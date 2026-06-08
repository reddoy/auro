'use client';

import { useRef, Suspense } from 'react';
import MobileHero from '../components/landing/MobileHero';
import LandingAtmosphere from '../components/landing/LandingAtmosphere';
import HeroAccentPhrase from '../components/landing/HeroAccentPhrase';
import HeroReviewsStat from '../components/landing/HeroReviewsStat';
import LandingTwoPaths from '../components/landing/LandingTwoPaths';
import LandingStickyCTA from '../components/landing/LandingStickyCTA';
import LandingCTAs from '../components/LandingCTAs';
import TestimonialsSection from '../components/landing/TestimonialsSection';

export const dynamic = 'force-dynamic';

function HomePageContent() {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="landing-page min-h-screen text-foreground mobile-smooth-scroll">
      <LandingAtmosphere variant="page" />
      <LandingStickyCTA />

      <div className="relative z-10">
        {/* Hero Section */}
        <section
          className="relative min-h-screen overflow-x-hidden overflow-y-hidden lg:overflow-hidden lg:pt-0"
          role="banner"
          aria-label="Hero section"
        >
          <MobileHero />

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-center min-h-screen">
            <div className="container mx-auto px-4 relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-left space-y-8 min-w-0 pr-2 xl:pr-6">
                  <div className="space-y-6">
                    <h1 className="max-w-2xl hyphens-none text-pretty text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl sm:leading-tight lg:text-[2.25rem] lg:leading-tight xl:text-[2.75rem] xl:leading-tight 2xl:text-5xl 2xl:leading-tight">
                      <span className="block lg:whitespace-nowrap">
                        Get dating&nbsp;profile&nbsp;feedback
                      </span>
                      <span className="block">
                        <HeroAccentPhrase />
                      </span>
                    </h1>

                    <p className="max-w-xl text-lg font-medium leading-relaxed text-white/85 xl:text-xl [text-wrap:balance] hyphens-none">
                      Honest notes from women you&apos;d actually want&nbsp;to&nbsp;date.
                    </p>

                    <HeroReviewsStat />
                  </div>

                  <div className="flex flex-col items-start pt-1">
                    <LandingCTAs variant="hero" />
                  </div>
                </div>

                <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="relative">
                    <div className="landing-phone-shadow" />
                    <div className="desktop-iphone-frame">
                      <video
                        ref={desktopVideoRef}
                        className="desktop-iphone-video"
                        src="/katie_henry_review.mov"
                        autoPlay
                        playsInline
                        muted
                        loop
                        onClick={() => {
                          const video = desktopVideoRef.current;
                          if (video) video.muted = !video.muted;
                        }}
                        aria-label="Demo video showing how a sample review works"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LandingTwoPaths />

        <TestimonialsSection />

        {/* Founder */}
        <section className="landing-section landing-founder py-12 lg:py-20">
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
                <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10 md:h-40 md:w-40">
                  <img
                    src="/rohan-headshot-backyard-min.jpg"
                    alt="RJ, founder of Auro"
                    className="h-full w-full object-cover object-[center_20%]"
                    loading="lazy"
                    width={160}
                    height={160}
                  />
                </div>

                <div className="min-w-0 space-y-3 text-center md:flex-1 md:text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-white [text-wrap:balance] md:text-3xl">
                    From the founder
                  </h2>
                  <p className="text-lg leading-relaxed text-white/90 [text-wrap:balance] hyphens-none">
                    On dating apps, you rarely know why you&apos;re getting swiped left. I built Auro to help guys level up
                    their dating game with honest feedback from real women.
                  </p>
                  <p className="text-lg leading-relaxed text-white/90 [text-wrap:balance] hyphens-none">
                    I personally review every reviewer application to make sure they&apos;re a great fit for the platform
                    and our community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .desktop-iphone-frame {
          position: relative;
          width: 300px;
          max-width: 100%;
          aspect-ratio: 9 / 19.5;
          border: 8px solid #000;
          border-radius: 30px;
          background: #000;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
          margin: 0 auto;
        }

        .desktop-iphone-frame::before {
          content: '';
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 24px;
          background: #000;
          border-radius: 16px;
          z-index: 2;
        }

        .desktop-iphone-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          border-radius: 22px;
        }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
