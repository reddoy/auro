import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      bio, 
      focusAreas, 
      hourlyRate, 
      avatarUrl, 
      avatarPath, 
      socials, 
      instagramHandle, 
      tiktokHandle, 
      phone, 
      marketingConsent, 
      userId: userIdFromBody,
      email,
      fullName,
      firstName,
      lastName
    } = body || {};
    
    console.log('[ApplySignup] Received request with:', {
      userId: userIdFromBody,
      email: email,
      fullName: fullName
    });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // For signup flow, we can accept userId from body if provided (from localStorage)
    // But we still need to verify the user exists in Supabase auth
    // SECURITY: This endpoint is only for users who just created an account and haven't confirmed email yet
    let userId: string | null = null;
    
    if (userIdFromBody) {
      // Verify the user exists in Supabase auth
      try {
        // First try to get user by ID
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(userIdFromBody);
        
        if (userError || !userData?.user) {
          // If getUserById fails, try to find by email as fallback
          console.log(`[ApplySignup] getUserById failed for ${userIdFromBody}, trying email lookup`);
          
          if (!email) {
            return new Response(JSON.stringify({ error: 'User verification failed - no email provided' }), { status: 400 });
          }
          
          const { data: users, error: listError } = await admin.auth.admin.listUsers();
          if (listError) {
            return new Response(JSON.stringify({ error: 'Failed to verify user by email' }), { status: 400 });
          }
          
          const user = users.users.find(u => u.email === email);
          if (!user) {
            return new Response(JSON.stringify({ error: 'User not found by email' }), { status: 400 });
          }
          
          // Verify the email matches the userId we were given
          if (user.id !== userIdFromBody) {
            return new Response(JSON.stringify({ error: 'User ID and email mismatch' }), { status: 400 });
          }
          
          userId = userIdFromBody;
          console.log(`[ApplySignup] User verified by email lookup: ${email}`);
        } else {
          // User found by ID, check email confirmation status
          if (userData.user.email_confirmed_at) {
            return new Response(JSON.stringify({ 
              error: 'Email already confirmed. Please use the regular sign-in flow.' 
            }), { status: 400 });
          }
          
          userId = userIdFromBody;
          console.log(`[ApplySignup] User verified by ID: ${userIdFromBody}`);
        }
      } catch (e) {
        console.error('[ApplySignup] User verification error:', e);
        return new Response(JSON.stringify({ error: 'User verification failed' }), { status: 400 });
      }
    } else {
      // Fallback: try to get user by email
      if (!email) {
        return new Response(JSON.stringify({ error: 'User identification required' }), { status: 400 });
      }
      
      try {
        const { data: users, error: listError } = await admin.auth.admin.listUsers();
        if (listError) {
          return new Response(JSON.stringify({ error: 'Failed to verify user' }), { status: 400 });
        }
        
        const user = users.users.find(u => u.email === email);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), { status: 400 });
        }
        userId = user.id;
        console.log(`[ApplySignup] User found by email: ${email}`);
      } catch (e) {
        console.error('[ApplySignup] Email lookup error:', e);
        return new Response(JSON.stringify({ error: 'User lookup failed' }), { status: 400 });
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unable to identify user' }), { status: 400 });
    }

    // Ensure profile exists first - only create if missing, don't overwrite existing data
    try {
      const { data: existingProfile } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
      
      if (!existingProfile) {
        // Profile doesn't exist - create it with basic info
        const { error: createErr } = await admin.from('profiles').insert({
          id: userId,
          email: email || '',
          full_name: fullName || '',
          username: email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
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
    const reviewerUpdates: any = {
      is_reviewer: true, // Always set this - CRITICAL: This makes them a reviewer
      reviewer_signup_status: 'completed', // Mark as completed when they submit
    };
    
    console.log(`[ApplySignup] Setting is_reviewer=true for user ${userId}`);
    
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
    if (avatarPath) {
      reviewerUpdates.avatar_url = avatarPath;
    } else if (avatarUrl) {
      reviewerUpdates.avatar_url = avatarUrl;
    }
    
    // Store contact/marketing consent in preferences JSON
    reviewerUpdates.preferences = { 
      marketing_consent: !!marketingConsent, 
      phone: phone || null 
    };

    const { error: upErr } = await admin.from('profiles').update(reviewerUpdates).eq('id', userId);
    if (upErr) {
      console.error('Profile update error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), { status: 400 });
    }
    
    console.log(`[ApplySignup] Successfully updated profile for user ${userId} with is_reviewer=true`);

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
