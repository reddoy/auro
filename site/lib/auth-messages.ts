/** Shown when Supabase throttles signup / auth emails (e.g. over_email_send_rate_limit). */
export const AUTH_EMAIL_RATE_LIMIT_MESSAGE =
  "Hey, we see you've been trying to create a lot of accounts in quick succession. Please give it a few minutes before trying again.";

export function isAuthEmailRateLimitError(error: unknown): boolean {
  const e = error as { status?: number; code?: string; message?: string };
  const msg = String(e?.message ?? "").toLowerCase();
  const code = String(e?.code ?? "").toLowerCase();
  return (
    e?.status === 429 ||
    code.includes("rate_limit") ||
    code.includes("too_many") ||
    msg.includes("rate limit") ||
    msg.includes("email rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("too many requests")
  );
}
