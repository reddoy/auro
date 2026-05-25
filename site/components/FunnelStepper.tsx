'use client';

export type FunnelStepConfig = {
  id: string;
  short: string;
  label: string;
};

type Props = {
  steps: readonly FunnelStepConfig[];
  currentIndex: number;
  ariaLabel?: string;
  onStepClick?: (index: number) => void;
};

export default function FunnelStepper({
  steps,
  currentIndex,
  ariaLabel = 'Progress',
  onStepClick,
}: Props) {
  const connectorTop = 'top-[22px] sm:top-5';
  const summaryLabel = steps[currentIndex]?.label ?? '';

  return (
    <nav
      className="w-full px-2 sm:px-4 pb-4 pt-2 md:pb-6 md:pt-4 bg-gradient-to-b from-background/55 to-transparent"
      aria-label={ariaLabel}
    >
      <p className="sm:hidden text-center text-[13px] font-semibold tracking-tight text-white/72 tabular-nums mb-3">
        Step {currentIndex + 1} of {steps.length} · {summaryLabel}
      </p>
      <div className="relative flex max-w-6xl mx-auto items-start justify-between gap-0.5 sm:gap-1">
        <div className={`absolute left-3 right-3 sm:left-10 sm:right-10 ${connectorTop} h-px bg-white/12`}>
          <div
            className="h-full bg-gradient-to-r from-primary to-orange-600/95 transition-[width] duration-500 ease-out"
            style={{
              width: `${steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0}%`,
            }}
          />
        </div>
        {steps.map((stepItem, idx) => {
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const isClickable = Boolean(onStepClick && currentIndex > idx);

          const circle = (
            <span
              className={[
                'flex h-[34px] w-[34px] sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs sm:text-[13px] font-semibold tabular-nums transition-all duration-200',
                isCompleted
                  ? 'bg-gradient-to-br from-primary to-orange-700 text-white ring-2 ring-black/35'
                  : isCurrent
                    ? 'bg-primary text-white shadow-md shadow-black/35 ring-2 ring-primary/25'
                    : 'border border-white/15 bg-black/35 text-muted-foreground',
              ].join(' ')}
            >
              {isCompleted ? '\u2713' : stepItem.short}
            </span>
          );

          const label = (
            <span
              className={[
                'hidden sm:block w-full px-0.5 text-xs font-medium text-center tabular-nums leading-snug tracking-normal hyphens-none',
                'line-clamp-2 break-words',
                isCurrent ? 'text-white' : isCompleted ? 'text-white/82' : 'text-muted-foreground/85',
              ].join(' ')}
            >
              {stepItem.label}
            </span>
          );

          if (isClickable) {
            return (
              <button
                key={stepItem.id}
                type="button"
                onClick={() => onStepClick!(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${stepItem.label}, completed. Return to this step`}
                className={[
                  'relative z-10 flex flex-1 flex-col items-center gap-1 min-w-0',
                  'bg-transparent border-0 p-0 cursor-pointer',
                  'touch-manipulation [-webkit-tap-highlight-color:transparent]',
                ].join(' ')}
              >
                {circle}
                {label}
              </button>
            );
          }

          return (
            <div
              key={stepItem.id}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={
                isCurrent
                  ? `${stepItem.label}, current step`
                  : isCompleted
                    ? `${stepItem.label}, completed`
                    : `${stepItem.label}, not started yet`
              }
              className="relative z-10 flex flex-1 flex-col items-center gap-1 min-w-0 opacity-95"
            >
              {circle}
              {label}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
