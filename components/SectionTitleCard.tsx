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
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primary + '10', // 10% opacity
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  activeTitle: {
    color: Colors.brand.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  activeSubtitle: {
    color: Colors.brand.primary + 'CC', // 80% opacity
  },
});
