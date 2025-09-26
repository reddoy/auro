import React from 'react';
import { StyleSheet, View } from 'react-native';
import Colors from '@/constants/Colors';

type Props = {
  totalItems: number;
  currentIndex: number;
  style?: any;
};

export default function PaginationDots({ totalItems, currentIndex, style }: Props) {
  if (totalItems <= 1) return null;

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: totalItems }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex ? styles.activeDot : styles.inactiveDot
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  activeDot: {
    backgroundColor: Colors.brand.primary,
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
