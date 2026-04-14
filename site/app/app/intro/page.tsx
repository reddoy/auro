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
      <p style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 360, lineHeight: 1.5 }}>
        Sign in to open the app: you&apos;ll land on <strong>Home</strong> with your overview, then <strong>My reviews</strong> for your full inbox (web only — no app install).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        <Link
          href="/auth/sign-in?redirect_to=/app"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            borderRadius: 999,
            background: '#F26955',
            color: '#1A0B2E',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.72)', alignSelf: 'center', textDecoration: 'underline' }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
