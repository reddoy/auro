import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request push notification permissions
 * @returns true if permission granted, false otherwise
 */
export async function requestPushNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting push notification permissions:', error);
    return false;
  }
}

/**
 * Get the push notification token for this device
 * @returns Push notification token or null if unavailable
 */
export async function getPushNotificationToken(): Promise<string | null> {
  try {
    // Check if we're running in Expo Go or a development build
    if (!Constants.expoConfig?.extra?.eas?.projectId) {
      console.warn('EAS project ID not found. Push notifications may not work in Expo Go.');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push notification token:', error);
    return null;
  }
}

/**
 * Check if push notifications are enabled
 */
export async function arePushNotificationsEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking push notification permissions:', error);
    return false;
  }
}

/**
 * Register push notification token with Supabase
 * Stores the token in the user's profile for server-side notifications
 */
export async function registerPushTokenWithSupabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user logged in, cannot register push token');
      return;
    }

    // Store token in profiles table
    // Note: The push_token column should exist (see migration 20250125_01_add_push_notifications.sql)
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);

    if (error) {
      // If column doesn't exist, log warning but don't fail
      if (error.code === '42703' || error.message?.includes('push_token')) {
        console.warn('Push token column may not exist yet. Run the migration: 20250125_01_add_push_notifications.sql');
      } else {
        console.error('Error registering push token with Supabase:', error);
      }
    } else {
      console.log('Push token registered successfully');
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

/**
 * Setup push notifications for the current user
 * Requests permissions, gets token, and registers it with Supabase
 */
export async function setupPushNotifications(): Promise<boolean> {
  try {
    // Request permissions
    const hasPermission = await requestPushNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    // Get token
    const token = await getPushNotificationToken();
    if (!token) {
      console.warn('Could not get push notification token');
      return false;
    }

    // Register with Supabase
    await registerPushTokenWithSupabase(token);
    
    return true;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return false;
  }
}

/**
 * Set up notification listeners for handling incoming notifications
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  // Return cleanup function
  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Schedule a local notification (for testing or immediate notifications)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Send immediately
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear push notification token from Supabase
 * Should be called when user logs out to prevent notifications going to wrong account
 */
export async function clearPushTokenFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // No user logged in, nothing to clear
      return;
    }

    // Clear token in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', user.id);

    if (error) {
      console.error('Error clearing push token from Supabase:', error);
    } else {
      console.log('Push token cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing push token:', error);
  }
}

/**
 * Register push token if permissions are already granted
 * Useful for when user signs in and already has permissions from previous session
 */
export async function registerPushTokenIfPermitted(): Promise<boolean> {
  try {
    // Check if permissions are already granted
    const hasPermission = await arePushNotificationsEnabled();
    if (!hasPermission) {
      return false;
    }

    // Get token
    const token = await getPushNotificationToken();
    if (!token) {
      return false;
    }

    // Register with Supabase
    await registerPushTokenWithSupabase(token);
    return true;
  } catch (error) {
    console.error('Error registering push token if permitted:', error);
    return false;
  }
}

