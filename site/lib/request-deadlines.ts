/** Reviewer must submit within this window after accepting (also used in terms, emails, UI). */
export const REVIEW_DELIVER_WINDOW_MS = 72 * 60 * 60 * 1000;

export const REVIEW_DELIVER_WINDOW_HOURS = 72;

export const REVIEW_DELIVER_WINDOW_LABEL = '72 hours';

/** Absolute payment-age fallback: accept window (14d) + deliver window (72h). */
export const REVIEW_ABSOLUTE_TIMEOUT_DAYS = 17;
