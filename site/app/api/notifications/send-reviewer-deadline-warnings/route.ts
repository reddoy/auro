import { createClient } from '@supabase/supabase-js';

const CRON_HEADER = 'x-vercel-cron';

function buildSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Server misconfigured');
  }
  return createClient(url, key);
}

function isAuthorizedCronRequest(req: Request) {
  if (req.method !== 'GET') return true;
  if (req.headers.get(CRON_HEADER)) return true;
  const token = new URL(req.url).searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return token === expected;
}

async function sendDeadlineWarnings(): Promise<Response> {
  try {
    const admin = buildSupabaseAdmin();
    const now = new Date();
    
    // Find requests that are in_progress and approaching their deadline
    // We'll send warnings at 24 hours, 12 hours, 6 hours, 2 hours, and 1 hour remaining
    const warningThresholds = [
      { hours: 24, message: '24 hours' },
      { hours: 12, message: '12 hours' },
      { hours: 6, message: '6 hours' },
      { hours: 2, message: '2 hours' },
      { hours: 1, message: '1 hour' },
    ];
    
    const results = {
      processed: 0,
      notificationsSent: 0,
      errors: [] as any[],
    };
    
    for (const threshold of warningThresholds) {
      const deadlineTime = new Date(now.getTime() + threshold.hours * 60 * 60 * 1000);
      const deadlineStart = new Date(deadlineTime.getTime() - 30 * 60 * 1000); // 30 minute window
      const deadlineEnd = new Date(deadlineTime.getTime() + 30 * 60 * 1000);
      
      // Find requests where deliver_by is within the warning window
      // Only check requests that are in_progress and haven't been completed
      const { data: requests, error: queryError } = await admin
        .from('requests')
        .select(`
          id,
          influencer_id,
          deliver_by,
          profiles!requests_influencer_id_fkey (
            id,
            push_token,
            first_name,
            last_name,
            username
          )
        `)
        .eq('status', 'in_progress')
        .not('deliver_by', 'is', null)
        .gte('deliver_by', deadlineStart.toISOString())
        .lte('deliver_by', deadlineEnd.toISOString());
      
      if (queryError) {
        console.error(`[deadline-warnings] Error fetching requests for ${threshold.hours}h threshold:`, queryError);
        results.errors.push({
          threshold: threshold.hours,
          error: queryError.message,
        });
        continue;
      }
      
      if (!requests || requests.length === 0) {
        continue;
      }
      
      console.log(`[deadline-warnings] Found ${requests.length} requests approaching ${threshold.message} deadline`);
      
      for (const request of requests) {
        try {
          results.processed++;
          const reviewer = (request.profiles as any);
          
          if (!reviewer || !reviewer.push_token) {
            console.log(`[deadline-warnings] Skipping request ${request.id}: no push token`);
            continue;
          }
          
          // Check if we've already sent a notification for this threshold
          // We'll use a simple approach: check the last notification time
          // For a more robust solution, you could add a notification_log table
          
          const reviewerName = [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.username || 'Reviewer';
          
          // Send push notification via Expo API
          const notificationResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
              to: reviewer.push_token,
              sound: 'default',
              title: `⏰ Review Deadline Approaching`,
              body: `You have ${threshold.message} left to complete this review. Complete it now to avoid automatic refund.`,
              data: {
                type: 'deadline_warning',
                requestId: request.id,
                hoursRemaining: threshold.hours,
              },
              priority: 'high',
            }),
          });
          
          if (!notificationResponse.ok) {
            const errorText = await notificationResponse.text();
            console.error(`[deadline-warnings] Failed to send notification for request ${request.id}:`, errorText);
            results.errors.push({
              requestId: request.id,
              threshold: threshold.hours,
              error: `Notification API error: ${errorText}`,
            });
          } else {
            results.notificationsSent++;
            console.log(`[deadline-warnings] Sent ${threshold.message} warning for request ${request.id}`);
          }
          
          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`[deadline-warnings] Error processing request ${request.id}:`, error);
          results.errors.push({
            requestId: request.id,
            threshold: threshold.hours,
            error: error.message || 'Unknown error',
          });
        }
      }
    }
    
    console.log(`[deadline-warnings] Completed: ${results.processed} processed, ${results.notificationsSent} notifications sent`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} requests, sent ${results.notificationsSent} notifications`,
        results,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[deadline-warnings] Error processing deadline warnings:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process deadline warnings',
        errorType: 'UNKNOWN_ERROR',
      }),
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return sendDeadlineWarnings();
}

export async function POST(req: Request) {
  return sendDeadlineWarnings();
}

