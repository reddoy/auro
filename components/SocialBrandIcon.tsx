import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SocialBrand = 'instagram' | 'tiktok' | 'linktree';

const brandColor: Record<SocialBrand, string> = {
  instagram: '#E4405F',
  tiktok: '#FFFFFF',
  linktree: '#39e09b',
};

export function SocialBrandIcon({
  brand,
  size,
  style,
}: {
  brand: SocialBrand;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const color = brandColor[brand];
  const icon =
    brand === 'instagram' ? (
      <Ionicons name="logo-instagram" size={size} color={color} />
    ) : brand === 'tiktok' ? (
      <Ionicons name="logo-tiktok" size={size} color={color} />
    ) : (
      <Ionicons name="link" size={size} color={color} />
    );

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      {icon}
    </View>
  );
}
