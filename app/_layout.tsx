import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Stack, useRootNavigationState, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@/components/StripeProvider';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { ToastProvider } from '@/components/Toast';
import LogoHeader from '@/components/LogoHeader';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
        setIsSignedIn(!!data.session);
      } catch (err) {
        console.warn('Failed to get session:', err);
        setIsSignedIn(false);
      } finally {
        setSessionChecked(true);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect unauthenticated users to /auth, except when already on /auth
  useEffect(() => {
    if (!sessionChecked) return;
    try {
      const onAuth = pathname?.startsWith('/auth');
      if (!isSignedIn && !onAuth) {
        router.replace('/auth');
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

  if (!sessionChecked) return null;

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={
          (Constants.expoConfig?.extra as any)?.stripePublishableKey ||
          (Constants.manifest2 as any)?.extra?.stripePublishableKey ||
          ''
        }
      >
        <ThemeProvider value={customTheme}>
          <ToastProvider>
            <View style={{ flex: 1 }}>
              <LogoHeader />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </View>
          </ToastProvider>
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
