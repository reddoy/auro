import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { sendProductEmail } from '../lib/notifications/send-product-email';
import type { ProductNotificationType } from '../lib/notifications/types';

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const PREVIEW_TO = process.argv[2] || process.env.PREVIEW_EMAIL_TO;

if (!PREVIEW_TO) {
  console.error('Usage: PREVIEW_EMAIL_TO=you@example.com npx tsx scripts/preview-lifecycle-emails.ts');
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is required');
  process.exit(1);
}

const sampleRequestId = '00000000-0000-4000-8000-000000000001';
const sampleData = {
  requestId: sampleRequestId,
  reviewerName: 'Katie',
  revieweeName: 'Alex',
  recipientFirstName: 'Rohan',
  amount: '$49.99',
};

const lifecycleTypes: ProductNotificationType[] = [
  'payment_receipt_reviewee',
  'request_paid_reviewer',
  'request_accepted_reviewee',
  'review_completed_reviewee',
];

async function main() {
  for (const type of lifecycleTypes) {
    const result = await sendProductEmail({
      to: PREVIEW_TO,
      type,
      data: sampleData,
    });

    if (!result.ok) {
      console.error(`Failed ${type}:`, result.error, result.skipped ? '(skipped)' : '');
      process.exit(1);
    }

    console.log(`Sent ${type} → ${PREVIEW_TO} (${result.id})`);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log('Done — check your inbox (and spam) for 4 emails.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
