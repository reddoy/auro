import Link from 'next/link';

export type BrandMarkSize = 'md' | 'lg';

type Props = {
  size?: BrandMarkSize;
  showWordmark?: boolean;
  href?: string;
  className?: string;
};

export default function BrandMark({
  size = 'md',
  showWordmark = true,
  href = '/',
  className = '',
}: Props) {
  const sizeClass = size === 'lg' ? 'brand-mark--lg' : 'brand-mark--md';

  return (
    <Link
      href={href}
      className={`brand-mark ${sizeClass} ${className}`.trim()}
      aria-label="Auro Home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static mark; crisp sizing without image optimizer */}
      <img
        src="/auro_aura_logo.png"
        alt=""
        width={size === 'lg' ? 48 : 40}
        height={size === 'lg' ? 48 : 40}
        decoding="async"
        className="brand-mark__img shrink-0 object-contain"
        aria-hidden
      />
      {showWordmark ? <span className="brand-mark__name">Auro</span> : null}
    </Link>
  );
}
