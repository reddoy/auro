import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, KeyboardAvoidingView, Platform, ScrollView, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';
import { MotionView, cardEntrance } from '@/components/motion';
import { SkeletonBlock, SkeletonCircle, SkeletonParagraph } from '@/components/Skeletons';
import PriceTierPicker from '@/components/PriceTierPicker';
import { findNearestTier } from '@/lib/iapPriceTiers';

export default function SetRateScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p?.hourly_rate != null) {
          const tier = findNearestTier(p.hourly_rate);
          setSelectedRate(tier);
        } else {
          setSelectedRate(null);
        }
      } catch (e: any) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSaveRate = useCallback(async () => {
    try {
      setSavingRate(true);

      if (!selectedRate) {
        Alert.alert('Invalid Rate', 'Please select a price tier.');
        return;
      }

      const updated = await updateProfile({ hourly_rate: selectedRate });
      setProfile(updated);
      
      // Show confirmation with simple calculation
      // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
      const auroFee = selectedRate * 0.2; // 20% platform fee
      const reviewerTakeHome = selectedRate - auroFee; // Reviewer gets 80%
      
      Alert.alert(
        'Rate Updated!', 
        `Your price per review: $${selectedRate.toFixed(2)}\n\nAuro fee (20%): -$${auroFee.toFixed(2)}\n\nYour take-home: $${reviewerTakeHome.toFixed(2)} (80%)\n\n* Processing fees are covered by Auro`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update rate');
    } finally {
      setSavingRate(false);
    }
  }, [selectedRate]);

  if (loading) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <RNView style={[styles.header, { paddingTop: 12, backgroundColor: 'transparent' }]}>
          <RNView style={{ marginRight: 12, backgroundColor: 'transparent' }}>
            <SkeletonCircle size={40} />
          </RNView>
          <SkeletonBlock width={160} height={24} radius={12} />
          <RNView style={[styles.headerSpacer, { backgroundColor: 'transparent' }]} />
        </RNView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 68 + insets.bottom + 24, paddingHorizontal: 20, paddingTop: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <MotionView entering={cardEntrance(0)} style={styles.skeletonCard}>
            <SkeletonParagraph lines={3} widths={['100%', '90%', '85%']} />
          </MotionView>

          <MotionView entering={cardEntrance(1)} style={styles.skeletonCard}>
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="100%" height={52} radius={18} style={{ marginTop: 16 }} />
          </MotionView>

          <MotionView entering={cardEntrance(2)} style={styles.skeletonCard}>
            <SkeletonBlock width="40%" height={18} />
            <SkeletonParagraph
              lines={4}
              lineHeight={14}
              widths={['95%', '85%', '75%', '65%']}
              style={{ marginTop: 16 }}
            />
          </MotionView>

          <MotionView entering={cardEntrance(3)} style={[styles.saveButton, styles.saveButtonDisabled, styles.skeletonButton]}>
            <SkeletonBlock width="60%" height={18} />
          </MotionView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Your Rate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 68 + insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Set your price per review (what customers pay). You'll receive 80% of this amount - Auro covers all processing fees.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price per Review (What Customer Pays)</Text>
            <TouchableOpacity
              style={styles.rateInput}
              onPress={() => setShowPicker(true)}
            >
              <Text style={[styles.rateInputText, !selectedRate && styles.rateInputPlaceholder]}>
                {selectedRate ? `$${selectedRate.toLocaleString()}` : 'Tap to select price'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedRate && selectedRate > 0 && (
            <View style={styles.breakdownContainer}>
              {(() => {
                const customerPrice = selectedRate;
                const auroFee = customerPrice * 0.2; // 20% platform fee
                const reviewerTakeHome = customerPrice - auroFee; // Reviewer gets 80%
                return (
                  <>
                    <Text style={styles.breakdownTitle}>Rate Breakdown</Text>
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Customer pays</Text>
                        <Text style={styles.breakdownValue}>${customerPrice.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Auro fee (20%)</Text>
                        <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${auroFee.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.breakdownDivider, { marginTop: 8 }]} />
                      <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                        <Text style={styles.breakdownTotalLabel}>Your take-home</Text>
                        <Text style={styles.breakdownTotalValue}>${reviewerTakeHome.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { fontSize: 12, fontStyle: 'italic', color: Colors.brand.textSecondary }]}>
                          * Processing fees are covered by Auro
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveButton, (savingRate || loading) && styles.saveButtonDisabled]} 
            onPress={handleSaveRate}
            disabled={savingRate || loading}
          >
            <Text style={styles.saveButtonText}>
              {savingRate ? 'Saving...' : 'Save Rate'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PriceTierPicker
        visible={showPicker}
        value={selectedRate}
        onValueChange={(value) => setSelectedRate(value)}
        onClose={() => setShowPicker(false)}
        title="Select Your Rate"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.brand.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: Colors.brand.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground
  },
  backButtonText: { 
    fontSize: 24, 
    color: Colors.brand.textPrimary,
    fontWeight: '300'
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold'
  },
  headerSpacer: { 
    width: 40 
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 20 
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 24,
    lineHeight: 24
  },
  inputContainer: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8
  },
  rateInput: { 
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.brand.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
  },
  rateInputText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  rateInputPlaceholder: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.brand.textSecondary,
  },
  breakdownContainer: {
    marginBottom: 24
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12
  },
  breakdownCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.brand.divider,
    marginVertical: 8
  },
  breakdownLabel: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  breakdownFee: {
    color: '#ef4444',
  },
  breakdownTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    letterSpacing: 0.2,
  },
  breakdownTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.3,
  },
  breakdownTotalRow: {
    paddingVertical: 12,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  skeletonCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  skeletonButton: {
    marginTop: 4,
  },
  saveButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
});
