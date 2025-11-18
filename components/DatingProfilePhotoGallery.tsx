import React, { useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

type Props = {
  uris: string[];
  onPhotoPress?: (index: number) => void;
};

export default function DatingProfilePhotoGallery({ uris, onPhotoPress }: Props) {
  if (!Array.isArray(uris) || uris.length === 0) return null;
  
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Calculate card dimensions for a modern, sleek layout
  // Cards are larger and more prominent, with spacing
  const cardWidth = screenWidth * 0.85; // 85% of screen width for prominent display
  const cardHeight = cardWidth * 1.35; // Portrait aspect ratio for dating profile photos (3:4 style)
  const cardSpacing = 12;
  const containerPadding = 20;
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (cardWidth + cardSpacing));
    setActiveIndex(Math.max(0, Math.min(index, uris.length - 1)));
  };

  // Calculate padding to center the photos
  // Center the first photo when there's extra space available
  const totalContentWidth = uris.length * cardWidth + (uris.length - 1) * cardSpacing;
  const centerPadding = Math.max(containerPadding, (screenWidth - totalContentWidth) / 2);
  
  const scrollToIndex = (index: number) => {
    const offset = index * (cardWidth + cardSpacing);
    scrollViewRef.current?.scrollTo({ x: offset, animated: true });
  };
  
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={cardWidth + cardSpacing}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: centerPadding,
          paddingVertical: 8,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {uris.map((uri, index) => (
          <Pressable
            key={`photo-${index}`}
            onPress={() => onPhotoPress?.(index)}
            style={[
              styles.photoCard,
              {
                width: cardWidth,
                height: cardHeight,
                marginRight: index < uris.length - 1 ? cardSpacing : 0,
              },
            ]}
            accessibilityLabel={`Dating profile photo ${index + 1} of ${uris.length}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view full size"
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={300}
                placeholderContentFit="contain"
                onError={() => {
                  console.warn(`Failed to load dating profile photo at index ${index}`);
                }}
              />
              {/* Subtle gradient overlay at bottom for a modern look */}
              <ExpoLinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.gradientOverlay}
                start={{ x: 0, y: 0.7 }}
                end={{ x: 0, y: 1 }}
              />
              
              {/* Photo number indicator */}
              <View style={styles.photoBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {index + 1}/{uris.length}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      
      {/* Modern pagination dots */}
      {uris.length > 1 && (
        <View style={styles.paginationContainer}>
          {uris.map((_, index) => (
            <Pressable
              key={`dot-${index}`}
              onPress={() => scrollToIndex(index)}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
                index < uris.length - 1 && { marginRight: 8 },
              ]}
              accessibilityLabel={`Go to photo ${index + 1} of ${uris.length}`}
              accessibilityRole="button"
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginVertical: 16,
  },
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  photoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.accentOrange,
    marginRight: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
  },
  paginationDotActive: {
    width: 24,
    height: 8,
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 4,
  },
});

