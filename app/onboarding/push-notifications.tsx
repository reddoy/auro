import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { setupPushNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { updateProfilePreferences } from '@/lib/profile';

export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [enabling, setEnabling] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    updateProfilePreferences({
      onboarding_completed: false,
      onboarding_step: 'role_selection',
    }).catch(() => {});
  }, []);

  const handleGetStarted = () => {
    router.replace('/onboarding/role-selection');
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const success = await setupPushNotifications();
      if (success) {
        setNotificationsEnabled(true);
        Alert.alert('Notifications Enabled', 'We will keep you posted on review updates.');
      } else {
        Alert.alert(
          'Permission Denied',
          'We were not able to enable push notifications. You can enable them later in your device settings.',
          [
            {
              text: 'OK',
              style: 'default',
            },
            {
              text: 'Try Again',
              onPress: () => handleEnable(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error setting up push notifications:', error);
      Alert.alert(
        'Error',
        'There was an error setting up push notifications. You can enable them later in settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setEnabling(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            paddingBottom: insets.bottom + 24,
            paddingTop: Math.max(24, insets.top + 12),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>🎉</Text>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Thanks for joining Auro!
          </Text>
          <Text style={styles.subtitle}>
            Let’s get you set up. We’ll walk you through a few quick steps to tailor Auro to how you want to use it.
          </Text>

          <View style={styles.stepsCard}>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.brand.success} />
              <Text style={styles.stepText}>Choose whether you want to review or get reviewed</Text>
            </View>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.brand.success} />
              <Text style={styles.stepText}>Add a few details so people know what to expect</Text>
            </View>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.brand.success} />
              <Text style={styles.stepText}>Share your profile and start connecting</Text>
            </View>
          </View>

          <View style={styles.benefitsContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Let’s build your profile</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, enabling && styles.secondaryButtonDisabled]}
              onPress={handleEnable}
              disabled={enabling}
              activeOpacity={0.85}
            >
              <Ionicons
                name={notificationsEnabled ? 'notifications' : 'notifications-outline'}
                size={20}
                color={Colors.brand.accentMagenta}
              />
              <Text style={styles.secondaryButtonText}>
                {notificationsEnabled ? 'Notifications enabled' : 'Enable push notifications'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hintText}>
              Notifications help you stay updated when reviews are submitted and when payouts hit your Stripe account.
            </Text>
            {notificationsEnabled && (
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.brand.success} />
                <Text style={styles.successBadgeText}>All set! You can change this anytime in settings.</Text>
              </View>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  content: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  stepText: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    flex: 1,
    lineHeight: 22,
    backgroundColor: 'transparent',
  },
  benefitsContainer: {
    width: '100%',
    gap: 14,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.25)',
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.accentMagenta,
  },
  hintText: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(61, 220, 132, 0.15)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 132, 0.35)',
  },
  successBadgeText: {
    fontSize: 13,
    color: Colors.brand.success,
    textAlign: 'center',
  },
});

