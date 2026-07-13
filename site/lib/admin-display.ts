type NameFields = {
  id: string;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function formatDisplayName(p: NameFields): string {
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean) as string[];
  if (parts.length) {
    return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  if (p.username?.trim()) return p.username.trim();
  if (p.email?.trim()) return p.email.split('@')[0] || p.email;
  return p.id.slice(0, 8);
}

export function extractPhone(preferences: unknown): string | null {
  if (!preferences || typeof preferences !== 'object') return null;
  const phone = (preferences as Record<string, unknown>).phone;
  return typeof phone === 'string' && phone.trim() ? phone.trim() : null;
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_PREFIX_PATTERN = /^[0-9a-f-]{8,}$/i;

export function isUuidSearch(q: string): boolean {
  const trimmed = q.trim();
  return UUID_PATTERN.test(trimmed) || (trimmed.length >= 8 && UUID_PREFIX_PATTERN.test(trimmed));
}
