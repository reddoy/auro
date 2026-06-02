const GET_REVIEWED_STEPS = [
  'Pick a reviewer',
  'Upload your photos',
  'Get your review',
  'Glow up',
] as const;

const BECOME_REVIEWER_STEPS = [
  'Sign up',
  'Set your rate',
  'Get approved',
  'Start reviewing',
] as const;

function PathCard({
  eyebrow,
  title,
  steps,
}: {
  eyebrow: string;
  title: string;
  steps: readonly string[];
}) {
  return (
    <div className="landing-path-card group flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-8 text-center backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07] md:px-8 md:py-10">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h3 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h3>

      <ol className="m-0 mt-8 w-full max-w-[220px] list-none space-y-5 p-0">
        {steps.map((step, index) => (
          <li key={step} className="flex flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/25">
              {index + 1}
            </span>
            <span className="text-base leading-snug text-white/85">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function LandingTwoPaths() {
  return (
    <section className="landing-section py-16 lg:py-24">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Two ways in.</h2>

          <div className="grid gap-6 md:grid-cols-2 md:gap-5">
            <PathCard eyebrow="For guys" title="Get reviewed" steps={GET_REVIEWED_STEPS} />
            <PathCard eyebrow="For reviewers" title="Start earning" steps={BECOME_REVIEWER_STEPS} />
          </div>
        </div>
      </div>
    </section>
  );
}
