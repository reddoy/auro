import React from 'react';
import { StyleSheet, View } from 'react-native';
import Colors from '@/constants/Colors';

type Props = {
  totalItems: number;
  currentIndex: number;
  style?: any;
  orientation?: 'horizontal' | 'vertical';
};

export default function PaginationDots({ totalItems, currentIndex, style, orientation = 'horizontal' }: Props) {
  if (totalItems <= 1) return null;

  const containerStyle = orientation === 'vertical' 
    ? [styles.container, styles.verticalContainer, style]
    : [styles.container, style];

  return (
    <View style={containerStyle}>
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
    gap: 4,
  },
  verticalContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    transition: 'all 0.2s ease',
  },
  activeDot: {
    backgroundColor: Colors.brand.accentOrange,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
