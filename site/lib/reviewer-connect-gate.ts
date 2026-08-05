/**
 * Stripe Connect (onboarding + Express login) is only for **approved** reviewers.
 * Pending applicants complete profile steps first; payouts setup happens after approval.
 */
export function isReviewerApprovedForStripeConnect(raw: unknown): boolean {
  if (typeof raw === 'string') {
    return raw.trim() === 'approved';
  }
  const s = String(raw ?? '').trim();
  if (s === 'approved') return true;
  // Legacy boolean column migrated to text sometimes surfaces as "true"
  if (s.toLowerCase() === 'true') return true;
  return false;
}

/** Platform transfers require the Connect account's transfers capability, not bank payouts. */
export function canReviewerReceivePlatformTransfer(account: {
  capabilities?: { transfers?: string | null } | null;
}): boolean {
  return account.capabilities?.transfers === 'active';
}
