import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { serverSubmitReviewRequest } from '@/lib/review-request-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    requestId?: string;
    videoUrl?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'requestId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!videoUrl) {
    return new Response(JSON.stringify({ error: 'videoUrl is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const request = await serverSubmitReviewRequest(gate.admin, gate.user.userId, {
      requestId,
      videoUrl,
    });
    return new Response(JSON.stringify({ ok: true, request }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    const status = msg === 'Forbidden' ? 403 : msg === 'Request not found' ? 404 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
