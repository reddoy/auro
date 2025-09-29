import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Linking, Switch } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';
import { createStripeExpressLoginLink, createStripeExpressOnboardingLink } from '@/lib/payments';

export default function ReviewerSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const hourlyRateRef = useRef<any>(null);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p) {
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          try {
            const link = await createStripeExpressLoginLink(p.id);
            setStripePortalUrl(link);
          } catch {}
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Partial<Profile> = {
        is_reviewer: true,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      Alert.alert('Saved', 'Your reviewer settings have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
        contentInsetAdjustmentBehavior="always"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reviewer Settings</Text>
          <Text style={styles.headerSubtitle}>Control your reviewer status and price per review.</Text>
        </View>

        {/* Reviewer Status Section */}
        <View style={styles.card}>
          <View style={styles.statusSection}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusChip, isReviewer && styles.statusChipActive]}>
                <Text style={[styles.statusChipText, isReviewer && styles.statusChipTextActive]}>
                  {isReviewer ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.statusRight}>
              <Text style={styles.statusLabel}>Reviewer Status</Text>
              <Switch
                value={isReviewer}
                onValueChange={async (val) => {
                  try {
                    const updated = await updateProfile({ is_reviewer: val });
                    setProfile(updated);
                    setIsReviewer(val);
                    if (val) {
                      Alert.alert('Reviewer enabled', 'Your reviewer profile is now active.');
                    } else {
                      Alert.alert('Reviewer disabled', 'You will no longer appear as a reviewer.');
                    }
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to update reviewer status');
                  }
                }}
                trackColor={{ false: Colors.brand.border, true: Colors.brand.status.paid }}
                thumbColor={isReviewer ? '#FFFFFF' : Colors.brand.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Price per Review Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price per Review</Text>
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                {hourlyRate ? `$${hourlyRate}/review` : 'Not set'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                // Focus the input when edit is pressed
                hourlyRateRef.current?.focus();
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputSection}>
            <LabeledInput 
              label="Set your price per review" 
              value={hourlyRate} 
              onChangeText={setHourlyRate} 
              keyboardType="numeric" 
              placeholder="e.g. 42" 
              inputRef={hourlyRateRef} 
              returnKeyType="done" 
              blurOnSubmit 
            />
          </View>

          {!!hourlyRate && !isNaN(Number(hourlyRate)) && (
            <View style={styles.breakdownContainer}>
              {(() => {
                const price = Math.max(0, Number(hourlyRate) || 0);
                const auroFee = price * 0.15; // founders 15%
                const stripeFee = Math.max(0, price * 0.029 + 0.3); // estimate
                const net = Math.max(0, price - auroFee - stripeFee);
                return (
                  <>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Your price</Text>
                      <Text style={styles.breakdownValue}>${price.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Auro fee (15%)</Text>
                      <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${auroFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Stripe fee (est.)</Text>
                      <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${stripeFee.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                      <Text style={styles.breakdownTotalLabel}>Estimated take-home</Text>
                      <Text style={styles.breakdownTotalValue}>${net.toFixed(2)}</Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Payouts Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payouts</Text>
          <View style={styles.payoutsSection}>
            <View style={styles.payoutsContainer}>
              <Text style={styles.payoutsText}>
                {stripePortalUrl ? 'Stripe connected' : 'Not connected'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.openButton, { opacity: payoutsLoading ? 0.7 : 1 }]}
              disabled={payoutsLoading}
              onPress={async () => {
                try {
                  setPayoutsLoading(true);
                  if (stripePortalUrl) {
                    console.log('[stripe-login] Opening', stripePortalUrl);
                    Linking.openURL(stripePortalUrl);
                    return;
                  }
                  const reviewerId = profile?.id || '';
                  const url = await createStripeExpressOnboardingLink(reviewerId);
                  console.log('[stripe-onboarding] reviewerId:', reviewerId, 'url:', url);
                  if (url) {
                    Linking.openURL(url);
                  } else {
                    Alert.alert('Stripe', 'Setup link not available. Check env EXPO_PUBLIC_SUPABASE_URL and function URL envs.');
                  }
                } catch (e: any) {
                  console.log('[stripe-onboarding] error', e?.message || e);
                  Alert.alert('Stripe', e?.message || 'Failed to open Stripe');
                } finally {
                  setPayoutsLoading(false);
                }
              }}
            >
              <Text style={styles.openButtonText}>
                {payoutsLoading ? 'Loading…' : (stripePortalUrl ? 'Open' : 'Connect')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveBar}>
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput(props: any) {
  const { label, style, multiline, numberOfLines, inputRef, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        ref={inputRef}
        style={[styles.input, multiline && { height: Math.max(96, (numberOfLines || 4) * 22) }, style]}
        placeholderTextColor={Colors.brand.textSecondary}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.brand.background 
  },
  
  // Header styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
  },

  // Card styles
  card: { 
    margin: 16, 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: Colors.brand.border, 
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 6 
  },
  
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: Colors.brand.textPrimary, 
    marginBottom: 16 
  },

  // Status section styles
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  statusChipActive: {
    backgroundColor: Colors.brand.accentOrange,
    borderColor: Colors.brand.accentOrange,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  statusLabel: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },

  // Price section styles
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    flex: 1,
    marginRight: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  editButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    marginTop: 8,
  },

  // Breakdown styles
  breakdownContainer: {
    marginTop: 16,
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.brand.border,
    marginTop: 8,
    paddingTop: 12,
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
  breakdownTotalLabel: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  breakdownTotalValue: {
    fontSize: 16,
    color: Colors.brand.success,
    fontWeight: '700',
  },

  // Payouts section styles
  payoutsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payoutsContainer: {
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    flex: 1,
    marginRight: 12,
  },
  payoutsText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.brand.textPrimary,
  },
  openButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Input styles
  label: { 
    fontSize: 16, 
    color: Colors.brand.textSecondary, 
    marginBottom: 8,
    fontWeight: '500',
  },
  input: { 
    borderWidth: 1, 
    borderColor: Colors.brand.border, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: Colors.brand.textPrimary, 
    fontSize: 16,
    backgroundColor: Colors.brand.cardBackgroundSecondary,
  },

  // Save button styles
  saveBar: { 
    padding: 16 
  },
  saveButton: { 
    backgroundColor: Colors.brand.accentMagenta, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600' 
  },
});


