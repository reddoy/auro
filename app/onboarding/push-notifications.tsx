import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { setupPushNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';

export default function PushNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await setupPushNotifications();
      if (success) {
        // Continue to the next step (either role selection or thank you)
        router.replace('/onboarding/role-selection');
      } else {
        Alert.alert(
          'Permission Denied',
          'Push notifications were not enabled. You can enable them later in your device settings.',
          [
            {
              text: 'Skip for Now',
              style: 'cancel',
              onPress: () => router.replace('/onboarding/role-selection'),
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
        [{ text: 'OK', onPress: () => router.replace('/onboarding/role-selection') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/onboarding/role-selection');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={80} color={Colors.brand.accentMagenta} />
          </View>

          <Text style={styles.title}>Stay Updated! 🔔</Text>
          <Text style={styles.subtitle}>
            Enable push notifications to get great updates
          </Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.brand.success} />
              <Text style={styles.benefitText}>
                Get notified when your review is completed
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.brand.success} />
              <Text style={styles.benefitText}>
                Receive updates on new review requests (for reviewers)
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.brand.success} />
              <Text style={styles.benefitText}>
                Never miss important updates about your account
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.brand.success} />
              <Text style={styles.benefitText}>
                Get payment notifications when you receive payouts
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleEnable}
              disabled={loading}
              activeOpacity={0.8}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Setting up...' : 'Enable Notifications'}
                </Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.privacyText}>
            You can change this setting anytime in your device settings
          </Text>
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
    paddingTop: 60,
  },
  content: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    borderRadius: 60,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 0, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 26,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 40,
    gap: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
  },
  benefitText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginLeft: 16,
    flex: 1,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
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
  primaryButtonDisabled: {
    opacity: 0.6,
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
  skipButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
  },
  privacyText: {
    fontSize: 12,
    color: Colors.brand.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});

