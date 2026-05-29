type Variant = 'page' | 'section' | 'hero';

type Props = {
  variant?: Variant;
};

export default function LandingAtmosphere({ variant = 'section' }: Props) {
  if (variant === 'page') {
    return (
      <div className="landing-atmosphere landing-atmosphere--page pointer-events-none" aria-hidden>
        <div className="landing-atmosphere__wash" />
        <div className="landing-atmosphere__orb landing-atmosphere__orb--a" />
        <div className="landing-atmosphere__orb landing-atmosphere__orb--b" />
        <div className="landing-atmosphere__orb landing-atmosphere__orb--c" />
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="landing-atmosphere landing-atmosphere--hero pointer-events-none" aria-hidden>
        <div className="landing-atmosphere__wash landing-atmosphere__wash--hero" />
        <div className="landing-atmosphere__orb landing-atmosphere__orb--hero-a" />
        <div className="landing-atmosphere__orb landing-atmosphere__orb--hero-b" />
      </div>
    );
  }

  return (
    <div className="landing-atmosphere landing-atmosphere--section pointer-events-none" aria-hidden>
      <div className="landing-atmosphere__wash landing-atmosphere__wash--section" />
    </div>
  );
}
