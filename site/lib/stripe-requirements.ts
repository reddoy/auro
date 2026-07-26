import type Stripe from 'stripe';

/**
 * Translates Stripe Connect `account.requirements` into a reviewer-friendly summary.
 *
 * Stripe reports the exact fields it's still waiting on (identity docs, bank account, etc.).
 * We surface those on the profile page so a reviewer knows precisely what to finish in Stripe,
 * instead of a generic "finish setup" message.
 */

export interface OutstandingRequirement {
  /** Raw Stripe requirement key, e.g. `individual.verification.document`. */
  code: string;
  /** Reviewer-friendly label. */
  label: string;
  /** Past-due items are more urgent than merely currently-due ones. */
  pastDue: boolean;
}

export interface RequirementError {
  requirement: string;
  reason: string;
}

export interface AccountRequirementsSummary {
  outstanding: OutstandingRequirement[];
  /** Stripe is actively reviewing submitted info — nothing for the reviewer to do right now. */
  pendingVerification: boolean;
  /** Humanized `requirements.disabled_reason`, or null when payouts aren't blocked for this reason. */
  disabledReason: string | null;
  errors: RequirementError[];
  /**
   * True when an outstanding item is sensitive identity/tax info (SSN, DOB, ID doc).
   * Used to surface a trust note reassuring reviewers that Stripe (not Auro) collects it.
   */
  requiresIdentityInfo: boolean;
}

/**
 * Plain-language copy for common Stripe requirement keys. Anything not listed here
 * falls back to {@link humanizeKey}.
 */
const REQUIREMENT_LABELS: Record<string, string> = {
  external_account: 'Add a bank account or debit card for payouts',
  'individual.verification.document': 'Upload a photo ID',
  'individual.verification.additional_document': 'Upload an additional ID document',
  'individual.id_number': 'Government ID / SSN',
  'individual.ssn_last_4': 'Last 4 digits of your SSN',
  'individual.first_name': 'Legal name',
  'individual.last_name': 'Legal name',
  'individual.email': 'Email address',
  'individual.phone': 'Phone number',
  'individual.political_exposure': 'Confirm political exposure status',
  'tos_acceptance.date': "Accept Stripe's terms of service",
  'tos_acceptance.ip': "Accept Stripe's terms of service",
  'business_profile.url': 'Business website or profile details',
  'business_profile.mcc': 'Business category',
  'business_profile.product_description': 'Describe what you do',
};

/** Prefix-based labels so we can collapse groups of related keys into one item. */
const REQUIREMENT_PREFIX_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: 'individual.dob', label: 'Date of birth' },
  { prefix: 'individual.address', label: 'Home address' },
  { prefix: 'individual.verification', label: 'Identity verification' },
];

/** Requirement keys that ask for sensitive identity/tax info reviewers tend to hesitate over. */
const IDENTITY_REQUIREMENT_PREFIXES = [
  'individual.verification',
  'individual.dob',
  'individual.id_number',
  'individual.ssn_last_4',
];

function isIdentityRequirement(code: string): boolean {
  return IDENTITY_REQUIREMENT_PREFIXES.some(
    (prefix) => code === prefix || code.startsWith(`${prefix}.`)
  );
}

/** Humanized copy for `requirements.disabled_reason` values Stripe can return. */
const DISABLED_REASON_LABELS: Record<string, string> = {
  'requirements.past_due': 'Some required information is past due.',
  'requirements.pending_verification': 'Stripe is verifying the details you submitted.',
  'listed': 'This account is under review by Stripe.',
  'under_review': 'This account is under review by Stripe.',
  'other': 'Stripe needs more information before enabling payouts.',
  'rejected.fraud': 'Stripe rejected this account for suspected fraud.',
  'rejected.terms_of_service': "Stripe rejected this account for a terms-of-service issue.",
  'rejected.listed': 'Stripe rejected this account.',
  'rejected.other': 'Stripe rejected this account.',
  'platform_paused': 'Payouts are paused.',
};

/** Turns a raw requirement key like `individual.dob.day` into "Individual dob day". */
export function humanizeKey(code: string): string {
  const cleaned = code
    .replace(/[._]/g, ' ')
    .replace(/\b(id)\b/gi, 'ID')
    .trim();
  if (cleaned.length === 0) return code;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function labelForRequirement(code: string): string {
  const exact = REQUIREMENT_LABELS[code];
  if (exact) return exact;
  for (const { prefix, label } of REQUIREMENT_PREFIX_LABELS) {
    if (code === prefix || code.startsWith(`${prefix}.`)) return label;
  }
  return humanizeKey(code);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function summarizeAccountRequirements(acct: Stripe.Account): AccountRequirementsSummary {
  const requirements = acct.requirements ?? null;

  const pastDue = toStringArray(requirements?.past_due);
  const currentlyDue = toStringArray(requirements?.currently_due);
  const pendingVerificationList = toStringArray(requirements?.pending_verification);

  const pastDueSet = new Set(pastDue);
  // Union of past-due + currently-due, collapsed to one item per friendly label so the
  // reviewer doesn't see "Date of birth" three times (dob.day/month/year).
  const orderedCodes = [...pastDue, ...currentlyDue];
  const byLabel = new Map<string, OutstandingRequirement>();
  for (const code of orderedCodes) {
    const label = labelForRequirement(code);
    const existing = byLabel.get(label);
    const isPastDue = pastDueSet.has(code);
    if (existing) {
      existing.pastDue = existing.pastDue || isPastDue;
    } else {
      byLabel.set(label, { code, label, pastDue: isPastDue });
    }
  }

  const rawDisabledReason =
    typeof requirements?.disabled_reason === 'string' ? requirements.disabled_reason.trim() : '';
  const disabledReason = rawDisabledReason
    ? DISABLED_REASON_LABELS[rawDisabledReason] ?? humanizeKey(rawDisabledReason)
    : null;

  const errors: RequirementError[] = Array.isArray(requirements?.errors)
    ? requirements.errors
        .map((e) => ({
          requirement: typeof e?.requirement === 'string' ? e.requirement : '',
          reason: typeof e?.reason === 'string' ? e.reason : '',
        }))
        .filter((e) => e.reason.length > 0)
    : [];

  return {
    outstanding: [...byLabel.values()],
    pendingVerification: pendingVerificationList.length > 0,
    disabledReason,
    errors,
    requiresIdentityInfo: orderedCodes.some(isIdentityRequirement),
  };
}
