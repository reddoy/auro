/**
 * Helper function to get display name from first_name and last_name
 */
export function getDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
  fallback: string = 'User'
): string {
  const parts: string[] = [];
  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);
  
  if (parts.length > 0) {
    return parts.join(' ');
  }
  
  return username || fallback;
}

/**
 * Helper function to get full name from first_name and last_name
 */
export function getFullName(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const parts: string[] = [];
  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);
  
  return parts.length > 0 ? parts.join(' ') : null;
}

