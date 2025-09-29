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
  const [fullName, setFullName] = useState('');
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      body: JSON.stringify({ fileName: avatarFile.name || 'avatar.jpg', contentType, category: 'selfie', uploadSessionId: 'reviewer-apply' })
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/reviewers/apply`
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
      if (!fullName || !email) { setError('Please enter your name and email'); return; }
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
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

  // Modern Stepper Component
  const Stepper = () => {
    const steps = [
      { id: 1, label: 'Intro', icon: Star },
      { id: 2, label: 'Account', icon: User },
      { id: 3, label: 'Password', icon: Lock },
      { id: 4, label: 'Profile', icon: Camera },
      { id: 5, label: 'Socials', icon: Instagram },
      { id: 6, label: 'Bio & Focus', icon: Target },
      { id: 7, label: 'Done', icon: Check }
    ];

        return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-500 ease-out"
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
                className="flex flex-col items-center relative z-10"
                onClick={isClickable ? () => setStep(stepItem.id) : undefined}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-out
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg' 
                      : isCurrent 
                        ? 'bg-white border-2 border-orange-500 text-orange-500 shadow-lg' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`
                  mt-2 text-xs font-medium text-center max-w-16
                  ${isCurrent ? 'text-orange-500' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
                `}>
                  {stepItem.label}
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center space-y-8">
              {/* Header */}
              <div className="space-y-4">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border-orange-500/30 text-orange-400 px-4 py-2">
                  <Star className="w-4 h-4 mr-2" />
                  Exclusive Founding Program
                </Badge>
                
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  <span className="block text-white">Become a</span>
                  <span className="block bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Founding Reviewer
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Join an exclusive group of 100 founding reviewers shaping the next big lifestyle feedback platform.
                </p>
              </div>
                
                {/* Reviewer Counter */}
              <div className="flex justify-center">
                  <ReviewerCounter 
                    maxReviewers={100}
                    className="apply-counter"
                  />
                </div>
                
              {/* Benefits Grid */}
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto">
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">85% Earnings</h3>
                    <p className="text-gray-300">
                      Keep 85% of every payment forever (vs 80% for regular members)
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center mx-auto">
                      <Star className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Founding Badge</h3>
                    <p className="text-gray-300">
                      Get exclusive founding member badge and priority visibility
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Early Access</h3>
                    <p className="text-gray-300">
                      Influence app features and get first access to new opportunities
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA */}
              <div className="space-y-4">
                <Button 
                  size="xl" 
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => setStep(2)}
                >
                  Claim Your Founding Spot
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-sm text-gray-400">
                  No commitment required • Limited to first 100 reviewers
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-blue-400" />
            </div>
              <CardTitle className="text-2xl font-bold text-white">Create Your Account</CardTitle>
              <CardDescription className="text-gray-300">
                Tell us who you are and how to reach you
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              {/* Google Auth */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
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
                  disabled={loading || !fullName || !email}
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Secure Your Account</CardTitle>
              <CardDescription className="text-gray-300">
                Create a strong password to protect your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">Password Requirements:</h4>
                <ul className="text-xs text-blue-200 space-y-1">
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Your Reviewer Profile</CardTitle>
              <CardDescription className="text-gray-300">
                Set up your profile and pricing
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
            </div>
              )}
              
              <div className="space-y-6">
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500/20 to-pink-600/20 rounded-full flex items-center justify-center mx-auto">
                <Instagram className="w-8 h-8 text-pink-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Social Presence</CardTitle>
              <CardDescription className="text-gray-300">
                Connect your social accounts (optional but recommended)
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Bio & Focus Areas</CardTitle>
              <CardDescription className="text-gray-300">
                Tell guys what makes you a great reviewer
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
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
                    placeholder="e.g., wardrobe, room setup, selfies, dating profile"
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
        <div className="flex-1 flex items-center justify-center px-4 py-8">
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


