import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Verify the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Use service role client for admin operations
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from all related tables
    // Note: Many tables have ON DELETE CASCADE, but we explicitly delete to be safe and clear
    // We handle errors for each table separately so one failure doesn't stop the entire process

    const deletionErrors: string[] = [];

    // Delete social accounts
    try {
      await admin.from('social_accounts').delete().eq('user_id', userId);
    } catch (e: any) {
      console.warn('Error deleting social_accounts:', e);
      deletionErrors.push('social_accounts');
    }

    // Delete reviewer reviews (where user is reviewer or reviewee)
    try {
      await admin.from('reviewer_reviews').delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`);
    } catch (e: any) {
      console.warn('Error deleting reviewer_reviews:', e);
      deletionErrors.push('reviewer_reviews');
    }

    // Delete disputes (where user is customer or reviewer)
    try {
      await admin.from('disputes').delete().or(`customer_id.eq.${userId},reviewer_id.eq.${userId}`);
    } catch (e: any) {
      console.warn('Error deleting disputes:', e);
      deletionErrors.push('disputes');
    }

    // Delete requests (where user is the requester)
    // Note: This will cascade to related data via foreign keys
    try {
      await admin.from('requests').delete().eq('user_id', userId);
    } catch (e: any) {
      console.warn('Error deleting requests:', e);
      deletionErrors.push('requests');
    }

    // Delete reviews (where user is author or subject)
    // Check if reviews table exists and has these columns
    try {
      await admin.from('reviews').delete().or(`author_id.eq.${userId},subject_id.eq.${userId}`);
    } catch (e: any) {
      // Reviews table might not exist or have different schema - continue
      console.warn('Could not delete from reviews table:', e);
    }

    // Delete profile (this should cascade to related data if foreign keys are set up)
    try {
      await admin.from('profiles').delete().eq('id', userId);
    } catch (e: any) {
      console.warn('Error deleting profile:', e);
      deletionErrors.push('profiles');
    }

    // Delete auth user (this will also delete the session)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // Note: Storage files (avatars, request media) should be cleaned up separately
    // or via database triggers. For now, we'll rely on Supabase's cleanup policies.

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete account' }, { status: 500 });
  }
}

