import ReviewerRequestClient from '../reviewer-request-client';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <ReviewerRequestClient id={params.id} />;
}
