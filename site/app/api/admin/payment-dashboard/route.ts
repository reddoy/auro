import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(supabaseUrl, supabaseKey);

    // Calculate date filter
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        dateFilter = '1=1'; // All time
    }

    // Get payment statistics
    const { data: paymentStats, error: paymentError } = await admin
      .from('requests')
      .select(`
        status,
        payment_status,
        refund_status,
        dispute_status,
        amount_cents,
        application_fee_cents,
        reviewer_amount_cents,
        refunded_amount_cents,
        payment_distributed,
        payment_distribution_attempts,
        created_at
      `)
      .not('amount_cents', 'is', null);

    if (paymentError) {
      console.error('Failed to fetch payment stats:', paymentError);
      return new Response(JSON.stringify({ error: 'Failed to fetch payment stats' }), { status: 500 });
    }

    // Calculate statistics
    const stats = {
      totalRequests: 0,
      totalRevenue: 0,
      totalFees: 0,
      totalPaidOut: 0,
      totalRefunded: 0,
      pendingPayouts: 0,
      failedDistributions: 0,
      openDisputes: 0,
      timeoutRequests: 0,
      statusBreakdown: {} as Record<string, number>,
      paymentStatusBreakdown: {} as Record<string, number>,
      refundStatusBreakdown: {} as Record<string, number>,
      disputeStatusBreakdown: {} as Record<string, number>
    };

    // Process payment statistics
    paymentStats?.forEach(request => {
      const amount = request.amount_cents || 0;
      const fee = request.application_fee_cents || 0;
      const paidOut = request.reviewer_amount_cents || 0;
      const refunded = request.refunded_amount_cents || 0;

      stats.totalRequests++;
      stats.totalRevenue += amount;
      stats.totalFees += fee;
      stats.totalPaidOut += paidOut;
      stats.totalRefunded += refunded;

      // Status breakdowns
      stats.statusBreakdown[request.status || 'unknown'] = (stats.statusBreakdown[request.status || 'unknown'] || 0) + 1;
      stats.paymentStatusBreakdown[request.payment_status || 'unknown'] = (stats.paymentStatusBreakdown[request.payment_status || 'unknown'] || 0) + 1;
      stats.refundStatusBreakdown[request.refund_status || 'none'] = (stats.refundStatusBreakdown[request.refund_status || 'none'] || 0) + 1;
      stats.disputeStatusBreakdown[request.dispute_status || 'none'] = (stats.disputeStatusBreakdown[request.dispute_status || 'none'] || 0) + 1;

      // Special counts
      if (request.status === 'completed' && !request.payment_distributed) {
        stats.pendingPayouts += amount - fee;
      }
      if (request.payment_distribution_attempts && request.payment_distribution_attempts > 0 && !request.payment_distributed) {
        stats.failedDistributions++;
      }
      if (request.status === 'timeout') {
        stats.timeoutRequests++;
      }
    });

    // Get dispute statistics
    const { data: disputeStats, error: disputeError } = await admin
      .from('disputes')
      .select('status, dispute_type, created_at')
      .eq('status', 'open');

    if (!disputeError) {
      stats.openDisputes = disputeStats?.length || 0;
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        payment_status,
        refund_status,
        amount_cents,
        created_at,
        updated_at,
        profiles!requests_user_id_fkey (
          username,
          full_name
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(20);

    // Get failed distributions that need attention
    const { data: failedDistributions, error: failedError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        amount_cents,
        application_fee_cents,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
        profiles!requests_influencer_id_fkey (
          username,
          full_name,
          stripe_connect_account_id
        )
      `)
      .eq('status', 'completed')
      .eq('payment_distributed', false)
      .not('payment_distribution_failed_at', 'is', null)
      .order('payment_distribution_failed_at', { ascending: false })
      .limit(10);

    // Get timeout requests that need refunds
    const { data: timeoutRequests, error: timeoutError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        amount_cents,
        refund_status,
        refund_reason,
        created_at,
        profiles!requests_user_id_fkey (
          username,
          full_name,
          email
        )
      `)
      .eq('status', 'timeout')
      .eq('refund_status', 'none')
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      success: true,
      period: period,
      stats: {
        ...stats,
        // Convert cents to dollars for display
        totalRevenueUSD: (stats.totalRevenue / 100).toFixed(2),
        totalFeesUSD: (stats.totalFees / 100).toFixed(2),
        totalPaidOutUSD: (stats.totalPaidOut / 100).toFixed(2),
        totalRefundedUSD: (stats.totalRefunded / 100).toFixed(2),
        pendingPayoutsUSD: (stats.pendingPayouts / 100).toFixed(2)
      },
      recentActivity: recentActivity || [],
      failedDistributions: failedDistributions || [],
      timeoutRequests: timeoutRequests || [],
      alerts: {
        failedDistributions: stats.failedDistributions,
        openDisputes: stats.openDisputes,
        timeoutRequests: stats.timeoutRequests,
        pendingPayouts: stats.pendingPayouts
      }
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error fetching payment dashboard:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch payment dashboard',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}