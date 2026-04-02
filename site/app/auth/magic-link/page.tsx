import { redirect } from 'next/navigation';

/** Legacy URL: passwordless sign-in was removed; send users to email/password + OAuth. */
export default function MagicLinkRedirectPage() {
  redirect('/auth/sign-in');
}
