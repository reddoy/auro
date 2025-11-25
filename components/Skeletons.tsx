import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';

type SkeletonBlockProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  backgroundColor?: string;
};

const BASE_BG = 'rgba(255, 255, 255, 0.1)';
const HIGHLIGHT_BG = 'rgba(255, 255, 255, 0.18)';

export function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = 12,
  style,
  delay = 0,
  backgroundColor,
}: SkeletonBlockProps) {
  const shimmer = useSharedValue(0.7);

  useEffect(() => {
    shimmer.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.6, { duration: 900 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: backgroundColor ?? BASE_BG,
        },
        style,
        animatedStyle,
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading"
      accessibilityLiveRegion="polite"
    />
  );
}

type SkeletonCircleProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  backgroundColor?: string;
};

export function SkeletonCircle({
  size = 48,
  style,
  delay = 0,
  backgroundColor = HIGHLIGHT_BG,
}: SkeletonCircleProps) {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      radius={size / 2}
      style={style}
      delay={delay}
      backgroundColor={backgroundColor}
    />
  );
}

type SkeletonParagraphProps = {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  widths?: Array<number | string>;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonParagraph({
  lines = 3,
  lineHeight = 12,
  gap = 10,
  widths,
  delay = 0,
  style,
}: SkeletonParagraphProps) {
  return (
    <View style={[{ backgroundColor: 'transparent' }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          width={widths?.[index] ?? '100%'}
          height={lineHeight}
          style={index > 0 ? { marginTop: gap } : undefined}
          delay={delay + index * 90}
        />
      ))}
    </View>
  );
}

export const SkeletonColors = {
  base: BASE_BG,
  highlight: HIGHLIGHT_BG,
  surface: Colors.brand.cardBackground,
  elevated: Colors.brand.cardBackgroundLight,
};



