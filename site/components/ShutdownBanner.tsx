import { SHUTDOWN_STORY_URL } from '@/lib/shutdown';

export default function ShutdownBanner() {
  return (
    <div className="shutdown-banner" role="status">
      <p>
        <strong>Auro has shut down.</strong> We launched it, but it didn&apos;t take off, and we burned
        out and got bored. Sign-ups and payments are turned off.{' '}
        <a href={SHUTDOWN_STORY_URL} target="_blank" rel="noopener noreferrer">
          Read the story
        </a>
      </p>
    </div>
  );
}
