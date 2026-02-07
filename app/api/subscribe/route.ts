import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subscription = body.subscription;
    const userAgent = body.userAgent || null;
    if (!subscription || !subscription.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });

    // store minimal subscription info in DB
    const { data, error } = await supabase.from('push_subscriptions').insert({
      endpoint: subscription.endpoint,
      keys: subscription.keys || null,
      user_agent: userAgent,
      enabled: true,
    }).select().single();

    if (error) {
      console.error('Failed to save subscription', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const endpoint = body.endpoint;
    if (!endpoint) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

    const { error } = await supabase.from('push_subscriptions').update({ enabled: false }).eq('endpoint', endpoint);
    if (error) {
      console.error('Failed to disable subscription', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
