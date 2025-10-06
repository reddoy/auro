import React, { useState, useRef } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import VideoReviewSection from '@/components/VideoReviewSection';
import PaginationDots from '@/components/PaginationDots';
import SectionSlideCard from '@/components/SectionSlideCard';
import MediaRecorder from '@/components/MediaRecorder';
import AvatarUploader from '@/components/AvatarUploader';
import { uploadRequestMedia } from '@/lib/uploads';
import * as ImagePicker from 'expo-image-picker';

type PhotoSection = {
  title: string;
  subtitle?: string;
  photos: string[];
  category: string;
};

const DEMO_SECTIONS: PhotoSection[] = [
  {
    title: "Outfit Photos",
    subtitle: "Share your best outfits and style choices",
    photos: [],
    category: "outfits"
  },
  {
    title: "Room Tour",
    subtitle: "Show us your space and environment",
    photos: [],
    category: "room"
  },
  {
    title: "Dating Profile",
    subtitle: "Share screenshots from your dating profiles",
    photos: [],
    category: "dating"
  }
];

export default function VideoReviewDemoScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<PhotoSection[]>(DEMO_SECTIONS);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isVideoReviewMode, setIsVideoReviewMode] = useState(false);
  const [recordingModeOpen, setRecordingModeOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUris, setGalleryUris] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handlePhotoPress = (photos: string[], index: number) => {
    setGalleryUris(photos);
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const addPhotoToSection = async (sectionIndex: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newPhotoUri = asset.uri;
        
        setSections(prev => prev.map((section, index) => 
          index === sectionIndex 
            ? { ...section, photos: [...section.photos, newPhotoUri] }
            : section
        ));
        
        Alert.alert('Photo Added', 'Photo has been added to this section for demo purposes.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    }
  };

  const removePhotoFromSection = (sectionIndex: number, photoIndex: number) => {
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { 
            ...section, 
            photos: section.photos.filter((_, idx) => idx !== photoIndex) 
          }
        : section
    ));
  };

  const startVideoReview = () => {
    const totalPhotos = sections.reduce((acc, section) => acc + section.photos.length, 0);
    if (totalPhotos === 0) {
      Alert.alert('No Photos', 'Please add some photos first before starting the video review demo.');
      return;
    }
    setIsVideoReviewMode(true);
    setRecordingModeOpen(true);
  };

  const finishVideoReview = () => {
    Alert.alert(
      'Demo Complete', 
      'This is just a demo! In the real app, this would submit your video review.',
      [{ text: 'OK', onPress: () => {
        setIsVideoReviewMode(false);
        setVideoUri(null);
        setRecordingModeOpen(false);
      }}]
    );
  };

  const canSubmit = sections.every(section => section.photos.length > 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Review Demo</Text>
        <View style={styles.placeholder} />
      </View>

      {!isVideoReviewMode ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.demoInfo}>
            <Text style={styles.demoTitle}>🎥 Video Review Demo</Text>
            <Text style={styles.demoDescription}>
              This demo lets you experience the video review interface. Add photos to each section, then start recording a video review!
            </Text>
          </View>

          {sections.map((section, sectionIndex) => (
            <View key={section.category} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              </View>

              {section.photos.length > 0 ? (
                <VideoReviewSection
                  sections={[section]}
                  onPhotoPress={(photos, index) => handlePhotoPress(photos, index)}
                  currentSectionIndex={0}
                  currentPhotoIndex={0}
                />
              ) : (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No photos added yet</Text>
                </View>
              )}

              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => addPhotoToSection(sectionIndex)}
                >
                  <Text style={styles.addPhotoButtonText}>
                    {section.photos.length > 0 ? '+ Add More Photos' : '+ Add Photos'}
                  </Text>
                </TouchableOpacity>

                {section.photos.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      Alert.alert(
                        'Clear Photos',
                        `Remove all photos from ${section.title}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Clear', 
                            style: 'destructive',
                            onPress: () => setSections(prev => prev.map((s, idx) => 
                              idx === sectionIndex ? { ...s, photos: [] } : s
                            ))
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <View style={styles.startReviewContainer}>
            <TouchableOpacity
              style={[styles.startReviewButton, !canSubmit && styles.disabledButton]}
              onPress={startVideoReview}
              disabled={!canSubmit}
            >
              <LinearGradient
                colors={canSubmit ? [Colors.brand.accentOrange, Colors.brand.primary] : ['#ccc', '#999']}
                style={styles.startReviewGradient}
              >
                <Text style={styles.startReviewButtonText}>
                  🎬 Start Video Review Demo
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {!canSubmit && (
              <Text style={styles.helpText}>
                Add at least one photo to each section to start the demo
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <RNView style={styles.videoReviewContainer}>
          <ScrollView 
            style={styles.videoReviewScroll}
            showsVerticalScrollIndicator={false}
            pagingEnabled
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const contentOffset = event.nativeEvent.contentOffset;
              const viewSize = event.nativeEvent.layoutMeasurement;
              const pageNum = Math.floor(contentOffset.y / viewSize.height);
              setCurrentSectionIndex(pageNum);
            }}
          >
            {sections.map((section, sectionIndex) => (
              <RNView key={section.category} style={styles.videoReviewPage}>
                <ScrollView style={styles.videoReviewContent} showsVerticalScrollIndicator={false}>
                  {/* Section Title Card */}
                  <SectionSlideCard
                    title={section.title}
                    subtitle={section.subtitle || ''}
                    revieweeName="Demo User"
                    style={{ marginTop: 20 }}
                  />

                  {/* Photo Carousel */}
                  {section.photos.length > 0 && (
                    <View style={styles.photoSection}>
                      <VideoReviewSection
                        sections={[section]}
                        onPhotoPress={(photos, index) => handlePhotoPress(photos, index)}
                        currentSectionIndex={0}
                        currentPhotoIndex={0}
                      />
                    </View>
                  )}

                  {/* Pagination Dots */}
                  <View style={styles.paginationContainer}>
                    <PaginationDots 
                      totalItems={sections.length} 
                      currentIndex={sectionIndex}
                      orientation="horizontal"
                    />
                  </View>

                  {/* Finish Video Review Button */}
                  <TouchableOpacity
                    onPress={finishVideoReview}
                    style={[
                      styles.actionButton, 
                      styles.acceptButton, 
                      { marginTop: 24 },
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      Finish Video Review Demo
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </RNView>
            ))}
          </ScrollView>

          {/* Circular video recorder centered at top-middle */}
          <RNView style={{ position: 'absolute', top: insets.top + 20, left: 0, right: 0, alignItems: 'center', zIndex: 10, elevation: 10 }}>
            <MediaRecorder
              onRecorded={(uri) => {
                setVideoUri(uri);
                setRecordingModeOpen(false);
                setIsVideoReviewMode(false);
                Alert.alert('Demo Complete', 'Video recorded! This is just a demo - in the real app, this would be submitted as your review.');
              }}
              variant="centered"
              circleSize={140}
            />
          </RNView>
        </RNView>
      )}

      {/* Gallery Modal */}
      <Modal
        visible={galleryOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGalleryOpen(false)}
      >
        <RNView style={styles.modalOverlay}>
          <RNView style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setGalleryOpen(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <ScrollView horizontal pagingEnabled style={styles.galleryScroll}>
              {galleryUris.map((uri, index) => (
                <RNView key={index} style={styles.galleryItem}>
                  <RNView style={styles.galleryImageContainer}>
                    <RNView style={styles.galleryImage} />
                  </RNView>
                </RNView>
              ))}
            </ScrollView>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.brand.cardBackground,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  demoInfo: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  demoDescription: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
  },
  sectionContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  emptySection: {
    backgroundColor: Colors.brand.background,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    fontStyle: 'italic',
  },
  sectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addPhotoButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginRight: 12,
  },
  addPhotoButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.brand.status.rejected,
  },
  clearButtonText: {
    color: Colors.brand.status.rejected,
    fontWeight: '600',
  },
  startReviewContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  startReviewButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  startReviewGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  startReviewButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  videoReviewContainer: {
    flex: 1,
    position: 'relative',
  },
  videoReviewScroll: {
    flex: 1,
  },
  videoReviewPage: {
    height: '100%',
  },
  videoReviewContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photoSection: {
    marginVertical: 20,
  },
  paginationContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  actionButton: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptButton: {
    backgroundColor: Colors.brand.status.completed,
  },
  actionButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  galleryScroll: {
    flex: 1,
  },
  galleryItem: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImageContainer: {
    width: '90%',
    height: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  galleryImage: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
});

