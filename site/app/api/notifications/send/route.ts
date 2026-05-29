import { createClient } from '@supabase/supabase-js';
import { isTrustedInternalRequest } from '@/lib/internal-fetch-secret';
import { notifyUser } from '@/lib/notifications/notify-user';
import type { ProductNotificationType } from '@/lib/notifications/types';

/** Map legacy push-only types to product notification types. */
function mapLegacyType(data?: { type?: string }): ProductNotificationType | null {
  switch (data?.type) {
    case 'new_request':
      return 'request_paid_reviewer';
    case 'review_completed':
      return 'review_completed_reviewee';
    case 'review_declined':
      return 'request_declined_reviewee';
    case 'deadline_warning':
      return 'deadline_warning_reviewer';
    default:
      return null;
  }
}

export async function POST(req: Request) {
  if (!isTrustedInternalRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, title, body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }

    const admin = createClient(url, key);
    const mapped = mapLegacyType(data);
    const requestId = typeof data?.requestId === 'string' ? data.requestId : undefined;

    if (mapped) {
      const result = await notifyUser(admin, {
        userId,
        type: mapped,
        entityId: requestId,
        data: {
          requestId,
          hoursLeft: typeof data?.hoursRemaining === 'number' ? `${data.hoursRemaining} hours` : undefined,
        },
      });
      return new Response(
        JSON.stringify({
          success: true,
          channels: result,
          userId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Unknown notification type; no channels sent',
        userId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
