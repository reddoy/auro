import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useToast } from '@/components/Toast';
import { scheduleLocalNotification } from '@/lib/notifications';
import { MotionView, cardEntrance } from '@/components/motion';

export default function TestNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const testToast = (message: string) => {
    show(message);
  };

  const testPushNotification = async (title: string, body: string, type?: string, requestId?: string) => {
    try {
      await scheduleLocalNotification(title, body, {
        type,
        requestId: requestId || 'test-123',
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
      show('Error scheduling notification');
    }
  };

  const notificationTests = [
    // Toast notifications
    {
      category: 'Toast Notifications',
      tests: [
        {
          label: 'Success Message',
          action: () => testToast('Review submitted successfully! ✨'),
          description: 'Standard success toast',
        },
        {
          label: 'Info Message',
          action: () => testToast('Accepted! You can start the review. ✅'),
          description: 'Info toast message',
        },
        {
          label: 'Action Confirmed',
          action: () => testToast('Declined the request. ❌'),
          description: 'Action confirmation toast',
        },
        {
          label: 'Short Message',
          action: () => testToast('Saved! 💾'),
          description: 'Brief toast notification',
        },
        {
          label: 'Long Message',
          action: () => testToast('This is a longer notification message that demonstrates how the toast handles multiple lines of text and longer content.'),
          description: 'Multi-line toast message',
        },
      ],
    },
    // Push notifications
    {
      category: 'Push Notifications',
      tests: [
        {
          label: 'Review Completed',
          action: () => testPushNotification(
            'Review Completed!',
            'Your review is ready! Tap to view your feedback. ✨',
            'review_completed',
            'test-request-1'
          ),
          description: 'Notification when a review is completed',
        },
        {
          label: 'Request Accepted',
          action: () => testPushNotification(
            'Request Accepted!',
            'A new review request has been accepted! Start reviewing now! 🎉',
            'request_accepted',
            'test-request-2'
          ),
          description: 'Notification when a request is accepted',
        },
        {
          label: 'Payment Received',
          action: () => testPushNotification(
            'Payment Received!',
            'Your payment has been processed successfully! 💰',
            'payment_received',
            'test-request-3'
          ),
          description: 'Notification for payment confirmation',
        },
        {
          label: 'New Request',
          action: () => testPushNotification(
            'New Review Request!',
            'You have a new review request waiting for your response! 📬',
            'new_request',
            'test-request-4'
          ),
          description: 'Notification for new review requests',
        },
        {
          label: 'Review Submitted',
          action: () => testPushNotification(
            'Review Submitted!',
            'Your review has been submitted and is being processed! 🚀',
            'review_submitted',
            'test-request-5'
          ),
          description: 'Notification when a review is submitted',
        },
        {
          label: 'Custom Notification',
          action: () => testPushNotification(
            'Custom Title',
            'This is a custom notification with your own message content.',
            'custom',
            'test-request-6'
          ),
          description: 'Custom notification with any content',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Tap any button below to test different notification types. Toast notifications appear at the top of the screen, while push notifications will appear as system notifications.
        </Text>

        {notificationTests.map((section, sectionIndex) => (
          <MotionView
            key={section.category}
            entering={cardEntrance(sectionIndex)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{section.category}</Text>
            {section.tests.map((test, testIndex) => (
              <TouchableOpacity
                key={testIndex}
                style={styles.testButton}
                onPress={test.action}
                activeOpacity={0.7}
              >
                <View style={styles.testButtonContent}>
                  <Text style={styles.testButtonLabel}>{test.label}</Text>
                  <Text style={styles.testButtonDescription}>{test.description}</Text>
                </View>
                <Text style={styles.testButtonArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </MotionView>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Note</Text>
          <Text style={styles.infoText}>
            Push notifications require proper permissions. If you don't see push notifications, make sure notifications are enabled in your device settings.
          </Text>
        </View>
      </ScrollView>
    </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: Colors.brand.textPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    fontFamily: 'Inter_700Bold',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    fontFamily: 'Inter_700Bold',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.brand.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  testButtonContent: {
    flex: 1,
  },
  testButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  testButtonDescription: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    lineHeight: 16,
  },
  testButtonArrow: {
    fontSize: 20,
    color: Colors.brand.textSecondary,
    marginLeft: 12,
  },
  infoBox: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  infoText: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
    lineHeight: 18,
  },
});

