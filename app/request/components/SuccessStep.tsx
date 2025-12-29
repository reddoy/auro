import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

type Props = {
  requestId?: string;
  onBack: () => void;
};

export default function SuccessStep({ requestId, onBack }: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.description}>
          Your review request has been submitted and payment processed successfully.
        </Text>
        
        {requestId && (
          <View style={styles.requestInfo}>
            <Text style={styles.requestLabel}>Request ID:</Text>
            <Text style={styles.requestId}>{requestId}</Text>
          </View>
        )}

        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>What happens next:</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineStep}>
              <Text style={styles.timelineStepNumber}>1</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineItemTitle}>Review Assignment</Text>
              <Text style={styles.timelineItemText}>
                Your selected reviewer will be notified immediately
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineStep}>
              <Text style={styles.timelineStepNumber}>2</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineItemTitle}>Review Acceptance</Text>
              <Text style={styles.timelineItemText}>
                Your reviewer has 2 weeks to accept or deny your request
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineStep}>
              <Text style={styles.timelineStepNumber}>3</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineItemTitle}>Review Process</Text>
              <Text style={styles.timelineItemText}>
                Once accepted, your reviewer will provide detailed feedback within 48 hours
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/requests')}
        >
          <ExpoLinearGradient
            colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>View My Requests</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  requestInfo: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  requestLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 4,
  },
  requestId: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  timeline: {
    width: '100%',
    marginBottom: 32,
  },
  timelineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineStepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  timelineContent: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  timelineItemText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
});
