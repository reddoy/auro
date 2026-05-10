/**
 * Stripe Connect onboarding mirrors product rules: only pending or approved applicants.
 */
export function isReviewerEligibleForStripeConnect(raw: unknown): boolean {
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s === 'pending' || s === 'approved';
  }
  const s = String(raw ?? '').trim();
  if (s === 'pending' || s === 'approved') return true;
  if (s.toLowerCase() === 'true') return true;
  return false;
}
