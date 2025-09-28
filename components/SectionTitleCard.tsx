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
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
  },
  activeCard: {
    borderColor: Colors.brand.accentOrange,
    backgroundColor: Colors.brand.accentOrange + '15', // 15% opacity for better visibility
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  activeTitle: {
    color: Colors.brand.accentOrange,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
    fontWeight: '500',
  },
  activeSubtitle: {
    color: Colors.brand.accentOrange + 'CC', // 80% opacity
  },
});
