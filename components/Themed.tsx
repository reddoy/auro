/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const flattened = StyleSheet.flatten(style) as any;
  const requestedWeight: string | number | undefined = flattened?.fontWeight;
  let fontFamily = 'Poppins_400Regular';
  const numericWeight = typeof requestedWeight === 'string' && /\d+/.test(requestedWeight)
    ? parseInt(requestedWeight, 10)
    : (typeof requestedWeight === 'number' ? requestedWeight : undefined);
  if (requestedWeight === 'bold' || (numericWeight !== undefined && numericWeight >= 700)) {
    fontFamily = 'Poppins_700Bold';
  } else if (numericWeight !== undefined && numericWeight >= 600) {
    fontFamily = 'Poppins_600SemiBold';
  }
  return <DefaultText style={[{ color, fontFamily }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
