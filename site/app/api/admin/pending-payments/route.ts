import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

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
    const formatted = (pendingPayments || []).map((req: any) => ({
      id: req.id,
      amount_cents: req.amount_cents,
      reviewer_amount_cents: req.reviewer_amount_cents || (req.amount_cents - (req.application_fee_cents || 0)),
      payment_distribution_error: req.payment_distribution_error,
      payment_distribution_attempts: req.payment_distribution_attempts || 0,
      created_at: req.created_at,
      reviewer: req.profiles ? {
        username: req.profiles.username,
        email: req.profiles.email,
        stripe_connect_account_id: req.profiles.stripe_connect_account_id
      } : null
    }));

    return new Response(JSON.stringify({
      success: true,
      pendingPayments: formatted
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error fetching pending payments:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to fetch pending payments'
    }), { status: 500 });
  }
}

