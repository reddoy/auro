/**
 * Maps Expo Router paths (from resolveOnboardingDestination, etc.) to Next.js /app/* URLs.
 */
export function mapExpoRouterPathToNext(expoPath: string): string {
  const trimmed = expoPath.startsWith('/') ? expoPath.slice(1) : expoPath;
  if (trimmed.startsWith('(tabs)/')) {
    return '/app/' + trimmed.slice('(tabs)/'.length);
  }
  return '/app/' + trimmed;
}
