import ReviewRequestClient from '../review-request-client';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <ReviewRequestClient id={params.id} />;
}
