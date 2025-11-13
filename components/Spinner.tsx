import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Colors from '@/constants/Colors';

interface SpinnerProps {
  size?: number;
  color?: string;
  borderColor?: string;
}

export default function Spinner({ 
  size = 20, 
  color = Colors.brand.accentMagenta, 
  borderColor = Colors.brand.border 
}: SpinnerProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      progress.value = 0;
    };
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderWidth: size * 0.1, // 10% of size for border width
            borderColor: borderColor,
            borderTopColor: color,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderRadius: 50,
  },
});
