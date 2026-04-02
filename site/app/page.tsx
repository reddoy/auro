'use client';

import { useEffect, useRef, Suspense } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import RevieweeWaitlist from '../components/RevieweeWaitlist';
import { ArrowRight, Sparkles, DollarSign, Clock, Users, TrendingUp, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
      <section className="relative min-h-screen overflow-hidden pt-16 lg:pt-0" role="banner" aria-label="Hero section">
        {/* Clean Background */}
        <div className="absolute inset-0 bg-[#0c0325]" />
        
        {/* Mobile Background Gradient */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-[#0c0325] via-[#0f0528] to-[#0c0325]" />
        
        
        {/* Hero Content - Mobile Only */}
        <div className="container mx-auto px-4 relative z-10 pt-12 pb-8 lg:hidden">
          <div className="text-center space-y-6 mobile-hero-content w-full">
              {/* Removed redundant badge to save space and reduce clutter */}
              
              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.15] text-center tracking-tight px-4 text-balance max-w-2xl mx-auto mobile-text-reveal" style={{ animationDelay: '0.4s' }}>
                  <span className="text-white">Get honest feedback on your dating profile.</span>
                </h1>
                
                <p className="text-lg text-white/90 max-w-lg mx-auto mobile-text-reveal leading-relaxed px-4 font-medium text-balance" style={{ animationDelay: '1s' }}>
                  Reviewers earn by giving advice. Guys get reviewed and improve. Join either side in minutes.
                </p>
                
                <div className="mobile-text-reveal space-y-2 px-4" style={{ animationDelay: '1.1s' }}>
                  <div className="flex items-center justify-center gap-2 text-base text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="font-medium">Set your own rates</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-base text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="font-medium">Work when you want</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-base text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="font-medium">Paid when you complete a review</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons - both core paths */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mobile-text-reveal mb-8 px-4" style={{ animationDelay: '1.2s' }}>
                <Button
                  size="xl"
                  variant="gradient"
                  className="group mobile-gradient-border mobile-touch-feedback mobile-optimized mobile-cta-glow w-full max-w-sm text-base sm:text-lg px-4 sm:px-6 py-3 shadow-2xl font-semibold"
                  asChild
                >
                  <a
                    href="/reviewers/apply"
                    className="flex items-center justify-center"
                    aria-label="Apply to become a reviewer"
                  >
                    <span className="truncate">Become a Reviewer</span>
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  size="xl"
                  variant="secondary"
                  className="group w-full max-w-sm text-base sm:text-lg px-4 sm:px-6 py-3 shadow-2xl font-semibold border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  asChild
                >
                  <a
                    href="/request"
                    className="flex items-center justify-center"
                    aria-label="Request a profile review"
                  >
                    <span className="truncate">Get Reviewed</span>
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" aria-hidden="true" />
                  </a>
                </Button>
              </div>

              {/* Mobile iPhone Video - Moved below CTA with proper spacing */}
              <div className="flex justify-center mobile-text-reveal mt-4" style={{ animationDelay: '1.3s' }}>
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
                      aria-label="Click to see the full review and get your personalized style review"
                    >
                      <div className="overlay-content">
                        <h3>👆 Click here to see the full review</h3>
                        <p>Get your personalized style review</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mobile-text-reveal mobile-stats px-6" style={{ animationDelay: '1.6s' }}>
                <div className="flex flex-col gap-3 text-sm text-white">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No commitment required</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Clear payout breakdown in the app</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Built for web + mobile web</span>
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
                
                {/* Main Headline — RMH-style: one strong line + supporting line (no nowrap) */}
                <div className="space-y-6">
                  <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-extrabold leading-[1.12] tracking-tight text-white text-balance max-w-2xl">
                    Get honest feedback on your dating profile.
                  </h1>
                  
                  <p className="text-lg xl:text-xl text-white/90 max-w-xl leading-relaxed font-medium text-pretty">
                    Reviewers earn by giving advice. Guys get reviewed and improve. Join either side in minutes.
                  </p>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3 justify-start">
                  <Button
                    size="xl"
                    variant="gradient"
                    className="group text-lg px-8 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300"
                    asChild
                  >
                    <a href="/reviewers/apply" className="flex items-center justify-center gap-2">
                      <span className="mobile-button-text">Become a Reviewer</span>
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </a>
                  </Button>
                  <Button
                    size="xl"
                    variant="secondary"
                    className="group text-lg px-8 py-4 shadow-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                    asChild
                  >
                    <a href="/request" className="flex items-center justify-center gap-2">
                      <span className="mobile-button-text">Get Reviewed</span>
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </a>
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No commitment required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Paid when you complete a review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Built for web + mobile web</span>
                  </div>
                </div>
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
                        <h3>👆 Click here to see the full review</h3>
                        <p>Get your personalized style review</p>
                      </div>
                    </a>
                  </div>
                  
                  {/* Floating Benefit Callouts */}
                  <div className="absolute top-2 right-2 glass rounded-lg p-2 shadow-lg animate-slide-in-right hover-lift">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-white">Set your own rates</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 glass rounded-lg p-2 shadow-lg animate-slide-in-right hover-lift" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-medium text-white">Specific, usable feedback</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request a Review Path */}
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-8 md:p-10">
                <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
                  <div className="space-y-4">
                    <Badge variant="outline" className="border-orange-400/40 text-orange-300 bg-orange-500/20">
                      FOR GUYS WHO WANT BETTER RESULTS
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      Request a review. Get honest, actionable feedback.
                    </h2>
                    <p className="text-white/85 text-lg leading-relaxed">
                      Submit your photos and profile details, get direct feedback from real women, and leave with clear next steps for better matches.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Badge variant="outline" className="text-xs border-purple-400/40 text-purple-300 bg-purple-500/20">Dating profile feedback</Badge>
                      <Badge variant="outline" className="text-xs border-green-400/40 text-green-300 bg-green-500/20">Style + photo suggestions</Badge>
                      <Badge variant="outline" className="text-xs border-blue-400/40 text-blue-300 bg-blue-500/20">Fast turnaround</Badge>
                    </div>
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      size="xl"
                      variant="gradient"
                      className="group w-full md:w-auto text-lg px-8 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300"
                      asChild
                    >
                      <a href="/request" className="flex items-center justify-center gap-2" aria-label="Start your review request">
                        <span>Request a Review</span>
                        <ArrowRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
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
      <section id="platform-economics" className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Badge variant="gradient" className="text-sm px-4 py-2 font-semibold">
              FULLY LAUNCHED
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Straightforward payouts
            </h2>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed">
              Reviewers keep <span className="text-white font-semibold">80%</span> of each completed review. The rest is a platform fee that covers payments, support, and running Auro—you’ll see the exact breakdown when you set your rate or complete checkout.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">How It Works</h2>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">Start earning on web in 3 simple steps</p>
            </div>
            
            {/* Process Steps */}
            <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-3">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                    1
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Set Your Rate & Share Your Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-white/80 text-base leading-relaxed">
                    Set your own price per review and share your Auro profile link on social media. Guys pay through your link and request reviews.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs border-orange-400/40 text-orange-300 bg-orange-500/20">💰 You set your rates</Badge>
                    <Badge variant="outline" className="text-xs border-orange-400/40 text-orange-300 bg-orange-500/20">📱 Share on Instagram/TikTok</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                    2
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Rate & Give Advice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-white/80 text-base leading-relaxed">
                    Accept requests and rate men on attractiveness, style, and social profiles (Hinge/Tinder/Instagram) from 1-5. Give specific advice on what they could improve.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs border-purple-400/40 text-purple-300 bg-purple-500/20">📊 Rate 1-5 scale</Badge>
                    <Badge variant="outline" className="text-xs border-purple-400/40 text-purple-300 bg-purple-500/20">💡 Give improvement advice</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                    3
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Get Paid & Build Your Brand</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center text-white/80 text-base leading-relaxed">
                    Get paid instantly after your review. If the guy consents, you can post the review to social media to build your brand and attract more review requests.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs border-green-400/40 text-green-300 bg-green-500/20">💳 Instant payments</Badge>
                    <Badge variant="outline" className="text-xs border-green-400/40 text-green-300 bg-green-500/20">📸 Build your brand</Badge>
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
                      <h4 className="font-bold text-xl mb-2 text-white">Work Your Schedule</h4>
                      <p className="text-white/80 text-base leading-relaxed">
                        Review profiles whenever you want - mornings, evenings, weekends
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
                      <h4 className="font-bold text-xl mb-2 text-white">Scale Your Income</h4>
                      <p className="text-white/80 text-base leading-relaxed">
                        Increase your rates as you build reputation and demand grows
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
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">What Reviewers Are Saying</h2>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">A real web marketplace for profile feedback</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-orange-400/40 hover:bg-white/[0.15] transition-all duration-300 mobile-card-hover">
                <CardContent className="p-8 space-y-5">
                  <p className="text-white text-base leading-relaxed italic">
                    "So many guys are close to having solid profiles, they just need honest feedback. Auro makes it easy to help and get paid."
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <Avatar className="w-20 h-20 md:w-24 md:h-24 ring-2 ring-orange-500/50 overflow-hidden">
                      <AvatarImage 
                        src="/jenna_headshot.jpg" 
                        alt="Jenna - Reviewer"
                        className="object-cover scale-125"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-2xl">J</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white text-xl md:text-2xl">Jenna</p>
                      <p className="text-sm text-white/80">Reviewer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-orange-400/40 hover:bg-white/[0.15] transition-all duration-300 mobile-card-hover">
                <CardContent className="p-8 space-y-5">
                  <p className="text-white text-base leading-relaxed italic">
                    "Sometimes one tweak makes a huge difference in matches. I like that I can give direct feedback and get paid for it."
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <Avatar className="w-20 h-20 md:w-24 md:h-24 ring-2 ring-red-500/50 overflow-hidden">
                      <AvatarImage 
                        src="/katie_headshot.jpg" 
                        alt="Katie - Reviewer"
                        className="object-cover scale-y-110 scale-x-100"
                        style={{ objectPosition: 'center 40%' }}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold text-2xl">K</AvatarFallback>
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
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Why I started Auro</h2>
            
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
                <p className="text-xl text-white/90 leading-relaxed">
                  Look, I know us guys struggle on dating apps. We could definitely use a woman's opinion on our photos, style, and how we come across.
                </p>
                <p className="text-xl text-white/90 leading-relaxed">
                  So I built Auro to connect guys who need help with women who can give it. This way women get paid for their expertise and guys get a leg up in the tough dating scene. Everyone wins.
                </p>
                <p className="text-xl font-bold leading-relaxed">
                  <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Auro is now fully launched on web and mobile web.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-[#0c0325] relative overflow-hidden">
        
        <div className="container mx-auto px-6 sm:px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
                Ready to Start Earning?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 leading-relaxed mobile-text-reveal" style={{ animationDelay: '0.4s' }}>
                Set your rate, share your link, and get paid when reviews finish.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mobile-text-reveal px-4" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="xl" 
                variant="gradient" 
                className="group text-base sm:text-lg px-6 sm:px-8 py-4 mobile-gradient-border animate-pulse-glow shadow-2xl hover:shadow-3xl transition-all duration-300 w-full max-w-sm sm:max-w-none"
                asChild
              >
                <a href="/reviewers/apply" className="flex items-center justify-center gap-2">
                  <span className="mobile-button-text">Start Earning Today</span>
                  <ArrowRight className="ml-1 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </a>
              </Button>
              
              <div className="text-center sm:text-left">
                <p className="text-sm text-white/80 font-semibold">Fully live on web and mobile web</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center text-sm text-white/80 mobile-text-reveal" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" />
                <span>No commitment required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span>You set your rates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span>Web-first—no app store cut on your link</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                <span>Built for web + mobile web</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviewee Waitlist Section - Small and subtle */}
      <section className="py-12 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <RevieweeWaitlist />
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
          box-shadow: 
            0 0 30px rgba(236, 72, 153, 0.6),
            0 0 60px rgba(236, 72, 153, 0.4),
            0 0 90px rgba(236, 72, 153, 0.2),
            0 0 20px rgba(0,0,0,0.4);
          margin: 0 auto;
          animation: iphone-glow-pulse 3s ease-in-out infinite;
        }

        @keyframes iphone-glow-pulse {
          0%, 100% { 
            box-shadow: 
              0 0 30px rgba(236, 72, 153, 0.6),
              0 0 60px rgba(236, 72, 153, 0.4),
              0 0 90px rgba(236, 72, 153, 0.2),
              0 0 20px rgba(0,0,0,0.4);
          }
          50% { 
            box-shadow: 
              0 0 40px rgba(236, 72, 153, 0.8),
              0 0 80px rgba(236, 72, 153, 0.6),
              0 0 120px rgba(236, 72, 153, 0.3),
              0 0 20px rgba(0,0,0,0.4);
          }
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
          background: linear-gradient(135deg, #6C63FF, #FF6584);
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
          background: linear-gradient(135deg, #5A51FF, #FF5070);
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
          box-shadow: 
            0 0 25px rgba(236, 72, 153, 0.6),
            0 0 50px rgba(236, 72, 153, 0.4),
            0 0 75px rgba(236, 72, 153, 0.2),
            0 0 30px rgba(0,0,0,0.6),
            inset 0 0 20px rgba(255,255,255,0.05);
          margin: 0 auto;
          animation: mobile-iphone-glow-pulse 3s ease-in-out infinite;
        }

        @keyframes mobile-iphone-glow-pulse {
          0%, 100% { 
            box-shadow: 
              0 0 25px rgba(236, 72, 153, 0.6),
              0 0 50px rgba(236, 72, 153, 0.4),
              0 0 75px rgba(236, 72, 153, 0.2),
              0 0 30px rgba(0,0,0,0.6),
              inset 0 0 20px rgba(255,255,255,0.05);
          }
          50% { 
            box-shadow: 
              0 0 35px rgba(236, 72, 153, 0.8),
              0 0 70px rgba(236, 72, 153, 0.6),
              0 0 105px rgba(236, 72, 153, 0.3),
              0 0 30px rgba(0,0,0,0.6),
              inset 0 0 20px rgba(255,255,255,0.05);
          }
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
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
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
          background: linear-gradient(135deg, #ff5555, #ff7878);
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