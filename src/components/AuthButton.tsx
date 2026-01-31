"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isAuthorizedEmail } from "@/lib/auth";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const syncSession = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const sessionEmail = data.session?.user.email ?? null;
      if (!mounted) return;
      setEmail(sessionEmail);
      const authorized = isAuthorizedEmail(sessionEmail);
      setIsAuthorized(authorized);
      if (sessionEmail && !authorized) {
        await supabase.auth.signOut();
        setEmail(null);
      }
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    if (!supabase) return;
    try {
      // build redirect URL: prefer NEXT_PUBLIC_SITE_URL when available (useful on Vercel)
      const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL as string) || (typeof window !== "undefined" ? window.location.origin : "");
      const redirectTo = siteOrigin ? `${siteOrigin.replace(/\/$/, "")}/dashboard` : undefined;
      // eslint-disable-next-line no-console
      console.debug("Starting Google OAuth sign-in", { redirectTo });
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Google sign-in failed:", err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Sign-out failed:", err);
    } finally {
      setEmail(null);
    }
  };

  // Show disabled state if Supabase is not configured
  if (!supabase) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 xs:px-3 py-2 text-xs font-medium text-amber-700">
        <span>⚠️</span>
        <span>Auth not configured</span>
      </div>
    );
  }

  if (!email) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 xs:px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:bg-[var(--secondary)] hover:shadow-md"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 xs:gap-3">
      <div className="flex items-center gap-2 rounded-xl bg-[var(--secondary)] px-2 xs:px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
          {email.charAt(0).toUpperCase()}
        </div>
        <span className="hidden max-w-[100px] xs:max-w-[140px] truncate text-sm font-medium text-[var(--foreground)] sm:inline">
          {email}
        </span>
      </div>
      {!isAuthorized ? (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
          Access restricted
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-2 xs:px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
      >
        Sign out
      </button>
    </div>
  );
}
