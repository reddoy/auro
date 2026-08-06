import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildProductEmailMessage } from '../lib/notifications/email-messages';
import type { ProductNotificationType } from '../lib/notifications/types';

const outDir = resolve(process.cwd(), 'email-previews');
mkdirSync(outDir, { recursive: true });

const sampleData = {
  requestId: '00000000-0000-4000-8000-000000000001',
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

for (const type of lifecycleTypes) {
  const message = buildProductEmailMessage(type, sampleData);
  const file = resolve(outDir, `${type}.html`);
  writeFileSync(file, message.html, 'utf8');
  console.log('Wrote', file);
}

console.log('\nOpen the HTML files in email-previews/ in your browser.');
