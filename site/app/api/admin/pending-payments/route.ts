import { requireAdmin } from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = gate.admin;

    // Get pending payments (completed but not distributed)
    const { data: pendingPayments, error: queryError } = await admin
      .from('requests')
      .select(`
        id,
        amount_cents,
        application_fee_cents,
        reviewer_amount_cents,
        payment_distribution_error,
        payment_distribution_attempts,
        created_at,
        profiles!requests_influencer_id_fkey (
          username,
          email,
          stripe_connect_account_id
        )
      `)
      .eq('status', 'completed')
      .eq('payment_distributed', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (queryError) {
      console.error('Failed to fetch pending payments:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to fetch pending payments' }), { status: 500 });
    }

    // Transform the data
    const formatted = (pendingPayments || []).map((req: {
      id: string;
      amount_cents: number | null;
      application_fee_cents: number | null;
      reviewer_amount_cents: number | null;
      payment_distribution_error: string | null;
      payment_distribution_attempts: number | null;
      created_at: string;
      profiles:
        | {
            username: string | null;
            email: string | null;
            stripe_connect_account_id: string | null;
          }
        | {
            username: string | null;
            email: string | null;
            stripe_connect_account_id: string | null;
          }[]
        | null;
    }) => {
      const profile = Array.isArray(req.profiles) ? req.profiles[0] ?? null : req.profiles;
      return {
        id: req.id,
        amount_cents: req.amount_cents,
        reviewer_amount_cents: req.reviewer_amount_cents || (req.amount_cents ?? 0) - (req.application_fee_cents || 0),
        payment_distribution_error: req.payment_distribution_error,
        payment_distribution_attempts: req.payment_distribution_attempts || 0,
        created_at: req.created_at,
        reviewer: profile
          ? {
              username: profile.username,
              email: profile.email,
              stripe_connect_account_id: profile.stripe_connect_account_id,
            }
          : null,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        pendingPayments: formatted,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pending payments';
    console.error('Error fetching pending payments:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
