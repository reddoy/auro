import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function ThankYouScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isReviewer = type === 'reviewer';

  const handleGoHome = () => {
    if (isReviewer) {
      // For reviewers, go to their requests page (my reviews)
      router.replace('/(tabs)/requests');
    } else {
      // For get reviewed, go to home (requests page)
      router.replace('/(tabs)/requests');
    }
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
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>
            {isReviewer ? 'Welcome to the Auro Community!' : 'Thank You for Signing Up!'}
          </Text>
          <Text style={styles.message}>
            {isReviewer 
              ? "You're all set! You can now start receiving review requests and earning money. We're excited to have you as part of our reviewer community."
              : "You're all set! You can now discover reviewers and request reviews whenever you're ready."
            }
          </Text>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {isReviewer ? 'Take Me to My Reviews' : 'Take Me to Home'}
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  content: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins_700Bold',
  },
  message: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
    paddingHorizontal: 20,
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
});


