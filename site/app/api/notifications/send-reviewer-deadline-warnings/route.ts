import { createClient } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notifications/notify-user';

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
  if (req.headers.get(CRON_HEADER)) return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const token = new URL(req.url).searchParams.get('token');
  if (token === expected) return true;
  const headerToken = (req.headers.get('x-auro-internal') || '').trim();
  return headerToken === expected;
}

async function sendDeadlineWarnings(): Promise<Response> {
  try {
    const admin = buildSupabaseAdmin();
    const now = new Date();

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
      errors: [] as { requestId?: string; threshold?: number; error: string }[],
    };

    for (const threshold of warningThresholds) {
      const deadlineTime = new Date(now.getTime() + threshold.hours * 60 * 60 * 1000);
      const deadlineStart = new Date(deadlineTime.getTime() - 30 * 60 * 1000);
      const deadlineEnd = new Date(deadlineTime.getTime() + 30 * 60 * 1000);

      const { data: requests, error: queryError } = await admin
        .from('requests')
        .select('id, influencer_id, deliver_by')
        .eq('status', 'in_progress')
        .not('deliver_by', 'is', null)
        .gte('deliver_by', deadlineStart.toISOString())
        .lte('deliver_by', deadlineEnd.toISOString());

      if (queryError) {
        console.error(`[deadline-warnings] Error fetching requests for ${threshold.hours}h:`, queryError);
        results.errors.push({ threshold: threshold.hours, error: queryError.message });
        continue;
      }

      if (!requests?.length) continue;

      for (const request of requests) {
        try {
          results.processed++;
          const reviewerId = (request as { influencer_id?: string }).influencer_id;
          if (!reviewerId) continue;

          const entityId = `${request.id}:${threshold.hours}h`;
          const sent = await notifyUser(admin, {
            userId: reviewerId,
            type: 'deadline_warning_reviewer',
            entityId,
            data: {
              requestId: request.id,
              hoursLeft: threshold.message,
            },
          });

          if (sent.email || sent.sms || sent.push) {
            results.notificationsSent++;
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ requestId: request.id, threshold: threshold.hours, error: message });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} requests, sent ${results.notificationsSent} notifications`,
        results,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process deadline warnings';
    console.error('[deadline-warnings] Error:', error);
    return new Response(JSON.stringify({ error: message, errorType: 'UNKNOWN_ERROR' }), { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return sendDeadlineWarnings();
}

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return sendDeadlineWarnings();
}
