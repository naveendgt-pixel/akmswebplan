import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { supabase } from '@/lib/supabaseClient';

// Ensure you set these env vars in your deployment:
// VAPID_PUBLIC and VAPID_PRIVATE (VAPID_PUBLIC should match NEXT_PUBLIC_VAPID_PUBLIC)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || process.env.NEXT_PUBLIC_VAPID_PUBLIC || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails('mailto:you@example.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = JSON.stringify({
      title: body.title || 'Aura Knot',
      body: body.body || 'You have a notification',
      url: body.url || '/',
    });

    // fetch enabled subscriptions
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('enabled', true);
    if (error) {
      console.error('Failed to fetch subscriptions', error);
      return NextResponse.json({ error: 'DB fetch error' }, { status: 500 });
    }

    const results: Array<{ id: string | null; ok: boolean; error?: string }> = [];

    for (const s of subs || []) {
      try {
        const subscription = {
          endpoint: s.endpoint,
          keys: s.keys || undefined,
        };
        await webPush.sendNotification(subscription as any, payload);
        results.push({ id: s.id, ok: true });
      } catch (e: any) {
        console.error('Send error for', s.id, e && (e.stack || e.message || e));
        results.push({ id: s.id, ok: false, error: e && (e.message || String(e)) });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
