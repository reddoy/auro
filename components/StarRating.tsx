import React from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { View, Text } from './Themed';
import Colors from '@/constants/Colors';

type Props = {
  rating: number; // Rating out of 10
  maxStars?: number; // Default 5 stars
  size?: 'small' | 'medium' | 'large';
  showNumber?: boolean; // Whether to show the numeric rating alongside stars
  category?: string; // Category name for the rating
  label?: string; // Optional label below the stars
};

export default function StarRating({ 
  rating, 
  maxStars = 5, 
  size = 'medium',
  showNumber = false,
  category,
  label
}: Props) {
  // Convert 0-10 scale to 0-5 scale for stars
  const starRating = Math.round((rating / 10) * maxStars);
  
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return Colors.brand.status.completed;
    if (rating >= 6) return Colors.brand.status.in_progress;
    return Colors.brand.status.rejected;
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 8) return 'Excellent';
    if (rating >= 6) return 'Good';
    if (rating >= 4) return 'Fair';
    return 'Needs Work';
  };

  const starSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <RNView style={styles.container}>
      {category && (
        <Text style={[styles.category, { fontSize }]}>{category}</Text>
      )}
      
      <RNView style={styles.starsContainer}>
        {Array.from({ length: maxStars }, (_, index) => {
          const isFilled = index < starRating;
          return (
            <Text 
              key={index} 
              style={[
                styles.star, 
                { 
                  fontSize: starSize,
                  color: isFilled ? getRatingColor(rating) : Colors.brand.border 
                }
              ]}
            >
              {isFilled ? '★' : '☆'}
            </Text>
          );
        })}
        
        {showNumber && (
          <Text style={[styles.numberRating, { fontSize: starSize * 0.8, color: getRatingColor(rating) }]}>
            {rating}/10
          </Text>
        )}
      </RNView>
      
      {label && (
        <Text style={[styles.label, { fontSize: fontSize * 0.8 }]}>{label}</Text>
      )}
      
      {!label && (
        <Text style={[styles.label, { fontSize: fontSize * 0.8, color: getRatingColor(rating) }]}>
          {getRatingLabel(rating)}
        </Text>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    color: Colors.brand.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
  },
  star: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  numberRating: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  label: {
    color: Colors.brand.textSecondary,
    textAlign: 'center',
  },
});
