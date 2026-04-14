import { createClient } from '@supabase/supabase-js';
import { INTERNAL_AURO_HEADER, getInternalJobSecret } from '@/lib/internal-fetch-secret';

export async function POST(req: Request) {
  try {
    const { disputeId, resolution, resolutionType, refundAmountCents = 0, adminNotes } = await req.json();
    
    if (!disputeId || !resolution || !resolutionType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get dispute details
    const { data: dispute, error: disputeError } = await admin
      .from('disputes')
      .select(`
        id,
        request_id,
        status,
        resolution_type,
        requests!inner (
          id,
          amount_cents,
          stripe_payment_intent_id,
          refund_status
        )
      `)
      .eq('id', disputeId)
      .maybeSingle();

    if (disputeError) {
      console.error('Failed to fetch dispute:', disputeError);
      return new Response(JSON.stringify({ error: 'Failed to fetch dispute' }), { status: 500 });
    }

    if (!dispute) {
      return new Response(JSON.stringify({ error: 'Dispute not found' }), { status: 404 });
    }

    if (dispute.status === 'resolved') {
      return new Response(JSON.stringify({ 
        error: 'Dispute already resolved',
        currentResolution: dispute.resolution_type
      }), { status: 400 });
    }

    // Use the resolve_dispute function
    const { data: resolveResult, error: resolveError } = await admin
      .rpc('resolve_dispute', {
        dispute_id_param: disputeId,
        resolution_param: resolution,
        resolution_type_param: resolutionType,
        refund_amount_param: refundAmountCents,
        admin_notes_param: adminNotes
      });

    if (resolveError) {
      console.error('Failed to resolve dispute:', resolveError);
      return new Response(JSON.stringify({ error: 'Failed to resolve dispute' }), { status: 500 });
    }

    // If resolution involves refund, trigger refund processing
    if (resolutionType === 'refund_full' || resolutionType === 'refund_partial') {
      const request = (dispute as any).requests;
      if (request?.stripe_payment_intent_id && refundAmountCents > 0) {
        try {
          const internal = getInternalJobSecret();
          const refundResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/api/payments/refund`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(internal ? { [INTERNAL_AURO_HEADER]: internal } : {}),
            },
            body: JSON.stringify({
              requestId: request.id,
              reason: 'dispute_resolution',
              amountCents: refundAmountCents,
              partial: resolutionType === 'refund_partial'
            })
          });

          if (!refundResponse.ok) {
            console.error('Failed to process dispute refund:', await refundResponse.text());
            // Don't fail the resolution - refund can be processed manually
          } else {
            console.log('Dispute refund processed successfully');
          }
        } catch (refundError) {
          console.error('Error processing dispute refund:', refundError);
          // Don't fail the resolution - refund can be processed manually
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      disputeId: disputeId,
      resolution: resolution,
      resolutionType: resolutionType,
      refundAmount: refundAmountCents,
      message: 'Dispute resolved successfully'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error resolving dispute:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to resolve dispute',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { disputeId, reviewerResponse, reviewerEvidence } = await req.json();
    
    if (!disputeId) {
      return new Response(JSON.stringify({ error: 'Missing disputeId' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Update dispute with reviewer response
    const { data: updatedDispute, error: updateError } = await admin
      .from('disputes')
      .update({
        reviewer_response: reviewerResponse,
        reviewer_evidence: reviewerEvidence,
        status: 'under_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update dispute:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update dispute' }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      disputeId: disputeId,
      message: 'Dispute response submitted successfully'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error updating dispute:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to update dispute',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
