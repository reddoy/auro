import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text } from '@/components/Themed';
import { AuroMark } from '@/components/AuroMark';
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
      {/* Minimal Auro Logo */}
      <AuroMark height={32} style={{ marginBottom: 24, alignSelf: 'center', opacity: 0.9 }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle.replace('{name}', revieweeName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent', // Removed card background for TikTok-style clean look
    borderRadius: 0,
    padding: 32,
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 0, // Removed orange border
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 200,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
    paddingHorizontal: 24,
  },
});
