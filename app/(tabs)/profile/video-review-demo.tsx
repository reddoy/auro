import React, { useMemo, useState } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, TextInput, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import * as ImagePicker from 'expo-image-picker';
import MediaRecorder from '@/components/MediaRecorder';
import StarRating from '@/components/StarRating';
import SectionSlideCard from '@/components/SectionSlideCard';
import PaginationDots from '@/components/PaginationDots';

type DatingProfileData = {
  profilePhoto: string | null;
  outfitPhotos: string[];
  roomPhotos: string[];
  socialPhotos: string[];
  reviewerNote: string;
  isSubmitted: boolean;
};

type VideoReviewState = {
  isVideoReviewMode: boolean;
  recordingModeOpen: boolean;
  videoUri: string | null;
  currentPhotoIndex: number;
  overallRating: number;
  overallNote: string;
};

export default function DatingProfileUploadScreen() {
  const insets = useSafeAreaInsets();
  const [profileData, setProfileData] = useState<DatingProfileData>({
    profilePhoto: null,
    outfitPhotos: [],
    roomPhotos: [],
    socialPhotos: [],
    reviewerNote: '',
    isSubmitted: false
  });
  const [videoReviewState, setVideoReviewState] = useState<VideoReviewState>({
    isVideoReviewMode: false,
    recordingModeOpen: false,
    videoUri: null,
    currentPhotoIndex: 0,
    overallRating: 0,
    overallNote: '',
  });
  const [revieweeName] = useState('Sarah'); // Demo reviewee name
  const [currentFlowStep, setCurrentFlowStep] = useState<'upload' | 'video-review' | 'submitted'>('upload');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const frameMetrics = useMemo(() => {
    const horizontalMargin = 32;
    const desiredMaxWidth = 360;
    const availableWidth = Math.max(windowWidth - horizontalMargin, 220);
    const constrainedWidth = Math.min(availableWidth, desiredMaxWidth);
    const availableHeight = Math.max(windowHeight - (insets.top + insets.bottom + 160), 480);
    const heightLimitedWidth = availableHeight * (9 / 16);
    const frameWidth = Math.max(220, Math.min(constrainedWidth, heightLimitedWidth));
    const frameHeight = frameWidth * (16 / 9);
    const slideHorizontalPadding = Math.max((windowWidth - frameWidth) / 2, 16);
    const slideTopPadding = insets.top + 96;
    const slideBottomPadding = insets.bottom + 36;
    const paginationTop = slideTopPadding + frameHeight / 2 - 48;
    const paginationLeft = Math.max(slideHorizontalPadding - 24, 12);

    return {
      frameWidth,
      frameHeight,
      slideHorizontalPadding,
      slideTopPadding,
      slideBottomPadding,
      paginationTop,
      paginationLeft,
    };
  }, [insets, windowHeight, windowWidth]);

  const recorderTop = Math.max(insets.top + 16, frameMetrics.slideTopPadding - 96);
  const ratingSteps = useMemo(() => Array.from({ length: 9 }, (_, index) => 1 + index * 0.5), []);

  const handlePhotoUpload = async (category: 'profile' | 'outfits' | 'room' | 'socials') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setProfileData(prev => {
          switch (category) {
            case 'profile':
              return { ...prev, profilePhoto: asset.uri };
            case 'outfits':
              return { ...prev, outfitPhotos: [...prev.outfitPhotos, asset.uri] };
            case 'room':
              return { ...prev, roomPhotos: [...prev.roomPhotos, asset.uri] };
            case 'socials':
              return { ...prev, socialPhotos: [...prev.socialPhotos, asset.uri] };
            default:
              return prev;
          }
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const removePhoto = (category: 'outfits' | 'room' | 'socials', index: number) => {
    setProfileData(prev => {
      switch (category) {
        case 'outfits':
          return { ...prev, outfitPhotos: prev.outfitPhotos.filter((_, i) => i !== index) };
        case 'room':
          return { ...prev, roomPhotos: prev.roomPhotos.filter((_, i) => i !== index) };
        case 'socials':
          return { ...prev, socialPhotos: prev.socialPhotos.filter((_, i) => i !== index) };
        default:
          return prev;
      }
    });
  };

  const handleSubmit = () => {
    if (!profileData.profilePhoto) {
      Alert.alert('Missing Photo', 'Please upload a profile photo before submitting.');
      return;
    }
    if (!profileData.reviewerNote.trim()) {
      Alert.alert('Missing Note', 'Please add a note for the reviewer before submitting.');
      return;
    }
    
    // Move to video review step
    setCurrentFlowStep('video-review');
  };

  const canSubmitReview = videoReviewState.videoUri && videoReviewState.overallRating > 0;

  const handleSubmitReview = () => {
    if (!canSubmitReview) {
      if (!videoReviewState.videoUri) {
        Alert.alert('Video Required', 'Please record a video review before submitting.');
      } else if (videoReviewState.overallRating === 0) {
        Alert.alert('Overall Rating Required', 'Please provide an overall rating before submitting.');
      }
      return;
    }
    
    // Move to submitted step
    setCurrentFlowStep('submitted');
    setProfileData(prev => ({ ...prev, isSubmitted: true }));
  };

  const handleShareToTikTok = () => {
    Alert.alert('Share to TikTok', 'This would open TikTok to share the review!');
  };

  const handleShareToInstagram = () => {
    Alert.alert('Share to Instagram', 'This would open Instagram to share the review!');
  };

  // Create slides for video review carousel
  const createVideoReviewSlides = () => {
    const slides: any[] = [];
    
    // Profile slide
    if (profileData.profilePhoto) {
      slides.push({
        type: 'profile',
        data: {
          name: revieweeName,
          message: profileData.reviewerNote,
          profilePicture: profileData.profilePhoto
        }
      });
    }

    // Section slides
    const sections = [
      { title: 'Outfit Photos', subtitle: `Rate ${revieweeName}'s outfit choices`, photos: profileData.outfitPhotos, category: 'outfits' },
      { title: 'Room Tour', subtitle: `Review ${revieweeName}'s living space`, photos: profileData.roomPhotos, category: 'room' },
      { title: 'Social Photos', subtitle: `Evaluate ${revieweeName}'s social presence`, photos: profileData.socialPhotos, category: 'socials' }
    ];

    sections.forEach(section => {
      if (section.photos.length > 0) {
        // Section header
        slides.push({
          type: 'section',
          data: {
            title: section.title,
            subtitle: section.subtitle
          }
        });

        // Individual photos
        section.photos.forEach((photo, index) => {
          slides.push({
            type: 'photo',
            data: {
              uri: photo,
              category: section.category,
              photoIndex: index
            }
          });
        });
      }
    });

    // Overall rating slide
    slides.push({
      type: 'overall',
      data: {
        name: revieweeName,
        profilePicture: profileData.profilePhoto
      }
    });

    return slides;
  };

  const allSlides = createVideoReviewSlides();

  const renderUploadStep = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.demoInfo}>
        <Text style={styles.demoTitle}>💕 Dating Profile Review Demo</Text>
            <Text style={styles.demoDescription}>
          Experience the complete video review flow: upload photos, record a video review with ratings, and see the final result.
            </Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Profile Photo</Text>
        <Text style={styles.sectionSubtitle}>Upload your main dating profile photo</Text>
            
            <View style={styles.photoUploadContainer}>
              {profileData.profilePhoto ? (
                <View style={styles.photoPreview}>
                  <Image 
                    source={{ uri: profileData.profilePhoto }} 
                    style={styles.uploadedPhoto}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                onPress={() => handlePhotoUpload('profile')}
                  >
                    <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
              onPress={() => handlePhotoUpload('profile')}
                >
              <Text style={styles.uploadButtonText}>📷 Upload Profile Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Outfit Photos</Text>
        <Text style={styles.sectionSubtitle}>Show your style with outfit photos</Text>
        
        <View style={styles.photoGrid}>
          {profileData.outfitPhotos.map((photo, index) => (
            <View key={index} style={styles.photoGridItem}>
              <Image source={{ uri: photo }} style={styles.gridPhoto} contentFit="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto('outfits', index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.uploadGridButton, profileData.outfitPhotos.length >= 3 && styles.disabledButton]}
            onPress={() => handlePhotoUpload('outfits')}
            disabled={profileData.outfitPhotos.length >= 3}
          >
            <Text style={styles.uploadGridButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Room Photos</Text>
        <Text style={styles.sectionSubtitle}>Show your living space</Text>
        
        <View style={styles.photoGrid}>
          {profileData.roomPhotos.map((photo, index) => (
            <View key={index} style={styles.photoGridItem}>
              <Image source={{ uri: photo }} style={styles.gridPhoto} contentFit="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto('room', index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.uploadGridButton, profileData.roomPhotos.length >= 2 && styles.disabledButton]}
            onPress={() => handlePhotoUpload('room')}
            disabled={profileData.roomPhotos.length >= 2}
          >
            <Text style={styles.uploadGridButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Social Photos</Text>
        <Text style={styles.sectionSubtitle}>Show your lifestyle and interests</Text>
        
        <View style={styles.photoGrid}>
          {profileData.socialPhotos.map((photo, index) => (
            <View key={index} style={styles.photoGridItem}>
              <Image source={{ uri: photo }} style={styles.gridPhoto} contentFit="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto('socials', index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.uploadGridButton, profileData.socialPhotos.length >= 2 && styles.disabledButton]}
            onPress={() => handlePhotoUpload('socials')}
            disabled={profileData.socialPhotos.length >= 2}
          >
            <Text style={styles.uploadGridButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Note for Reviewer</Text>
            <Text style={styles.sectionSubtitle}>Tell the reviewer what you'd like feedback on</Text>
            
            <TextInput
              style={styles.noteInput}
          placeholder="e.g., 'Please review my dating profile and suggest improvements for better matches'"
              placeholderTextColor={Colors.brand.textSecondary}
              value={profileData.reviewerNote}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, reviewerNote: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, (!profileData.profilePhoto || !profileData.reviewerNote.trim()) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!profileData.profilePhoto || !profileData.reviewerNote.trim()}
            >
              <LinearGradient
                colors={(!profileData.profilePhoto || !profileData.reviewerNote.trim()) ? ['#ccc', '#999'] : [Colors.brand.accentOrange, Colors.brand.primary]}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>
              Start Video Review Demo
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {(!profileData.profilePhoto || !profileData.reviewerNote.trim()) && (
              <Text style={styles.helpText}>
            Please upload a profile photo and add a note before starting the demo
              </Text>
            )}
          </View>
        </ScrollView>
  );

  const renderVideoReviewStep = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.demoInfo}>
        <Text style={styles.demoTitle}>🎥 Video Review Interface</Text>
        <Text style={styles.demoDescription}>
          This is what reviewers see when recording a video review. They can swipe through your photos, rate each one, add notes, and record their feedback.
        </Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Video Recording</Text>
        <Text style={styles.sectionSubtitle}>Reviewers record while swiping through your photos</Text>
        
        <TouchableOpacity
          style={styles.videoReviewButton}
          onPress={() => setVideoReviewState(prev => ({ ...prev, recordingModeOpen: true }))}
        >
          <LinearGradient
            colors={[Colors.brand.accentOrange, Colors.brand.primary]}
            style={styles.videoReviewGradient}
          >
            <Text style={styles.videoReviewButtonText}>🎥 Start Video Review Demo</Text>
          </LinearGradient>
        </TouchableOpacity>

        {videoReviewState.videoUri && (
          <View style={styles.videoCompleteContainer}>
            <Text style={styles.videoCompleteText}>✅ Video Review Complete</Text>
            <Text style={styles.videoCompleteSubtext}>Ready to submit with ratings and notes</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Rating System</Text>
        <Text style={styles.sectionSubtitle}>Reviewers leave an overall rating with optional notes</Text>
        
        <View style={styles.ratingDemoContainer}>
          <Text style={styles.ratingDemoLabel}>Overall Rating:</Text>
          <StarRating 
            rating={videoReviewState.overallRating * 2}
            category="Overall"
            size="large"
            showNumber={false}
          />
          <View style={styles.ratingButtons}>
            {ratingSteps.map((rating) => {
              const isSelected = videoReviewState.overallRating === rating;
              return (
                <TouchableOpacity
                  key={rating}
                  onPress={() => setVideoReviewState(prev => ({ ...prev, overallRating: rating }))}
                  style={[
                    styles.ratingButton,
                    isSelected && styles.ratingButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.ratingButtonText,
                    isSelected && styles.ratingButtonTextSelected
                  ]}>
                    {rating.toFixed(rating % 1 === 0 ? 0 : 1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.overallNoteContainer}>
          <Text style={styles.overallNoteLabel}>Overall Note</Text>
          <TextInput
            style={styles.overallNoteInput}
            placeholder="Share a quick summary of your feedback"
            placeholderTextColor={Colors.brand.textSecondary}
            multiline
            value={videoReviewState.overallNote}
            onChangeText={(text) => setVideoReviewState(prev => ({ ...prev, overallNote: text }))}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmitReview && styles.disabledButton]}
          onPress={handleSubmitReview}
          disabled={!canSubmitReview}
        >
          <LinearGradient
            colors={!canSubmitReview ? ['#ccc', '#999'] : [Colors.brand.accentOrange, Colors.brand.primary]}
            style={styles.submitGradient}
          >
            <Text style={styles.submitButtonText}>
              Complete Review Demo
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {!canSubmitReview && (
          <Text style={styles.helpText}>
            Please record a video and provide an overall rating
          </Text>
        )}
      </View>
    </ScrollView>
  );

  const renderSubmittedStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.thankYouContainer}>
        <Text style={styles.thankYouTitle}>🎉 Review Complete!</Text>
        <Text style={styles.thankYouMessage}>
          Thank you for experiencing the video review demo! In the real app, reviewers would submit their video review with ratings and notes, and you could share it to social media.
            </Text>
            
            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareToTikTok}
              >
                <LinearGradient
                  colors={['#000000', '#333333']}
                  style={styles.shareButtonGradient}
                >
                  <Text style={styles.shareButtonText}>🎵 Share to TikTok</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareToInstagram}
              >
                <LinearGradient
                  colors={['#E4405F', '#C13584']}
                  style={styles.shareButtonGradient}
                >
                  <Text style={styles.shareButtonText}>📸 Share to Instagram</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.backToHomeButtonText}>Back to Profile</Text>
        </TouchableOpacity>
          </View>
        </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => currentFlowStep === 'upload' ? router.back() : setCurrentFlowStep('upload')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentFlowStep === 'upload' ? 'Dating Profile Upload' : 
           currentFlowStep === 'video-review' ? 'Video Review Demo' : 
           'Review Complete'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {currentFlowStep === 'upload' && renderUploadStep()}
      {currentFlowStep === 'video-review' && renderVideoReviewStep()}
      {currentFlowStep === 'submitted' && renderSubmittedStep()}

      {/* Video Review Recording Modal */}
      <Modal visible={videoReviewState.recordingModeOpen} animationType="slide" onRequestClose={() => setVideoReviewState(prev => ({ ...prev, recordingModeOpen: false }))}>
        <RNView style={{ flex: 1, backgroundColor: Colors.brand.background }}>
          {/* Vertical photo carousel */}
          <ScrollView 
            pagingEnabled 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }} 
            contentContainerStyle={{ alignItems: 'center' }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.y / windowHeight);
              setVideoReviewState(prev => ({ ...prev, currentPhotoIndex: index }));
            }}
          >
            {allSlides.map((slide, i) => (
              <RNView
                key={`slide-${i}`}
                style={[
                  styles.recordingSlide,
                  {
                    width: windowWidth,
                    height: windowHeight,
                    paddingHorizontal: frameMetrics.slideHorizontalPadding,
                    paddingTop: frameMetrics.slideTopPadding,
                    paddingBottom: frameMetrics.slideBottomPadding,
                  },
                ]}
              >
                {slide.type === 'profile' && (
                  <RNView style={[styles.overlayCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }]}>
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 16, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={styles.overlayTitle}>{slide.data.name}</Text>
                    {slide.data.message ? (<Text style={styles.overlayText}>{slide.data.message}</Text>) : null}
                    {slide.data.profilePicture ? (<Image source={{ uri: slide.data.profilePicture }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12, marginTop: 12 }} contentFit="cover" />) : null}
                  </RNView>
                )}
                
                {slide.type === 'section' && (
                  <SectionSlideCard
                    title={slide.data.title}
                    subtitle={slide.data.subtitle}
                    revieweeName={revieweeName}
                    style={{ marginHorizontal: 0, width: frameMetrics.frameWidth }}
                  />
                )}
                
                {slide.type === 'photo' && (
                  <RNView style={[styles.overlayPhotoCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }]}>
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 12, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={styles.overlayTitle}>{slide.data.category} - Photo {slide.data.photoIndex + 1}</Text>
                    <TouchableOpacity
                      style={{ width: '100%', aspectRatio: 3/4, borderRadius: 12, marginTop: 8, overflow: 'hidden' }}
                    >
                      <Image source={{ uri: slide.data.uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
                    </TouchableOpacity>
                    <Text style={[styles.overlayText, { marginTop: 16 }]}>
                      Share your thoughts out loud while recording. Swipe up to move to the next photo.
                    </Text>
                  </RNView>
                )}
                
                {slide.type === 'overall' && (
                  <RNView style={[styles.overlayCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }]}>
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 16, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={styles.overlayTitle}>Overall Rating</Text>
                    <Text style={styles.overlayText}>Rate {slide.data.name} overall</Text>
                    
                    {slide.data.profilePicture ? (
                      <TouchableOpacity
                        style={{ width: '100%', aspectRatio: 1, borderRadius: 12, marginTop: 16, marginBottom: 16, overflow: 'hidden' }}
                      >
                        <Image source={{ uri: slide.data.profilePicture }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
                      </TouchableOpacity>
                    ) : null}
                    
                    <RNView style={{ marginTop: 16, alignItems: 'center' }}>
                      <Text style={[styles.overlayText, { marginBottom: 16 }]}>Overall Rating:</Text>
                      <StarRating 
                        rating={videoReviewState.overallRating * 2}
                        category="Overall"
                        size="large"
                        showNumber={false}
                      />
                      <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                        {ratingSteps.map((rating) => {
                          const isSelected = videoReviewState.overallRating === rating;
                          return (
                            <TouchableOpacity
                              key={rating}
                              onPress={() => setVideoReviewState(prev => ({ ...prev, overallRating: rating }))}
                              style={[
                                styles.ratingButton,
                                isSelected && styles.ratingButtonSelected
                              ]}
                            >
                              <Text style={[
                                styles.ratingButtonText,
                                isSelected && styles.ratingButtonTextSelected
                              ]}>
                                {rating.toFixed(rating % 1 === 0 ? 0 : 1)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </RNView>
                    </RNView>

                    <RNView style={{ marginTop: 20, width: '100%' }}>
                      <Text style={[styles.overlayText, { marginBottom: 12 }]}>Overall Note</Text>
                      <TextInput
                        style={[styles.overallNoteInput, { minHeight: 100 }]}
                        placeholder="Write a quick summary to pair with your video review"
                        placeholderTextColor={Colors.brand.textSecondary}
                        multiline
                        value={videoReviewState.overallNote}
                        onChangeText={(text) => setVideoReviewState(prev => ({ ...prev, overallNote: text }))}
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </RNView>
                    
                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      disabled={!canSubmitReview}
                      style={[
                        styles.actionButton, 
                        styles.acceptButton, 
                        { marginTop: 24 },
                        !canSubmitReview && styles.disabledButton
                      ]}
                    >
                      <Text style={styles.actionButtonText}>
                        Finish Video Review
                      </Text>
                    </TouchableOpacity>
                  </RNView>
                )}
              </RNView>
            ))}
          </ScrollView>

          {/* Circular video recorder centered at top-middle */}
          <RNView style={{ position: 'absolute', top: recorderTop, left: 0, right: 0, alignItems: 'center', zIndex: 10, elevation: 10 }}>
            <MediaRecorder
              onRecorded={(uri) => {
                setVideoReviewState(prev => ({ 
                  ...prev, 
                  videoUri: uri, 
                  recordingModeOpen: false,
                  isVideoReviewMode: false 
                }));
                Alert.alert('Video Attached', 'Demo video recorded! In the real app, reviewers would submit their video review.');
              }}
              variant="centered"
              circleSize={120}
            />
          </RNView>

          {/* Close button */}
          <RNView style={{ position: 'absolute', top: insets.top + 12, left: 16, zIndex: 11, elevation: 11 }}>
            <TouchableOpacity onPress={() => setVideoReviewState(prev => ({ ...prev, recordingModeOpen: false, isVideoReviewMode: false }))} style={[styles.actionButton, styles.denyButton, { paddingHorizontal: 14, paddingVertical: 8 }]}>
              <Text style={[styles.actionButtonText, styles.denyButtonText]}>Close</Text>
            </TouchableOpacity>
          </RNView>

          {/* Vertical pagination dots */}
          <RNView
            style={{
              position: 'absolute',
              top: Math.max(frameMetrics.paginationTop, frameMetrics.slideTopPadding + 16),
              left: frameMetrics.paginationLeft,
              zIndex: 10,
            }}
          >
            <PaginationDots
              totalItems={allSlides.length}
              currentIndex={videoReviewState.currentPhotoIndex}
              orientation="vertical"
            />
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 16,
  },
  photoUploadContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    alignItems: 'center',
  },
  uploadedPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
  },
  changePhotoButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  changePhotoButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
    fontSize: 16,
  },
  noteInput: {
    backgroundColor: Colors.brand.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
    minHeight: 100,
  },
  submitContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  submitButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  submitButtonText: {
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
  thankYouContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
  },
  thankYouMessage: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shareButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  shareButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shareButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  // New styles for enhanced demo
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoGridItem: {
    position: 'relative',
    width: '30%',
    aspectRatio: 1,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  uploadGridButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadGridButtonText: {
    color: Colors.brand.accentOrange,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  videoReviewButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 16,
  },
  videoReviewGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  videoReviewButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
  videoCompleteContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.brand.status?.completed + '15' || '#10b98115',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand.status?.completed || '#10b981',
  },
  videoCompleteText: {
    color: Colors.brand.status?.completed || '#10b981',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  videoCompleteSubtext: {
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
  },
  ratingDemoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  ratingDemoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  ratingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonSelected: {
    backgroundColor: Colors.brand.accentOrange,
    borderColor: Colors.brand.accentOrange,
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  ratingButtonTextSelected: {
    color: Colors.brand.textOnGradient,
  },
  overallNoteContainer: {
    marginTop: 28,
    width: '100%',
  },
  overallNoteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  overallNoteInput: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  backToHomeButton: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    alignItems: 'center',
  },
  backToHomeButtonText: {
    color: Colors.brand.accentOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal overlay styles
  overlayCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  overlayPhotoCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  overlayText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.brand.accentOrange,
  },
  denyButton: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  actionButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  denyButtonText: {
    color: Colors.brand.textPrimary,
  },
  recordingSlide: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});

