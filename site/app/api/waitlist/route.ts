import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Simple endpoint to add phone numbers to reviewee waitlist
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phoneNumber, source } = body || {};

    // Basic validation
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Simple phone validation - just check it has some numbers
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    // Initialize Supabase with service role key
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);

    // Insert into waitlist (duplicate phone numbers will be caught by unique constraint)
    const { error } = await supabase
      .from('reviewee_waitlist')
      .insert({
        phone_number: phoneNumber,
        source: source || 'homepage'
      });

    if (error) {
      // Check if it's a duplicate phone number error
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'This phone number is already on the waitlist!' 
        }, { status: 400 });
      }
      
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the waitlist!' 
    });

  } catch (e: any) {
    console.error('Waitlist API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Unknown error' 
    }, { status: 500 });
  }
}

