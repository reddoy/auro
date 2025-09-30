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
        // Only run on client side
        if (typeof window === 'undefined') return;
        
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
      <section className="relative min-h-screen overflow-hidden pt-16 lg:pt-0">
        {/* Clean Background */}
        <div className="absolute inset-0 bg-[#0c0325]" />
        
        
        {/* Hero Content - Mobile Only */}
        <div className="container mx-auto px-4 relative z-10 pt-8 pb-32 lg:hidden">
          <div className="text-center space-y-6 lg:space-y-8 mobile-hero-content lg:text-left w-full lg:w-auto">
              {/* Badge */}
              <div className="flex justify-center">
                <Badge variant="gradient" className="text-sm px-4 py-2 mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Exclusive Founding Reviewer Program
                </Badge>
              </div>
              
              {/* Main Headline */}
              <div className="space-y-4 lg:space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-center tracking-tight">
                  <span className="block text-white mobile-text-reveal" style={{ animationDelay: '0.4s' }}>Girls review guys.</span>
                  <span className="block bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mobile-text-reveal whitespace-nowrap" style={{ animationDelay: '0.6s' }}>
                    Guys get advice.
                  </span>
                  <span className="block text-white mobile-text-reveal" style={{ animationDelay: '0.8s' }}>Girls get paid.</span>
              </h1>
              
                <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mobile-text-reveal leading-relaxed" style={{ animationDelay: '1s' }}>
                  Men pay for your advice, you help them glow up, and grow your brand.
                </p>
              </div>
              
              {/* CTA Button */}
              <div className="flex justify-center mobile-text-reveal" style={{ animationDelay: '1.2s' }}>
                <Button 
                  size="xl" 
                  variant="gradient" 
                  className="group mobile-gradient-border mobile-touch-feedback mobile-optimized mobile-cta-glow w-full max-w-md"
                  asChild
                >
                  <a href="/reviewers/apply">
                    Claim Your Founding Reviewer Spot ({reviewerCount}/100)
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
            </div>

              {/* Stats */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4 justify-center text-sm text-white mobile-text-reveal" style={{ animationDelay: '1.4s' }}>
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
        </div>
        
        {/* Desktop Layout - Only visible on large screens */}
        <div className="hidden lg:flex items-center justify-center min-h-screen">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-left space-y-8">
                {/* Badge */}
                <div className="flex justify-start">
                  <Badge variant="gradient" className="text-sm px-4 py-2">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Exclusive Founding Reviewer Program
                  </Badge>
                </div>
                
                {/* Main Headline */}
                <div className="space-y-6">
                  <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
                    <span className="block text-white">Girls review guys.</span>
                    <span className="block bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                      Guys get advice.
                    </span>
                    <span className="block text-white">Girls get paid.</span>
                  </h1>
                  
                  <p className="text-2xl text-white/90 max-w-2xl leading-relaxed">
                    Men pay for your advice, you help them glow up, and grow your brand.
                  </p>
                </div>
                
                {/* CTA Button */}
                <div className="flex justify-start">
                  <Button 
                    size="xl" 
                    variant="gradient" 
                    className="group"
                    asChild
                  >
                    <a href="/reviewers/apply">
                      Claim Your Founding Reviewer Spot ({reviewerCount}/100)
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
                    <span>85% earnings forever</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Launch October 15th</span>
                  </div>
                </div>
              </div>
              
              {/* Right Content - Desktop iPhone */}
              <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative">
                  <img 
                    className="w-full max-w-xs mx-auto animate-float" 
                    src="/iphone-mockup.png" 
                    alt="iPhone app mockup showing review process" 
                    loading="eager" 
                  />
                  
                  {/* Floating Benefit Callouts */}
                  <div className="absolute top-2 right-2 glass rounded-lg p-2 shadow-lg animate-slide-in-right hover-lift">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-white">Set your own rates</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-1/2 -left-4 glass rounded-lg p-2 shadow-lg animate-slide-in-left hover-lift">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-white">Quick video reviews</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 glass rounded-lg p-2 shadow-lg animate-slide-in-right hover-lift" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-white">Founding member perks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile iPhone - Integrated into Hero */}
        <div className="lg:hidden absolute bottom-8 left-1/2 transform -translate-x-1/2" style={{ animationDelay: '1.6s' }}>
          <div className="mobile-iphone-container">
            <div className="mobile-iphone-glow"></div>
            <div className="mobile-iphone-shadow"></div>
            <div className="iphone-peek">
              <img 
                className="w-80 h-auto relative z-10 drop-shadow-2xl rounded-3xl" 
                src="/iphone-mockup.png" 
                alt="iPhone app mockup" 
                loading="lazy" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founding Members Section */}
      <section id="founding-program" className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-6">
              <Badge variant="destructive" className="text-sm px-4 py-2 font-semibold text-white">
                🚨 FOUNDING MEMBERS ONLY
              </Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                First 100 reviewers get exclusive benefits{' '}
                <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                  forever
                </span>
              </h2>
            </div>
            
            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-green-400/40 hover:bg-white/[0.15] transition-all duration-300 hover:scale-105 mobile-card-hover">
                <CardHeader className="text-center">
                  <div className="w-20 h-20 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                    <DollarSign className="w-10 h-10 text-green-400" />
                </div>
                  <CardTitle className="text-2xl font-bold text-white">85% Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-white/90 text-base leading-relaxed">
                    Keep more of what you earn compared to regular members.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-orange-400/40 hover:bg-white/[0.15] transition-all duration-300 hover:scale-105 mobile-card-hover">
                <CardHeader className="text-center">
                  <div className="w-20 h-20 bg-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                    <Star className="w-10 h-10 text-orange-400" />
              </div>
                  <CardTitle className="text-2xl font-bold text-white">Exclusive Badge</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-white/90 text-base leading-relaxed">
                    Get recommended more to guys looking for reviewers.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-blue-400/40 hover:bg-white/[0.15] transition-all duration-300 hover:scale-105 mobile-card-hover">
                <CardHeader className="text-center">
                  <div className="w-20 h-20 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                    <Users className="w-10 h-10 text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Founder Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-white/90 text-base leading-relaxed">
                    Direct line to me for support and feedback.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
            
            {/* Countdown Timer */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-white">Limited Time Offer</h3>
                <p className="text-white/80">
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
              <p className="text-sm text-white/80">
                No commitment • Benefits end Oct 15th
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">How It Works</h2>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">Start earning in 3 simple steps</p>
            </div>
            
            {/* Process Steps */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                    Accept requests and rate men on attractiveness, style, room, and social profiles (Hinge/Tinder/Instagram) from 1-5. Give specific advice on what they could improve.
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
              <p className="text-sm text-white/80">
                Free to join • No commitment required • Launch October 15th
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-[#0c0325]">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">What Early Reviewers Are Saying</h2>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">Join the community that's already making money</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <p className="text-white/90 italic text-base leading-relaxed">
                    "I made $200 in my first week just reviewing guys' profiles. The founding member benefits are incredible!"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-orange-500/40">
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold">SM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white">Sarah M.</p>
                      <p className="text-sm text-white/70">Founding Reviewer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <p className="text-white/90 italic text-base leading-relaxed">
                    "The 85% earnings rate is amazing. I can finally monetize my fashion expertise without the hassle of traditional influencer work."
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-red-500/40">
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold">JL</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white">Jessica L.</p>
                      <p className="text-sm text-white/70">Style Expert</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 mobile-card-hover mobile-gradient-border">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <p className="text-white/90 italic text-base leading-relaxed">
                    "RJ's vision is spot on. Guys really do need honest feedback, and we get paid well for providing it. Win-win!"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-pink-500/40">
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold">AM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white">Alex M.</p>
                      <p className="text-sm text-white/70">Content Creator</p>
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
              <div className="flex-shrink-0">
                <img 
                  src="/rj-headshot.jpg" 
                  alt="RJ headshot" 
                  className="w-40 h-40 rounded-2xl object-cover shadow-lg" 
                  loading="lazy" 
                />
          </div>
          
              <div className="space-y-5 text-left">
                <p className="text-xl text-white/90 leading-relaxed">
                  I'm RJ, founder of Auro. I started this because guys like me need help from women to glow up and improve our style, rooms, and social presence.
                </p>
                <p className="text-xl text-white/90 leading-relaxed">
                  I also wanted to help creators diversify their income by monetizing their expertise in style and presentation. It's a win-win for everyone.
                </p>
                <p className="text-xl font-bold leading-relaxed">
                  <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Join the first 100 founding reviewers and lock in 85% earnings forever.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-[#0c0325] relative overflow-hidden">
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
                Ready to Start Earning?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 leading-relaxed mobile-text-reveal" style={{ animationDelay: '0.4s' }}>
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
                <p className="text-sm text-white/80 font-semibold">
                  {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'Spots filled!'}
                </p>
                <p className="text-xs text-white/80">
                  Benefits end October 15th, 2025
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center text-sm text-white/80 mobile-text-reveal" style={{ animationDelay: '0.8s' }}>
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