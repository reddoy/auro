export const SHUTDOWN_STORY_URL = 'https://github.com/reddoy/auro#background';

/** Pages that need an account or take payment. They redirect home now that Auro is shut down. */
const CLOSED_PAGE_PREFIXES = [
  '/request',
  '/checkout',
  '/auth',
  '/reviewers/apply',
  '/waitlist',
  '/app',
  '/admin',
  '/internal',
];

export function isClosedPage(pathname: string): boolean {
  return (
    pathname.endsWith('/request') ||
    CLOSED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}
