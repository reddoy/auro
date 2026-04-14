import { getSupabaseAdmin, parseBearerToken, verifyAdminAccess } from '@/lib/admin-server';

export async function GET(req: Request) {
  try {
    const token = parseBearerToken(req);

    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }

    const session = await verifyAdminAccess(admin, token);

    if (!session) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          message: 'You do not have permission to access this page',
        }),
        { status: 403 }
      );
    }

    return new Response(
      JSON.stringify({
        authorized: true,
        email: session.email,
        userId: session.userId,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check access';
    console.error('Access check error:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

// POST endpoint for email and password-based access (legacy; used by some admin UIs)
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
    }

    const authorizedEmails = (process.env.MASTER_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (authorizedEmails.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Email authorization not configured',
          message: 'Please set MASTER_ADMIN_EMAILS in environment variables',
        }),
        { status: 500 }
      );
    }

    if (!authorizedEmails.includes(String(email).toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email',
          message: 'Access denied',
        }),
        { status: 403 }
      );
    }

    const adminPassword = process.env.CHEESEWAFFLE || '';

    if (!adminPassword) {
      return new Response(
        JSON.stringify({
          error: 'Password not configured',
          message: 'Please set CHEESEWAFFLE in environment variables',
        }),
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return new Response(
        JSON.stringify({
          error: 'Invalid password',
          message: 'Access denied',
        }),
        { status: 403 }
      );
    }

    return new Response(
      JSON.stringify({
        authorized: true,
        message: 'Access granted',
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check credentials';
    console.error('Access check error:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
