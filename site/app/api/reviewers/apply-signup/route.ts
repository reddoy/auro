import { createClient } from '@supabase/supabase-js';
import { buildAvatarObjectPath } from '../../../../lib/avatar-path';

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

    const normalizeAvatarPath = (value: string): string => {
      if (!value) return '';
      if (!/^https?:\/\//i.test(value)) return value.replace(/^avatars\//, '');
      const match = value.match(/\/(?:storage\/v1\/)?object\/(?:public|sign)\/avatars\/([^?]+)/);
      return match?.[1] ? decodeURIComponent(match[1]) : value;
    };

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
          
          // Use the user ID from the email lookup instead of the one from localStorage
          // This handles cases where localStorage might have stale or incorrect data
          userId = user.id;
          console.log(`[ApplySignup] User verified by email lookup: ${email}, using ID: ${user.id}`);
        } else {
          // User found by ID, check if email matches (case-insensitive)
          if (email && userData.user.email && userData.user.email.toLowerCase() !== email.toLowerCase()) {
            console.log(`[ApplySignup] Email mismatch: stored=${userData.user.email}, provided=${email}`);
            // Don't fail here - just log the mismatch and continue with the ID we found
          }
          
          // Don't check email confirmation status for signup flow - they might not have confirmed yet
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
        // Use first_name and last_name instead of full_name
        const profileData: any = {
          id: userId,
          email: email || '',
          username: email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
        };
        
        // Add first_name and last_name if provided
        if (firstName) profileData.first_name = firstName;
        if (lastName) profileData.last_name = lastName;
        
        // If fullName is provided but no firstName/lastName, try to split it
        if (!firstName && !lastName && fullName) {
          const nameParts = fullName.trim().split(/\s+/);
          if (nameParts.length > 0) {
            profileData.first_name = nameParts[0];
            if (nameParts.length > 1) {
              profileData.last_name = nameParts.slice(1).join(' ');
            }
          }
        }
        
        const { error: createErr } = await admin.from('profiles').insert(profileData);
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
      .select('is_reviewer')
      .eq('id', userId)
      .single();
    
    // Check if they already have a reviewer status (pending, approved, or rejected)
    if (existingProfile?.is_reviewer === 'pending' || existingProfile?.is_reviewer === 'approved') {
      return new Response(JSON.stringify({ 
        error: 'You have already completed the reviewer application. An account with this email is already associated with our platform.' 
      }), { status: 400 });
    }

    // Now update ONLY reviewer-specific fields - don't touch core profile data
    // IMPORTANT: Set is_reviewer='pending' to await manual approval
    // is_reviewer will be set to 'approved' only after manual approval
    const reviewerUpdates: any = {
      is_reviewer: 'pending', // Awaiting manual approval
    };
    
    // Update first_name and last_name if provided
    if (firstName) reviewerUpdates.first_name = firstName;
    if (lastName) reviewerUpdates.last_name = lastName;
    
    console.log(`[ApplySignup] Setting is_reviewer='pending' for user ${userId} (awaiting manual approval)`);
    
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
    
    // Standardize avatar path to readable folders while keeping old files untouched.
    // We copy into the new path instead of moving/deleting legacy objects.
    let finalAvatarPath: string | undefined = undefined;
    if (avatarPath) {
      const normalizedPath = normalizeAvatarPath(avatarPath);
      const avatarsBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
      let sourcePath = normalizedPath;

      try {
        if (normalizedPath.startsWith('temp-uploads/')) {
          const directoryPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
          const { data: files, error: listError } = await (admin.storage as any)
            .from(avatarsBucket)
            .list(directoryPath, { limit: 1 });

          if (!listError && files && files.length > 0) {
            sourcePath = directoryPath + files[0].name;
          }
        }

        const sourceExt = (sourcePath.split('.').pop() || 'jpg').toLowerCase();
        const destinationPath = buildAvatarObjectPath({
          firstName,
          lastName,
          ownerId: userId,
          ownerEmail: email,
          ext: sourceExt,
        });

        const { error: copyError } = await (admin.storage as any)
          .from(avatarsBucket)
          .copy(sourcePath, destinationPath);

        if (!copyError) {
          finalAvatarPath = destinationPath;
          console.log(`[ApplySignup] Copied avatar from ${sourcePath} to ${destinationPath}`);
        } else {
          console.error('[ApplySignup] Error copying avatar to standardized path:', copyError);
          finalAvatarPath = normalizedPath;
        }
      } catch (err) {
        console.error('[ApplySignup] Exception standardizing avatar path:', err);
        finalAvatarPath = normalizedPath;
      }
    } else if (avatarUrl) {
      finalAvatarPath = normalizeAvatarPath(avatarUrl);
    }
    
    if (finalAvatarPath) {
      reviewerUpdates.avatar_url = finalAvatarPath;
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
    
    console.log(`[ApplySignup] Successfully updated profile for user ${userId} with is_reviewer='pending' (awaiting manual approval)`);

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
    console.error('[ApplySignup] Unexpected error:', e);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (e?.message?.includes('duplicate key') || e?.message?.includes('unique constraint')) {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
      statusCode = 400;
    } else if (e?.message?.includes('foreign key') || e?.message?.includes('constraint')) {
      errorMessage = 'Database constraint error. Please try again or contact support.';
      statusCode = 400;
    } else if (e?.message?.includes('network') || e?.message?.includes('timeout')) {
      errorMessage = 'Network error. Please check your connection and try again.';
      statusCode = 500;
    } else if (e?.message?.includes('validation')) {
      errorMessage = 'Invalid data provided. Please check your information and try again.';
      statusCode = 400;
    } else if (e?.message) {
      errorMessage = e.message;
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), { status: statusCode });
  }
}
