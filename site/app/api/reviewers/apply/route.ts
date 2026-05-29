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
      firstName,
      lastName,
      email,
    } = body || {};

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
          first_name: userFullName?.split(' ')[0] || null,
          last_name: userFullName?.split(' ').slice(1).join(' ') || null,
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
      .select('is_reviewer, first_name, last_name, email')
      .eq('id', userId)
      .single();
    
    if (existingProfile?.is_reviewer === 'pending' || existingProfile?.is_reviewer === 'approved') {
      return new Response(JSON.stringify({ 
        error: 'You have already completed the reviewer application. An account with this email is already associated with our platform.' 
      }), { status: 400 });
    }

    // Now update ONLY reviewer-specific fields - don't touch core profile data
    // IMPORTANT: Only update fields that were explicitly provided to avoid overwriting existing data
    const reviewerUpdates: any = {
      is_reviewer: 'pending',
    };

    console.log(`[Apply] Setting is_reviewer='pending' for user ${userId}`);
    
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
          firstName: firstName || existingProfile?.first_name,
          lastName: lastName || existingProfile?.last_name,
          ownerId: userId,
          ownerEmail: email || existingProfile?.email,
          ext: sourceExt,
        });

        const { error: copyError } = await (admin.storage as any)
          .from(avatarsBucket)
          .copy(sourcePath, destinationPath);

        if (!copyError) {
          finalAvatarPath = destinationPath;
          console.log(`[Apply] Copied avatar from ${sourcePath} to ${destinationPath}`);
        } else {
          console.error('[Apply] Error copying avatar to standardized path:', copyError);
          finalAvatarPath = normalizedPath;
        }
      } catch (err) {
        console.error('[Apply] Exception standardizing avatar path:', err);
        finalAvatarPath = normalizedPath;
      }
    } else if (avatarUrl) {
      finalAvatarPath = normalizeAvatarPath(avatarUrl);
    }
    
    if (finalAvatarPath) {
      reviewerUpdates.avatar_url = finalAvatarPath;
    }
    // If neither avatarPath nor avatarUrl, don't include avatar_url in update
    
    // Store contact/marketing consent in preferences JSON
    // Merge with existing preferences to not lose other data
    const normalizedPhone =
      typeof phone === 'string' && phone.replace(/\D/g, '').length >= 10 ? phone.trim() : null;
    reviewerUpdates.preferences = {
      marketing_consent: !!marketingConsent,
      phone: normalizedPhone,
      email_notifications: true,
      sms_notifications: !!normalizedPhone,
    };

    const { error: upErr } = await admin.from('profiles').update(reviewerUpdates).eq('id', userId);
    if (upErr) {
      console.error('Profile update error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), { status: 400 });
    }
    
    console.log(`[Apply] Successfully updated profile for user ${userId} with is_reviewer='pending'`);

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


