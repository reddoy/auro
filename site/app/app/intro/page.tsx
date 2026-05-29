import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function AppIntroPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <BrandMark size="lg" showWordmark={false} href="/app" />
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome to Auro</h1>
        <p className="text-[15px] leading-relaxed text-white/70">
          Sign in to open the app: you&apos;ll land on <span className="font-medium text-white/90">Home</span> with
          your overview, then <span className="font-medium text-white/90">My reviews</span> for your full inbox (web
          only — no app install).
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-sm">
        <Link
          href="/auth/sign-in?redirect_to=/app"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.45)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="py-2 text-center text-sm font-medium text-white/60 underline-offset-4 transition hover:text-white/90 hover:underline"
        >
          Back to marketing site
        </Link>
      </div>
    </div>
  );
}
