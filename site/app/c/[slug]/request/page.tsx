import { redirect } from 'next/navigation';

export default function CreatorRequestPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug || '';
  redirect(`/waitlist${slug ? `?creatorSlug=${encodeURIComponent(slug)}` : ''}`);
}


