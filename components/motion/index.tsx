import React, { forwardRef } from 'react';
import { Pressable, PressableProps, ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimateProps,
} from 'react-native-reanimated';

import { MotionDelays, MotionDurations, MotionEasing, MotionSpring } from './tokens';

type MotionViewProps = AnimateProps<ViewProps> & {
  debugName?: string;
};

const DEFAULT_ENTERING = FadeIn.duration(MotionDurations.sm).easing(MotionEasing.standard);
const DEFAULT_EXITING = FadeOut.duration(MotionDurations.sm).easing(MotionEasing.exit);
const DEFAULT_LAYOUT = LinearTransition.springify()
  .damping(MotionSpring.soft.damping)
  .stiffness(MotionSpring.soft.stiffness)
  .mass(MotionSpring.soft.mass);

export const MotionView = forwardRef<Animated.View, MotionViewProps>(
  ({ entering, exiting, layout, children, ...rest }, ref) => {
    return (
      <Animated.View
        ref={ref}
        entering={entering ?? DEFAULT_ENTERING}
        exiting={exiting ?? DEFAULT_EXITING}
        layout={layout ?? DEFAULT_LAYOUT}
        {...rest}
      >
        {children}
      </Animated.View>
    );
  },
);

MotionView.displayName = 'MotionView';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionPressableProps = AnimateProps<PressableProps> & {
  scaleEffect?: boolean;
  restingScale?: number;
  pressedScale?: number;
  debugName?: string;
};

export const MotionPressable = forwardRef<Animated.ComponentRef<typeof AnimatedPressable>, MotionPressableProps>(
  (
    {
      scaleEffect = true,
      restingScale = 1,
      pressedScale = 0.97,
      entering,
      exiting,
      layout,
      style,
      onPressIn,
      onPressOut,
      onHoverIn,
      onHoverOut,
      ...rest
    },
    ref,
  ) => {
    const scale = useSharedValue(restingScale);
    const elevation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      elevation: elevation.value,
    }));

    const resolvedStyle =
      typeof style === 'function'
        ? (state: Parameters<NonNullable<PressableProps['style']>>[0]) => {
            const base = style(state);
            return [base, animatedStyle];
          }
        : [style, animatedStyle];

    return (
      <AnimatedPressable
        ref={ref}
        entering={entering ?? DEFAULT_ENTERING}
        exiting={exiting ?? DEFAULT_EXITING}
        layout={layout !== undefined ? layout : (scaleEffect ? undefined : DEFAULT_LAYOUT)}
        style={resolvedStyle}
        onPressIn={(event) => {
          if (scaleEffect) {
            scale.value = withSpring(pressedScale, {
              damping: MotionSpring.medium.damping,
              stiffness: MotionSpring.medium.stiffness,
              mass: MotionSpring.medium.mass,
            });
            elevation.value = withTiming(2, {
              duration: MotionDurations.xs,
              easing: MotionEasing.standard,
            });
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (scaleEffect) {
            scale.value = withSpring(restingScale, {
              damping: MotionSpring.medium.damping,
              stiffness: MotionSpring.medium.stiffness,
              mass: MotionSpring.medium.mass,
            });
            elevation.value = withTiming(0, {
              duration: MotionDurations.xs,
              easing: MotionEasing.exit,
            });
          }
          onPressOut?.(event);
        }}
        onHoverIn={(event) => {
          if (scaleEffect) {
            scale.value = withTiming(restingScale + 0.01, {
              duration: MotionDurations.xs,
              easing: MotionEasing.standard,
            });
          }
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          if (scaleEffect) {
            scale.value = withTiming(restingScale, {
              duration: MotionDurations.xs,
              easing: MotionEasing.exit,
            });
          }
          onHoverOut?.(event);
        }}
        {...rest}
      />
    );
  },
);

MotionPressable.displayName = 'MotionPressable';

export const MotionZoomIn = ZoomIn.duration(MotionDurations.md).easing(MotionEasing.emphasized);
export const MotionZoomOut = ZoomOut.duration(MotionDurations.sm).easing(MotionEasing.exit);

export const cardEntrance = (index = 0) =>
  FadeInDown.duration(MotionDurations.md)
    .delay(index * MotionDelays.item)
    .springify()
    .damping(MotionSpring.soft.damping)
    .stiffness(MotionSpring.soft.stiffness)
    .mass(MotionSpring.soft.mass);

export const cardExit = () =>
  FadeOutDown.duration(MotionDurations.sm)
    .easing(MotionEasing.exit);

export const subtleFadeIn = () =>
  FadeIn.duration(MotionDurations.sm).easing(MotionEasing.standard);

export const subtleFadeOut = () =>
  FadeOut.duration(MotionDurations.sm).easing(MotionEasing.exit);

export * from './tokens';


