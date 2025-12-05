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
    
    // Verify user and get their email
    let userEmail: string | null = null;
    let userId: string | null = null;
    
    try {
      const { data: u, error: authError } = await admin.auth.getUser(token);
      if (authError || !u?.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication token' }), { status: 401 });
      }
      userEmail = u.user.email || null;
      userId = u.user.id;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
    }

    // Check if user is admin via environment variable
    // Master admin email(s) stored in environment variable (comma-separated)
    const masterAdminEmails = (process.env.MASTER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const masterAdminUserIds = (process.env.MASTER_ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

    const isAdmin = 
      (userEmail && masterAdminEmails.includes(userEmail.toLowerCase())) ||
      (userId && masterAdminUserIds.includes(userId));

    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Access denied',
        message: 'You do not have permission to access this page'
      }), { status: 403 });
    }

    return new Response(JSON.stringify({ 
      authorized: true,
      email: userEmail,
      userId: userId
    }), { status: 200 });

  } catch (error: any) {
    console.error('Admin access check error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to check admin access'
    }), { status: 500 });
  }
}

