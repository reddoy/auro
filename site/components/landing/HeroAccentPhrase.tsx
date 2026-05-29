import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
};

export default function HeroAccentPhrase({ children = 'from real women' }: Props) {
  return (
    <span className="hero-accent-phrase relative inline-block">
      {children}
    </span>
  );
}
