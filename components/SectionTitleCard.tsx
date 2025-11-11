import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

type Props = {
  title: string;
  subtitle?: string;
  isActive?: boolean;
};

export default function SectionTitleCard({ title, subtitle, isActive = false }: Props) {
  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      <Text style={[styles.title, isActive && styles.activeTitle]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, isActive && styles.activeSubtitle]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  activeCard: {
    borderColor: Colors.brand.accentOrange,
    // Remove background color change to keep consistent background
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  activeTitle: {
    color: Colors.brand.textPrimary, // Keep white text even when active
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textPrimary, // Use white text instead of secondary gray
    lineHeight: 24,
    fontWeight: '500',
  },
  activeSubtitle: {
    color: Colors.brand.textPrimary, // Keep white text even when active
  },
});
