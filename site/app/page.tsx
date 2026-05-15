'use client';

import { useEffect, useRef, Suspense } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ArrowRight, Sparkles, DollarSign, Clock, TrendingUp, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** Match gradient + glass-outline CTAs used in cards below (e.g. Get Reviewed). */
const LANDING_CTA_PRIMARY =
  'group w-full sm:w-auto text-lg px-8 py-4 font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300';
const LANDING_CTA_SECONDARY =
  'group w-full sm:w-auto text-lg px-8 py-4 font-semibold border-white/20 bg-white/[0.06] text-white shadow-lg transition-all duration-300 hover:bg-white/[0.12] hover:text-white focus-visible:ring-white/30';

function HomePageContent() {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const desktopOverlayRef = useRef<HTMLAnchorElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const mobileOverlayRef = useRef<HTMLAnchorElement>(null);

  // Video handling for desktop
  useEffect(() => {
    const video = desktopVideoRef.current;
    const overlay = desktopOverlayRef.current;

    if (!video || !overlay) return;

    const handleVideoEnd = () => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        video.currentTime = 0;
        video.play();
      }, 5000);
    };

    const handleVideoClick = (e: MouseEvent) => {
      // Only toggle mute if clicking video, not overlay
      if (e.target === video) {
        video.muted = !video.muted;
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('click', handleVideoClick);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('click', handleVideoClick);
    };
  }, []);

  // Video handling for mobile
  useEffect(() => {
    const video = mobileVideoRef.current;
    const overlay = mobileOverlayRef.current;

    if (!video || !overlay) return;

    const handleVideoEnd = () => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        video.currentTime = 0;
        video.play();
      }, 5000);
    };

    const handleVideoClick = (e: MouseEvent) => {
      // Only toggle mute if clicking video, not overlay
      if (e.target === video) {
        video.muted = !video.muted;
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('click', handleVideoClick);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('click', handleVideoClick);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground mobile-smooth-scroll">
      {/* Hero Section */}
      <section
        className="relative min-h-screen overflow-x-hidden overflow-y-visible pt-16 lg:overflow-hidden lg:pt-0"
        role="banner"
        aria-label="Hero section"
      >
        {/* Clean Background */}
        <div className="absolute inset-0 bg-background" />
        
        {/* Mobile Background Gradient */}
        <div className="absolute inset-0 bg-background/95 lg:hidden" />
        
        
        {/* Hero Content - Mobile Only */}
        <div className="container mx-auto px-4 relative z-10 pt-8 pb-14 sm:pt-10 lg:hidden">
          <div className="text-center space-y-7 mobile-hero-content w-full sm:space-y-8">
              {/* Removed redundant badge to save space and reduce clutter */}
              
              {/* Headline + sub: generous leading so descenders never collide; CTAs before checklist to match desktop rhythm */}
              <div className="space-y-6">
                <h1
                  className="text-3xl font-bold leading-tight text-center tracking-[-0.02em] text-white [text-wrap:balance] hyphens-none max-w-lg px-3 mobile-text-reveal min-[400px]:text-4xl sm:text-5xl sm:leading-tight"
                  style={{ animationDelay: '0.4s' }}
                >
                  <span className="[text-wrap:balance]">
                    Get dating profile feedback{' '}
                    <span className="text-white/95">from real women</span>
                  </span>
                </h1>

                <p
                  className="mx-auto max-w-lg px-4 text-lg font-medium leading-relaxed text-white/85 mobile-text-reveal text-pretty sm:text-xl"
                  style={{ animationDelay: '1s' }}
                >
                  Book profile feedback now or apply as a reviewer today.
                </p>
              </div>

              {/* CTA Buttons - both core paths */}
              <div
                className="mx-auto flex w-full max-w-sm flex-col items-stretch justify-center gap-3 px-4 mobile-text-reveal sm:max-w-none sm:flex-row sm:justify-center"
                style={{ animationDelay: '1.1s' }}
              >
                <Button size="xl" variant="gradient" className={LANDING_CTA_PRIMARY} asChild>
                  <a
                    href="/reviewers/apply"
                    className="flex items-center justify-center gap-2"
                    aria-label="Apply to become a reviewer"
                  >
                    <span className="truncate">Become a Reviewer</span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                </Button>
                <Button size="xl" variant="outline" className={LANDING_CTA_SECONDARY} asChild>
                  <a
                    href="/request"
                    className="flex items-center justify-center gap-2"
                    aria-label="Request a profile review"
                  >
                    <span className="truncate">Get Reviewed</span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                </Button>
              </div>

              <ul
                className="mobile-text-reveal mx-auto w-full max-w-lg list-none space-y-2.5 px-4 pt-1 text-left sm:px-5"
                style={{ animationDelay: '1.15s' }}
              >
                <li className="flex items-start gap-2.5 text-base text-white/85">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                  <span className="min-w-0 font-medium leading-snug">Specific notes on photos and prompts</span>
                </li>
                <li className="flex items-start gap-2.5 text-base text-white/85">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                  <span className="min-w-0 font-medium leading-snug">
                    Book directly with available reviewers
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-base text-white/85">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                  <span className="min-w-0 font-medium leading-snug">Built for web and mobile web</span>
                </li>
              </ul>

              {/* Mobile iPhone Video - Moved below CTA with proper spacing */}
              <div className="flex justify-center mobile-text-reveal mt-6" style={{ animationDelay: '1.3s' }}>
                <div className="mobile-iphone-container">
                  <div className="mobile-iphone-glow"></div>
                  <div className="mobile-iphone-shadow"></div>
                  <div className="mobile-iphone-frame">
                    <video 
                      ref={mobileVideoRef}
                      className="mobile-iphone-video"
                      src="/katie_demo.mov" 
                      autoPlay 
                      playsInline
                      muted
                      aria-label="Demo video showing how Auro app works - reviewing a guy's profile and style"
                    />
                    <a
                      ref={mobileOverlayRef}
                      href="/reviewers/apply"
                      className="mobile-iphone-overlay"
                      aria-label="Watch a sample review in the product demo"
                    >
                      <div className="overlay-content">
                        <h3>Watch a full example review</h3>
                        <p>Real feedback on photos and prompts</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mobile-text-reveal mobile-stats px-6" style={{ animationDelay: '1.6s' }}>
                <div className="flex flex-col gap-3 text-sm text-white/90">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>Reviewers keep 80% per completed review</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>Reviewer fee split is clear — no surprises at checkout</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>No app store tax on your personal link</span>
                  </div>
                </div>
              </div>
          </div>
        </div>
        
        {/* Desktop Layout - Only visible on large screens */}
        <div className="hidden lg:flex items-center justify-center min-h-screen">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content — min-w-0 lets copy wrap inside the grid track instead of overflowing under the phone */}
              <div className="text-left space-y-8 min-w-0 pr-2 xl:pr-6">
                {/* Removed redundant badge to save space and reduce clutter */}
                
                <div className="space-y-6">
                  <h1 className="max-w-2xl hyphens-none text-pretty text-4xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-5xl sm:leading-tight xl:text-[2.75rem] xl:leading-tight 2xl:text-5xl 2xl:leading-tight">
                    <span className="[text-wrap:balance]">
                      Get dating profile feedback{' '}
                      <span className="text-white/95">from real women</span>
                    </span>
                  </h1>

                  <p className="max-w-xl text-lg font-medium leading-relaxed text-white/85 xl:text-xl text-pretty hyphens-none">
                    Book profile feedback now or apply as a reviewer today.
                  </p>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3 justify-start">
                  <Button size="xl" variant="gradient" className={LANDING_CTA_PRIMARY} asChild>
                    <a href="/reviewers/apply" className="flex items-center justify-center gap-2">
                      <span className="mobile-button-text">Become a Reviewer</span>
                      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                  <Button size="xl" variant="outline" className={LANDING_CTA_SECONDARY} asChild>
                    <a href="/request" className="flex items-center justify-center gap-2" aria-label="Request a profile review">
                      <span className="mobile-button-text">Get Reviewed</span>
                      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </div>

                {/* Trust line — column layout aligns checks with headline (no ragged wrap grid) */}
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 pt-2 text-sm text-white/90" aria-label="Key benefits">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>Specific notes on photos and prompts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>Book directly with available reviewers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden />
                    <span>Built for web and mobile web</span>
                  </li>
                </ul>
              </div>
              
              {/* Right Content - Desktop iPhone Video */}
              <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative">
                  <div className="desktop-iphone-frame">
                    <video 
                      ref={desktopVideoRef}
                      className="desktop-iphone-video"
                      src="/katie_demo.mov" 
                      autoPlay 
                      playsInline
                      muted
                      aria-label="Demo video showing how Auro app works - reviewing a guy's profile and style"
                    />
                    <a
                      ref={desktopOverlayRef}
                      href="/reviewers/apply"
                      className="desktop-iphone-overlay"
                    >
                      <div className="overlay-content">
                        <h3>Watch a full example review</h3>
                        <p>Real feedback on photos and prompts</p>
                      </div>
                    </a>
                  </div>
                  
                  {/* Floating Benefit Callouts */}
                  <div className="absolute right-2 top-2 glass rounded-lg p-2 shadow-lg hover-lift">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" aria-hidden />
                      <span className="text-sm font-medium text-white">Clear rates before checkout</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 glass rounded-lg p-2 shadow-lg hover-lift">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                      <span className="text-sm font-medium text-white">Notes you can act on fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Review request entry */}
      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="border-white/20 bg-white/5 backdrop-blur-sm">
              <CardContent className="p-8 md:p-10">
                <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
                  <div className="space-y-4">
                    <Badge variant="outline" className="border-primary/40 bg-primary/15 text-primary">
                      FOR GUYS LEVELING UP
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      Book your review directly with available reviewers.
                    </h2>
                    <p className="text-lg leading-relaxed text-white/85">
                      Browse reviewer profiles and submit your request right away.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Dating profile feedback</Badge>
                      <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Style + photo suggestions</Badge>
                      <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Book live reviewer spots</Badge>
                    </div>
                  </div>
                  <div className="flex md:justify-end">
                    <Button size="xl" variant="gradient" className={LANDING_CTA_PRIMARY} asChild>
                      <a href="/request" className="flex items-center justify-center gap-2" aria-label="Request a profile review">
                        <span>Get Reviewed</span>
                        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Payouts — one clear mention; details also in reviewer flow */}
      <section id="platform-economics" className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Badge variant="gradient" className="text-sm px-4 py-2 font-semibold">
              REVIEW REQUESTS — LIVE
            </Badge>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
              Straightforward payouts for reviewers
            </h2>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed">
              Reviewers keep <span className="font-semibold text-white">80%</span> of each completed paid review. The rest covers payments, support, and running Auro. You see the exact split before you check out.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">How it works for reviewers</h2>
              <p className="text-lg leading-relaxed text-white/80 md:text-xl">
                Set up your reviewer profile, share your link, and start accepting paid review requests on your schedule.
              </p>
            </div>
            
            {/* Process Steps */}
            <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-3">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-md">
                    1
                  </div>
                  <CardTitle className="text-xl font-semibold text-white md:text-2xl">Set Your Rate & Share Your Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-base leading-relaxed text-white/80">
                    Name your price per review and drop your Auro link where your audience already is. Guys can book review requests directly through your link.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">You set your rates</Badge>
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Share on Instagram/TikTok</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-md">
                    2
                  </div>
                  <CardTitle className="text-xl font-semibold text-white md:text-2xl">Rate & Give Advice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-base leading-relaxed text-white/80">
                    Open a request, skim their photos and prompts, then spell out what is helping or hurting them on a simple 1–5 scale—plus concrete fixes, not vibes.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Rate 1-5 scale</Badge>
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Give improvement advice</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-md">
                    3
                  </div>
                  <CardTitle className="text-xl font-semibold text-white md:text-2xl">Get Paid & Build Your Brand</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-base leading-relaxed text-white/80">
                    Finish the review, get paid, and—if they opt in—clip the best moments to socials so more guys know you take requests.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Stripe payouts</Badge>
                    <Badge variant="outline" className="border-white/25 bg-white/5 text-xs text-white/90">Build your brand</Badge>
              </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional Benefits */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xl font-semibold text-white">Work Your Schedule</h4>
                      <p className="text-base leading-relaxed text-white/80">
                        Review profiles whenever you want—mornings, evenings, or weekends.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xl font-semibold text-white">Scale Your Income</h4>
                      <p className="text-base leading-relaxed text-white/80">
                        Raise your price as your queue fills up and your reviews speak for themselves.
                      </p>
                </div>
              </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Removed CTA to reduce clutter - keeping focus on main hero CTA */}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">What reviewers are saying</h2>
              <p className="text-lg leading-relaxed text-white/80 md:text-xl">
                Honest notes, flexible sessions, built for the web.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-primary/45 hover:bg-white/[0.15] mobile-card-hover">
                <CardContent className="p-8 space-y-5">
                  <p className="text-white text-base leading-relaxed italic">
                    "So many guys are close to having solid profiles, they just need honest feedback. Auro makes it easy to help and get paid."
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-primary/50 md:h-24 md:w-24">
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
              
              <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-primary/45 hover:bg-white/[0.15] mobile-card-hover">
                <CardContent className="p-8 space-y-5">
                  <p className="text-white text-base leading-relaxed italic">
                    "Sometimes one tweak makes a huge difference in matches. I like that I can give direct feedback and get paid for it."
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-primary/50 md:h-24 md:w-24">
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
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="bg-background py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Why I built Auro</h2>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-40 h-40 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src="/rohan-headshot.jpg" 
                  alt="RJ, founder of Auro - helping men improve their style and helping women monetize their expertise" 
                  className="w-full h-full object-cover scale-125" 
                  loading="lazy"
                  width={160}
                  height={160}
                />
          </div>
          
              <div className="space-y-5 text-left">
                <p className="text-xl leading-relaxed text-white/90">
                  Most guys are guessing on dating apps—photos, prompts, and how they read in the feed. A clear woman&apos;s-eye view cuts through that noise fast.
                </p>
                <p className="text-xl leading-relaxed text-white/90">
                  Auro pairs guys who want specifics with women who can deliver them. Reviewers earn for completed reviews; guys get a punch list instead of generic advice.
                </p>
                <p className="text-xl font-semibold leading-relaxed text-white">
                  <span className="text-primary">Reviewer applications are open and review requests are live.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden bg-background py-16 lg:py-24">
        
        <div className="container mx-auto px-6 sm:px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="space-y-6">
              <h2
                className="mobile-text-reveal text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
                style={{ animationDelay: '0.2s' }}
              >
              Get reviewed now
              </h2>
              <p
                className="mobile-text-reveal text-xl leading-relaxed text-white/90 md:text-2xl"
                style={{ animationDelay: '0.4s' }}
              >
                Book a paid review request now, or apply as a reviewer and start earning today.
              </p>
            </div>
            
            <div
              className="mobile-text-reveal flex flex-col items-stretch justify-center gap-3 px-4 sm:flex-row sm:items-center"
              style={{ animationDelay: '0.6s' }}
            >
              <Button size="xl" variant="gradient" className={LANDING_CTA_PRIMARY} asChild>
                <a href="/reviewers/apply" className="flex items-center justify-center gap-2">
                  <span className="mobile-button-text">Become a Reviewer</span>
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6" />
                </a>
              </Button>
              <Button size="xl" variant="outline" className={LANDING_CTA_SECONDARY} asChild>
                <a href="/request" className="flex items-center justify-center gap-2">
                  <span className="mobile-button-text">Get Reviewed</span>
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6" />
                </a>
              </Button>
            </div>
            <p className="text-sm font-medium text-white/70 mobile-text-reveal" style={{ animationDelay: '0.65s' }}>
              Reviewer onboarding is live and review requests are open.
            </p>
            
            <div
              className="mobile-text-reveal flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/80"
              style={{ animationDelay: '0.8s' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                <span>No commitment to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                <span>Reviewer economics are transparent — you see exactly what you earn per review</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                <span>Web-first—no app store cut on your link</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* iPhone Frame Styles */}
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
          box-shadow: 0 20px 50px rgba(0,0,0,0.45);
          margin: 0 auto;
          animation: none;
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
          border-radius: 22px;
        }

        .desktop-iphone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(20, 12, 34, 0.95);
          color: white;
          opacity: 0;
          pointer-events: none;
          transition: opacity 1s ease;
          text-align: center;
          padding: 1.5rem;
          z-index: 3;
          text-decoration: none;
          cursor: pointer;
        }
        
        .desktop-iphone-overlay:hover {
          background: rgba(20, 12, 34, 0.98);
        }

        .desktop-iphone-overlay .overlay-content h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          margin: 0;
        }

        .desktop-iphone-overlay .overlay-content p {
          font-size: 0.9rem;
          margin: 0;
          opacity: 0.9;
        }

        .mobile-iphone-frame {
          position: relative;
          width: 280px;
          height: 560px;
          border: 6px solid #1a1a1a;
          border-radius: 28px;
          background: #000;
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(0,0,0,0.55);
          margin: 0 auto;
          animation: none;
        }


        .mobile-iphone-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 22px;
        }

        .mobile-iphone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(20, 12, 34, 0.94);
          color: white;
          opacity: 0;
          pointer-events: none;
          transition: opacity 1s ease;
          text-align: center;
          padding: 1.5rem;
          z-index: 3;
          text-decoration: none;
          cursor: pointer;
        }
        
        .mobile-iphone-overlay:active {
          background: rgba(20, 12, 34, 0.98);
        }

        .mobile-iphone-overlay .overlay-content h3 {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          margin: 0;
        }

        .mobile-iphone-overlay .overlay-content p {
          font-size: 0.85rem;
          margin: 0;
          opacity: 0.9;
        }

        /* Enhanced shadow effects for CTA buttons */
        .shadow-2xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.35);
        }

        /* Mobile CTA button fixes */
        @media (max-width: 640px) {
          .mobile-text-reveal {
            padding: 0 8px;
          }
          
          .mobile-text-reveal .group {
            max-width: calc(100vw - 32px);
            box-sizing: border-box;
          }
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