/**
 * Single source of truth for the Auro platform / reviewer revenue split.
 *
 * The 20% platform fee is captured via the escrow model: the platform charges
 * the customer the full price, holds it, and transfers only the reviewer share
 * (80%) on review completion. The fee is therefore never a Stripe application
 * fee object in the default path — it is the amount the platform never transfers
 * out. Both the checkout (fee computation) and the payout (reviewer share) must
 * derive from these same constants so the split can never silently drift.
 */

export const PLATFORM_FEE_BPS = 2000;
export const REVIEWER_SHARE_BPS = 10000 - PLATFORM_FEE_BPS;

/**
 * Minimum cents that must always be left for the reviewer, so a rounding or
 * pricing edge case can never resolve the reviewer's cut to zero.
 */
export const MIN_REVIEWER_CENTS = 50;

/**
 * Platform fee (in cents) for a given customer price.
 *
 * Floors the raw percentage and caps it so the reviewer always keeps at least
 * MIN_REVIEWER_CENTS. This centralizes the cap that previously lived inline in
 * create-session (`Math.min(fee, price - 50)`).
 */
export function computePlatformFeeCents(priceCents: number): number {
  const price = Math.max(0, Math.floor(priceCents));
  const rawFee = Math.floor((price * PLATFORM_FEE_BPS) / 10000);
  return Math.min(rawFee, Math.max(0, price - MIN_REVIEWER_CENTS));
}

/**
 * Reviewer amount (in cents) for a given customer price: the remainder after
 * the platform fee. Uses the fee cap above so the two always sum to `priceCents`.
 */
export function computeReviewerAmountCents(priceCents: number): number {
  const price = Math.max(0, Math.floor(priceCents));
  return price - computePlatformFeeCents(price);
}

/**
 * Fail-closed invariant. Throws when a computed platform fee would give away the
 * cut — either because it is non-positive or because the resulting reviewer
 * share would exceed the intended 80%. Callers should treat a throw as a hard
 * stop (do not create the charge / transfer) and alert.
 */
export function assertFeeInvariant(priceCents: number, feeCents: number): void {
  const price = Math.floor(priceCents);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for fee invariant: priceCents=${priceCents}`);
  }
  if (!Number.isFinite(feeCents) || feeCents <= 0) {
    throw new Error(
      `Platform fee resolved to a non-positive value: feeCents=${feeCents}, priceCents=${price}`
    );
  }
  const reviewerShare = price - feeCents;
  const maxReviewerShare = Math.floor((price * REVIEWER_SHARE_BPS) / 10000);
  if (reviewerShare > maxReviewerShare) {
    throw new Error(
      `Reviewer share ${reviewerShare} exceeds the allowed ${maxReviewerShare} ` +
        `(${REVIEWER_SHARE_BPS} bps) for priceCents=${price}; platform fee too low.`
    );
  }
}
