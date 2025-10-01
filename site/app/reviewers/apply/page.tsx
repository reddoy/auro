'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import ReviewerCounter from '../../../components/ReviewerCounter';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Star, DollarSign, Users, Clock, Shield, Mail, Lock, User, Camera, Instagram, Smartphone, FileText, Target } from 'lucide-react';

type SocialAccount = {
  provider: 'tiktok' | 'instagram';
  username?: string | null;
};

export default function FoundingReviewerApplyPage() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [rate, setRate] = useState<string>('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [reviewerCount, setReviewerCount] = useState<number>(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Check if resuming from OAuth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const shouldResume = urlParams.get('resume') === 'true';
    
    if (shouldResume) {
      try {
        const saved = localStorage.getItem('auro_reviewer_signup_state');
        if (saved) {
          const state = JSON.parse(saved);
          // Only restore if saved within last 30 minutes
          if (Date.now() - state.timestamp < 30 * 60 * 1000) {
            // Restore what they entered before OAuth
            setFirstName(state.firstName || '');
            setLastName(state.lastName || '');
            setEmail(state.email || '');
            
            // Also try to get info from Google OAuth if available
            try {
              const googleFirstName = localStorage.getItem('auro_signup_first_name');
              const googleLastName = localStorage.getItem('auro_signup_last_name');
              const googleEmail = localStorage.getItem('auro_signup_email');
              
              if (googleFirstName && !state.firstName) setFirstName(googleFirstName);
              if (googleLastName && !state.lastName) setLastName(googleLastName);
              if (googleEmail && !state.email) setEmail(googleEmail);
            } catch {}
            
            // Skip to step 4 (Profile) after successful OAuth
            setStep(4);
          }
          localStorage.removeItem('auro_reviewer_signup_state');
        }
      } catch (e) {
        console.error('Failed to restore state:', e);
      }
      
      // Clean up URL
      window.history.replaceState({}, '', '/reviewers/apply');
    }
  }, []);

  const isAuthed = useMemo(() => {
    return false;
  }, []);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      // no-op; we can trigger a re-render by updating local state if needed
    });
    return () => {
      try { (sub as any)?.data?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  // Fetch reviewer count
  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        // Try profiles table first since creators might not exist yet
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);
        
        if (!profileError && profileData) {
          setReviewerCount(profileData.length || 0);
          return;
        }

        // Fallback to creators table
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (!error && data) {
          setReviewerCount(data.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        // Silently fail - default to 0
      }
    };

    fetchReviewerCount();
    const interval = setInterval(fetchReviewerCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const passwordStrength = useMemo(() => {
    const val = password || '';
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[a-z]/.test(val)) score += 1;
    if (/\d/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;
    const labels = ['Very Weak','Weak','Moderate','Strong','Very Strong'];
    return { score, label: labels[Math.max(0, Math.min(4, score - 1))] };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }, [password]);

  const passwordsMatch = useMemo(() => password && passwordConfirm && password === passwordConfirm, [password, passwordConfirm]);

  const handleAvatarChange = async (f: File | null) => {
    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarFile(f);
    try {
      const url = URL.createObjectURL(f);
      setAvatarPreview(url);
    } catch {}
  };

  const uploadAvatarViaSignedUrl = async (): Promise<{ url: string; path: string } | null> => {
    if (!avatarFile) return null;
    // Ask server for a signed upload URL and then upload with supabase client
    const contentType = avatarFile.type || 'image/jpeg';
    const res = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: avatarFile.name || 'avatar.jpg', contentType, category: 'avatar', uploadSessionId: 'reviewer-apply' })
    });
    if (!res.ok) throw new Error('Failed to get signed upload URL');
    const { path, token, bucket } = await res.json();
    const { error: uploadErr } = await (supabase.storage as any)
      .from(bucket || 'avatars')
      .uploadToSignedUrl(path, token, avatarFile, { contentType });
    if (uploadErr) throw new Error(uploadErr.message);
    // Sign for immediate preview
    const signRes = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'sign-view', path, expiresIn: 60 * 60 * 24 })
    });
    const signJson = await signRes.json();
    return { url: signJson?.signedUrl || '', path };
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Save current state to localStorage before OAuth redirect
      try {
        localStorage.setItem('auro_reviewer_signup_state', JSON.stringify({
          step: 2,
          firstName,
          lastName,
          email,
          timestamp: Date.now()
        }));
      } catch {}

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent('/reviewers/apply?resume=true')}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      // Information screen → go to form
      setStep(2);
      return;
    }
    if (step === 2) {
      // Account basics step
      if (!firstName || !lastName || !email) { setError('Please enter your first name, last name, and email'); return; }
      setStep(3);
      return;
    }
    if (step === 3) {
      // Password creation and account sign-up
      if (!password || !passwordConfirm) { setError('Please create and confirm your password'); return; }
      if (!isPasswordValid) { setError('Password must be at least 8 chars with uppercase, lowercase, number, and symbol'); return; }
      if (!passwordsMatch) { setError('Passwords do not match'); return; }
      try {
        setLoading(true);
        const fullName = `${firstName} ${lastName}`.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, first_name: firstName, last_name: lastName } }
        });
        if (error) throw error;
        if (data?.user) {
          try {
            await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id, email, fullName })
            });
          } catch {}
          try {
            localStorage.setItem('auro_signup_user_id', data.user.id);
            localStorage.setItem('auro_signup_email', email);
            localStorage.setItem('auro_signup_full_name', fullName);
          } catch {}
          setStep(4);
        }
      } catch (e: any) {
        setError(e?.message || 'Sign up failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 4) {
      // Profile details step
      if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) { setError('Please enter a valid rate'); return; }
      setStep(5);
      return;
    }
    if (step === 5) {
      // Socials step -> go to Bio & Focus
      setStep(6);
      return;
    }
    if (step === 6) {
      try {
        setLoading(true);
        const avatar = await uploadAvatarViaSignedUrl();
        const { data: s } = await supabase.auth.getSession();
        const token = (s as any)?.session?.access_token as string | undefined;
        let explicitUserId: string | null = null;
        try {
          const { data: u } = await supabase.auth.getUser();
          explicitUserId = (u?.user?.id as string) || null;
        } catch {}
        if (!explicitUserId) {
          try { explicitUserId = localStorage.getItem('auro_signup_user_id'); } catch {}
        }

        const socialArray: SocialAccount[] = [];
        const clean = (h: string) => (h || '').trim().replace(/^@+/, '');
        if (instagramHandle.trim()) socialArray.push({ provider: 'instagram', username: clean(instagramHandle) });
        if (tiktokHandle.trim()) socialArray.push({ provider: 'tiktok', username: clean(tiktokHandle) });

        const resp = await fetch('/api/reviewers/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            bio,
            focusAreas,
            hourlyRate: Number(rate),
            avatarUrl: avatar?.url || null,
            avatarPath: avatar?.path || null,
            socials: socialArray,
            instagramHandle: instagramHandle || null,
            tiktokHandle: tiktokHandle || null,
            phone,
            marketingConsent,
            userId: explicitUserId || null,
          })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to submit');
        try { router.replace('/reviewers/thanks'); } catch {}
        setStep(7);
      } catch (e: any) {
        setError(e?.message || 'Failed to submit application');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  // Modern Stepper Component - Mobile optimized
  const Stepper = () => {
    const steps = [
      { id: 1, label: 'Intro', shortLabel: 'Intro', icon: Star },
      { id: 2, label: 'Account', shortLabel: 'Account', icon: User },
      { id: 3, label: 'Password', shortLabel: 'Pass', icon: Lock },
      { id: 4, label: 'Profile', shortLabel: 'Profile', icon: Camera },
      { id: 5, label: 'Socials', shortLabel: 'Social', icon: Instagram },
      { id: 6, label: 'Bio & Focus', shortLabel: 'Bio', icon: Target },
      { id: 7, label: 'Done', shortLabel: 'Done', icon: Check }
    ];

    return (
      <div className="w-full px-2 py-3 md:px-4 md:py-6 bg-gradient-to-b from-[#0c0325]/50 to-transparent">
        <div className="flex items-center justify-between relative max-w-5xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-4 md:top-6 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-500 ease-out shadow-sm shadow-orange-500/50"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          
          {steps.map((stepItem, idx) => {
            const isCompleted = step > stepItem.id;
            const isCurrent = step === stepItem.id;
            const isClickable = step > stepItem.id;
            const Icon = stepItem.icon;
            
            return (
              <div
                key={stepItem.id}
                className="flex flex-col items-center relative z-10 flex-1"
                onClick={isClickable ? () => setStep(stepItem.id) : undefined}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-out
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg shadow-orange-500/30' 
                      : isCurrent 
                        ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-xl shadow-orange-500/50 scale-110' 
                        : 'bg-white/10 border border-white/20 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 md:w-5 md:h-5" />
                  ) : (
                    <Icon className="w-3 h-3 md:w-5 md:h-5" />
                  )}
                </div>
                <span className={`
                  mt-1 md:mt-2 text-[9px] md:text-xs font-medium text-center px-0.5
                  hidden sm:block
                  ${isCurrent ? 'text-orange-400 font-bold' : isCompleted ? 'text-white' : 'text-gray-500'}
                `}>
                  {stepItem.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b3d] to-[#0c0325] text-white">
      <div className="w-full">
        <Stepper />
      </div>
      
      {step === 1 && (
        <div className="flex-1 flex items-center justify-center px-4 py-2 md:py-6 min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-100px)]">
          {/* Mobile Layout - Optimized for viewport fit, no scrolling */}
          <div className="w-full max-w-4xl mx-auto md:hidden">
            <div className="flex flex-col justify-between h-[calc(100vh-140px)] max-h-[700px]">
              {/* Top Section - Compact */}
              <div className="text-center space-y-2.5 pt-2">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border-orange-500/30 text-orange-400 px-3 py-1 text-xs">
                  <Star className="w-3 h-3 mr-1.5" />
                  Exclusive Founding Program
                </Badge>
                
                <h1 className="text-3xl font-bold leading-tight px-2">
                  <span className="block text-white">Girls rate guys.</span>
                  <span className="block text-white">Guys get advice.</span>
                  <span className="block bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                    Girls get paid.
                  </span>
                </h1>
                
                <p className="text-xs text-gray-300 px-4 leading-relaxed">
                  We're building the platform where your honest feedback helps guys level up—and you earn money doing it. 
                  <span className="text-orange-400 font-semibold"> Join the first 100 reviewers</span> and lock in exclusive perks forever.
                </p>
              </div>

              {/* Middle Section - Benefits Cards */}
              <div className="px-4 space-y-2.5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-xl p-2.5 border border-green-500/20">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white">$25-50</div>
                        <div className="text-[9px] text-gray-300">per review</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm rounded-xl p-2.5 border border-orange-500/20">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-500/30 to-orange-600/20 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white">85%</div>
                        <div className="text-[9px] text-gray-300">forever</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm rounded-xl p-2.5 border border-purple-500/20">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white">Flexible</div>
                        <div className="text-[9px] text-gray-300">schedule</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional perks */}
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 backdrop-blur-sm rounded-xl p-2.5 border border-blue-500/20">
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-white font-medium">Founding badge</span>
                    </div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-white font-medium">Priority reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - CTA + Urgency */}
              <div className="space-y-2.5 px-4 pb-4">
                {/* Live counter urgency bar */}
                <div className="bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-2.5 border border-orange-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-orange-300">Founding Spots</span>
                    <span className="text-xs font-bold text-white">{Math.max(0, 100 - reviewerCount)}/100 left</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, ((100 - reviewerCount) / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Main CTA */}
                <Button 
                  size="xl" 
                  className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white py-5 text-base font-bold rounded-2xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 border-2 border-white/10"
                  onClick={() => setStep(2)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Join Now - Limited Spots!</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    <span>No commitment</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>Launch Oct 15</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span>Vetted only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Keep existing design with iPhone */}
          <div className="hidden md:block w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left: Content */}
              <div className="text-center lg:text-left space-y-6">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border-orange-500/30 text-orange-400 px-4 py-2">
                  <Star className="w-4 h-4 mr-2" />
                  Exclusive Founding Program
                </Badge>
                
                <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
                  <span className="block text-white">Girls rate guys.</span>
                  <span className="block text-white">Guys get advice.</span>
                  <span className="block bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                    Girls get paid.
                  </span>
                </h1>
                
                <p className="text-lg text-gray-300 leading-relaxed">
                  We're building the platform where your honest feedback helps guys level up—and you earn money doing it. 
                  <span className="text-orange-400 font-semibold"> Join the first 100 reviewers</span> and lock in exclusive perks forever.
                </p>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">$25-50/review</div>
                      <div className="text-xs text-gray-400">You set the rate</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">85% forever</div>
                      <div className="text-xs text-gray-400">Founding member</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    size="xl" 
                    className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => setStep(2)}
                  >
                    <div className="flex items-center gap-3">
                      <span>Join {Math.max(0, 100 - reviewerCount)} Founding Reviewers</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </Button>
                  <p className="text-sm text-gray-400">
                    Keep 85% forever (vs 80% regular) • No commitment • Launch Oct 15th
                  </p>
                </div>
              </div>

              {/* Right: iPhone Mockup */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative">
                  <img 
                    className="w-72 xl:w-80 h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500" 
                    src="/iphone-mockup.png" 
                    alt="iPhone app mockup showing review process" 
                    loading="eager" 
                  />
                  
                  {/* Floating callouts */}
                  <div className="absolute top-8 -left-4 bg-gradient-to-r from-green-500/90 to-green-600/90 backdrop-blur-sm rounded-lg p-3 shadow-xl animate-pulse">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">$25-50/review</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-8 -right-4 bg-gradient-to-r from-orange-500/90 to-orange-600/90 backdrop-blur-sm rounded-lg p-3 shadow-xl animate-pulse" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">Keep 85% forever</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                <User className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Create Your Account</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Tell us who you are and how to reach you
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              {/* Google Auth */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300 py-2.5 md:py-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0c0325] px-2 text-gray-400">Or continue with email</span>
                </div>
            </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Name Fields - Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !firstName || !lastName || !email}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Secure Your Account</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Create a strong password to protect your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${isPasswordValid ? 'text-green-400' : 'text-red-400'}`}>
                      Strength: {passwordStrength.label}
                    </span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-1 rounded-full ${
                            level <= passwordStrength.score
                              ? isPasswordValid
                                ? 'bg-green-400'
                                : 'bg-orange-400'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                {!passwordsMatch && passwordConfirm.length > 0 && (
                    <div className="text-xs text-red-400">Passwords do not match</div>
                )}
              </div>
            </div>

              {/* Password Requirements */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 md:p-4">
                <h4 className="text-xs md:text-sm font-medium text-blue-300 mb-1.5 md:mb-2">Password Requirements:</h4>
                <ul className="text-[10px] md:text-xs text-blue-200 space-y-0.5 md:space-y-1">
                  <li className={`flex items-center ${password.length >= 8 ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`} />
                    At least 8 characters
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One uppercase letter
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One lowercase letter
                  </li>
                  <li className={`flex items-center ${/\d/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/\d/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One number
                  </li>
                  <li className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One special character
                  </li>
                </ul>
            </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  {loading ? 'Creating...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
          </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Your Reviewer Profile</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Set up your profile and pricing
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4 md:space-y-6">
                {/* Profile Photo */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Profile Photo</label>
                  <div className="flex justify-center">
                {avatarPreview ? (
                      <div className="relative">
                        <img 
                          src={avatarPreview} 
                          alt="Preview" 
                          className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                        />
                        <button 
                          type="button" 
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="w-24 h-24 border-2 border-dashed border-white/30 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-white/5 transition-all duration-200"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Camera className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400 text-center px-2">Add Photo</span>
                      </div>
                    )}
                  </div>
                  <input 
                    ref={avatarInputRef} 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} 
                  />
                  <p className="text-xs text-gray-400 text-center">
                    A good profile photo helps guys trust your reviews
                  </p>
                </div>
                
                {/* Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Rate per Review (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="25"
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-orange-400 mt-0.5" />
                      <div className="text-xs text-orange-200">
                        <p className="font-medium mb-1">Pricing Tips:</p>
                        <ul className="space-y-1">
                          <li>• $15-25: Good for starting out</li>
                          <li>• $25-40: Experienced reviewers</li>
                          <li>• $40+: Premium/celebrity reviewers</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !rate || isNaN(Number(rate)) || Number(rate) <= 0}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  {loading ? 'Saving...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 5 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-pink-500/20 to-pink-600/20 rounded-full flex items-center justify-center mx-auto">
                <Instagram className="w-6 h-6 md:w-8 md:h-8 text-pink-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Social Presence</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Connect your social accounts (optional but recommended)
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-3 md:space-y-4">
                {/* Instagram */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                      placeholder="username"
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* TikTok */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    TikTok Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={tiktokHandle}
                      onChange={(e) => setTiktokHandle(e.target.value.replace('@', ''))}
                      placeholder="username"
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
              </div>
                
                {/* Marketing Consent */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="marketing-consent"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 text-orange-500 bg-white/10 border-white/20 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <label htmlFor="marketing-consent" className="text-sm text-gray-300 leading-relaxed">
                      I agree to receive marketing messages by email and SMS about new features, opportunities, and updates
                </label>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-200">
                    <p className="font-medium mb-1">Why connect social accounts?</p>
                    <ul className="space-y-1">
                      <li>• Helps guys verify your credibility</li>
                      <li>• You can share reviews on your social media</li>
                      <li>• Build your personal brand as a reviewer</li>
                      <li>• Get more review requests from your followers</li>
                    </ul>
            </div>
            </div>
          </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(4)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  {loading ? 'Next...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 6 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Bio & Focus Areas</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Tell guys what makes you a great reviewer
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-3 md:space-y-4">
                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Your Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell guys why you're great at giving reviews and what your expertise is..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                  <div className="text-xs text-gray-400">
                    {bio.length}/500 characters
                  </div>
                </div>
                
                {/* Focus Areas */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Focus Areas</label>
                  <input
                    type="text"
                    value={focusAreas}
                    onChange={(e) => setFocusAreas(e.target.value)}
                    placeholder="e.g., wardrobe, room setup, dating profile"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Examples */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-green-400 mt-0.5" />
                  <div className="text-xs text-green-200">
                    <p className="font-medium mb-2">Great bio examples:</p>
                    <div className="space-y-2">
                      <div className="bg-green-500/20 rounded p-2">
                        <p className="font-medium">Fashion Expert:</p>
                        <p>"Fashion stylist with 5+ years helping guys upgrade their wardrobe. I focus on finding pieces that make you look confident and attractive."</p>
                      </div>
                      <div className="bg-green-500/20 rounded p-2">
                        <p className="font-medium">Dating Coach:</p>
                        <p>"Dating coach who's helped 200+ guys improve their profiles. I specialize in photos, bios, and conversation starters that get matches."</p>
                      </div>
              </div>
            </div>
            </div>
          </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(5)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 7 && (
        <div className="flex-1 flex items-center justify-center px-4 py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Welcome to the Founding Team! 🎉</h3>
                <p className="text-gray-300 leading-relaxed">
                  You're now one of the exclusive 100 founding reviewers. We've sent a verification email to confirm your account.
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border border-orange-500/30 rounded-lg p-4 space-y-3">
                <h4 className="text-lg font-semibold text-white">What happens next?</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Check your email and verify your account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>We'll notify you when the app launches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Start earning with your founding benefits</span>
                  </div>
            </div>
          </div>

              <div className="space-y-4">
                <Button 
                  asChild
                  className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  <a href="/">
                    Back to Home
                  </a>
                </Button>
                
                <p className="text-xs text-gray-400">
                  Questions? Reach out to us at support@appauro.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}



