import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';

export default function SetRateScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingRate, setEditingRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        setEditingRate(p?.hourly_rate != null ? String(p.hourly_rate) : '');
      } catch (e: any) {
        Alert.alert('Error', 'Failed to load profile');
      }
    };
    loadProfile();
  }, []);

  const handleSaveRate = useCallback(async () => {
    try {
      setSavingRate(true);
      const rate = editingRate.trim();
      const rateNumber = rate ? Number(rate) : null;
      
      if (rate && (isNaN(rateNumber) || rateNumber <= 0)) {
        Alert.alert('Invalid Rate', 'Please enter a valid positive number.');
        return;
      }

      const updated = await updateProfile({ hourly_rate: rateNumber });
      setProfile(updated);
      
      // Show confirmation with simplified calculation
      if (rateNumber !== null && rateNumber > 0) {
        // Simplified: Reviewer gets 80% of the total amount (20% Auro fee)
        const reviewerEarnings = rateNumber * 0.8;
        const auroFee = rateNumber * 0.2;
        
        Alert.alert(
          'Rate Updated!', 
          `Your rate is now $${rateNumber}/review.\n\nYou will earn: $${reviewerEarnings.toFixed(2)}\n(Auro fee: $${auroFee.toFixed(2)})`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Rate Updated!', 'Your rate has been cleared.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update rate');
    } finally {
      setSavingRate(false);
    }
  }, [editingRate]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Your Rate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Set your price per review. This is what clients will pay for your review service.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price per Review</Text>
            <TextInput
              style={styles.rateInput}
              value={editingRate}
              onChangeText={setEditingRate}
              placeholder="e.g. 42"
              keyboardType="numeric"
              placeholderTextColor={Colors.brand.textSecondary}
            />
          </View>

          {!!editingRate && !isNaN(Number(editingRate)) && Number(editingRate) > 0 && (
            <View style={styles.breakdownContainer}>
              {(() => {
                const price = Number(editingRate);
                // Simplified: Reviewer gets 80% of the total (20% Auro fee)
                const reviewerEarnings = price * 0.8;
                const auroFee = price * 0.2;
                return (
                  <>
                    <Text style={styles.breakdownTitle}>Rate Breakdown</Text>
                    <View style={styles.breakdownCard}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Your price per review</Text>
                        <Text style={styles.breakdownValue}>${price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Auro fee (20%)</Text>
                        <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${auroFee.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.breakdownDivider, { marginTop: 8 }]} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownTotalLabel}>You earn</Text>
                        <Text style={styles.breakdownTotalValue}>${reviewerEarnings.toFixed(2)}</Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveButton, savingRate && styles.saveButtonDisabled]} 
            onPress={handleSaveRate}
            disabled={savingRate}
          >
            <Text style={styles.saveButtonText}>
              {savingRate ? 'Saving...' : 'Save Rate'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: Colors.brand.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.divider
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backButtonText: { 
    fontSize: 32, 
    color: Colors.brand.textPrimary, 
    lineHeight: 40 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.brand.textPrimary 
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
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    backgroundColor: Colors.brand.cardBackground,
    textAlign: 'center',
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
  },
  breakdownTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
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
  saveButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
});
