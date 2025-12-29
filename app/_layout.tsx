import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Stack, useRootNavigationState, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { ToastProvider } from '@/components/Toast';
import LogoHeader from '@/components/LogoHeader';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { setupNotificationListeners, registerPushTokenIfPermitted } from '@/lib/notifications';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// unstable_settings removed - no longer needed in current Expo Router version

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress development-only navigation warnings for unhandled GO_BACK actions
// This occurs during app initialization when navigation stack isn't ready yet
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args: any[]) => {
    // Filter out the unhandled GO_BACK action warning
    const message = args.join(' ').toString();
    if (
      message.includes("The action 'GO_BACK' was not handled by any navigator") ||
      message.includes('Is there any screen to go back to?') ||
      message.includes("GO_BACK' was not handled")
    ) {
      // Silently ignore this development-only warning
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
    // Also filter from console.warn in case it's logged there
    const message = args.join(' ').toString();
    if (
      message.includes("The action 'GO_BACK' was not handled by any navigator") ||
      message.includes('Is there any screen to go back to?') ||
      message.includes("GO_BACK' was not handled")
    ) {
      // Silently ignore this development-only warning
      return;
    }
    originalWarn.apply(console, args);
  };
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_400Regular,
    Inter_600SemiBold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Auth session error:', error.message);
          // Clear any corrupted session data
          await supabase.auth.signOut();
        }
        
        // Check if user has a session but email is not verified
        if (data.session?.user && !data.session.user.email_confirmed_at) {
          // Email not verified - sign out and redirect to confirmation
          await supabase.auth.signOut();
          setIsSignedIn(false);
          // Redirect to confirmation screen if not already there
          const currentPath = pathname || '';
          if (!currentPath.startsWith('/auth/confirm')) {
            router.replace({ pathname: '/auth/confirm', params: { email: data.session.user.email || '' } });
          }
        } else {
          setIsSignedIn(!!data.session);
        }
      } catch (err) {
        console.warn('Failed to get session:', err);
        setIsSignedIn(false);
      } finally {
        setSessionChecked(true);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Check email verification on auth state change
      if (session?.user && !session.user.email_confirmed_at) {
        // Email not verified - sign out
        await supabase.auth.signOut();
        setIsSignedIn(false);
        // Redirect to confirmation screen if not already there
        const currentPath = pathname || '';
        if (!currentPath.startsWith('/auth/confirm') && !currentPath.startsWith('/auth')) {
          router.replace({ pathname: '/auth/confirm', params: { email: session.user.email || '' } });
        }
      } else {
        setIsSignedIn(!!session);
        
        // Register push token when user signs in (if permissions already granted)
        // This ensures the token is updated when switching accounts
        if (event === 'SIGNED_IN' && session) {
          // Small delay to ensure user is fully authenticated
          setTimeout(() => {
            registerPushTokenIfPermitted().catch(err => {
              console.log('Could not register push token on sign-in (may not have permissions):', err);
            });
          }, 1000);
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect unauthenticated users to /intro, except when already on /intro or /auth
  useEffect(() => {
    if (!sessionChecked) return;
    try {
      const onAuth = pathname?.startsWith('/auth');
      const onIntro = pathname?.startsWith('/intro');
      if (!isSignedIn && !onAuth && !onIntro) {
        router.replace('/intro' as any);
      }
    } catch {}
  }, [sessionChecked, isSignedIn, pathname]);

  // Simple navigation logger: logs the current route on every navigation
  useEffect(() => {
    try {
      if (typeof pathname === 'string') {
        
      }
    } catch {}
  }, [pathname]);

  // Custom theme with Auro deep purple background
  const customTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: Colors.brand.background,
    },
  };

  // Handle deep links like auro://review?requestId=<id>
  useEffect(() => {
    const handler = (event: any) => {
      try {
        const url = event.url || '';
        const parsed = Linking.parse(url);
        const path = parsed?.path || '';
        const params = parsed?.queryParams || {} as any;
        if (path?.startsWith('review') && params?.requestId) {
          // Navigate to review details screen
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { router } = require('expo-router');
          router.replace(`/review/${params.requestId}`);
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', handler);
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      handler({ url } as any);
    });
    return () => sub.remove();
  }, []);

  // Setup push notification listeners
  useEffect(() => {
    if (!isSignedIn) return;

    const cleanup = setupNotificationListeners(
      // Handle notification received while app is in foreground
      (notification) => {
        console.log('Notification received in foreground:', notification);
        // You can show a custom toast or handle the notification here
      },
      // Handle notification tapped
      (response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        // Handle navigation based on notification data
        if (data?.type === 'review_completed' && data?.requestId) {
          router.push(`/review/${data.requestId}`);
        } else if (data?.type === 'request_accepted' && data?.requestId) {
          router.push(`/(tabs)/requests/reviewer/${data.requestId}`);
        } else if (data?.type === 'payment_received' && data?.requestId) {
          router.push(`/(tabs)/profile`);
        } else if (data?.type === 'new_request' && data?.requestId) {
          router.push(`/(tabs)/requests/reviewer/${data.requestId}`);
        } else if (data?.type === 'review_submitted' && data?.requestId) {
          router.push(`/(tabs)/requests/reviewer/${data.requestId}`);
        }
      }
    );

    // Note: We don't automatically call setupPushNotifications here
    // because that would trigger permission prompts on every app load.
    // Instead, users are prompted during onboarding, and the token
    // will be registered when they grant permission.

    return cleanup;
  }, [isSignedIn, router]);

  if (!sessionChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={customTheme}>
          <ToastProvider>
            <View style={{ flex: 1 }}>
              {pathname && !pathname.includes('/onboarding') && !pathname.includes('/auth') && !pathname.includes('/intro') && <LogoHeader />}
              <Stack 
                screenOptions={{ headerShown: false }}
                // Suppress unhandled GO_BACK action warnings during initialization
                // This is a development-only warning that occurs when navigation stack isn't ready yet
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="intro" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="request" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </View>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
