export async function POST(req: Request) {
  // Auth and role checks omitted for brevity; integrate with Supabase Auth
  try {
    const { reviewRequestId, decision } = await req.json();
    if (!reviewRequestId || !['accept','deny'].includes(decision)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }
    // TODO: update request status, on deny issue refund via Stripe
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed' }), { status: 400 });
  }
}


