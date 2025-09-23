export default function ContactPage() {
  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <h1 className="section-title" style={{ marginBottom: 16 }}>Contact</h1>
      <p style={{ color: 'var(--text-2)', maxWidth: 800 }}>
        Questions or feedback? Email us at{' '}
        <a href="mailto:support@auro.app" style={{ color: 'var(--text)' }}>support@auro.app</a>.
      </p>
    </main>
  );
}


