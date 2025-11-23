import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { setupPushNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance, subtleFadeIn } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function EnableNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [enabling, setEnabling] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const success = await setupPushNotifications();
      if (success) {
        setNotificationsEnabled(true);
        // Small delay to show success state
        setTimeout(() => {
          router.replace('/onboarding/role-selection');
        }, 1000);
      } else {
        Alert.alert(
          'Permission Denied',
          'We were not able to enable push notifications. You can enable them later in your device settings.',
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
        [
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => router.replace('/onboarding/role-selection'),
          },
        ]
      );
    } finally {
      setEnabling(false);
    }
  };

  const handleSkip = () => {
    router.replace('/onboarding/role-selection');
  };

  return (
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <View 
        style={[
          styles.content,
          {
            height: Platform.OS === 'ios' ? screenHeight - insets.top - insets.bottom : undefined,
            paddingTop: Platform.OS === 'ios' ? 0 : Math.max(20, insets.top + 20),
            paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.topSection}>
          <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={64} color={Colors.brand.accentOrange} />
            </View>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.title}>
              Stay Updated
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item * 2)}>
            <Text style={styles.subtitle}>
              Get notified when your review is completed and when important updates happen.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(3)} style={styles.benefitsCard}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.benefitText}>Know when your review is ready</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.benefitText}>Get alerts for new messages</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.benefitText}>Stay on top of your requests</Text>
            </View>
          </MotionView>
        </View>

        <MotionView entering={cardEntrance(4)} style={styles.buttonContainer}>
          <MotionPressable 
            style={[styles.primaryButton, (enabling || notificationsEnabled) && styles.primaryButtonDisabled]}
            onPress={handleEnable}
            disabled={enabling || notificationsEnabled}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              style={styles.buttonGradient}
            >
              {notificationsEnabled ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.brand.textOnGradient} />
                  <Text style={styles.primaryButtonText}>Notifications Enabled!</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {enabling ? 'Enabling...' : 'Enable Notifications'}
                </Text>
              )}
            </ExpoLinearGradient>
          </MotionPressable>

          <MotionView entering={subtleFadeIn().delay(MotionDelays.section)}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={enabling || notificationsEnabled}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </MotionView>
        </MotionView>
      </View>
    </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 111, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 26,
  },
  benefitsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  benefitText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    flex: 1,
    lineHeight: 22,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    paddingTop: 20,
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
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.brand.textSecondary,
    opacity: 0.7,
  },
});

