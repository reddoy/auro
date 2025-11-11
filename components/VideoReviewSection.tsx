import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { View } from '@/components/Themed';
import SectionTitleCard from './SectionTitleCard';
import PhotoCarousel from './PhotoCarousel';

type PhotoSection = {
  title: string;
  subtitle?: string;
  photos: string[];
  category: string;
};

type Props = {
  sections: PhotoSection[];
  onPhotoPress: (photos: string[], index: number) => void;
  currentSectionIndex?: number;
  currentPhotoIndex?: number;
};

export default function VideoReviewSection({ sections, onPhotoPress, currentSectionIndex = 0, currentPhotoIndex = 0 }: Props) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {sections.map((section, sectionIndex) => (
        <View key={section.category} style={styles.sectionContainer}>
          <SectionTitleCard
            title={section.title}
            subtitle={section.subtitle}
            isActive={sectionIndex === currentSectionIndex}
          />
          {section.photos.length > 0 && (
            <View style={styles.carouselContainer}>
              <PhotoCarousel
                uris={section.photos}
                onPressItem={(photoIndex) => onPhotoPress(section.photos, photoIndex)}
                height={140}
                showScrollIndicator={true}
              />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sectionContainer: {
    marginBottom: 8,
  },
  carouselContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
});
