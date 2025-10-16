import { redirect } from 'next/navigation';

export default async function CreatorPage({ params }: { params: { slug: string } }) {
  // Redirect all /creators/[slug] to /[username]
  redirect(`/${params.slug}`);
}
