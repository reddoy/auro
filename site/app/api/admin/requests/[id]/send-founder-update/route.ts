import { requireAdmin } from '@/lib/admin-server';
import { formatDisplayName } from '@/lib/admin-display';
import { logNotificationDelivery } from '@/lib/notifications/delivery-log';
import { sendFounderEmail } from '@/lib/notifications/send-founder-email';

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
    .select('id, user_id, influencer_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
  }

  const [revieweeRes, reviewerRes] = await Promise.all([
    gate.admin.from('profiles').select('email, first_name, last_name, username').eq('id', row.user_id).maybeSingle(),
    gate.admin
      .from('profiles')
      .select('first_name, last_name, username')
      .eq('id', row.influencer_id)
      .maybeSingle(),
  ]);

  const revieweeEmail = (revieweeRes.data as { email?: string | null } | null)?.email;
  if (!revieweeEmail) {
    return new Response(JSON.stringify({ error: 'Reviewee email not found' }), { status: 400 });
  }

  const revieweeFirstName =
    (revieweeRes.data as { first_name?: string | null } | null)?.first_name || 'there';
  const reviewerName = reviewerRes.data
    ? formatDisplayName(reviewerRes.data as Parameters<typeof formatDisplayName>[0])
    : 'your reviewer';

  const result = await sendFounderEmail({
    to: revieweeEmail,
    revieweeFirstName,
    reviewerName,
    requestId,
  });

  if (result.ok) {
    await logNotificationDelivery(gate.admin, {
      userId: row.user_id,
      type: 'founder_request_update',
      entityId: `${requestId}:founder-update`,
      channel: 'email',
      status: 'sent',
      providerId: result.id,
    });
    return new Response(
      JSON.stringify({ ok: true, to: revieweeEmail, messageId: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (result.skipped) {
    return new Response(JSON.stringify({ error: result.error, skipped: true }), { status: 503 });
  }

  return new Response(JSON.stringify({ error: result.error }), { status: 500 });
}
