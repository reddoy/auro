import React, { useCallback, useEffect, useState, useRef } from 'react';
import { StyleSheet, Alert, FlatList, Platform, Linking, Switch, View as RNView, Image, RefreshControl, ScrollView, Modal, TextInput, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { copyToClipboard } from '@/lib/clipboard';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getSignedAvatarUrl, getReviewerOnboardingStartStep, updateProfilePreferences } from '@/lib/profile';
import { getDisplayName } from '@/lib/profile-utils';
import type { Profile } from '@/types';
import { createStripeExpressLoginLink, createStripeExpressOnboardingLink } from '@/lib/payments';
import { getRequestsByReviewer } from '@/lib/api';
import { MotionPressable, MotionView, cardEntrance, subtleFadeIn } from '@/components/motion';
import { SkeletonBlock, SkeletonCircle, SkeletonParagraph } from '@/components/Skeletons';
import { clearPushTokenFromSupabase } from '@/lib/notifications';

const socialIcons = {
  instagram: require('../../../Instagram_icon-removebg-preview.png'),
  tiktok: require('../../../tiktok-icon-free-png-removebg-preview.png'),
  linktree: require('../../../linktreelogo.png'),
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({ 
    awaitingCompletion: 0,     // Money from paid reviews not yet completed
    awaitingPayout: 0,          // Money from completed reviews awaiting payout (failed distribution)
    completedPaid: 0,           // Money fully paid out to reviewer's Stripe account
    completedCount: 0           // Total number of completed reviews
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const skipNextFocusRefresh = useRef(true);
  const refreshInFlight = useRef(false);
  


  useEffect(() => {
    const run = async () => {
      refreshInFlight.current = true;
      console.log('[profile] initial load started');
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (!p) {
          console.log('[profile] getCurrentProfile returned null');
        }
        if (p?.id && p?.is_reviewer) {
          try {
            const link = await createStripeExpressLoginLink(p.id);
            setStripePortalUrl(link);
            console.log('[profile] stripe portal link fetched');
          } catch {}
          // Fetch earnings data
          try {
            const requests = await getRequestsByReviewer(p.id);
            console.log('[profile] fetched reviewer requests count', requests.length);
            
          // Helper function to calculate reviewer amount for a request
          // SIMPLE MODEL: Reviewer gets totalAmount - auroFee (Auro absorbs Stripe fee)
          const calculateReviewerAmount = (r: any) => {
            if (r.reviewer_amount_cents) return r.reviewer_amount_cents;
            // Fallback: amount - application_fee_cents
            const amount = r.amount_cents || 0;
            const auroFee = r.application_fee_cents || 0;
            return amount - auroFee;
          };
            
            // Awaiting completion: paid reviews not yet completed (status = 'paid' or 'in_progress')
            const awaitingCompletionRequests = requests.filter(r => (r.status === 'paid' || r.status === 'in_progress') && r.amount_cents);
            const awaitingCompletion = awaitingCompletionRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);
            
            // Awaiting payout: completed reviews that haven't been distributed yet
            // This includes both pending distributions and failed distributions
            const awaitingPayoutRequests = requests.filter(r => 
              r.status === 'completed' && 
              r.amount_cents && 
              !r.payment_distributed
            );
            const awaitingPayout = awaitingPayoutRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);
            
            // Completed & paid: fully paid out to reviewer (status = 'completed', payment_distributed = true)
            const completedPaidRequests = requests.filter(r => 
              r.status === 'completed' && 
              r.amount_cents && 
              r.payment_distributed === true
            );
            const completedPaid = completedPaidRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);
            
            // Total completed count
            const completedCount = requests.filter(r => r.status === 'completed').length;
            
            console.log('[earnings-calc] Awaiting completion:', awaitingCompletion / 100);
            console.log('[earnings-calc] Awaiting payout:', awaitingPayout / 100);
            console.log('[earnings-calc] Completed & paid:', completedPaid / 100);
            console.log('[earnings-calc] Completed count:', completedCount);
            
            setEarnings({ 
              awaitingCompletion: awaitingCompletion / 100,
              awaitingPayout: awaitingPayout / 100,
              completedPaid: completedPaid / 100,
              completedCount: completedCount
            });
            console.log('[profile] earnings updated', {
              awaitingCompletion: awaitingCompletion / 100,
              awaitingPayout: awaitingPayout / 100,
              completedPaid: completedPaid / 100,
              completedCount,
            });
          } catch (e) {
            console.log('[earnings] error fetching', e);
          }
        } else {
          setStripePortalUrl(null);
          setEarnings({ awaitingCompletion: 0, awaitingPayout: 0, completedPaid: 0, completedCount: 0 });
          if (p?.id) {
            console.log('[profile] user is not a reviewer, resetting earnings');
          }
        }
      } finally {
        // Mark initial load complete so pull-to-refresh becomes available
        setInitialLoad(false);
        refreshInFlight.current = false;
        console.log('[profile] initial load finished');
      }
    };
    run();
  }, []);

  // Generate a signed URL for private bucket avatars (only reload if URL actually changed)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = (profile?.avatar_url || '').trim().replace(/^@+/, '');
      if (!raw) {
        if (!cancelled) setAvatarUri(undefined);
        return;
      }
      // Only reload avatar if we don't have one yet or if the URL actually changed
      if (!avatarUri || !avatarUri.includes(raw.split('/').pop() || '')) {
        // Always try to re-sign (handles stored public/signed Supabase URLs and bucket paths)
        let finalUri: string | undefined = raw;
        try {
          const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
          if (signed) finalUri = signed;
        } catch {}
        if (!cancelled) setAvatarUri(finalUri || undefined);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.avatar_url, avatarUri]);


  

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out?') : true;
      if (!confirmed) return;
      (async () => {
        try {
          // Clear push token before signing out to prevent notifications going to wrong account
          await clearPushTokenFromSupabase();
          await supabase.auth.signOut();
        } catch (e: any) {
          Alert.alert('Logout failed', e?.message || 'Please try again.');
          return;
        }
        router.replace('/');
      })();
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear push token before signing out to prevent notifications going to wrong account
            await clearPushTokenFromSupabase();
            await supabase.auth.signOut();
          } catch (e: any) {
            Alert.alert('Logout failed', e?.message || 'Please try again.');
            return;
          }
          // Go to the auth gate which will redirect to /auth when no session exists
          router.replace('/');
        },
      },
    ]);
  };

  const handleCopyReviewerLink = useCallback(async () => {
    if (!profile?.is_reviewer) {
      Alert.alert('Not a Reviewer', 'You need to be an active reviewer to copy your link.');
      return;
    }

    try {
      // Use username if available, otherwise fall back to ID
      const slug = profile.username || profile.id;
      const reviewerUrl = `https://www.appauro.com/${slug}`;
      
      await copyToClipboard(reviewerUrl);
      Alert.alert('Copied!', 'Your reviewer link has been copied to clipboard. You can now paste it in your social media bios!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  }, [profile]);

  const handleEditRate = useCallback(() => {
    router.push('/(tabs)/profile/set-rate');
  }, []);



  const refreshProfile = useCallback(
    async (trigger: 'focus' | 'pull') => {
      if (refreshInFlight.current) {
        console.log('[profile] refresh skipped', { trigger, reason: 'in-flight' });
        return;
      }
      if (trigger === 'focus' && initialLoad) {
        console.log('[profile] refresh skipped', { trigger, reason: 'initial load still running' });
        return;
      }

      refreshInFlight.current = true;
      console.log('[profile] refresh start', { trigger });
      try {
        if (trigger === 'pull') {
          setRefreshing(true);
        }
        const p = await getCurrentProfile();
        setProfile(p);
        if (p?.id && p?.is_reviewer) {
          try {
            const link = await createStripeExpressLoginLink(p.id);
            setStripePortalUrl(link);
          } catch {}
          // Refresh earnings data
          try {
            const requests = await getRequestsByReviewer(p.id);

            // Helper function to calculate reviewer amount for a request
            // SIMPLE MODEL: Reviewer gets totalAmount - auroFee (Auro absorbs Stripe fee)
            const calculateReviewerAmount = (r: any) => {
              if (r.reviewer_amount_cents) return r.reviewer_amount_cents;
              // Fallback: amount - application_fee_cents
              const amount = r.amount_cents || 0;
              const auroFee = r.application_fee_cents || 0;
              return amount - auroFee;
            };

            // Awaiting completion: paid reviews not yet completed (status = 'paid' or 'in_progress')
            const awaitingCompletionRequests = requests.filter(r => (r.status === 'paid' || r.status === 'in_progress') && r.amount_cents);
            const awaitingCompletion = awaitingCompletionRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);

            // Awaiting payout: completed reviews that haven't been distributed yet
            // This includes both pending distributions and failed distributions
            const awaitingPayoutRequests = requests.filter(r =>
              r.status === 'completed' &&
              r.amount_cents &&
              !r.payment_distributed
            );
            const awaitingPayout = awaitingPayoutRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);

            // Completed & paid: fully paid out to reviewer (status = 'completed', payment_distributed = true)
            const completedPaidRequests = requests.filter(r =>
              r.status === 'completed' &&
              r.amount_cents &&
              r.payment_distributed === true
            );
            const completedPaid = completedPaidRequests.reduce((sum, r) => sum + calculateReviewerAmount(r), 0);

            // Total completed count
            const completedCount = requests.filter(r => r.status === 'completed').length;

            setEarnings({
              awaitingCompletion: awaitingCompletion / 100,
              awaitingPayout: awaitingPayout / 100,
              completedPaid: completedPaid / 100,
              completedCount: completedCount
            });
            console.log('[profile] refresh earnings updated', {
              trigger,
              awaitingCompletion: awaitingCompletion / 100,
              awaitingPayout: awaitingPayout / 100,
              completedPaid: completedPaid / 100,
              completedCount,
            });
          } catch {}
        } else {
          setStripePortalUrl(null);
          setEarnings({ awaitingCompletion: 0, awaitingPayout: 0, completedPaid: 0, completedCount: 0 });
          if (p?.id) {
            console.log('[profile] refresh reset earnings for non-reviewer', { trigger });
          }
        }
      } finally {
        if (trigger === 'pull') {
          setRefreshing(false);
        }
        refreshInFlight.current = false;
        setInitialLoad(false);
        console.log('[profile] refresh finished', { trigger });
      }
    },
    [initialLoad]
  );

  const onRefresh = useCallback(() => {
    refreshProfile('pull');
  }, [refreshProfile]);

  // Refresh profile when screen gains focus so recent changes (e.g., become reviewer) show up
  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false;
        console.log('[profile] focus refresh skipped on first focus');
        return () => {};
      }
      console.log('[profile] screen focused, triggering refresh');
      refreshProfile('focus');
      return () => {};
    }, [refreshProfile])
  );

  useEffect(() => {
    console.log('[profile] initialLoad changed', { initialLoad });
  }, [initialLoad]);

  useEffect(() => {
    console.log('[profile] refreshing changed', { refreshing });
  }, [refreshing]);

  let sectionCursor = 0;
  const nextEntrance = () => cardEntrance(sectionCursor++);

  const renderSkeleton = (overlay = false) => {
    const content = (
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 24,
          paddingHorizontal: 16,
          paddingTop: overlay ? 0 : insets.top,
        }}
      >
        <MotionView entering={subtleFadeIn()} style={styles.header}>
          <MotionView entering={subtleFadeIn()} style={styles.headerContent}>
            <MotionView entering={subtleFadeIn()} style={styles.profileSection}>
              <RNView style={{ marginRight: 20, backgroundColor: 'transparent' }}>
                <SkeletonCircle size={94} />
              </RNView>
              <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
                <SkeletonBlock width="75%" height={32} />
                <SkeletonBlock width="50%" height={16} style={{ marginTop: 10 }} />
              </RNView>
            </MotionView>
            <SkeletonBlock width="60%" height={50} radius={24} />
          </MotionView>
        </MotionView>

        <MotionView entering={cardEntrance(1)} style={styles.bioSection}>
          <SkeletonBlock width="45%" height={26} />
          <SkeletonParagraph
            lines={3}
            lineHeight={14}
            widths={['95%', '85%', '70%']}
            style={{ marginTop: 18 }}
          />
          <SkeletonBlock width="100%" height={48} radius={18} style={{ marginTop: 20 }} />
        </MotionView>

        <MotionView entering={cardEntrance(2)} style={styles.bioSection}>
          <SkeletonBlock width="35%" height={24} />
          <SkeletonParagraph
            lines={4}
            lineHeight={14}
            widths={['90%', '80%', '70%', '50%']}
            style={{ marginTop: 16 }}
          />
        </MotionView>

        <MotionView entering={cardEntrance(3)} style={styles.actionsSection}>
          {[0, 1].map((index) => (
            <RNView
              key={index}
              style={[
                styles.actionItem,
                { borderBottomWidth: index === 1 ? 0 : StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
              ]}
            >
              <RNView style={[styles.actionIconContainer, { backgroundColor: 'transparent' }]}>
                <SkeletonCircle size={44} />
              </RNView>
              <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
                <SkeletonBlock width="60%" height={18} />
              </RNView>
              <SkeletonBlock width={18} height={18} radius={9} />
            </RNView>
          ))}
        </MotionView>

        <MotionView entering={cardEntrance(4)} style={styles.dangerSection}>
          <RNView style={[styles.logoutButtonDark, { backgroundColor: 'transparent' }]}>
            <SkeletonBlock width="40%" height={18} />
          </RNView>
        </MotionView>
      </ScrollView>
    );

    if (overlay) {
      return (
        <View style={styles.profileRefreshOverlay}>
          {content}
        </View>
      );
    }

    return (
      <View style={[styles.container, { paddingTop: 0 }]}>
        {content}
      </View>
    );
  };

  if (initialLoad) {
    return renderSkeleton();
  }

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <ScrollView
        refreshControl={
          !initialLoad ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brand.textPrimary}
              colors={[Colors.brand.accentMagenta]}
              progressBackgroundColor={Colors.brand.background}
              title="Pull to refresh"
              titleColor={Colors.brand.textSecondary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, paddingTop: 0 }}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <MotionView entering={nextEntrance()} style={styles.header}>
          <MotionView entering={subtleFadeIn()} style={styles.headerContent}>
            <MotionView entering={subtleFadeIn()} style={styles.profileSection}>
              <MotionView entering={subtleFadeIn()} style={styles.avatarContainer}>
                <AvatarUploader
                  uri={avatarUri}
                  previousPathOrUrl={profile?.avatar_url || undefined as any}
                  onUploaded={async ({ publicUrl, path }) => {
                    let signed: string | null = null;
                    try {
                      const updated = await updateProfile({ avatar_url: path });
                      setProfile(updated);
                    } catch (e: any) {
                      Alert.alert('Profile not updated', 'Showing your new photo locally. Enable profile update policy in Supabase to persist.');
                    } finally {
                      try { signed = await getSignedAvatarUrl(path, 3600); } catch {}
                      setAvatarUri(signed || publicUrl || undefined);
                    }
                  }}
                  onRemoved={async () => {
                    try {
                      await updateProfile({ avatar_url: null });
                      setProfile(prev => (prev ? { ...prev, avatar_url: null } : prev));
                      setAvatarUri(undefined);
                    } catch (e: any) {
                      setAvatarUri(undefined);
                      Alert.alert('Profile not updated', 'Removed locally. Enable profile update policy in Supabase to persist.');
                    }
                  }}
                  size={94}
                  accessibilityLabel="Change avatar"
                />
              </MotionView>
              <MotionView entering={subtleFadeIn()} style={styles.userInfo}>
                <Text style={styles.userName}>
                  {profile ? getDisplayName(profile.first_name, profile.last_name, profile.username) : 'Loading...'}
                </Text>
                {!!profile?.created_at && (
                  <Text style={styles.userEmail} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </Text>
                )}
              </MotionView>
            </MotionView>

            <MotionPressable
              entering={subtleFadeIn()}
              style={styles.editButton}
              onPress={() => router.push('/(tabs)/profile/settings')}
              accessibilityLabel="Edit profile"
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </MotionPressable>
          </MotionView>
        </MotionView>

        {/* Reviewer Setup Completion Progress Bar */}
        {profile?.is_reviewer && (() => {
          const hasStripe = !!profile?.stripe_connect_account_id;
          const hasRate = !!(profile?.hourly_rate && profile.hourly_rate > 0);
          const isComplete = hasStripe && hasRate;
          
          // Hide the entire section once both steps are completed
          if (isComplete) return null;
          
          return (
            <MotionView entering={nextEntrance()} style={styles.setupProgressContainer}>
              <View style={styles.setupProgressHeader}>
                <Text style={styles.setupProgressTitle}>Reviewer Setup Completion</Text>
                <Text style={styles.setupProgressSubtitle}>
                  {(() => {
                    const completed = (hasStripe ? 1 : 0) + (hasRate ? 1 : 0);
                    return `${completed}/2 steps completed`;
                  })()}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, {
                  width: `${((hasStripe ? 1 : 0) + (hasRate ? 1 : 0)) * 50}%`
                }]} />
              </View>
              
              {/* Setup Indicators */}
              {!profile?.stripe_connect_account_id && (
              <MotionPressable
                entering={cardEntrance(1)}
                style={styles.setupIndicator}
                onPress={async () => {
                  if (!profile?.id) return;
                  try {
                    const url = await createStripeExpressOnboardingLink(profile.id);
                    if (url) {
                      await Linking.openURL(url);
                    } else {
                      Alert.alert('Error', 'Failed to create Stripe setup link');
                    }
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to open Stripe setup');
                  }
                }}
              >
                <View style={styles.setupIndicatorContent}>
                  <Text style={styles.setupIndicatorIcon}>⚠️</Text>
                  <View style={styles.setupIndicatorTextContainer}>
                    <Text style={styles.setupIndicatorTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Complete Stripe Connect Setup</Text>
                    <Text style={styles.setupIndicatorSubtitle}>Required to receive payments</Text>
                  </View>
                  <Text style={styles.setupIndicatorArrow}>→</Text>
                </View>
              </MotionPressable>
            )}
            
            {(!profile?.hourly_rate || profile.hourly_rate <= 0) && (
              <MotionPressable
                entering={cardEntrance(2)}
                style={styles.setupIndicator}
                onPress={() => router.push('/(tabs)/profile/set-rate')}
              >
                <View style={styles.setupIndicatorContent}>
                  <Text style={styles.setupIndicatorIcon}>⚠️</Text>
                  <View style={styles.setupIndicatorTextContainer}>
                    <Text style={styles.setupIndicatorTitle}>Set Your Rate</Text>
                    <Text style={styles.setupIndicatorSubtitle}>Required to appear in reviewer listings</Text>
                  </View>
                  <Text style={styles.setupIndicatorArrow}>→</Text>
                </View>
              </MotionPressable>
            )}
            </MotionView>
          );
        })()}

        <MotionView entering={nextEntrance()} style={styles.bioSection}>
          <Text style={styles.sectionTitle}>Reviewer Settings</Text>
          <Text style={{ color: Colors.brand.textSecondary }}>Control your reviewer status and price per review.</Text>
          
          {profile?.is_reviewer === 'approved' ? (
            <>
              {/* Earnings Tracker - Moved to top */}
              <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>💰 Earnings Overview</Text>
                <View style={styles.earningsCard}>
                  {/* Stack columns vertically */}
                  <View style={styles.earningStatColumn}>
                    <ExpoLinearGradient
                      colors={['rgba(249, 115, 22, 0.15)', 'rgba(234, 88, 12, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.earningStatBg}
                    />
                    <Text style={styles.earningStatNumber}>${earnings.awaitingCompletion.toFixed(2)}</Text>
                    <Text style={styles.earningStatLabel}>Awaiting Completion</Text>
                  </View>
                  
                  <View style={styles.earningStatColumn}>
                    <ExpoLinearGradient
                      colors={['rgba(255, 193, 7, 0.15)', 'rgba(255, 152, 0, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.earningStatBg}
                    />
                    <Text style={styles.earningStatNumber}>${earnings.awaitingPayout.toFixed(2)}</Text>
                    <Text style={styles.earningStatLabel}>Awaiting Payout</Text>
                  </View>
                  
                  <View style={styles.earningStatColumn}>
                    <ExpoLinearGradient
                      colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.earningStatBg}
                    />
                    <Text style={styles.earningStatNumber}>${earnings.completedPaid.toFixed(2)}</Text>
                    <Text style={styles.earningStatLabel}>Completed & Paid</Text>
                  </View>
                  
                  <View style={{ backgroundColor: 'transparent', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <Text style={[styles.earningStatLabel, { textAlign: 'center', fontSize: 14 }]}>
                      Completed Reviews: {earnings.completedCount}
                    </Text>
                  </View>
                  
                  <MotionView entering={subtleFadeIn()} style={[styles.paymentButtonsContainer, { marginTop: 16 }]}>
                    <MotionPressable
                      onPress={() => router.push('/(tabs)/profile/transaction-history')}
                      style={styles.transactionHistoryButton}
                    >
                      <Text style={styles.transactionHistoryText}>
                        📊 Stripe Transactions
                      </Text>
                    </MotionPressable>
                  </MotionView>
                </View>
              </View>
                </>
              ) : null}
              
              {/* Reviewer Status Toggle */}
              {profile?.is_reviewer !== 'pending' && (
                <View style={styles.reviewerStatusRow}>
                  <MotionView entering={subtleFadeIn()} style={styles.reviewerStatusControls}>
                    <MotionView entering={subtleFadeIn()} style={[
                      styles.statusIndicator, 
                      profile?.is_reviewer === 'approved' && styles.statusIndicatorActive
                    ]}>
                      <Text 
                        style={[
                          styles.statusIndicatorText, 
                          profile?.is_reviewer === 'approved' && styles.statusIndicatorTextActive
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {profile?.is_reviewer === 'approved'
                          ? '✓ Active' 
                          : '○ Inactive'}
                      </Text>
                    </MotionView>
                    <Switch
                      value={profile?.is_reviewer === 'approved'}
                      onValueChange={async (val) => {
                        // If enabling, navigate to reviewer onboarding flow
                        if (val) {
                          try {
                            // Determine which onboarding step to start from based on existing profile data
                            const { route } = getReviewerOnboardingStartStep(profile);
                            
                            // Navigate directly without setting onboarding preferences
                            // This prevents the app from redirecting to onboarding on restart
                            // (onboarding preferences are only for initial signup flow)
                            router.push(route);
                          } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to start reviewer onboarding');
                          }
                          return;
                        }

                        // If disabling, check for pending reviews first
                        try {
                          if (!profile?.id) {
                            Alert.alert('Error', 'Unable to verify your profile');
                            return;
                          }

                          // Check for pending reviews (accepted, paid, or in_progress)
                          const requests = await getRequestsByReviewer(profile.id);
                          const pendingReviews = requests.filter(
                            (r) => (r.status === 'accepted' || r.status === 'paid' || r.status === 'in_progress')
                          );

                          if (pendingReviews.length > 0) {
                            // Show warning dialog with details
                            const pendingCount = pendingReviews.length;
                            const totalPending = pendingReviews.reduce((sum, r) => {
                              // Only count amounts for paid/in_progress reviews that have payment info
                              if (r.status === 'paid' || r.status === 'in_progress') {
                                const amount = r.reviewer_amount_cents || ((r.amount_cents || 0) - (r.application_fee_cents || 0));
                                return sum + amount;
                              }
                              // For 'accepted' status, payment might not be complete yet, so return 0
                              return sum;
                            }, 0) / 100;

                            Alert.alert(
                              'Pending Reviews',
                              `You have ${pendingCount} pending review${pendingCount > 1 ? 's' : ''} that need to be completed${totalPending > 0 ? ` ($${totalPending.toFixed(2)} in pending earnings)` : ''}.\n\nDisabling your reviewer status will prevent you from completing these reviews. You can still complete them if you re-enable your reviewer status later.\n\nDo you want to continue?`,
                              [
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                  onPress: () => {
                                    // Reset switch to true since we're canceling
                                    // The Switch is controlled by profile.is_reviewer, so this will reset it visually
                                    if (profile) {
                                      setProfile({ ...profile, is_reviewer: true });
                                    }
                                  },
                                },
                                {
                                  text: 'Disable Anyway',
                                  style: 'destructive',
                                  onPress: () => {
                                    // Show confirmation modal requiring typing "auro"
                                    setConfirmText('');
                                    setShowConfirmModal(true);
                                  },
                                },
                              ],
                              { cancelable: true }
                            );
                          } else {
                            // No pending reviews, show confirmation modal requiring typing "auro"
                            setConfirmText('');
                            setShowConfirmModal(true);
                          }
                        } catch (e: any) {
                          Alert.alert('Error', e?.message || 'Failed to check pending reviews');
                        }
                      }}
                      trackColor={{ false: '#3e3e3e', true: '#10b981' }}
                      thumbColor={profile?.is_reviewer === 'approved' ? '#ffffff' : '#f4f3f4'}
                      style={styles.reviewerSwitch}
                    />
                  </MotionView>
                </View>
              )}
              
              {/* Pending Approval Message */}
              {profile?.is_reviewer === 'pending' && (
                <MotionView entering={cardEntrance(1)} style={styles.pendingApprovalCard}>
                  <RNView style={styles.pendingApprovalContent}>
                    <Text style={styles.pendingApprovalIcon}>⏳</Text>
                    <RNView style={styles.pendingApprovalTextContainer}>
                      <Text style={styles.pendingApprovalTitle}>Under Review</Text>
                      <Text style={styles.pendingApprovalMessage}>
                        Your reviewer application is currently under review. You'll receive an email notification with the approval or denial decision within a few business days.
                      </Text>
                    </RNView>
                  </RNView>
                  <MotionPressable
                    entering={cardEntrance(2)}
                    style={styles.revokeButton}
                    onPress={() => {
                      Alert.alert(
                        'Revoke Reviewer Application',
                        'Are you sure you want to revoke your reviewer application? You can always apply again later.',
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                          {
                            text: 'Revoke',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const updated = await updateProfile({ is_reviewer: null });
                                setProfile(updated);
                                Alert.alert(
                                  'Application Revoked',
                                  'Your reviewer application has been revoked. You can apply again anytime from your profile settings.'
                                );
                              } catch (e: any) {
                                Alert.alert('Error', e?.message || 'Failed to revoke application');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.revokeButtonText}>Revoke Application</Text>
                  </MotionPressable>
                </MotionView>
              )}
              
              {profile?.is_reviewer === 'approved' ? (
                <>
                  <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>Share Your Reviewer Profile</Text>
                    <MotionPressable
                      onPress={() => router.push('/(tabs)/profile/profile-link')}
                      accessibilityLabel="Edit profile link"
                      style={styles.shareProfileButton}
                    >
                      <Text style={styles.shareProfileButtonText}>🔗 Profile Link</Text>
                    </MotionPressable>
                  </View>
                  <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>Price per Review</Text>
                    <View style={styles.priceCard}>
                      <Text style={styles.priceText}>{profile?.hourly_rate != null ? `$${profile.hourly_rate}/review` : 'Tap to set your rate →'}</Text>
                      <MotionPressable onPress={handleEditRate} accessibilityLabel="Edit rate" style={styles.editRateButton}>
                        <Text style={styles.editRateButtonText}>Edit</Text>
                      </MotionPressable>
                    </View>
                  </View>
                </>
              ) : null}
            </MotionView>

            {/* Transaction History for Reviewees */}
            {!profile?.is_reviewer && (
              <MotionView entering={nextEntrance()} style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Your Reviews</Text>
                <Text style={{ color: Colors.brand.textSecondary, marginBottom: 16 }}>
                  View your review orders and transaction history.
                </Text>
                <MotionPressable
                  onPress={() => router.push('/(tabs)/profile/transaction-history')}
                  style={styles.transactionHistoryButton}
                >
                  <Text style={styles.transactionHistoryText}>
                    📊 Transaction History
                  </Text>
                </MotionPressable>
              </MotionView>
            )}

            {profile?.bio && (
              <MotionView entering={nextEntrance()} style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </MotionView>
            )}

            {!!profile?.links && (
              <MotionView entering={nextEntrance()} style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Socials</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.brand.cardBackground }}>
                  {(() => {
                    const items: { label: string; url: string; key: 'instagram' | 'tiktok' | 'linktree' }[] = [];
                    const l: any = profile?.links || {};
                    const ig = (l.instagram || '').trim();
                    const tt = (l.tiktok || '').trim();
                    const lt = (l.linktree || '').trim();
                    if (ig) items.push({ label: 'Instagram', url: `https://instagram.com/${ig.replace(/^@+/, '')}`, key: 'instagram' });
                    if (tt) items.push({ label: 'TikTok', url: `https://www.tiktok.com/@${tt.replace(/^@+/, '')}`, key: 'tiktok' });
                    if (lt) items.push({ label: 'Linktree', url: `https://linktr.ee/${lt.replace(/^@+/, '')}`, key: 'linktree' });
                    return items.map((it, idx) => (
                      <MotionPressable key={`${it.label}-${idx}`} onPress={() => Linking.openURL(it.url)} style={styles.socialLinkBtn}>
                        <Image source={socialIcons[it.key]} style={styles.socialIcon} resizeMode="contain" />
                        <Text style={styles.socialLinkText}>{it.label}</Text>
                      </MotionPressable>
                    ));
                  })()}
                </View>
              </MotionView>
            )}

            {/* Removed separate payouts banner; consolidated into Reviewer Settings card above */}

            {!!profile?.skills?.length && (
              <MotionView entering={nextEntrance()} style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {profile.skills!.map((s, idx) => (
                    <View key={`${s}-${idx}`} style={styles.skillChip}><Text style={styles.skillChipText}>{s}</Text></View>
                  ))}
                </View>
              </MotionView>
            )}

            {!!(profile?.links?.twitter || profile?.links?.linkedin || profile?.links?.github) && (
              <MotionView entering={nextEntrance()} style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Links</Text>
                <View style={{ flexDirection: 'row' }}>
                  {profile?.links?.twitter ? (
                    <MotionPressable onPress={() => Linking.openURL(profile.links!.twitter!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>Twitter</Text></MotionPressable>
                  ) : null}
                  {profile?.links?.linkedin ? (
                    <MotionPressable onPress={() => Linking.openURL(profile.links!.linkedin!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>LinkedIn</Text></MotionPressable>
                  ) : null}
                  {profile?.links?.github ? (
                    <MotionPressable onPress={() => Linking.openURL(profile.links!.github!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>GitHub</Text></MotionPressable>
                  ) : null}
                </View>
              </MotionView>
            )}

        <MotionView entering={nextEntrance()} style={styles.actionsSection}>
          <MotionPressable style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/settings')} accessibilityLabel="Open account settings">
            <View style={styles.actionIconContainer}>
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionIconGradient}
              />
              <Text style={styles.actionIcon}>⚙️</Text>
            </View>
            <Text style={styles.actionText}>Account Settings</Text>
            <Text style={styles.actionArrow}>›</Text>
          </MotionPressable>
        </MotionView>

        <MotionView entering={nextEntrance()} style={styles.helpSection}>
          <Text style={styles.helpText}>
            Need help or want to share your feedback? Please reach out to{' '}
            <Text 
              style={styles.helpEmail}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = 'mailto:rj@appauro.com';
                } else {
                  Linking.openURL('mailto:rj@appauro.com');
                }
              }}
            >
              rj@appauro.com
            </Text>
          </Text>
        </MotionView>

        <MotionView entering={nextEntrance()} style={styles.dangerSection}>
          <MotionPressable style={styles.logoutButtonDark} onPress={handleLogout}>
            <View style={styles.logoutButtonBorder} />
            <Text style={styles.logoutText}>Logout</Text>
          </MotionPressable>
        </MotionView>
      </ScrollView>
      {refreshing ? renderSkeleton(true) : null}
      
      {/* Confirmation Modal for Disabling Reviewer Status */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowConfirmModal(false);
          setConfirmText('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowConfirmModal(false);
              setConfirmText('');
            }}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity activeOpacity={1}>
                <Text style={styles.modalTitle}>Confirm Disable Reviewer Status</Text>
                <Text style={styles.modalMessage}>
                  To confirm you want to disable your reviewer status, please type "auro" below.
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Type 'auro' to confirm"
                  placeholderTextColor={Colors.brand.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={Platform.OS !== 'web'}
                />
                <RNView style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setConfirmText('');
                      // Reset switch to true since we're canceling
                      if (profile) {
                        setProfile({ ...profile, is_reviewer: true });
                      }
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      confirmText.toLowerCase() !== 'auro' && styles.modalButtonDisabled,
                    ]}
                    onPress={async () => {
                      if (confirmText.toLowerCase() !== 'auro') {
                        return;
                      }
                      try {
                        // Set is_reviewer to null (not false) to match the constraint
                        const updated = await updateProfile({ is_reviewer: null });
                        setProfile(updated);
                        setShowConfirmModal(false);
                        setConfirmText('');
                        Alert.alert(
                          'Reviewer disabled',
                          'You will no longer appear as a reviewer. You can re-enable your status to complete pending reviews.'
                        );
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to update reviewer status');
                      }
                    }}
                    disabled={confirmText.toLowerCase() !== 'auro'}
                  >
                    <Text
                      style={[
                        styles.modalButtonConfirmText,
                        confirmText.toLowerCase() !== 'auro' && styles.modalButtonDisabledText,
                      ]}
                    >
                      Disable
                    </Text>
                  </TouchableOpacity>
                </RNView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
  },
  profileRefreshOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.brand.background,
    zIndex: 6,
  },
  container: { flex: 1, backgroundColor: Colors.brand.background },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 0, backgroundColor: Colors.brand.cardBackground, borderRadius: 30, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  headerContent: { paddingHorizontal: 20, backgroundColor: 'transparent', width: '100%' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'transparent' },
  avatarContainer: { position: 'relative', marginRight: 20, backgroundColor: 'transparent' },
  userInfo: { flex: 1, backgroundColor: 'transparent' },
  userName: { fontSize: 32, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 18, color: Colors.brand.textSecondary, marginBottom: 4, fontWeight: '500' },
  editButton: { 
    paddingVertical: 16, 
    paddingHorizontal: 36, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 12, 
    elevation: 8 
  },
  editButtonText: { 
    color: Colors.brand.textOnGradient, 
    fontSize: 18, 
    fontWeight: '700' 
  },
  statsSection: { margin: 24, marginTop: 32, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: 28, fontWeight: 'bold', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 18 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  statCard: { alignItems: 'center', flex: 1, backgroundColor: 'transparent' },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: Colors.brand.accentMagenta, marginBottom: 6 },
  statLabel: { fontSize: 13, color: Colors.brand.textSecondary, textAlign: 'center', fontWeight: '500' },
  bioSection: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 20, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12, borderWidth: 2, borderColor: Colors.brand.accentOrange, overflow: 'hidden' },
  bioText: { fontSize: 18, color: Colors.brand.textSecondary, lineHeight: 26 },
  actionsSection: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 2, borderColor: Colors.brand.accentOrange, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.brand.divider, marginHorizontal: 4 },
  actionIconContainer: { width: 44, height: 44, borderRadius: 22, marginRight: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  actionIconGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 22 },
  actionIcon: { fontSize: 20, zIndex: 1 },
  actionText: { flex: 1, fontSize: 18, color: Colors.brand.textPrimary, fontWeight: '500' },
  actionArrow: { fontSize: 22, color: Colors.brand.textLight },
  helpSection: { 
    margin: 16, 
    marginBottom: 8,
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 20, 
    padding: 20, 
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
  },
  helpText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  helpEmail: {
    color: Colors.brand.accentMagenta,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dangerSection: { margin: 16, marginBottom: 120 },
  logoutButtonDark: { backgroundColor: Colors.brand.cardBackground, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: Colors.brand.accentOrange },
  logoutButtonBorder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26, borderWidth: 2, borderColor: Colors.brand.accentOrange },
  logoutText: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: 'bold', zIndex: 1 },
  // New enhanced component styles
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  statusChipActive: { backgroundColor: 'rgba(255, 111, 0, 0.15)', borderColor: 'rgba(255, 111, 0, 0.3)' },
  statusChipText: { color: Colors.brand.textSecondary, fontSize: 14, fontWeight: '600' },
  statusChipTextActive: { color: Colors.brand.accentOrange, fontWeight: '700' },
  
  // Reviewer status row
  reviewerStatusRow: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    minHeight: 60,
    flexWrap: 'wrap',
  },
  reviewerStatusLabelContainer: {
    flex: 1,
    minWidth: 120,
    marginRight: 12,
  },
  reviewerStatusLabel: {
    color: Colors.brand.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
    marginRight: 8,
    textAlign: 'center',
  },
  reviewerStatusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reviewerSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    maxWidth: 120,
    minWidth: 70,
  },
  statusIndicatorActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusIndicatorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusIndicatorTextActive: {
    color: '#10b981',
  },
  statusIndicatorPending: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  statusIndicatorTextPending: {
    color: '#fbbf24',
  },
  
  priceCard: { backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', minHeight: 60 },
  priceText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16, flex: 1, marginRight: 12 },
  
  skillChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)' },
  skillChipText: { color: Colors.brand.textPrimary, fontSize: 14, fontWeight: '500' },
  
  socialLinkBtn: { backgroundColor: 'rgba(32,21,50,1.00)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', flexDirection: 'row', alignItems: 'center' },
  socialLinkText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16 },
  socialIcon: { width: 20, height: 20, marginRight: 10, borderRadius: 4 },
  
  // Legacy styles (keeping for backward compatibility)
  segmentContainer: { flexDirection: 'row', backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 10, margin: 16, overflow: 'hidden' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  segmentText: { color: Colors.brand.textSecondary },
  segmentTextActive: { color: Colors.brand.textPrimary, fontWeight: '700' },
  reviewCard: { marginHorizontal: 16, backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.brand.cardBackground },
  emptyListWrapper: { paddingHorizontal: 24, paddingVertical: 8 },
  emptyList: { padding: 24, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: Colors.brand.divider },
  emptyListEmoji: { fontSize: 28, marginBottom: 6 },
  emptyListTitle: { color: Colors.brand.textPrimary, fontWeight: '700', marginBottom: 6 },
  emptyListText: { color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 10 },
  primaryCta: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primaryCtaText: { color: '#fff', fontWeight: '700' },
  linkBtn: { backgroundColor: Colors.brand.cardBackgroundLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  linkText: { color: Colors.brand.textPrimary, fontWeight: '600' },
  editRateButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 6, 
    elevation: 4 
  },
  editRateButtonText: { 
    color: Colors.brand.textOnGradient, 
    fontWeight: '700', 
    fontSize: 14 
  },
  copyLinkButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#10b981',
    shadowColor: '#10b981', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 6, 
    elevation: 4 
  },
  copyLinkButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  
  shareProfileButton: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  shareProfileButtonText: {
    color: Colors.brand.textPrimary,
    fontWeight: '700',
    fontSize: 16
  },
  
  // Earnings tracker styles
  earningsCard: { 
    backgroundColor: 'rgba(32, 21, 50, 0.8)', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 111, 0, 0.2)',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  earningsHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  earningsLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  earningsTotal: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
    textShadowColor: 'rgba(255, 111, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  stripeDashboardButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  stripeDashboardButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#635BFF',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
  },
  stripeDashboardText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  earningsStats: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
    flexWrap: 'nowrap',
  },
  earningStat: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  earningStatColumn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  earningStatBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  earningStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
    zIndex: 1,
    fontFamily: 'Poppins_700Bold',
  },
  earningStatLabel: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
    zIndex: 1,
    letterSpacing: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  rateInput: {
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.brand.textPrimary,
    backgroundColor: Colors.brand.cardBackgroundLight,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  breakdownContainer: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    color: Colors.brand.textPrimary,
    fontWeight: '500',
  },
  breakdownFee: {
    color: Colors.brand.error,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  breakdownTotalValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.border,
  },
  modalButtonSave: {
    backgroundColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  setupProgressContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
  },
  setupProgressHeader: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  setupProgressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  setupProgressSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 4,
  },
  setupIndicator: {
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
  },
  setupIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  setupIndicatorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  setupIndicatorTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  setupIndicatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 2,
    fontFamily: 'Poppins_600SemiBold',
  },
  setupIndicatorSubtitle: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
  },
  setupIndicatorArrow: {
    fontSize: 20,
    color: Colors.brand.accentOrange,
    fontWeight: '700',
  },
  modalButtonCancelText: {
    color: Colors.brand.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  paymentNoticeContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  paymentNoticeText: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  paymentButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  transactionHistoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    alignItems: 'center',
  },
  transactionHistoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmInput: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    marginRight: 6,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.brand.status.rejected,
    marginLeft: 6,
  },
  modalButtonDisabled: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    opacity: 0.5,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalButtonDisabledText: {
    color: Colors.brand.textSecondary,
  },
  pendingApprovalCard: {
    marginTop: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  pendingApprovalContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  pendingApprovalIcon: {
    fontSize: 28,
    marginRight: 12,
    marginTop: 2,
  },
  pendingApprovalTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pendingApprovalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  pendingApprovalMessage: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  revokeButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});



