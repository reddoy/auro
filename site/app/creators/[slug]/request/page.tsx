import { redirect } from 'next/navigation';

export default function RequestPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug || '';
  redirect(`/waitlist${slug ? `?creatorSlug=${encodeURIComponent(slug)}` : ''}`);
}
