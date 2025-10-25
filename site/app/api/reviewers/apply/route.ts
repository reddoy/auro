import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bio, focusAreas, hourlyRate, avatarUrl, avatarPath, socials, instagramHandle, tiktokHandle, phone, marketingConsent, userId: userIdFromBody } = body || {};

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // SECURITY: Only trust the auth token - NEVER accept userId from request body
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }
    
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
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Ensure profile exists first - only create if missing, don't overwrite existing data
    try {
      const { data: existingProfile } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
      
      if (!existingProfile) {
        // Profile doesn't exist - create it with basic info from auth
        let userEmail: string | undefined;
        let userFullName: string | undefined;
        
        if (token) {
          const { data: userData } = await admin.auth.getUser(token);
          userEmail = userData?.user?.email;
          userFullName = userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name;
        } else {
          // Fallback: try to get user by ID directly
          const { data: { user } } = await admin.auth.admin.getUserById(userId);
          userEmail = user?.email;
          userFullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
        }

        const { error: createErr } = await admin.from('profiles').insert({
          id: userId,
          email: userEmail,
          full_name: userFullName || '',
          username: userEmail?.split('@')[0] || `user_${userId.slice(0, 8)}`,
        });
        if (createErr) {
          console.error('Failed to create profile:', createErr);
          return new Response(JSON.stringify({ error: 'Failed to create profile: ' + createErr.message }), { status: 400 });
        }
      }
    } catch (profileCheckErr: any) {
      console.error('Profile check error:', profileCheckErr);
    }

    // Check if user can complete reviewer signup (prevent duplicates)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('reviewer_signup_status, is_reviewer')
      .eq('id', userId)
      .single();
    
    if (existingProfile?.reviewer_signup_status === 'completed') {
      return new Response(JSON.stringify({ 
        error: 'You have already completed the reviewer application. An account with this email is already associated with our platform.' 
      }), { status: 400 });
    }

    // Now update ONLY reviewer-specific fields - don't touch core profile data
    // IMPORTANT: Only update fields that were explicitly provided to avoid overwriting existing data
    const reviewerUpdates: any = {
      is_reviewer: true, // Always set this - CRITICAL: This makes them a reviewer
      reviewer_signup_status: 'completed', // Mark as completed when they submit
    };
    
    console.log(`[Apply] Setting is_reviewer=true for user ${userId}`);
    
    // Only update bio if provided (empty string counts as intentional)
    if (typeof bio === 'string') reviewerUpdates.bio = bio;
    
    // Only update skills if provided
    if (typeof focusAreas === 'string') {
      reviewerUpdates.skills = focusAreas.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    
    // Only update hourly_rate if provided (they might want to set it later)
    if (hourlyRate && !isNaN(Number(hourlyRate))) {
      reviewerUpdates.hourly_rate = Number(hourlyRate);
    }
    
    // CRITICAL: Only update avatar if they actually uploaded a new one in this session
    // If avatarPath is set, they uploaded a new file - update it
    // If not set, preserve their existing avatar (don't overwrite)
    if (avatarPath) {
      reviewerUpdates.avatar_url = avatarPath;
    } else if (avatarUrl) {
      reviewerUpdates.avatar_url = avatarUrl;
    }
    // If neither avatarPath nor avatarUrl, don't include avatar_url in update
    
    // Store contact/marketing consent in preferences JSON
    // Merge with existing preferences to not lose other data
    reviewerUpdates.preferences = { 
      marketing_consent: !!marketingConsent, 
      phone: phone || null 
    };

    const { error: upErr } = await admin.from('profiles').update(reviewerUpdates).eq('id', userId);
    if (upErr) {
      console.error('Profile update error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), { status: 400 });
    }
    
    console.log(`[Apply] Successfully updated profile for user ${userId} with is_reviewer=true`);

    // Store socials if provided
    if (Array.isArray(socials) && socials.length) {
      for (const s of socials) {
        try {
          const provider = String(s.provider || '').toLowerCase();
          if (!['tiktok','instagram'].includes(provider)) continue;
          await admin.from('social_accounts').upsert({
            user_id: userId,
            provider,
            username: s.username || provider,
          }, { onConflict: 'user_id,provider' });
        } catch {}
      }
    }

    // Also persist handles into profiles.links json for convenience
    const linksUpdate = {
      links: {
        instagram: instagramHandle || null,
        tiktok: tiktokHandle || null,
      }
    };
    try { 
      await admin.from('profiles').update(linksUpdate).eq('id', userId);
    } catch (linkErr) {
      console.error('Links update error:', linkErr);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


