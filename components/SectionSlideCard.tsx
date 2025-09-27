import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';

type Props = {
  title: string;
  subtitle: string;
  revieweeName: string;
  style?: any;
};

export default function SectionSlideCard({ title, subtitle, revieweeName, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {/* Auro Logo */}
      <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 16, alignSelf: 'center' }} contentFit="contain" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle.replace('{name}', revieweeName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});
