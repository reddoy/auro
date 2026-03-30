import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Colors from '@/constants/Colors';

/** Text wordmark used when raster logo assets are not bundled (e.g. CI / web export). */
export function AuroMark({
  height = 32,
  style,
}: {
  height?: number;
  style?: StyleProp<TextStyle>;
}) {
  const fontSize = Math.max(14, Math.round(height * 0.82));
  return (
    <Text
      style={[
        {
          fontSize,
          lineHeight: Math.round(fontSize * 1.05),
          fontFamily: 'Poppins_700Bold',
          fontWeight: '700',
          color: Colors.brand.textPrimary,
        },
        style,
      ]}
    >
      Auro
    </Text>
  );
}
