// Auro Brand Colors - Deep Purple + Orange→Magenta Gradient
const brandColors = {
  // Core
  background: '#0C0225',
  cardBackground: '#2A1B3D',
  cardBackgroundSecondary: '#1F1629',
  cardBackgroundLight: '#342346',

  // Primary gradient (orange → magenta)
  gradientStart: '#FF6F00',
  gradientEnd: '#FF2D55',

  // Accents
  accentOrange: '#FF6F00',
  accentMagenta: '#FF2D55',
  primary: '#FF2D55', // Main brand color (magenta)

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#C7BFD9',
  textLight: '#C7BFD9',
  textOnGradient: '#FFFFFF',

  // UI
  border: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.35)',
  shadowLight: 'rgba(0, 0, 0, 0.25)',
  shadowMedium: 'rgba(0, 0, 0, 0.45)',
  avatarPlaceholder: '#A89BC5',

  // Status
  success: '#3DDC84',
  warning: '#FFB300',
  error: '#FF4D4F',
  info: '#64B5F6',
  status: {
    // Centralized request status colors
    // Visual intent: pending (info), accepted (orange), paid (teal), in_progress (amber), completed (success), rejected (error)
    pending: '#2196F3',
    accepted: '#FF6F00',
    paid: '#009688',
    in_progress: '#FFB300',
    completed: '#3DDC84',
    rejected: '#EF4444',
  },
};

const tintColor = brandColors.accentMagenta;

export default {
  light: {
    text: brandColors.textPrimary,
    background: brandColors.background,
    cardBackground: brandColors.cardBackground,
    cardBackgroundLight: brandColors.cardBackgroundLight,
    tint: tintColor,
    tabIconDefault: brandColors.textSecondary,
    tabIconSelected: tintColor,
    border: brandColors.border,
    textSecondary: brandColors.textSecondary,
  },
  dark: {
    text: brandColors.textPrimary,
    background: brandColors.background,
    cardBackground: brandColors.cardBackground,
    cardBackgroundLight: brandColors.cardBackgroundLight,
    tint: tintColor,
    tabIconDefault: brandColors.textSecondary,
    tabIconSelected: tintColor,
    border: brandColors.border,
    textSecondary: brandColors.textSecondary,
  },
  brand: brandColors,
};
