import Link from 'next/link';

export default function AppRequestsStubPage() {
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Requests</h1>
      <p style={{ color: '#C7BFD9', lineHeight: 1.6, marginBottom: 20 }}>
        This screen replaces the legacy Expo &quot;Requests&quot; tab. Use the marketing site to start a review flow, or we&apos;ll port your full inbox here next.
      </p>
      <Link href="/request" style={{ color: '#FF2D55', fontWeight: 600 }}>
        Go to web request flow →
      </Link>
      <p style={{ marginTop: 24 }}>
        <Link href="/app" style={{ color: '#C7BFD9' }}>
          ← App home
        </Link>
      </p>
    </div>
  );
}
