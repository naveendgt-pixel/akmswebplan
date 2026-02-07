"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscribe() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    setSupported(('serviceWorker' in navigator) && ('PushManager' in window));
  }, []);

  const registerServiceWorker = async () => {
    if (!supported) return;
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.error('SW register failed', err);
    }
  };

  useEffect(() => {
    if (!supported) return;
    registerServiceWorker();
    // check existing subscription
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    })();
  }, [supported]);

  const subscribe = async () => {
    if (!supported) return alert('Push not supported in this browser');
    if (Notification.permission === 'denied') return alert('Notifications are blocked');

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC || '';
    if (!vapidPublic) return alert('VAPID public key not configured (NEXT_PUBLIC_VAPID_PUBLIC)');

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });

      // send subscription to server
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userAgent: navigator.userAgent }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('Subscribe failed', err);
      alert('Subscription failed');
    }
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return setSubscribed(false);
    try {
      await sub.unsubscribe();
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed', err);
    }
  };

  return (
    <div>
      {!supported && <p className="text-sm text-[var(--muted-foreground)]">Push not supported in this browser</p>}
      {supported && (
        <div className="flex items-center gap-2">
          <button onClick={subscribe} className="btn" disabled={subscribed}>Enable Notifications</button>
          <button onClick={unsubscribe} className="btn-ghost" disabled={!subscribed}>Disable</button>
          <p className="text-sm text-[var(--muted-foreground)]">Permission: {permission}</p>
        </div>
      )}
    </div>
  );
}
