import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfile, updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown } from 'react-native-reanimated';

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
      router.replace('/onboarding/reviewer/profile-picture');
    } catch (e: any) {
      const message = e?.message || 'Failed to save rate';
      if (message.toLowerCase().includes('not signed in') || message.toLowerCase().includes('not authenticated')) {
        router.replace('/auth');
        return;
      }
      Alert.alert('Error', message);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: insets.bottom + 100
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title}>Set Your Rate</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Set your price per review (what customers pay). You'll receive 80% of this amount - Auro covers all processing fees.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(2)} style={styles.inputContainer}>
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
          </MotionView>

          {rateNumber && rateNumber > 0 && (
            <MotionView entering={cardEntrance(3)} style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Rate Breakdown</Text>
              <RNView style={styles.breakdownCard}>
                <RNView style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Customer pays</Text>
                  <Text style={styles.breakdownValue}>${rateNumber.toFixed(2)}</Text>
                </RNView>
                <RNView style={styles.breakdownDivider} />
                <RNView style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Auro fee (20%)</Text>
                  <Text style={[styles.breakdownValue, styles.breakdownFee]}>-${auroFee.toFixed(2)}</Text>
                </RNView>
                <RNView style={[styles.breakdownDivider, { marginTop: 8 }]} />
                <RNView style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotalLabel}>Your take-home</Text>
                  <Text style={styles.breakdownTotalValue}>${takeHome.toFixed(2)} (80%)</Text>
                </RNView>
                <RNView style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { fontSize: 12, fontStyle: 'italic', color: Colors.brand.textSecondary }]}>
                    * Processing fees are covered by Auro
                  </Text>
                </RNView>
              </RNView>
            </MotionView>
          )}

          <MotionView entering={cardEntrance(4)}>
            <MotionPressable 
              style={[styles.nextButton, saving && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={saving}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {saving ? 'Saving...' : 'Next'}
                </Text>
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    minHeight: '100%',
  },
  content: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  breakdownContainer: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  breakdownCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.brand.divider,
    marginVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  breakdownFee: {
    color: '#ef4444',
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  breakdownTotalValue: {
    fontSize: 20,
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
    paddingVertical: 14,
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


