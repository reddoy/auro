import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phoneNumber, source, userId, email, fullName } = body || {};

    const normalizedEmail = normalizeEmail(email);
    const normalizedUserId = typeof userId === 'string' && userId.trim() ? userId.trim() : null;
    const normalizedFullName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;
    const hasPhoneInput = typeof phoneNumber === 'string' && phoneNumber.trim().length > 0;

    if (!hasPhoneInput && !normalizedEmail && !normalizedUserId) {
      return NextResponse.json(
        { error: 'Provide at least one of phone number, email, or user id' },
        { status: 400 }
      );
    }

    const normalizedPhone = hasPhoneInput ? String(phoneNumber).trim() : null;
    const cleanPhone = normalizedPhone ? normalizedPhone.replace(/\D/g, '') : '';
    if (normalizedPhone && cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!url || !key) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);

    let existing: { id: string; phone_number: string | null; email: string | null; user_id: string | null } | null = null;

    if (normalizedUserId) {
      const { data } = await supabase
        .from('reviewee_waitlist')
        .select('id, phone_number, email, user_id')
        .eq('user_id', normalizedUserId)
        .maybeSingle();
      existing = data ?? null;
    }

    if (!existing && normalizedEmail) {
      const { data } = await supabase
        .from('reviewee_waitlist')
        .select('id, phone_number, email, user_id')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (normalizedPhone && !existing.phone_number) updates.phone_number = normalizedPhone;
      if (normalizedEmail && !existing.email) updates.email = normalizedEmail;
      if (normalizedUserId && !existing.user_id) updates.user_id = normalizedUserId;
      if (normalizedFullName) updates.full_name = normalizedFullName;
      if (normalizedPhone) updates.sms_opt_in = true;
      if (source) updates.source = source;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('reviewee_waitlist')
          .update(updates)
          .eq('id', existing.id);
        if (updateError) {
          console.error('Waitlist update error:', updateError);
          return NextResponse.json({ error: 'Failed to update waitlist entry' }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        message: normalizedPhone ? 'Phone number saved for SMS updates.' : 'Already on the waitlist.',
      });
    }

    const payload = {
      phone_number: normalizedPhone,
      email: normalizedEmail,
      user_id: normalizedUserId,
      full_name: normalizedFullName,
      sms_opt_in: Boolean(normalizedPhone),
      source: source || 'homepage',
    };

    const { error } = await supabase.from('reviewee_waitlist').insert(payload);

    if (error) {
      if (error.code === '23505') {
        const constraint = String((error as any)?.constraint || '');
        if (constraint.includes('unique_phone')) {
          return NextResponse.json({ error: 'This phone number is already on the waitlist!' }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          alreadyJoined: true,
          message: 'Already on the waitlist.',
        });
      }

      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: normalizedPhone
        ? 'Successfully joined the waitlist and enabled SMS updates!'
        : 'Successfully joined the waitlist!',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Waitlist API error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

