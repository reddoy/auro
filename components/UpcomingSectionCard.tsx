import React from 'react';
import { StyleSheet, Animated } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

type Props = {
  title: string;
  subtitle?: string;
  isVisible: boolean;
  style?: any;
};

export default function UpcomingSectionCard({ title, subtitle, isVisible, style }: Props) {
  if (!isVisible) return null;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>Next: {title}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
