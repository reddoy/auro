/** Build a display name from profile fields (profiles use first_name/last_name, not full_name). */
export function profileDisplayName(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null | undefined
): string | null {
  if (!profile) return null;
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return name || profile.username || null;
}
