type Props = {
  className?: string;
};

export default function HeroReviewsStat({ className = '' }: Props) {
  return (
    <p
      className={`hero-reviews-stat ${className}`.trim()}
      aria-label="Over 250 reviews completed on Auro"
    >
      <span className="hero-reviews-stat__star" aria-hidden="true">
        ⭐
      </span>{' '}
      Over{' '}
      <span className="hero-reviews-stat__number">250+</span> reviews completed
    </p>
  );
}
