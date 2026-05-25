import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { requestId, disputeType, description, evidence } = await req.json();
    
    if (!requestId || !disputeType || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get request details
    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        user_id,
        influencer_id,
        status,
        dispute_status,
        profiles!requests_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          username
        )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      console.error('Failed to fetch request:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to fetch request' }), { status: 500 });
    }

    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    // Check if dispute already exists
    if (request.dispute_status && request.dispute_status !== 'none') {
      return new Response(JSON.stringify({ 
        error: 'Dispute already exists for this request',
        disputeStatus: request.dispute_status
      }), { status: 400 });
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await admin
      .from('disputes')
      .insert({
        request_id: requestId,
        customer_id: request.user_id,
        reviewer_id: request.influencer_id,
        dispute_type: disputeType,
        description: description,
        customer_evidence: evidence || null,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single();

    if (disputeError) {
      console.error('Failed to create dispute:', disputeError);
      return new Response(JSON.stringify({ error: 'Failed to create dispute' }), { status: 500 });
    }

    // Update request dispute status
    const { error: updateError } = await admin
      .from('requests')
      .update({ 
        dispute_id: dispute.id,
        dispute_status: 'open'
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Failed to update request dispute status:', updateError);
      // Don't fail the request since dispute was created
    }

    return new Response(JSON.stringify({
      success: true,
      disputeId: dispute.id,
      message: 'Dispute created successfully'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error creating dispute:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to create dispute',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(supabaseUrl, supabaseKey);

    let query = admin
      .from('disputes')
      .select(`
        id,
        request_id,
        dispute_type,
        status,
        priority,
        description,
        created_at,
        updated_at,
        resolved_at,
        resolution,
        resolution_type,
        refund_amount_cents,
        requests!inner (
          id,
          status,
          amount_cents,
          created_at
        ),
        profiles!disputes_customer_id_fkey (
          id,
          username,
          first_name,
          last_name,
          email
        ),
        profiles!disputes_reviewer_id_fkey (
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.or(`customer_id.eq.${userId},reviewer_id.eq.${userId}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: disputes, error } = await query;

    if (error) {
      console.error('Failed to fetch disputes:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch disputes' }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      disputes: disputes || [],
      count: disputes?.length || 0
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error fetching disputes:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to fetch disputes',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
