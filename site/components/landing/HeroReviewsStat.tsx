type Props = {
  className?: string;
};

export default function HeroReviewsStat({ className = '' }: Props) {
  return (
    <p
      className={`text-sm font-medium tracking-wide text-white/75 sm:text-base ${className}`.trim()}
      aria-label="Over 250 reviews completed on Auro"
    >
      Over <span className="text-white">250+</span> reviews completed
    </p>
  );
}
