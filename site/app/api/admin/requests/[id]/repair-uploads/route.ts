import { requireAdmin } from '@/lib/admin-server';
import { finalizeRequestUploads } from '@/lib/finalize-request-uploads';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id: requestId } = params;
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'Missing request id' }), { status: 400 });
  }

  const { data: row, error } = await gate.admin
    .from('requests')
    .select('id, stripe_session_id, photos')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
  }

  let uploadSessionId: string | null = null;
  const body = await req.json().catch(() => ({}));
  if (typeof body.uploadSessionId === 'string' && body.uploadSessionId.trim()) {
    uploadSessionId = body.uploadSessionId.trim();
  }

  if (!uploadSessionId && row.stripe_session_id) {
    const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
    if (stripeSecret) {
      try {
        const stripe = new Stripe(stripeSecret);
        const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id as string);
        uploadSessionId = (session.metadata?.upload_session_id as string) || null;
      } catch (e) {
        console.error('[admin/repair-uploads] stripe session lookup failed', e);
      }
    }
  }

  if (!uploadSessionId) {
    return new Response(JSON.stringify({ error: 'Could not resolve upload_session_id' }), { status: 400 });
  }

  const result = await finalizeRequestUploads(gate.admin, { requestId, uploadSessionId });

  return new Response(
    JSON.stringify({
      ok: true,
      requestId,
      uploadSessionId,
      moved: result.moved,
      photoPaths: result.photoPaths,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
