import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string;
  amount_cents: number | null;
  application_fee_cents: number | null;
  reviewer_amount_cents: number | null;
  payment_distribution_attempts: number | null;
  payment_distribution_error: string | null;
  payment_distribution_failed_at: string | null;
};

/**
 * Returns the caller's review requests whose payout has been attempted but
 * did not succeed. Used by the reviewer profile to surface a "Payout failed"
 * affordance instead of silently displaying the amount under "Awaiting payout".
 */
export async function GET(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await gate.admin
    .from('requests')
    .select(
      'id, amount_cents, application_fee_cents, reviewer_amount_cents, payment_distribution_attempts, payment_distribution_error, payment_distribution_failed_at'
    )
    .eq('influencer_id', gate.user.userId)
    .eq('status', 'completed')
    .eq('payment_distributed', false)
    .not('refund_status', 'in', '(refunded,partially_refunded)')
    .gt('payment_distribution_attempts', 0)
    .order('payment_distribution_failed_at', { ascending: false, nullsFirst: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = (data || []) as RequestRow[];
  const items = rows.map((row) => {
    const total = row.amount_cents ?? 0;
    const fee = row.application_fee_cents ?? 0;
    const reviewerCents =
      typeof row.reviewer_amount_cents === 'number' ? row.reviewer_amount_cents : Math.max(total - fee, 0);
    return {
      requestId: row.id,
      reviewerAmountCents: reviewerCents,
      attempts: row.payment_distribution_attempts ?? 0,
      lastError: row.payment_distribution_error,
      lastFailedAt: row.payment_distribution_failed_at,
    };
  });

  const totalCents = items.reduce((sum, item) => sum + (item.reviewerAmountCents || 0), 0);

  return new Response(
    JSON.stringify({
      count: items.length,
      totalCents,
      items,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
