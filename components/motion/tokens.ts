import { Easing } from 'react-native-reanimated';

export const MotionDurations = {
  xs: 120,
  sm: 180,
  md: 240,
  lg: 320,
  xl: 420,
} as const;

export const MotionDelays = {
  quick: 45,
  item: 80,
  section: 140,
} as const;

export const MotionEasing = {
  standard: Easing.bezier(0.2, 0.8, 0.2, 1),
  emphasized: Easing.bezier(0.2, 0.8, 0, 1),
  exit: Easing.bezier(0.4, 0.0, 0.2, 1),
} as const;

export const MotionSpring = {
  soft: { damping: 16, mass: 0.8, stiffness: 120 },
  medium: { damping: 18, mass: 1, stiffness: 160 },
  firm: { damping: 20, mass: 1.1, stiffness: 200 },
} as const;

export const MotionOpacity = {
  hidden: 0,
  visible: 1,
} as const;



