import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';

export async function POST(req: Request) {
  console.log('[checkout-confirm] ===== CHECKOUT CONFIRMATION REQUEST =====');
  try {
    const gate = await requireAuthenticatedUser(req);
    if (!gate.ok) {
      return new Response(JSON.stringify(gate.body), {
        status: gate.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { sessionId } = await req.json();
    console.log('[checkout-confirm] Session ID received:', sessionId);
    
    if (!sessionId) {
      console.log('[checkout-confirm] ERROR: Missing sessionId');
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      console.log('[checkout-confirm] ERROR: Missing STRIPE_SECRET_KEY');
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    
    console.log('[checkout-confirm] Stripe secret key present:', !!secret);
    console.log('[checkout-confirm] Stripe secret key starts with:', secret.substring(0, 7));
    
    const stripe = new Stripe(secret);
    console.log('[checkout-confirm] Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      console.log('[checkout-confirm] ERROR: Session not found');
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    
    console.log('[checkout-confirm] Session retrieved successfully');
    console.log('[checkout-confirm] Session ID:', session.id);
    console.log('[checkout-confirm] Session status:', session.payment_status);
    console.log('[checkout-confirm] Session metadata:', session.metadata);

    const metadata = (session.metadata || {}) as Record<string, string>;
    const requestId = metadata.request_id;
    console.log('[checkout-confirm] Request ID from metadata:', requestId);
    
    if (!requestId) {
      console.log('[checkout-confirm] ERROR: No request id on session');
      return new Response(JSON.stringify({ error: 'No request id on session' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    console.log('[checkout-confirm] Supabase URL present:', !!url);
    console.log('[checkout-confirm] Supabase key present:', !!key);
    
    if (!url || !key) {
      console.log('[checkout-confirm] ERROR: Supabase not configured');
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }
    
    const admin = createClient(url, key);
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
    
    console.log('[checkout-confirm] Payment intent ID:', paymentIntentId);
    console.log('[checkout-confirm] Payment status:', session.payment_status);
    
    const { data: ownedRequest, error: ownershipError } = await admin
      .from('requests')
      .select('id,user_id,status,payment_status')
      .eq('id', requestId)
      .maybeSingle();
    if (ownershipError || !ownedRequest) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }
    if (ownedRequest.user_id !== gate.user.userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    if (session.payment_status === 'paid') {
      console.log('[checkout-confirm] ===== UPDATING REQUEST TO PAID STATUS =====');
      console.log('[checkout-confirm] Updating request ID:', requestId);
      
      const updateData = {
        status: 'paid', 
        payment_status: 'paid', 
        stripe_session_id: session.id, 
        stripe_payment_intent_id: paymentIntentId || null 
      };
      
      console.log('[checkout-confirm] Update data:', updateData);
      
      const { data, error } = await admin
        .from('requests')
        .update(updateData)
        .eq('id', requestId)
        .select();
        
      if (error) {
        console.error('[checkout-confirm] Database update error:', error);
        return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500 });
      } else {
        console.log('[checkout-confirm] Database update successful:', data);
      }
    } else {
      console.log('[checkout-confirm] Payment not completed, status:', session.payment_status);
    }
    
    console.log('[checkout-confirm] ===== CONFIRMATION COMPLETE =====');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to confirm' }), { status: 400 });
  }
}


