import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Dimensions, Platform, Linking, Animated, Pressable, LayoutAnimation } from 'react-native';
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
import PhotoCarousel from '@/components/PhotoCarousel';
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
import { LinearGradient } from 'expo-linear-gradient';
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

  const [signedPhotos, setSignedPhotos] = useState<string[]>([]); // fallback when categories aren't present
  const [signedOutfits, setSignedOutfits] = useState<string[]>([]);
  const [signedRoom, setSignedRoom] = useState<string[]>([]);
  const [signedSocials, setSignedSocials] = useState<string[]>([]);
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
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [photoRatings, setPhotoRatings] = useState<Record<string, number>>({});
  const [overallRating, setOverallRating] = useState<number>(0);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteUri, setNoteUri] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isVideoReviewMode, setIsVideoReviewMode] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
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
    
    // Add profile slide
    slides.push({
      type: 'profile',
      data: { name: reviewee?.displayName || 'User', message: parsedNotes?.message, profilePicture: avatarUri },
      index: slideIndex++
    });
    
    // Add sections with their photos
    if (signedOutfits.length > 0) {
      // Section card
      slides.push({
        type: 'section',
        data: { title: 'Outfits', subtitle: "These are {name}'s best outfits" },
        index: slideIndex++
      });
      // Outfit photos
      signedOutfits.forEach((uri, i) => {
        slides.push({
          type: 'photo',
          data: { uri, category: 'Outfits', photoIndex: i, totalPhotos: signedOutfits.length },
          index: slideIndex++
        });
      });
    }
    
    if (signedRoom.length > 0) {
      // Section card
      slides.push({
        type: 'section',
        data: { title: 'Room Tour', subtitle: "Here are some pictures of {name}'s room" },
        index: slideIndex++
      });
      // Room photos
      signedRoom.forEach((uri, i) => {
        slides.push({
          type: 'photo',
          data: { uri, category: 'Room Tour', photoIndex: i, totalPhotos: signedRoom.length },
          index: slideIndex++
        });
      });
    }
    
    if (signedSocials.length > 0) {
      // Section card
      slides.push({
        type: 'section',
        data: { title: 'Socials', subtitle: "Here are {name}'s social media highlights" },
        index: slideIndex++
      });
      // Social photos
      signedSocials.forEach((uri, i) => {
        slides.push({
          type: 'photo',
          data: { uri, category: 'Socials', photoIndex: i, totalPhotos: signedSocials.length },
          index: slideIndex++
        });
      });
    }
    
    // Add overall rating slide at the end
    slides.push({
      type: 'overall',
      data: { name: reviewee?.displayName || 'User', profilePicture: avatarUri }, // Use profile picture instead of selfie
      index: slideIndex++
    });
    
    return slides;
  }, [signedOutfits, signedRoom, signedSocials, avatarUri, reviewee?.displayName, parsedNotes?.message]);

  // Create sections for VideoReviewSection
  const reviewSections = React.useMemo(() => {
    const sections = [];
    
    if (signedOutfits.length > 0) {
      sections.push({
        title: 'Outfits',
        subtitle: 'Rate and review their outfit choices',
        photos: signedOutfits,
        category: 'outfits'
      });
    }
    
    if (signedRoom.length > 0) {
      sections.push({
        title: 'Room Tour',
        subtitle: 'Evaluate their living space and style',
        photos: signedRoom,
        category: 'room'
      });
    }
    
    if (signedSocials.length > 0) {
      sections.push({
        title: 'Socials',
        subtitle: 'Review their social media presence',
        photos: signedSocials,
        category: 'socials'
      });
    }
    
    return sections;
  }, [signedOutfits, signedRoom, signedSocials]);

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
          const outfits: string[] = Array.isArray(n?.media?.outfits) ? (n.media.outfits as string[]) : [];
          const room: string[] = Array.isArray(n?.media?.roomTourPhotos) ? (n.media.roomTourPhotos as string[]) : [];
          const socials: string[] = Array.isArray(n?.media?.datingProfileScreenshots) ? (n.media.datingProfileScreenshots as string[]) : [];

          if (outfits.length) setSignedOutfits(await signRequestMediaUrls(outfits)); else setSignedOutfits([]);
          if (room.length) setSignedRoom(await signRequestMediaUrls(room)); else setSignedRoom([]);
          if (socials.length) setSignedSocials(await signRequestMediaUrls(socials)); else setSignedSocials([]);

          // Fallback: if no categorized media present, show whatever is in basePhotos under a generic section
          if (!outfits.length && !room.length && !socials.length && basePhotos.length) {
            setSignedPhotos(await signRequestMediaUrls(basePhotos));
          } else {
            setSignedPhotos([]);
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
          feedback: { strengths: [], improvements: [], generalFeedback: 'Video review completed', sectionNotes: {}, photoNotes } as any,
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

        {parsedNotes?.message && (
          <View style={styles.section}>
            <Text style={styles.label}>About Me</Text>
            <Text style={[styles.value, { lineHeight: 26, fontStyle: 'italic' }]}>{parsedNotes.message}</Text>
          </View>
        )}

        {avatarUri && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Profile Picture</Text>
            <Text style={[styles.value, { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 12 }]}>
              This is the profile picture that will be used in reviews
            </Text>
            <TouchableOpacity onPress={() => { 
              if (!isVideoReviewMode) {
                setGalleryUris([avatarUri]); 
                setGalleryIndex(0); 
                setGalleryOpen(true); 
              }
            }}>
              <Image source={{ uri: avatarUri }} style={styles.selfie} contentFit="cover" cachePolicy="none" />
            </TouchableOpacity>
          </View>
        )}

        {/* Video Review Section with section cards */}
        {reviewSections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Photo Review</Text>
            <VideoReviewSection
              sections={reviewSections}
              onPhotoPress={(photos, index) => {
                if (!isVideoReviewMode) {
                  setGalleryUris(photos);
                  setGalleryIndex(index);
                  setGalleryOpen(true);
                }
              }}
              currentSectionIndex={currentSectionIndex}
            />
          </View>
        )}

        {signedPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Photos</Text>
            <PhotoCarousel uris={signedPhotos} onPressItem={(i) => { 
              if (!isVideoReviewMode) {
                setGalleryUris(signedPhotos); 
                setGalleryIndex(i); 
                setGalleryOpen(true); 
              }
            }} />
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
            <Text style={styles.sectionHint}>Record a video review while swiping through photos. You can rate and add notes to each photo during the recording.</Text>
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
              const index = Math.round(event.nativeEvent.contentOffset.y / Dimensions.get('window').height);
              setCurrentPhotoIndex(index);
            }}
          >
            {/* All slides: profile, section cards, and photos */}
            {allSlides.map((slide, i) => (
              <RNView key={`slide-${i}`} style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height, paddingHorizontal: 40, paddingTop: insets.top + 200, paddingBottom: insets.bottom + 20, justifyContent: 'center' }}>
                {slide.type === 'profile' && (
                  <RNView style={[styles.overlayCard, { width: '100%', alignSelf: 'center' }] }>
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
                    style={{ marginHorizontal: 0, width: '100%' }}
                  />
                )}
                
                {slide.type === 'photo' && (
                  <RNView style={[styles.overlayPhotoCard, { width: '100%', alignSelf: 'center' }] }>
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
                    
                    {/* Rating controls */}
                    <RNView style={{ marginTop: 16, alignItems: 'center' }}>
                      <Text style={[styles.overlayText, { marginBottom: 12 }]}>Rate this photo:</Text>
                      <RNView style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <TouchableOpacity
                            key={rating}
                            onPress={() => setPhotoRatings(prev => ({ ...prev, [slide.data.uri]: rating }))}
                            style={[
                              styles.ratingButton,
                              photoRatings[slide.data.uri] === rating && styles.ratingButtonSelected
                            ]}
                          >
                            <Text style={[
                              styles.ratingButtonText,
                              photoRatings[slide.data.uri] === rating && styles.ratingButtonTextSelected
                            ]}>
                              {rating}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </RNView>
                    </RNView>

                    {/* Note button - only show when not in video review mode */}
                    {!isVideoReviewMode && (
                      <TouchableOpacity
                        onPress={() => {
                          setNoteUri(slide.data.uri);
                          setNoteText(photoNotes[slide.data.uri] || '');
                          setNoteModalOpen(true);
                        }}
                        style={[styles.noteButton, photoNotes[slide.data.uri] && styles.noteButtonHasNote, { marginTop: 16 }]}
                      >
                        <Text style={[styles.noteButtonText, photoNotes[slide.data.uri] && styles.noteButtonTextHasNote]}>
                          {photoNotes[slide.data.uri] ? '📝 Edit Note' : '📝 Add Note'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </RNView>
                )}
                
                {slide.type === 'overall' && (
                  <RNView style={[styles.overlayCard, { width: '100%', alignSelf: 'center' }] }>
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
                      <RNView style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <TouchableOpacity
                            key={rating}
                            onPress={() => setOverallRating(rating)}
                            style={[
                              styles.ratingButton,
                              overallRating === rating && styles.ratingButtonSelected
                            ]}
                          >
                            <Text style={[
                              styles.ratingButtonText,
                              overallRating === rating && styles.ratingButtonTextSelected
                            ]}>
                              {rating}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </RNView>
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
          <RNView style={{ position: 'absolute', top: insets.top + 20, left: 0, right: 0, alignItems: 'center', zIndex: 10, elevation: 10 }}>
            <MediaRecorder
              onRecorded={(uri) => {
                setVideoUri(uri);
                setRecordingModeOpen(false);
                setIsVideoReviewMode(false);
                Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
              }}
              variant="centered"
              circleSize={140}
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
          <RNView style={{ position: 'absolute', top: insets.top + 220, left: 12, zIndex: 10 }}>
            <PaginationDots
              totalItems={allSlides.length}
              currentIndex={currentPhotoIndex}
              orientation="vertical"
            />
          </RNView>
        </RNView>
      </Modal>
      {/* Per-photo note editor */}
      <Modal visible={noteModalOpen} transparent animationType="fade" onRequestClose={() => setNoteModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.label}>Add a note for this photo</Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Type your note..."
              placeholderTextColor={Colors.brand.textSecondary}
              style={[styles.noteInput, { fontFamily: 'Poppins_400Regular' }]}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.actionButton, styles.denyButton]} onPress={() => { setNoteModalOpen(false); setNoteText(''); setNoteUri(null); }}>
                <Text style={[styles.actionButtonText, styles.denyButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => { if (noteUri) { setPhotoNotes(prev => ({ ...prev, [noteUri]: noteText })); } setNoteModalOpen(false); }}>
                <Text style={styles.actionButtonText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ImageGalleryModal visible={galleryOpen} uris={galleryUris} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
      <SimplePhotoModal visible={photoModalOpen} uri={currentPhotoUri} onClose={() => setPhotoModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  section: { marginHorizontal: 20, marginVertical: 12, backgroundColor: Colors.brand.cardBackground, borderRadius: 20, padding: 20, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  mediaSection: { alignItems: 'stretch' },
  label: { fontSize: 20, color: Colors.brand.textPrimary, marginBottom: 12, fontWeight: '800', letterSpacing: 0.3 },
  value: { fontSize: 16, color: Colors.brand.textPrimary, lineHeight: 24, fontWeight: '500' },
  selfie: { width: '100%', aspectRatio: 1.2, borderRadius: 12, marginTop: 8, maxHeight: 280 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  actionsSection: { marginHorizontal: 20, marginVertical: 16, gap: 16 },
  actionButton: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  acceptButton: { backgroundColor: Colors.brand.status.completed },
  primaryButton: { backgroundColor: Colors.brand.accentOrange },
  denyButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.brand.status.rejected },
  actionButtonText: { fontSize: 17, fontWeight: '700', color: Colors.brand.textOnGradient, letterSpacing: 0.3 },
  denyButtonText: { color: Colors.brand.status.rejected },
  statusMessage: { fontSize: 16, fontWeight: '600', color: Colors.brand.textSecondary, textAlign: 'center', padding: 16 },
  emptyText: { color: Colors.brand.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  noteInput: { minHeight: 100, borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, padding: 12, color: Colors.brand.textPrimary, marginBottom: 12 },
  sectionHint: { fontSize: 14, color: Colors.brand.textSecondary, marginTop: 8, fontWeight: '500', lineHeight: 20, fontStyle: 'italic' },

  disabledButton: { backgroundColor: Colors.brand.border, opacity: 0.6 },
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
  noteButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  noteButtonHasNote: { 
    backgroundColor: Colors.brand.accentMagenta + '40',
    borderColor: Colors.brand.accentMagenta
  },
  noteButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  noteButtonTextHasNote: { 
    color: Colors.brand.accentMagenta 
  },
  progressText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
});
