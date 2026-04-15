import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get auth token from request
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }
    
    // Verify user and get their ID
    let userId: string | null = null;
    try {
      const { data: u, error: authError } = await admin.auth.getUser(token);
      if (authError || !u?.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication token' }), { status: 401 });
      }
      userId = u.user.id;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
    }

    // Get user's reviewer signup status
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(
        'reviewer_signup_status, is_reviewer, email, full_name, username, avatar_url, hourly_rate, links, preferences'
      )
      .eq('id', userId)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // Determine the status
    const signupStatus = profile.reviewer_signup_status || 'not_started';
    const rawReviewer = profile.is_reviewer as string | boolean | null | undefined;
    const reviewerApproval =
      typeof rawReviewer === 'string'
        ? rawReviewer
        : rawReviewer === true
          ? 'approved'
          : null;

    return new Response(
      JSON.stringify({
        status: signupStatus,
        isReviewer: reviewerApproval === 'approved',
        reviewerApproval,
        profile: {
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          hourly_rate: profile.hourly_rate,
          links: profile.links,
          preferences: profile.preferences,
        },
      }),
      { status: 200 }
    );

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status } = body || {};

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get auth token from request
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }
    
    // Verify user and get their ID
    let userId: string | null = null;
    try {
      const { data: u, error: authError } = await admin.auth.getUser(token);
      if (authError || !u?.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication token' }), { status: 401 });
      }
      userId = u.user.id;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
    }

    // Validate status
    if (!['pending', 'completed'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    // Update the signup status
    const { error: updateError } = await admin
      .from('profiles')
      .update({ reviewer_signup_status: status })
      .eq('id', userId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}
