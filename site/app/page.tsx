'use client';

import { useRef, Suspense } from 'react';
import MobileHero from '../components/landing/MobileHero';
import LandingAtmosphere from '../components/landing/LandingAtmosphere';
import HeroAccentPhrase from '../components/landing/HeroAccentPhrase';
import LandingTwoPaths from '../components/landing/LandingTwoPaths';
import LandingStickyCTA from '../components/landing/LandingStickyCTA';
import LandingCTAs from '../components/LandingCTAs';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

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
                    <h1 className="max-w-2xl hyphens-none text-pretty text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl sm:leading-tight xl:text-[2.75rem] xl:leading-tight 2xl:text-5xl 2xl:leading-tight">
                      <span className="[text-wrap:balance]">
                        Get dating profile feedback <HeroAccentPhrase />
                      </span>
                    </h1>

                    <p className="max-w-xl text-lg font-medium leading-relaxed text-white/85 xl:text-xl [text-wrap:balance] hyphens-none">
                      Honest notes from women you&apos;d actually want&nbsp;to&nbsp;date.
                    </p>
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

        {/* Testimonials */}
        <section className="landing-section py-16 lg:py-20">
          <div className="container relative z-10 mx-auto px-4">
            <div className="text-center space-y-12">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                What people are saying
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.12]">
                  <CardContent className="p-8 space-y-5">
                    <p className="text-white text-base leading-relaxed italic">
                      &ldquo;So many guys are close to having solid profiles, they just need honest feedback. Auro makes it easy to help and get paid.&rdquo;
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-white/20 md:h-24 md:w-24">
                        <AvatarImage
                          src="/jenna_headshot.jpg"
                          alt="Jenna - Reviewer"
                          className="object-cover scale-125"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-2xl">J</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-xl md:text-2xl">Jenna</p>
                        <p className="text-sm text-white/80">Reviewer</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.12]">
                  <CardContent className="p-8 space-y-5">
                    <p className="text-white text-base leading-relaxed italic">
                      &ldquo;Sometimes one tweak makes a huge difference in matches. I like that I can give direct feedback and get paid for it.&rdquo;
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-white/20 md:h-24 md:w-24">
                        <AvatarImage
                          src="/katie_headshot.jpg"
                          alt="Katie - Reviewer"
                          className="object-cover scale-y-110 scale-x-100"
                          style={{ objectPosition: 'center 40%' }}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-2xl">K</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-xl md:text-2xl">Katie</p>
                        <p className="text-sm text-white/80">Reviewer</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.12] md:col-span-2 lg:col-span-1">
                  <CardContent className="p-8 space-y-5">
                    <p className="text-white text-base leading-relaxed italic">
                      &ldquo;Booked a review on my lunch break, had specific feedback by the next morning. Moved photo 3 to slot 1 and my match rate jumped that week.&rdquo;
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-white/20 md:h-24 md:w-24">
                        <AvatarFallback className="bg-white/10 text-white font-semibold text-2xl">J</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-xl md:text-2xl">Jordan</p>
                        <p className="text-sm text-white/80">Got reviewed · 27</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

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
                    I review every application personally.
                  </p>
                  <p className="text-lg leading-relaxed text-white/90 [text-wrap:balance] hyphens-none">
                    I built Auro because dating is brutal—especially for guys who want a straight answer from women they&apos;d
                    actually&nbsp;want&nbsp;to&nbsp;date.
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
          object-fit: contain;
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
