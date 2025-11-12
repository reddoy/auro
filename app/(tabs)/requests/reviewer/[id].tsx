import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Platform, Linking, Animated, Pressable, LayoutAnimation, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRequestById, getProfileById, acceptRequest, denyRequest, submitRequestReview, updateRequestStatus } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbRequestSummary } from '@/types';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { Image } from 'expo-image';
import SimplePhotoModal from '@/components/SimplePhotoModal';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import { signRequestMediaUrls, getSignedRequestMediaUrl } from '@/lib/uploads';
import RatingBar from '@/components/RatingBar';
import MediaRecorder from '@/components/MediaRecorder';
import { uploadRequestMedia } from '@/lib/uploads';
import { createStripeExpressLoginLink } from '@/lib/payments';
import * as Sharing from 'expo-sharing';
import Spinner from '@/components/Spinner';
import VideoReviewSection from '@/components/VideoReviewSection';
import PaginationDots from '@/components/PaginationDots';
import SectionSlideCard from '@/components/SectionSlideCard';
import ReviewStatusCard from '@/components/ReviewStatusCard';
import StarRating from '@/components/StarRating';

// Removed unused URL helper functions since we're not showing social links in this screen

export default function ReviewerRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [denyLoading,   setDenyLoading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [signedProfilePhotos, setSignedProfilePhotos] = useState<string[]>([]);
  // Removed signedSelfie - now using user's profile picture from avatarUri
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [recordingModeOpen, setRecordingModeOpen] = useState(false);
  const [galleryUris, setGalleryUris] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoUri, setCurrentPhotoUri] = useState<string>('');
  // Earnings UI
  const amountCents = (request as any)?.amount_cents as number | undefined;
  const auroFeeCents = (request as any)?.application_fee_cents as number | undefined;
  const stripeFeeCents = (request as any)?.stripe_fee_cents as number | undefined;
  const netAmountCents = (request as any)?.net_amount_cents as number | undefined;
  const auroFeeBps = (request as any)?.auro_fee_bps as number | undefined;
  const [expressUrl, setExpressUrl] = useState<string | null>(null);

  // Per-photo notes and ratings for video review
  const [overallRating, setOverallRating] = useState<number>(0);
  const [overallNote, setOverallNote] = useState<string>('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isVideoReviewMode, setIsVideoReviewMode] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const ratingSteps = React.useMemo(() => Array.from({ length: 9 }, (_, index) => 1 + index * 0.5), []);

  const frameMetrics = React.useMemo(() => {
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
  
  // Video review is now the only option - no individual section ratings needed
  const canSubmit = React.useMemo(() => !!videoUri && overallRating > 0, [videoUri, overallRating]);
  
  // Move useMemo to the top level, always called
  const parsedNotes = React.useMemo(() => {
    try {
      if (!request?.notes) return null;
      return typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes;
    } catch {
      return null;
    }
  }, [request?.notes]);
  
  // Create combined slides array: profile + section cards + photos + overall rating
  const allSlides = React.useMemo(() => {
    const slides: Array<{type: 'profile' | 'section' | 'photo' | 'overall', data: any, index: number}> = [];
    let slideIndex = 0;

    slides.push({
      type: 'profile',
      data: { name: reviewee?.displayName || 'User', message: parsedNotes?.message, profilePicture: avatarUri },
      index: slideIndex++
    });

    if (signedProfilePhotos.length > 0) {
      slides.push({
        type: 'section',
        data: { title: 'Dating Profile', subtitle: "Let's explore {name}'s dating profile" },
        index: slideIndex++
      });

      signedProfilePhotos.forEach((uri, i) => {
        slides.push({
          type: 'photo',
          data: { uri, category: 'Dating Profile', photoIndex: i, totalPhotos: signedProfilePhotos.length },
          index: slideIndex++
        });
      });
    }

    slides.push({
      type: 'overall',
      data: { name: reviewee?.displayName || 'User', profilePicture: avatarUri },
      index: slideIndex++
    });

    return slides;
  }, [signedProfilePhotos, avatarUri, reviewee?.displayName, parsedNotes?.message]);

  // Create sections for VideoReviewSection
  const reviewSections = React.useMemo(() => {
    if (!signedProfilePhotos.length) return [];
    return [
      {
        title: 'Dating Profile',
        subtitle: 'Review their dating profile photos and share what stands out',
        photos: signedProfilePhotos,
        category: 'datingProfile'
      },
    ];
  }, [signedProfilePhotos]);

  const hasConsent = React.useMemo(() => typeof parsedNotes?.consent?.shareOnSocial === 'boolean', [parsedNotes]);
  const shareConsent = React.useMemo(() => !!parsedNotes?.consent?.shareOnSocial, [parsedNotes]);

  useEffect(() => {
    const run = async () => {
      try {
        
        if (!id) {
          
          return;
        }
        const req = await getRequestById(String(id));
        
        setRequest(req);
        
        if (req?.userId) {
          const profile = await getProfileById(req.userId);
          
          setReviewee(profile);
          
          if (profile?.avatarUrl) {
            let uri = profile.avatarUrl;
            if (uri && !/^https?:\/\//i.test(uri)) {
              try { uri = (await getSignedAvatarUrl(uri)) || uri; } catch {}
            }
            setAvatarUri(uri);
          }
        }
        // Sign media URLs for reliable viewing
        try {
          const n = req?.notes ? (typeof req.notes === 'string' ? JSON.parse(req.notes) : req.notes) : null;
          const basePhotos = Array.isArray((req as any)?.photos) ? ((req as any).photos as string[]) : [];
          const datingProfilePhotos: string[] = Array.isArray(n?.media?.datingProfileScreenshots)
            ? (n.media.datingProfileScreenshots as string[])
            : [];

          const photosToSign = datingProfilePhotos.length ? datingProfilePhotos : basePhotos;

          if (photosToSign.length) {
            setSignedProfilePhotos(await signRequestMediaUrls(photosToSign));
          } else {
            setSignedProfilePhotos([]);
          }

          // No longer loading selfie - using user's profile picture instead
        } catch {}
        // Prepare Stripe Express Portal link for reviewers
        try {
          if (req?.influencerId) {
            const url = await createStripeExpressLoginLink(req.influencerId);
            setExpressUrl(url);
          }
        } catch {}
      } catch (error) {
        console.error('Error loading request:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const handleAccept = async () => {
    if (!request?.id) return;
    if (request.status !== 'paid') {
      Alert.alert('Payment required', 'You can accept only after payment is completed.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAcceptLoading(true);
    try {
      await updateRequestStatus(request.id, 'in_progress');
      Alert.alert('Request Accepted', 'You can now submit your review for this request.');
      const refreshed = await getRequestById(request.id);
      setRequest(refreshed);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to accept request');
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!request?.id) return;
    if (request.status !== 'paid') {
      Alert.alert('Payment required', 'You can deny only after payment is completed.');
      return;
    }
    Alert.alert(
      'Deny Request',
      'Are you sure you want to deny this request? The payment will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny & Refund',
          style: 'destructive',
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setDenyLoading(true);
            try {
              await denyRequest(request.id);
              Alert.alert('Request Denied', 'The request has been denied and will be refunded.');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to deny request');
            } finally {
              setDenyLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!request?.id) return;
    if (!canSubmit) {
      if (!videoUri) {
        Alert.alert('Video Required', 'Please record a video review before submitting.');
      } else if (overallRating === 0) {
        Alert.alert('Overall Rating Required', 'Please provide an overall rating before submitting.');
      }
      return;
    }
    setSubmitting(true);
    try {
      let uploadedVideoUrl: string | undefined;
      if (videoUri) {
        const res = await uploadRequestMedia(videoUri, { category: 'other' });
        uploadedVideoUrl = res.publicUrl;
      }
      const updated = await submitRequestReview({
        requestId: request.id,
        review: {
          ratings: { overall: overallRating * 2 }, // Convert 1-5 scale to 2-10 scale for overall rating
          feedback: { strengths: [], improvements: [], generalFeedback: overallNote.trim() || 'Video review completed', sectionNotes: {} } as any,
        },
        videoUrl: uploadedVideoUrl || null,
        imageUrl: null,
      });
      setRequest(updated);
      Alert.alert('Success', 'Review submitted successfully.');
      // Navigate to submission success screen with video uri
      router.replace({ pathname: '/(tabs)/requests/reviewer/submitted' as any, params: videoUri ? { uri: videoUri } : {} as any });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Spinner size={40} color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.emptyText}>Request not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: Platform.OS === 'web' ? 120 : 100, paddingHorizontal: 0 }} showsVerticalScrollIndicator={false}>
        {/* Modern Review Status Card */}
        <ReviewStatusCard
          displayName={reviewee?.displayName || 'User'}
          avatarUri={avatarUri}
          bio={typeof parsedNotes?.message === 'string' ? parsedNotes.message : undefined}
          status={request.status}
          createdAt={request.createdAt}
          hasConsent={hasConsent}
          shareConsent={shareConsent}
          amountCents={amountCents}
          auroFeeCents={auroFeeCents}
          stripeFeeCents={stripeFeeCents}
          netAmountCents={netAmountCents}
          auroFeeBps={auroFeeBps}
          expressUrl={expressUrl}
          statusMessage={
            request.status === 'in_progress' 
              ? 'You have 30 days to complete this review. After 30 days, the requester is refunded.'
              : (request.status === 'pending' || request.status === 'accepted')
              ? 'Waiting for the requester to finish payment. They have 30 days to finish payment.'
              : undefined
          }
        />

        {/* Video Review Section with section cards */}
        {reviewSections.length > 0 && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Dating Profile Photos</Text>
            <Text style={[styles.sectionHint, { marginTop: 0 }]}>
              Browse their uploaded dating profile shots while you plan your feedback.
            </Text>
            <VideoReviewSection
              sections={reviewSections}
              showSectionHeaders={false}
              onPhotoPress={(photos, index) => {
                if (!isVideoReviewMode) {
                  setGalleryUris(photos);
                  setGalleryIndex(index);
                  setGalleryOpen(true);
                }
              }}
            />
          </View>
        )}

        {request.status === 'paid' && (
          <View style={styles.actionsSection}>
            {/* Show only the active button during loading for smooth UX */}
            {acceptLoading ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                disabled
              >
                <Spinner size={18} color={Colors.brand.textOnGradient} borderColor={'rgba(255,255,255,0.35)'} />
              </TouchableOpacity>
            ) : denyLoading ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.denyButton]}
                disabled
              >
                <Spinner size={18} color={Colors.brand.status.rejected} borderColor={Colors.brand.border} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAccept}
                >
                  <Text style={styles.actionButtonText}>Accept Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.denyButton]}
                  onPress={handleDeny}
                >
                  <Text style={[styles.actionButtonText, styles.denyButtonText]}>Deny Request</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Removed duplicate Submit Review button to avoid confusion */}

        {(request.status === 'completed' || request.status === 'rejected') && (
          <View style={styles.actionsSection}>
            <Text style={styles.statusMessage}>
              {request.status === 'completed' 
                ? '✅ Review submitted successfully' 
                : '❌ Request was denied and refunded'
              }
            </Text>
          </View>
        )}

        {request.status === 'in_progress' && (
          <View style={styles.section}>
            <Text style={styles.label}>Video Review</Text>
            <Text style={styles.sectionHint}>
              Record a dating profile video review while you swipe through their photos, then wrap with an overall rating and summary note.
            </Text>
            {Platform.OS !== 'web' && (
              <RNView style={{ marginTop: 16 }}>
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => {
                  setIsVideoReviewMode(true);
                  setRecordingModeOpen(true);
                }}>
                  <Text style={styles.actionButtonText}>Start Video Review</Text>
                </TouchableOpacity>
              </RNView>
            )}
            {videoUri && (
              <RNView style={{ marginTop: 16, padding: 16, backgroundColor: Colors.brand.status.completed + '15', borderRadius: 16, borderWidth: 2, borderColor: Colors.brand.status.completed }}>
                <Text style={{ color: Colors.brand.status.completed, fontWeight: '700', textAlign: 'center', fontSize: 16 }}>✅ Video Review Complete</Text>
              </RNView>
            )}

            <TouchableOpacity
              style={[styles.actionButton, canSubmit ? styles.primaryButton : styles.disabledButton, { marginTop: 20 }]}
              onPress={handleSubmitReview}
              disabled={!canSubmit || submitting}
            >
              <Text style={styles.actionButtonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {/* Immersive recording modal with rating and note controls */}
      <Modal visible={recordingModeOpen} animationType="slide" onRequestClose={() => setRecordingModeOpen(false)}>
        <RNView style={{ flex: 1, backgroundColor: Colors.brand.background }}>
          
          {/* Vertical photo carousel with rating and note controls */}
          <ScrollView 
            pagingEnabled 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }} 
            contentContainerStyle={{ alignItems: 'center' }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.y / windowHeight);
              setCurrentPhotoIndex(index);
            }}
          >
            {/* All slides: profile, section cards, and photos */}
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
                  <RNView style={[styles.overlayCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }] }>
                    {/* Auro Logo */}
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
                    revieweeName={reviewee?.displayName || 'User'}
                    style={{ marginHorizontal: 0, width: frameMetrics.frameWidth }}
                  />
                )}
                
                {slide.type === 'photo' && (
                  <RNView style={[styles.overlayPhotoCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }] }>
                    {/* Auro Logo */}
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 12, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={styles.overlayTitle}>{slide.data.category} - Photo {slide.data.photoIndex + 1}</Text>
                    <TouchableOpacity
                      style={{ 
                        width: '100%', 
                        aspectRatio: 3/4, 
                        borderRadius: 12, 
                        marginTop: 8,
                        overflow: 'hidden'
                      }}
                      onPress={() => {
                        setCurrentPhotoUri(slide.data.uri);
                        setPhotoModalOpen(true);
                      }}
                    >
                      <Image source={{ uri: slide.data.uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
                    </TouchableOpacity>
                    <Text style={[styles.overlayText, { marginTop: 16 }]}>
                      Talk through what stands out while you record. Swipe to continue through their profile.
                    </Text>
                  </RNView>
                )}
                
                {slide.type === 'overall' && (
                  <RNView style={[styles.overlayCard, { width: frameMetrics.frameWidth, maxHeight: frameMetrics.frameHeight }] }>
                    {/* Auro Logo */}
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 80, height: 40, marginBottom: 16, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={styles.overlayTitle}>Overall Rating</Text>
                    <Text style={styles.overlayText}>Rate {slide.data.name} overall</Text>
                    
                    {/* Profile Picture display */}
                    {slide.data.profilePicture ? (
                      <TouchableOpacity
                        style={{ 
                          width: '100%', 
                          aspectRatio: 1, 
                          borderRadius: 12, 
                          marginTop: 16,
                          marginBottom: 16,
                          overflow: 'hidden'
                        }}
                        onPress={() => {
                          setCurrentPhotoUri(slide.data.profilePicture);
                          setPhotoModalOpen(true);
                        }}
                      >
                        <Image source={{ uri: slide.data.profilePicture }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
                      </TouchableOpacity>
                    ) : null}
                    
                    {/* Overall Rating with Stars */}
                    <RNView style={{ marginTop: 16, alignItems: 'center' }}>
                      <Text style={[styles.overlayText, { marginBottom: 16 }]}>Overall Rating:</Text>
                      <StarRating 
                        rating={overallRating * 2} // Convert 1-5 to 2-10 scale for StarRating component
                        category="Overall"
                        size="large"
                        showNumber={false}
                      />
                      <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                        {ratingSteps.map((rating) => {
                          const isSelected = overallRating === rating;
                          return (
                            <TouchableOpacity
                              key={rating}
                              onPress={() => setOverallRating(rating)}
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
                        style={styles.overallNoteInput}
                        placeholder="Share a short summary to pair with your video review"
                        placeholderTextColor={Colors.brand.textSecondary}
                        multiline
                        value={overallNote}
                        onChangeText={setOverallNote}
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </RNView>
                    
                    {/* Finish Video Review Button */}
                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      disabled={!canSubmit || submitting}
                      style={[
                        styles.actionButton, 
                        styles.acceptButton, 
                        { marginTop: 24 },
                        (!canSubmit || submitting) && styles.disabledButton
                      ]}
                    >
                      <Text style={styles.actionButtonText}>
                        {submitting ? 'Submitting...' : 'Finish Video Review'}
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
                setVideoUri(uri);
                setRecordingModeOpen(false);
                setIsVideoReviewMode(false);
                Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
              }}
              variant="centered"
              circleSize={120}
            />
          </RNView>


          {/* Close button - positioned to the left of camera circle */}
          <RNView style={{ position: 'absolute', top: insets.top + 12, left: 16, zIndex: 11, elevation: 11 }}>
            <TouchableOpacity onPress={() => {
              setRecordingModeOpen(false);
              setIsVideoReviewMode(false);
            }} style={[styles.actionButton, styles.denyButton, { paddingHorizontal: 14, paddingVertical: 8 }]}>
              <Text style={[styles.actionButtonText, styles.denyButtonText]}>Close</Text>
            </TouchableOpacity>
          </RNView>

          {/* Vertical pagination dots on left side */}
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
              currentIndex={currentPhotoIndex}
              orientation="vertical"
            />
          </RNView>
        </RNView>
      </Modal>
      <ImageGalleryModal visible={galleryOpen} uris={galleryUris} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
      <SimplePhotoModal visible={photoModalOpen} uri={currentPhotoUri} onClose={() => setPhotoModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mediaSection: { alignItems: 'stretch', gap: 16 },
  label: { fontSize: 22, color: Colors.brand.textPrimary, marginBottom: 12, fontWeight: '900', letterSpacing: 0.4 },
  value: { fontSize: 16, color: Colors.brand.textPrimary, lineHeight: 26, fontWeight: '500' },
  selfie: { width: '100%', aspectRatio: 1, borderRadius: 16, marginTop: 8, maxHeight: 320 },
  actionsSection: { marginHorizontal: 20, marginVertical: 16, gap: 16 },
  actionButton: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  acceptButton: { backgroundColor: Colors.brand.status.completed },
  primaryButton: { backgroundColor: Colors.brand.accentOrange },
  denyButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.brand.status.rejected },
  actionButtonText: { fontSize: 17, fontWeight: '700', color: Colors.brand.textOnGradient, letterSpacing: 0.35 },
  denyButtonText: { color: Colors.brand.status.rejected },
  statusMessage: { fontSize: 16, fontWeight: '600', color: Colors.brand.textSecondary, textAlign: 'center', padding: 16 },
  emptyText: { color: Colors.brand.textSecondary },
  sectionHint: { fontSize: 15, color: Colors.brand.textSecondary, marginTop: 8, fontWeight: '500', lineHeight: 22, fontStyle: 'italic' },

  disabledButton: { backgroundColor: Colors.brand.border, opacity: 0.6 },
  recordingSlide: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  overlayCard: { 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  overlayPhotoCard: { 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  overlayTitle: { fontSize: 20, fontWeight: '900', color: Colors.brand.textPrimary, marginBottom: 8 },
  overlayText: { fontSize: 15, color: Colors.brand.textSecondary, lineHeight: 21 },
  
  // New styles for video review interface
  ratingButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  ratingButtonSelected: { 
    backgroundColor: Colors.brand.accentOrange,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  ratingButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16 
  },
  ratingButtonTextSelected: { 
    color: '#fff' 
  },
  overallNoteInput: {
    minHeight: 110,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
    backgroundColor: Colors.brand.cardBackgroundLight,
    color: Colors.brand.textPrimary,
  },
});
