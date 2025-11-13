import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfile, updateProfilePreferences } from '@/lib/profile';

export default function RateScreen() {
  const insets = useSafeAreaInsets();
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    const rateNumber = rate.trim() ? Number(rate.trim()) : null;
    
    if (!rateNumber || isNaN(rateNumber) || rateNumber <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a valid positive number.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ hourly_rate: rateNumber });
      await updateProfilePreferences({ onboarding_step: 'reviewer_profile_picture' });
      router.push('/onboarding/reviewer/profile-picture');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const rateNumber = rate.trim() ? Number(rate.trim()) : null;
  // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
  const auroFee = rateNumber && rateNumber > 0 ? rateNumber * 0.2 : 0; // 20% platform fee
  const takeHome = rateNumber && rateNumber > 0 ? rateNumber - auroFee : 0; // Reviewer gets 80%

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Set Your Rate</Text>
          <Text style={styles.description}>
            Set your price per review (what customers pay). You'll receive 80% of this amount - Auro covers all processing fees.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price per Review (USD)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="65"
                placeholderTextColor={Colors.brand.textSecondary}
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
              />
            </View>
          </View>

          {rateNumber && rateNumber > 0 && (
            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Rate Breakdown</Text>
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Customer pays</Text>
                  <Text style={styles.breakdownValue}>${rateNumber.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Auro fee (20%)</Text>
                  <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${auroFee.toFixed(2)}</Text>
                </View>
                <View style={[styles.breakdownDivider, { marginTop: 8 }]} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotalLabel}>Your take-home</Text>
                  <Text style={styles.breakdownTotalValue}>${takeHome.toFixed(2)} (80%)</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { fontSize: 12, fontStyle: 'italic', color: Colors.brand.textSecondary }]}>
                    * Processing fees are covered by Auro
                  </Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.nextButton, saving && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={saving}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              style={styles.buttonGradient}
            >
              <Text style={styles.nextButtonText}>
                {saving ? 'Saving...' : 'Next'}
              </Text>
            </ExpoLinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  content: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  breakdownContainer: {
    marginBottom: 32,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.brand.divider,
    marginVertical: 8,
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
  nextButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
});


