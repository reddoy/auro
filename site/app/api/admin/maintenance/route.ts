import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { tasks = ['timeouts', 'retries', 'health'] } = await req.json();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    const results = {
      timeouts: null as any,
      retries: null as any,
      health: null as any,
      errors: [] as any[]
    };

    // Process timeout requests
    if (tasks.includes('timeouts')) {
      try {
        console.log('[maintenance] Processing timeout requests...');
        
        // Call the database function to handle timeouts
        const { data: timeoutResult, error: timeoutError } = await admin
          .rpc('handle_request_timeouts');

        if (timeoutError) {
          console.error('Timeout processing error:', timeoutError);
          results.errors.push({
            task: 'timeouts',
            error: timeoutError.message
          });
        } else {
          // Process timeout refunds via API
          const refundResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/api/payments/process-timeout-refunds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processAll: true })
          });

          if (refundResponse.ok) {
            results.timeouts = await refundResponse.json();
            console.log('[maintenance] Timeout processing completed');
          } else {
            const errorData = await refundResponse.text();
            results.errors.push({
              task: 'timeouts',
              error: `Refund processing failed: ${errorData}`
            });
          }
        }
      } catch (error: any) {
        console.error('Timeout processing error:', error);
        results.errors.push({
          task: 'timeouts',
          error: error.message
        });
      }
    }

    // Retry failed distributions
    if (tasks.includes('retries')) {
      try {
        console.log('[maintenance] Retrying failed distributions...');
        
        const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/api/payments/retry-failed-distributions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retryAll: true })
        });

        if (retryResponse.ok) {
          results.retries = await retryResponse.json();
          console.log('[maintenance] Retry processing completed');
        } else {
          const errorData = await retryResponse.text();
          results.errors.push({
            task: 'retries',
            error: `Retry processing failed: ${errorData}`
          });
        }
      } catch (error: any) {
        console.error('Retry processing error:', error);
        results.errors.push({
          task: 'retries',
          error: error.message
        });
      }
    }

    // Get system health
    if (tasks.includes('health')) {
      try {
        console.log('[maintenance] Getting system health...');
        
        const { data: healthData, error: healthError } = await admin
          .rpc('get_payment_system_health');

        if (healthError) {
          console.error('Health check error:', healthError);
          results.errors.push({
            task: 'health',
            error: healthError.message
          });
        } else {
          results.health = healthData;
          console.log('[maintenance] Health check completed');
        }
      } catch (error: any) {
        console.error('Health check error:', error);
        results.errors.push({
          task: 'health',
          error: error.message
        });
      }
    }

    // Log maintenance completion
    try {
      await admin
        .from('maintenance_log')
        .insert({
          maintenance_type: 'api_maintenance',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: results.errors.length === 0 ? 'completed' : 'partial',
          details: {
            tasks_requested: tasks,
            results: results,
            error_count: results.errors.length
          }
        });
    } catch (logError) {
      console.error('Failed to log maintenance completion:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Maintenance tasks completed',
      results: results,
      errorCount: results.errors.length
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error running maintenance tasks:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to run maintenance tasks',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get recent maintenance logs
    const { data: maintenanceLogs, error: logError } = await admin
      .from('maintenance_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    // Get system health
    const { data: healthData, error: healthError } = await admin
      .rpc('get_payment_system_health');

    return new Response(JSON.stringify({
      success: true,
      maintenanceLogs: maintenanceLogs || [],
      systemHealth: healthData || {},
      lastUpdated: new Date().toISOString()
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error fetching maintenance status:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch maintenance status',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
