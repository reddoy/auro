import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get failed payment distributions
    const { data: failedPayments, error } = await admin
      .from('failed_payment_distributions')
      .select('*')
      .order('payment_distribution_failed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch failed payments:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch failed payments' }), { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await admin
      .rpc('get_payment_distribution_stats');

    return new Response(JSON.stringify({
      failedPayments: failedPayments || [],
      stats: stats || {},
      timestamp: new Date().toISOString()
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error fetching payment distribution dashboard:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch dashboard data' 
    }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, requestId, maxRetries = 3 } = await req.json();
    
    if (!action || !requestId) {
      return new Response(JSON.stringify({ error: 'Missing action or requestId' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    switch (action) {
      case 'retry_payment':
        // Call the retry distribution API
        const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/api/payments/retry-distribution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, maxRetries })
        });
        
        const retryData = await retryResponse.json();
        return new Response(JSON.stringify(retryData), { status: retryResponse.status });

      case 'reset_attempts':
        // Reset the attempt counter for manual intervention
        const { error: resetError } = await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: 0,
            payment_distribution_error: null,
            payment_distribution_failed_at: null
          })
          .eq('id', requestId);

        if (resetError) {
          return new Response(JSON.stringify({ error: 'Failed to reset attempts' }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Payment distribution attempts reset successfully'
        }), { status: 200 });

      case 'mark_manual':
        // Mark as manually resolved
        const { error: manualError } = await admin
          .from('requests')
          .update({ 
            payment_distributed: true,
            payment_distributed_at: new Date().toISOString(),
            payment_distribution_error: 'MANUALLY_RESOLVED',
            reviewer_amount_cents: 0 // Will be calculated properly later
          })
          .eq('id', requestId);

        if (manualError) {
          return new Response(JSON.stringify({ error: 'Failed to mark as manual' }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Payment marked as manually resolved'
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

  } catch (error: any) {
    console.error('Error processing dashboard action:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process action' 
    }), { status: 500 });
  }
}
