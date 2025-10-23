import Stripe from 'stripe';

export async function GET() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }

    const stripe = new Stripe(secret);
    
    // List all connected accounts
    const accounts = await stripe.accounts.list({
      limit: 100,
    });

    const accountDetails = accounts.data.map(account => ({
      id: account.id,
      type: account.type,
      country: account.country,
      email: account.email,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      created: account.created,
      // Only include safe fields, not sensitive data
    }));

    return new Response(JSON.stringify({
      success: true,
      count: accounts.data.length,
      accounts: accountDetails,
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error checking connect accounts:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to check accounts',
      message: error.message 
    }), { status: 500 });
  }
}
