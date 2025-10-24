import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { shadowStyle } from '@/components/ThemeProvider';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  
  // Hide tab bar for hinge-clone screen
  const shouldHideTabBar = pathname?.includes('hinge-clone');

  // Handle tab press for web navigation
  const handleTabPress = (tabName: string) => {
    if (Platform.OS === 'web') {
      if (tabName === 'requests' && pathname?.startsWith('/requests') && pathname !== '/requests') {
        // If we're on a sub-page of requests, navigate back to the main requests page
        router.push('/requests');
        return false; // Prevent default tab behavior
      }
    }
    return true; // Allow default tab behavior
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.brand.textPrimary,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
          tabBarStyle: shouldHideTabBar ? { display: 'none' } : {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            paddingBottom: Math.max(12, 12 + insets.bottom),
            paddingTop: 8,
            height: 68 + insets.bottom,
            shadowColor: Colors.brand.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            ...(shadowStyle({ color: Colors.brand.shadow, offsetY: -4, blur: 16 }) as any),
          },
          tabBarBackground: () => (
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            />
          ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="requests"
        options={{
          title: 'My Reviews',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="star" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('requests')) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('profile')) {
              e.preventDefault();
            }
          },
        }}
        />
      </Tabs>
    </View>
  );
}
