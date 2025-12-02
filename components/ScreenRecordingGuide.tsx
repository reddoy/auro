import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export default function ScreenRecordingGuide({ visible, onClose, onContinue }: Props) {
  const insets = useSafeAreaInsets();

  const iosSteps = [
    'Open Control Center by swiping down from the top-right corner (or up from the bottom on older iPhones)',
    'Tap the Screen Recording button (circle with a dot inside)',
    'If prompted, tap "Start Recording"',
    'Return to this app and record your video review',
    'When finished, tap the red recording indicator at the top of your screen and select "Stop"',
  ];

  const androidSteps = [
    'Open Quick Settings by swiping down twice from the top of your screen',
    'Find and tap the "Screen Record" or "Screen Recorder" tile',
    'If prompted, grant screen recording permission',
    'Tap "Start" to begin recording',
    'Return to this app and record your video review',
    'When finished, swipe down and tap "Stop" in the notification panel',
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
          <Text style={styles.title}>How to Screen Record</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Follow these steps to record your video review using your device's screen recording feature:
          </Text>

          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteTitle}>💡 Tip</Text>
            <Text style={styles.noteText}>
              Make sure your face is visible in the circular camera preview while you record. 
              The screen recording will capture both your face and the app content.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={onContinue}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>I'm Ready to Record</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.divider,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginTop: 20,
    marginBottom: 24,
    lineHeight: 24,
  },
  stepsContainer: {
    gap: 20,
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.status.accepted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    lineHeight: 24,
  },
  noteContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.brand.divider,
  },
  continueButton: {
    backgroundColor: Colors.brand.status.accepted,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


