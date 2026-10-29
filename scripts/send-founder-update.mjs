/**
 * Send the founder follow-up email for a paid review request.
 *
 * Usage:
 *   RESEND_API_KEY=re_... node scripts/send-founder-update.mjs <requestId>
 */
const { createClient } = require('@supabase/supabase-js');

const requestId = process.argv[2] || 'f23ce6fd-d2b6-47e7-8b71-57f9c69101dd';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zxazjbduiistnfstnwka.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

if (!serviceKey || !resendKey) {
  console.error('Need SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://auro-pearl.vercel.app';

function displayName(p) {
  if (!p) return 'your reviewer';
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return full || p.username || 'your reviewer';
}

async function main() {
  const { data: row } = await admin
    .from('requests')
    .select('id, user_id, influencer_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!row) {
    console.error('Request not found');
    process.exit(1);
  }

  const { data: reviewee } = await admin
    .from('profiles')
    .select('email, first_name')
    .eq('id', row.user_id)
    .maybeSingle();
  const { data: reviewer } = await admin
    .from('profiles')
    .select('first_name, last_name, username')
    .eq('id', row.influencer_id)
    .maybeSingle();

  if (!reviewee?.email) {
    console.error('Reviewee email missing');
    process.exit(1);
  }

  const firstName = reviewee.first_name || 'there';
  const reviewerName = displayName(reviewer);
  const requestUrl = `${siteOrigin}/app/requests/review/${requestId}`;

  const text = [
    `Hi ${firstName},`,
    '',
    `I'm RJ — I run Auro. Thanks for signing up.`,
    '',
    `I work with our reviewers directly. I'm talking to ${reviewerName} about your request now.`,
    '',
    `If you have questions, just reply here or email rj@appauro.com.`,
    '',
    'RJ',
    '',
    requestUrl,
  ].join('\n');

  const from =
    process.env.RESEND_FOUNDER_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'RJ from Auro <notifications@appauro.com>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [reviewee.email],
      reply_to: process.env.FOUNDER_REPLY_TO_EMAIL || 'rj@appauro.com',
      subject: 'Re: your Auro request',
      text,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Resend failed:', body);
    process.exit(1);
  }

  console.log('Sent to', reviewee.email, 'id:', body.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
