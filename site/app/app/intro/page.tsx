import Link from 'next/link';

export default function AppIntroPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        gap: 20,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Welcome to Auro</h1>
      <p style={{ color: '#C7BFD9', maxWidth: 360, lineHeight: 1.5 }}>
        Sign in to open your inbox: after you sign in you&apos;ll land on <strong>My reviews</strong> with the same request list as before (web only — no app install).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        <Link
          href="/auth/magic-link"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #FF6F00, #FF2D55)',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
        <Link href="/" style={{ color: '#C7BFD9', alignSelf: 'center', textDecoration: 'underline' }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
