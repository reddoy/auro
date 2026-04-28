import { redirect } from 'next/navigation';

export default function CreatorRequestPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug || '';
  redirect(`/request${slug ? `?creatorSlug=${encodeURIComponent(slug)}` : ''}`);
}


