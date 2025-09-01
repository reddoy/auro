// Auro Brand Colors - Deep Purple + Orange→Magenta Gradient
const brandColors = {
  // Core
  background: '#1A0B2E',
  cardBackground: '#24123B',
  cardBackgroundSecondary: '#24123B',

  // Primary gradient (orange → magenta)
  gradientStart: '#FF6F00',
  gradientEnd: '#FF2D55',

  // Accents
  accentOrange: '#FF6F00',
  accentMagenta: '#FF2D55',

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

  // Status
  success: '#3DDC84',
  warning: '#FFB300',
  error: '#FF4D4F',
  info: '#64B5F6',
};

const tintColor = brandColors.accentMagenta;

export default {
  light: {
    text: brandColors.textPrimary,
    background: brandColors.background,
    cardBackground: brandColors.cardBackground,
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
    tint: tintColor,
    tabIconDefault: brandColors.textSecondary,
    tabIconSelected: tintColor,
    border: brandColors.border,
    textSecondary: brandColors.textSecondary,
  },
  brand: brandColors,
};
