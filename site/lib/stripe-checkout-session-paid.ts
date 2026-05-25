import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { markRequestPaidFromCheckoutSession } from '@/lib/mark-request-paid-from-checkout';

type ApplyArgs = {
  stripe: Stripe;
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
};

/**
 * Shared path for checkout.session.completed and checkout.session.async_payment_succeeded.
 * Marks the request paid, records fees, moves temp uploads, and marks webhook_events completed.
 */
export async function applyCheckoutSessionPaidUpdate({ stripe, event, session }: ApplyArgs): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const requestId = metadata.request_id;
  const uploadSessionId = metadata.upload_session_id;
  const customerEmail =
    (session.customer_details as { email?: string } | null)?.email ||
    (session as { customer_email?: string }).customer_email ||
    '';
  const stripeAccountId = (event as { account?: string }).account as string | undefined;

  if (!requestId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return;

  const admin = createClient(url, key) as SupabaseClient;

  const paidResult = await markRequestPaidFromCheckoutSession({
    admin,
    stripe,
    session,
    requestId,
    stripeAccountId,
  });
  if (!paidResult.ok) {
    console.error('[checkout-paid] mark paid failed:', paidResult.error);
    return;
  }
  console.log('[checkout-paid] Request marked paid:', requestId);

  try {
    await admin.from('webhook_events').update({ status: 'completed' }).eq('stripe_event_id', event.id);
  } catch (updateError) {
    console.error('[checkout-paid] Failed to mark webhook_events completed:', updateError);
  }

  try {
    const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
    const userId = (reqRow as { user_id?: string } | null)?.user_id;
    if (userId) {
      const updates: Record<string, unknown> = { id: userId };
      if (customerEmail) updates.email = customerEmail;
      await admin.from('profiles').upsert(updates, { onConflict: 'id' });
    }
  } catch {
    /* ignore */
  }

  try {
    if (uploadSessionId) {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
      const { data: files } = await (admin.storage as any).from(bucket).list(`temp-uploads/${uploadSessionId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
        search: '',
      });
      if (Array.isArray(files) && files.length > 0) {
        let userId: string | undefined;
        try {
          const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
          userId = (reqRow as { user_id?: string } | null)?.user_id;
        } catch {
          /* ignore */
        }
        const targetBase = userId ? `users/${userId}/requests/${requestId}` : `requests/${requestId}`;

        const moveRecursive = async (prefix: string, destBase: string) => {
          const { data: entries } = await (admin.storage as any).from(bucket).list(prefix);
          for (const entry of entries || []) {
            if (entry.id) {
              const fromPath = `${prefix}/${entry.name}`;
              const toPath = `${destBase}/${entry.name}`;
              await (admin.storage as any).from(bucket).move(fromPath, toPath);
            } else {
              await moveRecursive(`${prefix}/${entry.name}`, `${destBase}/${entry.name}`);
            }
          }
        };

        await moveRecursive(`temp-uploads/${uploadSessionId}`, targetBase);
      }
    }
  } catch (mvErr) {
    console.error('[checkout-paid] move temp uploads error', mvErr);
  }

  try {
    if (uploadSessionId) {
      const avatarsBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
      const { data: avatarEntries } = await (admin.storage as any).from(avatarsBucket).list(`temp-uploads/${uploadSessionId}/avatar`);
      const { data: selfieEntries } = await (admin.storage as any).from(avatarsBucket).list(`temp-uploads/${uploadSessionId}/selfie`);
      const entries = [...(avatarEntries || []), ...(selfieEntries || [])];
      if (Array.isArray(entries) && entries.length > 0) {
        let userIdForAvatar: string | undefined;
        try {
          const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
          userIdForAvatar = (reqRow as { user_id?: string } | null)?.user_id;
        } catch {
          /* ignore */
        }
        const first = entries.find((e: { id?: string }) => e?.id) || entries[0];
        const fromPath = first.name.includes('/avatar/')
          ? `temp-uploads/${uploadSessionId}/avatar/${first.name}`
          : `temp-uploads/${uploadSessionId}/selfie/${first.name}`;
        const toPath = userIdForAvatar
          ? `users/${userIdForAvatar}/avatar/${first.name}`
          : `requests/${requestId}/avatar/${first.name}`;
        await (admin.storage as any).from(avatarsBucket).move(fromPath, toPath);
        if (userIdForAvatar) {
          await admin.from('profiles').update({ avatar_url: toPath }).eq('id', userIdForAvatar);
        }
      }
    }
  } catch (avatarErr) {
    console.error('[checkout-paid] avatar move/update error', avatarErr);
  }
}

export async function applyCheckoutSessionAsyncPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const requestId = metadata.request_id;
  if (!requestId) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return;
  const admin = createClient(url, key);
  await admin
    .from('requests')
    .update({
      payment_distribution_error: 'stripe_checkout_async_payment_failed',
      payment_distribution_failed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');
}
