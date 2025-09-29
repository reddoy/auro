'use client';

import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import CountdownTimer from '../components/CountdownTimer';
import ReviewerCounter from '../components/ReviewerCounter';
import { supabase } from '../lib/supabase';
import { ArrowRight, Star, DollarSign, Clock, Users, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [showRibbon, setShowRibbon] = useState(true);
  const [reviewerCount, setReviewerCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);

  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (error) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('is_reviewer', true);
          
          if (!profileError) {
            setReviewerCount(profileData?.length || 0);
          }
        } else {
          setReviewerCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchReviewerCount();
    const interval = setInterval(fetchReviewerCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const spotsLeft = Math.max(0, 100 - reviewerCount);
  const isNearFull = spotsLeft <= 10;
  const isFull = spotsLeft === 0;
  
  const getSubText = () => {
    if (isFull) return 'Spots Filled! 🎉';
    if (isNearFull) return `Only ${spotsLeft} left! ⚡`;
    return 'Join exclusive founding group';
  };

  return (
    <div className="min-h-screen bg-background text-foreground mobile-smooth-scroll">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Enhanced Mobile Background */}
        <div className="absolute inset-0 mobile-hero-bg lg:bg-gradient-to-br lg:from-orange-500/20 lg:via-red-500/20 lg:to-pink-500/20 lg:blur-3xl" />
        
        {/* Mobile Floating Orbs */}
        <div className="lg:hidden mobile-floating-orb w-16 h-16 top-20 left-8" style={{ animationDelay: '0s' }} />
        <div className="lg:hidden mobile-floating-orb w-24 h-24 top-32 right-12" style={{ animationDelay: '2s' }} />
        <div className="lg:hidden mobile-floating-orb w-20 h-20 bottom-32 left-16" style={{ animationDelay: '4s' }} />
        <div className="lg:hidden mobile-floating-orb w-28 h-28 bottom-20 right-8" style={{ animationDelay: '6s' }} />
        
        {/* Desktop Floating Elements */}
        <div className="hidden lg:block absolute top-20 left-10 w-20 h-20 bg-orange-500/30 rounded-full blur-xl animate-float" />
        <div className="hidden lg:block absolute top-40 right-20 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="hidden lg:block absolute bottom-20 left-1/4 w-24 h-24 bg-red-500/25 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-8">
              {/* Badge */}
              <div className="flex justify-center lg:justify-start">
                <Badge variant="gradient" className="text-sm px-4 py-2 mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Exclusive Founding Reviewer Program
                </Badge>
              </div>
              
              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block text-foreground mobile-text-reveal" style={{ animationDelay: '0.4s' }}>Review guys.</span>
                  <span className="block bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent mobile-text-reveal" style={{ animationDelay: '0.6s' }}>
                    Give advice.
                  </span>
                  <span className="block text-foreground mobile-text-reveal" style={{ animationDelay: '0.8s' }}>Get paid.</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mobile-text-reveal" style={{ animationDelay: '1s' }}>
                  Men pay for your advice, you help them glow up, and grow your brand.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mobile-text-reveal" style={{ animationDelay: '1.2s' }}>
                <Button 
                  size="xl" 
                  variant="gradient" 
                  className="group mobile-gradient-border mobile-touch-feedback mobile-optimized"
                  asChild
                >
                  <a href="#founding-program">
                    Learn More About Founding Program
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                
                <Button 
                  size="xl" 
                  variant="outline" 
                  className="border-white/20 hover:bg-white/10 mobile-card-hover mobile-touch-feedback mobile-optimized"
                  asChild
                >
                  <a href="/reviewers/apply">
                    Claim Your Spot ({reviewerCount}/100)
                  </a>
                </Button>
              </div>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground mobile-text-reveal" style={{ animationDelay: '1.4s' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No commitment required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>85% earnings forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Launch October 15th</span>
                </div>
              </div>
            </div>
            
            {/* Right Content - Desktop iPhone */}
            <div className="hidden lg:block relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="relative">
                <img 
                  className="w-full max-w-md mx-auto animate-float" 
                  src="/iphone-mockup.png" 
                  alt="iPhone app mockup showing review process" 
                  loading="eager" 
                />
                
                {/* Floating Benefit Callouts */}
                <div className="absolute -top-4 -right-4 glass rounded-lg p-3 shadow-lg animate-slide-in-right hover-lift">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Set your own rates</span>
                  </div>
                </div>
                
                <div className="absolute top-1/2 -left-8 glass rounded-lg p-3 shadow-lg animate-slide-in-left hover-lift">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium">Quick video reviews</span>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -right-8 glass rounded-lg p-3 shadow-lg animate-slide-in-right hover-lift" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">Founding member perks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile iPhone Peeking from Bottom */}
        <div className="lg:hidden absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2" style={{ animationDelay: '1.6s' }}>
          <div className="mobile-iphone-container">
            <div className="mobile-iphone-glow"></div>
            <div className="iphone-peek">
              <img 
                className="w-72 h-auto relative z-10" 
                src="/iphone-mockup.png" 
                alt="iPhone app mockup" 
                loading="lazy" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founding Members Section */}
      <section id="founding-program" className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-12">
            <div className="space-y-4">
              <Badge variant="destructive" className="text-sm px-4 py-2">
                🚨 FOUNDING MEMBERS ONLY
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold">
                First 100 reviewers get exclusive benefits{' '}
                <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  forever
                </span>
              </h2>
            </div>
            
            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 mobile-card-hover mobile-gradient-border">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <CardTitle className="text-xl">85% Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Keep more of what you earn compared to regular members.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 mobile-card-hover mobile-gradient-border">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                  <CardTitle className="text-xl">Exclusive Badge</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Get recommended more to guys looking for reviewers.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 mobile-card-hover mobile-gradient-border">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">Founder Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Direct line to me for support and feedback.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
            
            {/* Countdown Timer */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Limited Time Offer</h3>
                <p className="text-muted-foreground">
                  Founding member benefits end on launch day
                </p>
              </div>
              <div className="flex justify-center">
                <CountdownTimer 
                  targetDate={new Date('2025-10-15T21:00:00-08:00')}
                  className="main-countdown"
                />
              </div>
            </div>
            
            {/* CTA */}
            <div className="space-y-4">
              <Button 
                size="xl" 
                variant="gradient" 
                className="group"
                asChild
              >
                <a href="/reviewers/apply">
                  Claim Your Spot ({reviewerCount}/100 taken)
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                No commitment • Benefits end Oct 15th
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">How It Works</h2>
              <p className="text-xl text-muted-foreground">Start earning in 3 simple steps</p>
            </div>
            
            {/* Process Steps */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                    1
                  </div>
                  <CardTitle className="text-xl">Set Your Rate & Share Your Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Set your own price per review and share your Auro profile link on social media. Guys pay through your link and request reviews.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">💰 You set your rates</Badge>
                    <Badge variant="outline" className="text-xs">📱 Share on Instagram/TikTok</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                    2
                  </div>
                  <CardTitle className="text-xl">Rate & Give Advice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Accept requests and rate men on attractiveness, style, room, and social profiles (Hinge/Tinder/Instagram) from 1-5. Give specific advice on what they could improve.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">📊 Rate 1-5 scale</Badge>
                    <Badge variant="outline" className="text-xs">💡 Give improvement advice</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                    3
                  </div>
                  <CardTitle className="text-xl">Get Paid & Build Your Brand</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Get paid instantly after your review. If the guy consents, you can post the review to social media to build your brand and attract more review requests.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">💳 Instant payments</Badge>
                    <Badge variant="outline" className="text-xs">📸 Build your brand</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional Benefits */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Work Your Schedule</h4>
                      <p className="text-muted-foreground">
                        Review profiles whenever you want - mornings, evenings, weekends
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Scale Your Income</h4>
                      <p className="text-muted-foreground">
                        Increase your rates as you build reputation and demand grows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* CTA */}
            <div className="space-y-4">
              <Button 
                size="xl" 
                variant="gradient" 
                className="group"
                asChild
              >
                <a href="/reviewers/apply">
                  Become a Founding Reviewer
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                Free to join • No commitment required • Launch October 15th
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">What Early Reviewers Are Saying</h2>
              <p className="text-xl text-muted-foreground">Join the community that's already making money</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">
                    "I made $200 in my first week just reviewing guys' profiles. The founding member benefits are incredible!"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-orange-500/30">
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">SM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">Sarah M.</p>
                      <p className="text-sm text-muted-foreground">Founding Reviewer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">
                    "The 85% earnings rate is amazing. I can finally monetize my fashion expertise without the hassle of traditional influencer work."
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-red-500/30">
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-pink-500 text-white">JL</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">Jessica L.</p>
                      <p className="text-sm text-muted-foreground">Style Expert</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 border-white/20 hover:border-white/40 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">
                    "RJ's vision is spot on. Guys really do need honest feedback, and we get paid well for providing it. Win-win!"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-pink-500/30">
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">AM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">Alex M.</p>
                      <p className="text-sm text-muted-foreground">Content Creator</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">Why I started Auro</h2>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <img 
                  src="/rj-headshot.jpg" 
                  alt="RJ headshot" 
                  className="w-40 h-40 rounded-2xl object-cover shadow-lg" 
                  loading="lazy" 
                />
              </div>
              
              <div className="space-y-4 text-left">
                <p className="text-lg text-muted-foreground">
                  I'm RJ, founder of Auro. I started this because guys like me need help from women to glow up and improve our style, rooms, and social presence.
                </p>
                <p className="text-lg text-muted-foreground">
                  I also wanted to help creators diversify their income by monetizing their expertise in style and presentation. It's a win-win for everyone.
                </p>
                <p className="text-lg font-semibold">
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    Join the first 100 founding reviewers and lock in 85% earnings forever.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 relative overflow-hidden">
        {/* Mobile floating orbs for CTA section */}
        <div className="lg:hidden mobile-floating-orb w-20 h-20 top-10 left-4" style={{ animationDelay: '0s' }} />
        <div className="lg:hidden mobile-floating-orb w-16 h-16 top-20 right-8" style={{ animationDelay: '3s' }} />
        <div className="lg:hidden mobile-floating-orb w-24 h-24 bottom-10 left-8" style={{ animationDelay: '6s' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
                Ready to Start Earning?
              </h2>
              <p className="text-xl text-muted-foreground mobile-text-reveal" style={{ animationDelay: '0.4s' }}>
                Join the first 100 founding reviewers and lock in exclusive benefits forever
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mobile-text-reveal" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="xl" 
                variant="gradient" 
                className="group text-lg px-8 py-4 mobile-gradient-border animate-pulse-glow"
                asChild
              >
                <a href="/reviewers/apply">
                  Claim Your Founding Spot
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground font-semibold">
                  {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'Spots filled!'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Benefits end October 15th, 2025
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground mobile-text-reveal" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" />
                <span>No commitment required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span>85% earnings forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span>Exclusive founding badge</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                <span>Direct founder access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}