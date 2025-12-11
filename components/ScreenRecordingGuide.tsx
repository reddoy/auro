import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

type Props = {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export default function ScreenRecordingGuide({ visible, onClose, onContinue }: Props) {
  const insets = useSafeAreaInsets();

  const iosSteps = [
    {
      title: 'Open Control Center',
      description: 'Swipe down from the top-right corner of your screen',
    },
    {
      title: 'Find Screen Recording',
      description: 'Tap and hold the Screen Recording button (circle with a dot inside)',
    },
    {
      title: 'Enable Microphone',
      description: 'Tap the Microphone button to turn it ON (it should be highlighted in red/orange)',
      important: true,
    },
    {
      title: 'Start Recording',
      description: 'Tap the "Start Recording" button',
    },
    {
      title: 'Return to App',
      description: 'Come back to this app and you\'ll see the video review interface',
    },
    {
      title: 'Stop Recording',
      description: 'When finished, tap the red recording indicator at the top and select "Stop"',
    },
  ];

  const androidSteps = [
    {
      title: 'Open Quick Settings',
      description: 'Swipe down twice from the top of your screen',
    },
    {
      title: 'Find Screen Record',
      description: 'Find and tap the "Screen Record" or "Screen Recorder" tile',
    },
    {
      title: 'Grant Permission',
      description: 'If prompted, grant screen recording permission',
    },
    {
      title: 'Start Recording',
      description: 'Tap "Start" to begin recording',
    },
    {
      title: 'Record Your Review',
      description: 'Return to this app and record your video review',
    },
    {
      title: 'Stop Recording',
      description: 'When finished, swipe down and tap "Stop" in the notification panel',
    },
  ];

  const steps = Platform.OS === 'ios' ? iosSteps : androidSteps;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>How to Screen Record</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Follow these steps to record your video review</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, step.important && styles.stepNumberImportant]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDescription}>{step.description}</Text>
                {step.important && (
                  <View style={styles.importantBadge}>
                    <Text style={styles.importantBadgeText}>Important</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>💡</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Make sure to enable the microphone before starting. Your face will appear in the circular camera preview while you swipe through photos.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={onContinue}
            style={styles.continueButton}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.accentOrange, Colors.brand.accentMagenta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>I'm Ready to Record</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  stepCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.status.accepted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberImportant: {
    backgroundColor: Colors.brand.accentOrange,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  stepTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    letterSpacing: -0.3,
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
    marginLeft: 54,
    marginTop: 2,
  },
  importantBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 54,
    backgroundColor: 'rgba(255, 111, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
  },
  importantBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.accentOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipCard: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 111, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  tipText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});



