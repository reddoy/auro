import Link from 'next/link';

type Props = {
  params: { slug?: string[] };
};

export default function OnboardingMigrationStubPage({ params }: Props) {
  const path = params.slug?.length ? params.slug.join('/') : '';
  const title = path ? `Onboarding: ${path}` : 'Onboarding';

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{title}</h1>
      <p style={{ color: '#C7BFD9', lineHeight: 1.6, marginBottom: 16 }}>
        This onboarding step is being rebuilt for web. You can continue using account settings on the marketing site where flows already exist, or check back after the next migration pass.
      </p>
      <ul style={{ color: '#C7BFD9', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
        <li>
          <Link href="/reviewers/apply" style={{ color: '#FF6F00' }}>
            Reviewer application
          </Link>
        </li>
        <li>
          <Link href="/request" style={{ color: '#FF6F00' }}>
            Request a review
          </Link>
        </li>
      </ul>
      <Link href="/app/requests" style={{ color: '#FF2D55', fontWeight: 600 }}>
        ← Back to requests hub
      </Link>
    </div>
  );
}
