import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Platform, Linking, Animated, LayoutAnimation, useWindowDimensions, PanResponder, Text as RNText } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
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
import FullScreenPhotoModal from '@/components/FullScreenPhotoModal';
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
import DatingProfilePhotoGallery from '@/components/DatingProfilePhotoGallery';
import StarRating from '@/components/StarRating';

// Removed unused URL helper functions since we're not showing social links in this screen

export default function ReviewerRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [reviewer, setReviewer] = useState<any>(null);
  const [reviewerAvatarUri, setReviewerAvatarUri] = useState<string | undefined>(undefined);
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
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [zoomedPhotoUri, setZoomedPhotoUri] = useState<string>('');
  
  // Zoom state and refs
  const zoomScale = useRef(new Animated.Value(1)).current;
  const zoomTranslateX = useRef(new Animated.Value(0)).current;
  const zoomTranslateY = useRef(new Animated.Value(0)).current;
  const [zoomLastScale, setZoomLastScale] = useState(1);
  const [zoomLastTranslateX, setZoomLastTranslateX] = useState(0);
  const [zoomLastTranslateY, setZoomLastTranslateY] = useState(0);
  const [zoomCurrentScale, setZoomCurrentScale] = useState(1);
  const zoomGestureScale = useRef(1);
  const zoomGestureTranslateX = useRef(0);
  const zoomGestureTranslateY = useRef(0);
  
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
  const [photoNotes, setPhotoNotes] = useState<Record<number, string>>({});
  const [selectedPros, setSelectedPros] = useState<string[]>([]);
  const [selectedCons, setSelectedCons] = useState<string[]>([]);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Pros and cons tag options
  const prosTags = ['Great photos', 'Great lighting', 'Clever prompts', 'Strong style', 'Good variety', 'Authentic', 'Well composed', 'Eye-catching'];
  const consTags = ['Work on prompts', 'Bad lighting', 'Group photos', 'Bad style', 'Too similar', 'Low quality', 'Needs variety', 'Unclear photos'];
  const ratingLabels = ['', 'Needs work', 'Could improve', 'Solid', 'Great', 'Outstanding'];

  const frameMetrics = React.useMemo(() => {
    // Optimize for TikTok vertical video (9:16) - maximize photo size
    // Photos should fill 90% of screen height for TikTok-friendly composition
    const horizontalMargin = 8; // Very minimal padding for maximum photo size
    
    // Account for pagination dots on the right side (dots + padding + margin)
    const paginationDotsWidth = 36; // Approximate width of pagination dots container (increased for iOS)
    const paginationRight = 16; // Increased right margin for iOS
    const rightMargin = paginationDotsWidth + paginationRight + 24; // Increased spacing to prevent overlap on iOS
    
    const availableWidth = windowWidth - horizontalMargin - rightMargin; // Left margin + right space for dots
    
    // Calculate vertical spacing optimized for TikTok - account for larger camera (130px) + companion panel
    const recorderSize = 130;
    // Increase top space to account for recorder + companion panel + extra padding to prevent cutoff
    const topSpace = Math.max(insets.top + recorderSize + 60, 200); // Increased padding for better spacing
    // Increase bottom space to prevent content cutoff
    const bottomSpace = insets.bottom + 120; // Increased to prevent bottom cutoff
    
    // Calculate available height for content
    const availableHeight = windowHeight - topSpace - bottomSpace;
    
    // Account for photo info overlay below photo (marginTop: 12 + padding: 24 + text content: ~50px = ~86px)
    const infoOverlayHeight = 86;
    const contentPadding = 20; // Extra padding for breathing room
    
    // Photo height should leave room for overlay and padding
    const maxPhotoHeight = availableHeight - infoOverlayHeight - contentPadding;
    // Use 75% of available space for photo to ensure overlay fits comfortably
    const photoHeight = Math.min(availableHeight * 0.75, maxPhotoHeight);
    const photoWidth = photoHeight * (3/4); // Maintain 3:4 aspect ratio for dating photos
    
    // Calculate pagination position - center it vertically on the right side
    const contentCenterY = topSpace + availableHeight / 2;
    const paginationTop = contentCenterY - 60; // Account for pagination height

    return {
      contentWidth: availableWidth,
      contentHeight: availableHeight,
      photoWidth: Math.min(photoWidth, availableWidth), // Use full available width (already accounts for pagination)
      photoHeight,
      slideHorizontalPadding: horizontalMargin,
      slideTopPadding: topSpace,
      slideBottomPadding: bottomSpace,
      paginationTop,
      paginationRight,
    };
  }, [insets, windowHeight, windowWidth]);

  // Position recorder at top-left corner for TikTok-style composition - larger size
  const recorderTop = insets.top + 16;
  const recorderLeft = 16;
  const recorderSize = 130; // Increased from 90 for better visibility

  // Zoom PanResponder for photo zoom functionality - iOS-like behavior
  const zoomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Always capture if 2 touches (pinch) or already zoomed
        return evt.nativeEvent.touches.length === 2 || zoomCurrentScale > 1;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // More sensitive detection for iOS-like feel
        if (evt.nativeEvent.touches.length === 2) return true;
        if (zoomCurrentScale > 1) return true;
        // Detect if user is trying to pan when zoomed
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        // Set offsets from last known values
        zoomScale.setOffset(zoomLastScale);
        zoomTranslateX.setOffset(zoomLastTranslateX);
        zoomTranslateY.setOffset(zoomLastTranslateY);
        zoomScale.setValue(0);
        zoomTranslateX.setValue(0);
        zoomTranslateY.setValue(0);
        
        zoomGestureScale.current = zoomLastScale;
        zoomGestureTranslateX.current = 0;
        zoomGestureTranslateY.current = 0;
        
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          const centerX = (touch1.pageX + touch2.pageX) / 2;
          const centerY = (touch1.pageY + touch2.pageY) / 2;
          
          (evt as any).initialDistance = distance;
          (evt as any).initialScale = zoomLastScale;
          (evt as any).initialCenterX = centerX;
          (evt as any).initialCenterY = centerY;
          (evt as any).initialTranslateX = zoomLastTranslateX;
          (evt as any).initialTranslateY = zoomLastTranslateY;
        } else if (zoomCurrentScale > 1) {
          // Store initial pan position
          (evt as any).initialPanX = zoomLastTranslateX;
          (evt as any).initialPanY = zoomLastTranslateY;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;
        
        if (touches.length === 2) {
          // Pinch to zoom - iOS-like behavior
          const touch1 = touches[0];
          const touch2 = touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          const initialDistance = (evt as any).initialDistance;
          const initialScale = (evt as any).initialScale || 1;
          
          if (initialDistance && initialDistance > 0) {
            const scaleFactor = distance / initialDistance;
            const newScale = Math.max(0.5, Math.min(5, initialScale * scaleFactor));
            
            // Calculate center point for zoom
            const centerX = (touch1.pageX + touch2.pageX) / 2;
            const centerY = (touch1.pageY + touch2.pageY) / 2;
            const initialCenterX = (evt as any).initialCenterX || windowWidth / 2;
            const initialCenterY = (evt as any).initialCenterY || windowHeight / 2;
            
            // Adjust translation to zoom towards touch center
            const scaleDelta = newScale - initialScale;
            const translateXDelta = (initialCenterX - windowWidth / 2) * (scaleDelta / initialScale);
            const translateYDelta = (initialCenterY - windowHeight / 2) * (scaleDelta / initialScale);
            
            const baseTranslateX = (evt as any).initialTranslateX || 0;
            const baseTranslateY = (evt as any).initialTranslateY || 0;
            
            zoomGestureScale.current = newScale;
            zoomGestureTranslateX.current = baseTranslateX - translateXDelta;
            zoomGestureTranslateY.current = baseTranslateY - translateYDelta;
            
            zoomScale.setValue(newScale - initialScale);
            zoomTranslateX.setValue(zoomGestureTranslateX.current - baseTranslateX);
            zoomTranslateY.setValue(zoomGestureTranslateY.current - baseTranslateY);
            
            setZoomCurrentScale(newScale);
          }
        } else if (zoomCurrentScale > 1 && touches.length === 1) {
          // Pan when zoomed - smooth iOS-like panning
          const initialPanX = (evt as any).initialPanX || 0;
          const initialPanY = (evt as any).initialPanY || 0;
          
          zoomGestureTranslateX.current = initialPanX + gestureState.dx;
          zoomGestureTranslateY.current = initialPanY + gestureState.dy;
          
          zoomTranslateX.setValue(gestureState.dx);
          zoomTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        // Get final values
        const finalScale = zoomGestureScale.current;
        const finalTranslateX = zoomGestureTranslateX.current;
        const finalTranslateY = zoomGestureTranslateY.current;
        
        // Clamp scale
        const clampedScale = Math.max(1, Math.min(5, finalScale));
        
        // Calculate proper pan boundaries based on image dimensions
        // For contain fit, we need to account for image aspect ratio
        const scaledWidth = windowWidth * clampedScale;
        const scaledHeight = windowHeight * clampedScale;
        const maxTranslateX = Math.max(0, (scaledWidth - windowWidth) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - windowHeight) / 2);
        
        const clampedTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, finalTranslateX));
        const clampedTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, finalTranslateY));
        
        // Smooth spring animation to final position
        Animated.parallel([
          Animated.spring(zoomScale, {
            toValue: clampedScale - zoomLastScale,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
            overshootClamping: true,
          }),
          Animated.spring(zoomTranslateX, {
            toValue: clampedTranslateX - zoomLastTranslateX,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
            overshootClamping: true,
          }),
          Animated.spring(zoomTranslateY, {
            toValue: clampedTranslateY - zoomLastTranslateY,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
            overshootClamping: true,
          }),
        ]).start(() => {
          // Update last known values
          setZoomLastScale(clampedScale);
          setZoomLastTranslateX(clampedTranslateX);
          setZoomLastTranslateY(clampedTranslateY);
          setZoomCurrentScale(clampedScale);
          
          zoomGestureScale.current = clampedScale;
          zoomGestureTranslateX.current = clampedTranslateX;
          zoomGestureTranslateY.current = clampedTranslateY;
          
          // Flatten offsets and set new base values
          zoomScale.flattenOffset();
          zoomTranslateX.flattenOffset();
          zoomTranslateY.flattenOffset();
          
          zoomScale.setValue(0);
          zoomTranslateX.setValue(0);
          zoomTranslateY.setValue(0);
          
          zoomScale.setOffset(clampedScale);
          zoomTranslateX.setOffset(clampedTranslateX);
          zoomTranslateY.setOffset(clampedTranslateY);
        });
      },
      onPanResponderTerminationRequest: () => {
        // Don't allow termination if zoomed
        return zoomCurrentScale <= 1;
      },
    })
  ).current;

  const handleCloseZoom = () => {
    setZoomLastScale(1);
    setZoomLastTranslateX(0);
    setZoomLastTranslateY(0);
    setZoomCurrentScale(1);
    zoomGestureScale.current = 1;
    zoomGestureTranslateX.current = 0;
    zoomGestureTranslateY.current = 0;
    zoomScale.setValue(1);
    zoomTranslateX.setValue(0);
    zoomTranslateY.setValue(0);
    setIsPhotoZoomed(false);
    setZoomedPhotoUri('');
  };

  // Animated style - offsets are handled in PanResponder, values are relative
  const zoomAnimatedStyle = {
    transform: [
      { scale: zoomScale },
      { translateX: zoomTranslateX },
      { translateY: zoomTranslateY },
    ],
  };
  
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
  
  // Create combined slides array: profile + section cards + photos + photo notes + rating input + pros + cons + overall summary
  const allSlides = React.useMemo(() => {
    const slides: Array<{type: 'profile' | 'section' | 'photo' | 'photoNote' | 'rating' | 'pros' | 'cons' | 'overall', data: any, index: number}> = [];
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
        // Add photo slide
        slides.push({
          type: 'photo',
          data: { uri, category: 'Dating Profile', photoIndex: i, totalPhotos: signedProfilePhotos.length },
          index: slideIndex++
        });
        
        // Add note slide after each photo
        slides.push({
          type: 'photoNote',
          data: { category: 'Dating Profile', photoIndex: i, totalPhotos: signedProfilePhotos.length, photoUri: uri },
          index: slideIndex++
        });
      });
    }

    // First: Overall Rating slide (just rating and note input)
    slides.push({
      type: 'rating',
      data: { name: reviewee?.displayName || 'User' },
      index: slideIndex++
    });

    // Second: Pros selection slide
    slides.push({
      type: 'pros',
      data: { name: reviewee?.displayName || 'User' },
      index: slideIndex++
    });

    // Third: Cons selection slide
    slides.push({
      type: 'cons',
      data: { name: reviewee?.displayName || 'User' },
      index: slideIndex++
    });

    // Fourth: Overall summary slide (profile photo with rating and notes displayed)
    slides.push({
      type: 'overall',
      data: { name: reviewee?.displayName || 'User', profilePicture: avatarUri },
      index: slideIndex++
    });

    return slides;
  }, [signedProfilePhotos, avatarUri, reviewee?.displayName, parsedNotes?.message]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

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
        
        // Get reviewee (person being reviewed)
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
        
        // Get reviewer (current user/influencer)
        if (req?.influencerId) {
          const reviewerProfile = await getProfileById(req.influencerId);
          setReviewer(reviewerProfile);
          
          if (reviewerProfile?.avatarUrl) {
            let reviewerUri = reviewerProfile.avatarUrl;
            if (reviewerUri && !/^https?:\/\//i.test(reviewerUri)) {
              try { reviewerUri = (await getSignedAvatarUrl(reviewerUri)) || reviewerUri; } catch {}
            }
            setReviewerAvatarUri(reviewerUri);
          }
        }
        // Sign media URLs for reliable viewing
        try {
          const n = req?.notes ? (typeof req.notes === 'string' ? JSON.parse(req.notes) : req.notes) : null;
          const basePhotos = Array.isArray((req as any)?.photos) ? ((req as any).photos as string[]) : [];
          const datingProfilePhotos: string[] = Array.isArray(n?.media?.datingProfileScreenshots)
            ? (n.media.datingProfileScreenshots as string[])
            : [];

          let photosToSign = datingProfilePhotos.length ? datingProfilePhotos : basePhotos;
          
          // Add fake placeholder images for testing (always add for now to see the gallery)
          // In production, remove this and uncomment the conditional check below
          photosToSign = [
            'https://picsum.photos/seed/dating1/400/600',
            'https://picsum.photos/seed/dating2/400/600',
            'https://picsum.photos/seed/dating3/400/600',
            'https://picsum.photos/seed/dating4/400/600',
            'https://picsum.photos/seed/dating5/400/600',
            'https://picsum.photos/seed/dating6/400/600',
          ];
          // Original logic (for production):
          // if (photosToSign.length === 0) {
          //   photosToSign = [...];
          // }

          if (photosToSign.length) {
            // If using placeholder images, use them directly (they're already URLs)
            // Otherwise sign the URLs
            if (photosToSign.some(url => url.includes('picsum.photos'))) {
              setSignedProfilePhotos(photosToSign);
            } else {
              setSignedProfilePhotos(await signRequestMediaUrls(photosToSign));
            }
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

        {/* Modern Dating Profile Photo Gallery */}
        {signedProfilePhotos.length > 0 && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Dating Profile Photos</Text>
            <Text style={[styles.sectionHint, { marginTop: 0 }]}>
              Browse their uploaded dating profile shots while you plan your feedback.
            </Text>
            <DatingProfilePhotoGallery
              uris={signedProfilePhotos}
              onPhotoPress={(index) => {
                if (!isVideoReviewMode) {
                  setGalleryUris(signedProfilePhotos);
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
          <RNView style={styles.videoReviewSection}>
            <RNView style={styles.videoReviewHeader}>
              <RNView style={styles.videoReviewIconContainer}>
                <Text style={styles.videoReviewIcon}>🎥</Text>
              </RNView>
              <RNView style={styles.videoReviewTitleContainer}>
                <Text style={styles.videoReviewTitle}>Video Review</Text>
                <Text style={styles.videoReviewSubtitle}>
                  Record your review while swiping through their photos
                </Text>
              </RNView>
            </RNView>
            
            {!videoUri ? (
              <RNView style={styles.videoReviewContent}>
                <RNView style={styles.videoReviewFeatureList}>
                  <RNView style={styles.videoReviewFeature}>
                    <Text style={styles.videoReviewFeatureIcon}>📸</Text>
                    <Text style={styles.videoReviewFeatureText}>Swipe through photos while recording</Text>
                  </RNView>
                  <RNView style={styles.videoReviewFeature}>
                    <Text style={styles.videoReviewFeatureIcon}>⭐</Text>
                    <Text style={styles.videoReviewFeatureText}>Add ratings and notes as you go</Text>
                  </RNView>
                  <RNView style={styles.videoReviewFeature}>
                    <Text style={styles.videoReviewFeatureIcon}>🚀</Text>
                    <Text style={styles.videoReviewFeatureText}>Share directly to TikTok & Instagram</Text>
                  </RNView>
                </RNView>
                <TouchableOpacity 
                  style={styles.videoReviewStartButton} 
                  onPress={() => {
                    setIsVideoReviewMode(true);
                    setRecordingModeOpen(true);
                  }}
                >
                  <Text style={styles.videoReviewStartButtonIcon}>▶</Text>
                  <Text style={styles.videoReviewStartButtonText}>Start Video Review</Text>
                </TouchableOpacity>
              </RNView>
            ) : (
              <RNView style={styles.videoReviewCompleteContainer}>
                <RNView style={styles.videoReviewCompleteBadge}>
                  <Text style={styles.videoReviewCompleteIcon}>✅</Text>
                  <Text style={styles.videoReviewCompleteText}>Video Review Complete</Text>
                </RNView>
                <Text style={styles.videoReviewCompleteHint}>
                  Ready to submit! Your video will be attached to the review.
                </Text>
              </RNView>
            )}

            <TouchableOpacity
              style={[styles.videoReviewSubmitButton, canSubmit ? styles.videoReviewSubmitButtonActive : styles.videoReviewSubmitButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={!canSubmit || submitting}
            >
              <Text style={styles.videoReviewSubmitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </RNView>
        )}
      </ScrollView>
      {/* Immersive recording modal with rating and note controls */}
      <Modal 
        visible={recordingModeOpen} 
        animationType="slide" 
        onRequestClose={() => setRecordingModeOpen(false)}
        presentationStyle="fullScreen"
      >
        <RNView style={{ flex: 1, backgroundColor: Colors.brand.background }}>
          
          {/* Vertical photo carousel with rating and note controls */}
          <ScrollView 
            ref={scrollViewRef}
            pagingEnabled 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1 }} 
            contentContainerStyle={{ alignItems: 'center' }}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              const index = Math.round(offsetY / windowHeight);
              if (index !== currentPhotoIndex && index >= 0 && index < allSlides.length) {
                setCurrentPhotoIndex(index);
              }
            }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              const index = Math.round(offsetY / windowHeight);
              if (index >= 0 && index < allSlides.length) {
                setCurrentPhotoIndex(index);
              }
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
                    paddingLeft: frameMetrics.slideHorizontalPadding,
                    paddingRight: frameMetrics.slideHorizontalPadding,
                    paddingTop: frameMetrics.slideTopPadding,
                    paddingBottom: frameMetrics.slideBottomPadding,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  },
                ]}
              >
                {slide.type === 'profile' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 0, paddingBottom: 0 }] }>
                    {/* Name and message overlay - ABOVE profile picture, centered with page */}
                    <RNView style={{
                      width: '100%',
                      alignItems: 'center',
                      marginTop: 0,
                      marginBottom: 24,
                      paddingHorizontal: frameMetrics.slideHorizontalPadding + 8,
                    }}>
                      <RNView style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: 20,
                        paddingVertical: 24,
                        paddingHorizontal: 24,
                        backdropFilter: 'blur(10px)',
                        width: frameMetrics.photoWidth,
                        alignItems: 'center',
                      }}>
                      {/* Auro Logo inside the box */}
                      <RNView style={{ marginBottom: 16, alignItems: 'center' }}>
                        <Image 
                          source={require('@/auro_aura_logo_nobg.png')} 
                          style={{ 
                            width: 72, 
                            height: 36, 
                            opacity: 0.95,
                          }} 
                          contentFit="contain" 
                        />
                      </RNView>
                      
                      <Text style={[styles.overlayTitle, { 
                        textAlign: 'center', 
                        width: '100%', 
                        fontSize: 28, 
                        marginBottom: 12,
                        color: '#fff',
                        fontWeight: '900',
                      }]}>
                        {slide.data.name}
                      </Text>
                      {slide.data.message ? (
                        <Text style={[styles.overlayText, { 
                          lineHeight: 24, 
                          textAlign: 'center', 
                          width: '100%', 
                          fontSize: 18,
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: '600',
                        }]}>
                          {slide.data.message}
                        </Text>
                      ) : null}
                      </RNView>
                    </RNView>
                    
                    {/* Circular profile photo - TikTok optimized */}
                    {slide.data.profilePicture ? (
                      <TouchableOpacity
                        style={{ 
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          setCurrentPhotoUri(slide.data.profilePicture);
                          setPhotoModalOpen(true);
                        }}
                        activeOpacity={0.95}
                      >
                        <Image 
                          source={{ uri: slide.data.profilePicture }} 
                          style={{ 
                            width: frameMetrics.photoWidth * 0.85,
                            height: frameMetrics.photoWidth * 0.85,
                            borderRadius: (frameMetrics.photoWidth * 0.85) / 2, // Make it circular
                            alignSelf: 'center',
                            shadowColor: Colors.brand.shadow,
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.4,
                            shadowRadius: 20,
                            elevation: 12,
                          }} 
                          contentFit="cover" 
                        />
                      </TouchableOpacity>
                    ) : null}
                  </RNView>
                )}
                
                {slide.type === 'section' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'center' }] }>
                    <SectionSlideCard
                      title={slide.data.title}
                      subtitle={slide.data.subtitle}
                      revieweeName={reviewee?.displayName || 'User'}
                      style={{ marginHorizontal: 0, width: '100%', maxWidth: '100%' }}
                    />
                  </RNView>
                )}
                
                {slide.type === 'photo' && (
                  <RNView style={[styles.overlayPhotoCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: 1 }] }>
                    {/* Full-screen photo - TikTok optimized */}
                    <TouchableOpacity
                      style={{ 
                        width: frameMetrics.photoWidth,
                        height: frameMetrics.photoHeight,
                        borderRadius: 20, 
                        overflow: 'hidden',
                        alignSelf: 'center',
                        shadowColor: Colors.brand.shadow,
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.4,
                        shadowRadius: 20,
                        elevation: 12,
                        zIndex: 1,
                      }}
                      onPress={() => {
                        setZoomedPhotoUri(slide.data.uri);
                        setIsPhotoZoomed(true);
                      }}
                      activeOpacity={0.95}
                    >
                      <Image source={{ uri: slide.data.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </TouchableOpacity>

                    {/* Minimal logo overlay - top center */}
                    <RNView style={{
                      position: 'absolute',
                      top: 20,
                      left: 0,
                      right: 0,
                      alignItems: 'center',
                      zIndex: 2,
                    }}>
                      <Image 
                        source={require('@/auro_aura_logo_nobg.png')} 
                        style={{ 
                          width: 56, 
                          height: 28, 
                          opacity: 0.9,
                        }} 
                        contentFit="contain" 
                      />
                    </RNView>

                    {/* Photo info overlay - positioned below photo, centered */}
                    <RNView style={{
                      marginTop: 12,
                      width: '100%',
                      alignItems: 'center',
                      paddingHorizontal: frameMetrics.slideHorizontalPadding + 8,
                    }}>
                      <RNView style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        borderRadius: 18,
                        paddingVertical: 12,
                        paddingHorizontal: 18,
                        backdropFilter: 'blur(10px)',
                        width: frameMetrics.photoWidth,
                        alignItems: 'center',
                        alignSelf: 'center',
                      }}>
                      <Text style={[styles.overlayTitle, { 
                        fontSize: 18, 
                        fontWeight: '800',
                        textAlign: 'center', 
                        color: '#fff',
                        marginBottom: 8,
                      }]}>
                        {slide.data.category} - Photo {slide.data.photoIndex + 1}
                      </Text>
                      
                      <Text style={[styles.overlayText, { 
                        fontSize: 11, 
                        lineHeight: 14, 
                        textAlign: 'center', 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '500',
                      }]}>
                        Swipe up to add a note
                      </Text>
                      </RNView>
                    </RNView>
                  </RNView>
                )}
                
                {slide.type === 'photoNote' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 40, paddingBottom: 40 }] }>
                    {/* Auro Logo and Title */}
                    <RNView style={{ alignItems: 'center', marginBottom: 32, width: '100%' }}>
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <Image 
                          source={require('@/auro_aura_logo_nobg.png')} 
                          style={{ width: 64, height: 32 }} 
                          contentFit="contain" 
                        />
                        <Text style={{ color: Colors.brand.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: 0.5 }}>
                          Auro
                        </Text>
                      </RNView>
                      <Text style={[styles.overlayTitle, { textAlign: 'center', width: '100%', marginBottom: 8, fontSize: 28, paddingHorizontal: 20 }]}>
                        Add a Note
                      </Text>
                      <Text style={[styles.overlayText, { marginBottom: 0, textAlign: 'center', width: '100%', fontSize: 16, paddingHorizontal: 20 }]}>
                        {slide.data.category} - Photo {slide.data.photoIndex + 1}
                      </Text>
                    </RNView>
                    
                    {/* Note input field */}
                    <RNView style={{ marginTop: 16, width: '100%', alignItems: 'center', paddingHorizontal: 20, flex: 1 }}>
                      <TextInput
                        style={{
                          width: '100%',
                          minHeight: 140,
                          maxHeight: 200,
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          borderRadius: 20,
                          paddingHorizontal: 20,
                          paddingVertical: 16,
                          color: Colors.brand.textPrimary,
                          fontSize: 16,
                          textAlign: 'left',
                          borderWidth: 2,
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        placeholder="Share your thoughts about this photo..."
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        multiline
                        value={photoNotes[slide.data.photoIndex] || ''}
                        onChangeText={(text) => {
                          setPhotoNotes(prev => ({ ...prev, [slide.data.photoIndex]: text }));
                        }}
                        numberOfLines={6}
                        textAlignVertical="top"
                      />
                      
                      <Text style={[styles.overlayText, { 
                        marginTop: 12, 
                        fontSize: 12, 
                        textAlign: 'center', 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontWeight: '500',
                      }]}>
                        {photoNotes[slide.data.photoIndex]?.length || 0} characters
                      </Text>
                    </RNView>
                  </RNView>
                )}
                
                {slide.type === 'rating' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 }] }>
                    {/* Auro Logo and Title */}
                    <RNView style={{ alignItems: 'center', marginBottom: 24, width: '100%' }}>
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <Image 
                          source={require('@/auro_aura_logo_nobg.png')} 
                          style={{ width: 72, height: 36 }} 
                          contentFit="contain" 
                        />
                        <Text style={{ color: Colors.brand.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: 0.5 }}>
                          Auro
                        </Text>
                      </RNView>
                      <Text style={[styles.overlayTitle, { textAlign: 'center', width: '100%', marginBottom: 6, fontSize: 28, paddingHorizontal: 20 }]}>
                        Overall Rating
                      </Text>
                      <Text style={[styles.overlayText, { marginBottom: 0, textAlign: 'center', width: '100%', fontSize: 16, paddingHorizontal: 20 }]}>
                        Rate {slide.data.name} overall
                      </Text>
                    </RNView>
                    
                    {/* Star Rating - tap a star 1-5 */}
                    <RNView style={{ marginTop: 8, marginBottom: 32, alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                      <Text style={[styles.overlayText, { marginBottom: 16, fontSize: 15, textAlign: 'center' }]}>Tap a star to rate:</Text>
                      <RNView style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map((value) => {
                          const isActive = value <= overallRating;
                          return (
                            <TouchableOpacity
                              key={value}
                              onPress={() => setOverallRating(value)}
                              activeOpacity={0.8}
                              style={{
                                padding: 6,
                                borderRadius: 24,
                              }}
                            >
                              <FontAwesome
                                name={isActive ? 'star' : 'star-o'}
                                size={42}
                                color={isActive ? Colors.brand.accentOrange : 'rgba(255, 255, 255, 0.4)'}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </RNView>
                      {overallRating > 0 && (
                        <Text style={[styles.overlayText, { marginTop: 12, fontSize: 14, textAlign: 'center', color: Colors.brand.accentOrange, fontWeight: '700' }]}>
                          {ratingLabels[overallRating]} ({overallRating} {overallRating === 1 ? 'star' : 'stars'})
                        </Text>
                      )}
                    </RNView>

                    <RNView style={{ marginTop: 20, width: '100%', alignItems: 'center', paddingHorizontal: 20 }}>
                      <Text style={[styles.overlayText, { marginBottom: 10, fontSize: 15, textAlign: 'center', width: '100%' }]}>Overall Note</Text>
                      <TextInput
                        style={[styles.overallNoteInput, { width: '100%', maxHeight: 120 }]}
                        placeholder="Share a short summary to pair with your video review"
                        placeholderTextColor={Colors.brand.textSecondary}
                        multiline
                        value={overallNote}
                        onChangeText={setOverallNote}
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </RNView>
                  </RNView>
                )}
                
                {slide.type === 'pros' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 }] }>
                    {/* Auro Logo and Title */}
                    <RNView style={{ alignItems: 'center', marginBottom: 32, width: '100%' }}>
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <Image 
                          source={require('@/auro_aura_logo_nobg.png')} 
                          style={{ width: 64, height: 32 }} 
                          contentFit="contain" 
                        />
                        <Text style={{ color: Colors.brand.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: 0.5 }}>
                          Auro
                        </Text>
                      </RNView>
                      <Text style={[styles.overlayTitle, { textAlign: 'center', width: '100%', marginBottom: 8, fontSize: 32, paddingHorizontal: 20, color: Colors.brand.status.completed }]}>
                        ✓ What stands out? (Pros)
                      </Text>
                      <Text style={[styles.overlayText, { marginBottom: 0, textAlign: 'center', width: '100%', fontSize: 16, paddingHorizontal: 20 }]}>
                        Select all pros for {slide.data.name}
                      </Text>
                    </RNView>
                    
                    {/* Pros Tags - Centered */}
                    <RNView style={{ marginTop: 16, width: '100%', alignItems: 'center', paddingHorizontal: 20, flex: 1 }}>
                      <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' }}>
                        {prosTags.map((tag) => {
                          const isSelected = selectedPros.includes(tag);
                          return (
                            <TouchableOpacity
                              key={tag}
                              onPress={() => {
                                setSelectedPros(prev => 
                                  isSelected 
                                    ? prev.filter(t => t !== tag)
                                    : [...prev, tag]
                                );
                              }}
                              style={{
                                paddingHorizontal: 18,
                                paddingVertical: 14,
                                borderRadius: 24,
                                backgroundColor: isSelected 
                                  ? Colors.brand.status.completed 
                                  : 'rgba(255, 255, 255, 0.12)',
                                borderWidth: 2,
                                borderColor: isSelected 
                                  ? Colors.brand.status.completed 
                                  : 'rgba(255, 255, 255, 0.25)',
                                shadowColor: isSelected ? Colors.brand.status.completed : '#000',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: isSelected ? 0.4 : 0.1,
                                shadowRadius: 6,
                                elevation: 3,
                                minWidth: 100,
                              }}
                            >
                              <Text style={{
                                color: isSelected ? '#fff' : Colors.brand.textPrimary,
                                fontSize: 15,
                                fontWeight: '700',
                              }}>
                                {tag}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </RNView>
                    </RNView>
                  </RNView>
                )}
                
                {slide.type === 'cons' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 }] }>
                    {/* Auro Logo and Title */}
                    <RNView style={{ alignItems: 'center', marginBottom: 32, width: '100%' }}>
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <Image 
                          source={require('@/auro_aura_logo_nobg.png')} 
                          style={{ width: 64, height: 32 }} 
                          contentFit="contain" 
                        />
                        <Text style={{ color: Colors.brand.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: 0.5 }}>
                          Auro
                        </Text>
                      </RNView>
                      <Text style={[styles.overlayTitle, { textAlign: 'center', width: '100%', marginBottom: 8, fontSize: 32, paddingHorizontal: 20, color: Colors.brand.status.rejected }]}>
                        ✗ What stands out? (Cons)
                      </Text>
                      <Text style={[styles.overlayText, { marginBottom: 0, textAlign: 'center', width: '100%', fontSize: 16, paddingHorizontal: 20 }]}>
                        Select all cons for {slide.data.name}
                      </Text>
                    </RNView>
                    
                    {/* Cons Tags - Centered */}
                    <RNView style={{ marginTop: 16, width: '100%', alignItems: 'center', paddingHorizontal: 20, flex: 1 }}>
                      <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' }}>
                        {consTags.map((tag) => {
                          const isSelected = selectedCons.includes(tag);
                          return (
                            <TouchableOpacity
                              key={tag}
                              onPress={() => {
                                setSelectedCons(prev => 
                                  isSelected 
                                    ? prev.filter(t => t !== tag)
                                    : [...prev, tag]
                                );
                              }}
                              style={{
                                paddingHorizontal: 18,
                                paddingVertical: 14,
                                borderRadius: 24,
                                backgroundColor: isSelected 
                                  ? Colors.brand.status.rejected 
                                  : 'rgba(255, 255, 255, 0.12)',
                                borderWidth: 2,
                                borderColor: isSelected 
                                  ? Colors.brand.status.rejected 
                                  : 'rgba(255, 255, 255, 0.25)',
                                shadowColor: isSelected ? Colors.brand.status.rejected : '#000',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: isSelected ? 0.4 : 0.1,
                                shadowRadius: 6,
                                elevation: 3,
                                minWidth: 100,
                              }}
                            >
                              <Text style={{
                                color: isSelected ? '#fff' : Colors.brand.textPrimary,
                                fontSize: 15,
                                fontWeight: '700',
                              }}>
                                {tag}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </RNView>
                    </RNView>
                  </RNView>
                )}
                
                {slide.type === 'overall' && (
                  <RNView style={[styles.overlayCard, { width: '100%', maxWidth: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 }] }>
                    {/* Auro Logo */}
                    <Image source={require('@/auro_aura_logo_nobg.png')} style={{ width: 72, height: 36, marginBottom: 16, alignSelf: 'center' }} contentFit="contain" />
                    <Text style={[styles.overlayTitle, { textAlign: 'center', width: '100%', marginBottom: 6, fontSize: 28 }]}>Review Summary</Text>
                    <Text style={[styles.overlayText, { marginBottom: 24, textAlign: 'center', width: '100%', fontSize: 16 }]}>Your final review for {slide.data.name}</Text>
                    
                    {/* Both Profile Pictures - Circular, side by side */}
                    <RNView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24, width: '100%', paddingHorizontal: 20 }}>
                      {/* Reviewer Profile Picture */}
                      {reviewerAvatarUri ? (
                        <RNView style={{ alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={{ 
                              width: 120, 
                              height: 120,
                              borderRadius: 60, 
                              overflow: 'hidden',
                              alignSelf: 'center',
                              shadowColor: Colors.brand.shadow,
                              shadowOffset: { width: 0, height: 8 },
                              shadowOpacity: 0.3,
                              shadowRadius: 12,
                              elevation: 8,
                              borderWidth: 3,
                              borderColor: Colors.brand.accentOrange,
                            }}
                            onPress={() => {
                              setCurrentPhotoUri(reviewerAvatarUri);
                              setPhotoModalOpen(true);
                            }}
                          >
                            <Image source={{ uri: reviewerAvatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          </TouchableOpacity>
                          <Text style={[styles.overlayText, { fontSize: 14, fontWeight: '600', textAlign: 'center' }]}>
                            {reviewer?.displayName || reviewer?.full_name || reviewer?.username || 'You'}
                          </Text>
                        </RNView>
                      ) : null}
                      
                      {/* VS or Arrow */}
                      <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.brand.accentOrange, opacity: 0.8 }}>→</Text>
                      
                      {/* Reviewee Profile Picture */}
                      {slide.data.profilePicture ? (
                        <RNView style={{ alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={{ 
                              width: 120, 
                              height: 120,
                              borderRadius: 60, 
                              overflow: 'hidden',
                              alignSelf: 'center',
                              shadowColor: Colors.brand.shadow,
                              shadowOffset: { width: 0, height: 8 },
                              shadowOpacity: 0.3,
                              shadowRadius: 12,
                              elevation: 8,
                              borderWidth: 3,
                              borderColor: Colors.brand.textPrimary,
                            }}
                            onPress={() => {
                              setCurrentPhotoUri(slide.data.profilePicture);
                              setPhotoModalOpen(true);
                            }}
                          >
                            <Image source={{ uri: slide.data.profilePicture }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          </TouchableOpacity>
                          <Text style={[styles.overlayText, { fontSize: 14, fontWeight: '600', textAlign: 'center' }]}>
                            {slide.data.name}
                          </Text>
                        </RNView>
                      ) : null}
                    </RNView>
                    
                    {/* Overall Rating Display - Large and prominent */}
                    {overallRating > 0 && (
                      <RNView style={{ marginTop: 8, alignItems: 'center', width: '100%', marginBottom: 24, paddingHorizontal: 20 }}>
                        <Text style={[styles.overlayText, { marginBottom: 12, fontSize: 16, fontWeight: '700', textAlign: 'center' }]}>Overall Rating</Text>
                        <RNView style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 12, gap: 8 }}>
                          <Text style={[styles.overlayTitle, { fontSize: 48, fontWeight: '900', color: Colors.brand.accentOrange }]}>{overallRating}</Text>
                          <Text style={[styles.overlayText, { fontSize: 24, fontWeight: '700', opacity: 0.7 }]}>/ 5</Text>
                        </RNView>
                        <RNView style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Text key={i} style={{ fontSize: 24, color: i < overallRating ? Colors.brand.accentOrange : 'rgba(255, 255, 255, 0.3)' }}>
                              ⭐
                            </Text>
                          ))}
                        </RNView>
                      </RNView>
                    )}
                    
                    {/* Selected Pros */}
                    {selectedPros.length > 0 && (
                      <RNView style={{ marginTop: 8, width: '100%', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
                        <Text style={[styles.overlayText, { marginBottom: 12, fontSize: 16, textAlign: 'center', width: '100%', fontWeight: '700', color: Colors.brand.status.completed }]}>
                          ✓ Pros ({selectedPros.length})
                        </Text>
                        <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' }}>
                          {selectedPros.map((tag) => (
                            <RNView
                              key={tag}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: Colors.brand.status.completed,
                                borderWidth: 1.5,
                                borderColor: Colors.brand.status.completed,
                              }}
                            >
                              <Text style={{
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: '600',
                              }}>
                                {tag}
                              </Text>
                            </RNView>
                          ))}
                        </RNView>
                      </RNView>
                    )}
                    
                    {/* Selected Cons */}
                    {selectedCons.length > 0 && (
                      <RNView style={{ marginTop: 8, width: '100%', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
                        <Text style={[styles.overlayText, { marginBottom: 12, fontSize: 16, textAlign: 'center', width: '100%', fontWeight: '700', color: Colors.brand.status.rejected }]}>
                          ✗ Cons ({selectedCons.length})
                        </Text>
                        <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' }}>
                          {selectedCons.map((tag) => (
                            <RNView
                              key={tag}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: Colors.brand.status.rejected,
                                borderWidth: 1.5,
                                borderColor: Colors.brand.status.rejected,
                              }}
                            >
                              <Text style={{
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: '600',
                              }}>
                                {tag}
                              </Text>
                            </RNView>
                          ))}
                        </RNView>
                      </RNView>
                    )}

                    {/* Overall Note Display (Read-only) */}
                    {overallNote.trim() && (
                      <RNView style={{ marginTop: 8, width: '100%', alignItems: 'center' }}>
                        <Text style={[styles.overlayText, { marginBottom: 8, fontSize: 15, fontWeight: '600', textAlign: 'center', width: '100%' }]}>Your Note:</Text>
                        <RNView style={[styles.overallNoteInput, { backgroundColor: Colors.brand.cardBackgroundLight, padding: 12, width: '100%', maxHeight: 100 }]}>
                          <Text style={[styles.overlayText, { textAlign: 'left', fontSize: 14, lineHeight: 20 }]} numberOfLines={4}>{overallNote}</Text>
                        </RNView>
                      </RNView>
                    )}
                    
                    {/* Finish Video Review Button */}
                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      disabled={!canSubmit || submitting}
                      style={[
                        styles.actionButton, 
                        styles.acceptButton, 
                        { marginTop: 20, alignSelf: 'center' },
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

          {/* Circular video recorder in top-left corner - TikTok style with companion info */}
          <RNView style={{ position: 'absolute', top: recorderTop, left: recorderLeft, zIndex: 15, elevation: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MediaRecorder
              onRecorded={(uri) => {
                setVideoUri(uri);
                setRecordingModeOpen(false);
                setIsVideoReviewMode(false);
                if (recordingTimerRef.current) {
                  clearInterval(recordingTimerRef.current);
                  recordingTimerRef.current = null;
                }
                setRecordingDuration(0);
                Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
              }}
              variant="corner"
              circleSize={recorderSize}
              hideButtons={true}
              value={videoUri}
              onVideoUriChange={(uri) => {
                setVideoUri(uri);
              }}
              onRecordingStart={() => {
                setRecordingDuration(0);
                recordingTimerRef.current = setInterval(() => {
                  setRecordingDuration(prev => prev + 1);
                }, 1000);
              }}
              onRecordingStop={() => {
                if (recordingTimerRef.current) {
                  clearInterval(recordingTimerRef.current);
                  recordingTimerRef.current = null;
                }
              }}
            />
            
            {/* Companion info panel - dynamic content based on state */}
            <RNView style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              borderRadius: 18,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backdropFilter: 'blur(10px)',
              borderWidth: 1.5,
              borderColor: recordingDuration > 0 ? Colors.brand.accentOrange + '40' : 'rgba(255, 255, 255, 0.2)',
              minWidth: 90,
              alignItems: 'center',
              alignSelf: 'center',
            }}>
              {/* Reviewer Name */}
              <RNView style={{ alignItems: 'center', marginBottom: recordingDuration > 0 ? 8 : 0 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' }}>
                  {reviewer?.displayName || reviewer?.full_name || reviewer?.username || 'Reviewer'}
                </Text>
              </RNView>
              
              {/* Recording timer with pulsing effect */}
              {recordingDuration > 0 && (
                <RNView style={{ alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.15)', width: '100%' }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontWeight: '600', marginBottom: 3, letterSpacing: 0.5 }}>
                    REC
                  </Text>
                  <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {/* Pulsing dot indicator */}
                    <RNView style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ff3b30',
                      shadowColor: '#ff3b30',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 4,
                      elevation: 4,
                    }} />
                    <Text style={{ color: Colors.brand.accentOrange, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  </RNView>
                </RNView>
              )}
              
            </RNView>
          </RNView>

          {/* Photo Zoom View - Full screen with pinch zoom, keeps recorder visible */}
          {isPhotoZoomed && zoomedPhotoUri && (
            <RNView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 5, elevation: 5 }}>
              {/* Done button - bottom center to avoid conflict with close button */}
              <TouchableOpacity 
                style={{ position: 'absolute', bottom: insets.bottom + 40, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 20, elevation: 20 }}
                onPress={handleCloseZoom}
                activeOpacity={0.7}
              >
                <RNText style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 }}>Done</RNText>
              </TouchableOpacity>
              
              {/* Zoomable image */}
              <RNView 
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                {...zoomPanResponder.panHandlers}
              >
                <Animated.View style={[{ width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }, zoomAnimatedStyle]}>
                  <Image
                    source={{ uri: zoomedPhotoUri }}
                    style={{ width: windowWidth, height: windowHeight }}
                    contentFit="contain"
                  />
                </Animated.View>
              </RNView>
            </RNView>
          )}

          {/* Close button - positioned at top right for better accessibility */}
          <RNView style={{ position: 'absolute', top: insets.top + 12, right: 16, zIndex: 11, elevation: 11 }}>
            <TouchableOpacity 
              onPress={() => {
                if (videoUri) {
                  Alert.alert(
                    'Exit Video Review?',
                    'Your recorded video will be saved. You can continue reviewing later.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Exit',
                        style: 'destructive',
                        onPress: () => {
                          setRecordingModeOpen(false);
                          setIsVideoReviewMode(false);
                        }
                      }
                    ]
                  );
                } else {
                  setRecordingModeOpen(false);
                  setIsVideoReviewMode(false);
                }
              }} 
              style={[
                styles.actionButton, 
                styles.denyButton, 
                { 
                  paddingHorizontal: 16, 
                  paddingVertical: 10,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 20
                }
              ]}
            >
              <Text style={[styles.actionButtonText, styles.denyButtonText, { color: '#fff', fontWeight: '700' }]}>✕</Text>
            </TouchableOpacity>
          </RNView>

          {/* Vertical pagination dots on right side (left side has camera) - TikTok optimized */}
          <RNView
            style={{
              position: 'absolute',
              top: frameMetrics.paginationTop,
              right: frameMetrics.paginationRight,
              zIndex: 5,
              elevation: 5,
              paddingVertical: 4,
              paddingHorizontal: 0,
            }}
            pointerEvents="box-none"
          >
            <PaginationDots
              totalItems={allSlides.length}
              currentIndex={currentPhotoIndex}
              orientation="vertical"
            />
          </RNView>

          {/* Fixed Use/Re-record buttons at bottom when video is recorded */}
          {videoUri && (
            <RNView
              style={{
                position: 'absolute',
                bottom: insets.bottom + 20,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 12,
                elevation: 12,
                paddingHorizontal: 20,
              }}
            >
              <RNView
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setRecordingModeOpen(false);
                    setIsVideoReviewMode(false);
                    if (recordingTimerRef.current) {
                      clearInterval(recordingTimerRef.current);
                      recordingTimerRef.current = null;
                    }
                    setRecordingDuration(0);
                    Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
                  }}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: Colors.brand.status.completed,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Use</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVideoUri(null)}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Re-record</Text>
                </TouchableOpacity>
              </RNView>
            </RNView>
          )}
          
        </RNView>
      </Modal>
      <ImageGalleryModal visible={galleryOpen} uris={galleryUris} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
      <FullScreenPhotoModal visible={photoModalOpen} uri={currentPhotoUri} onClose={() => setPhotoModalOpen(false)} />
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
  mediaSection: { 
    alignItems: 'stretch', 
    gap: 16,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
    padding: 0,
    marginHorizontal: 20,
    marginVertical: 12,
  },
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlayCard: { 
    backgroundColor: 'transparent', // Removed card background for TikTok-style clean look
    borderRadius: 0, 
    padding: 0, 
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  overlayPhotoCard: { 
    backgroundColor: 'transparent', // Removed card background for TikTok-style clean look
    borderRadius: 0, 
    padding: 0, 
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  overlayTitle: { fontSize: 24, fontWeight: '900', color: Colors.brand.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: 0.3 },
  overlayText: { fontSize: 15, color: Colors.brand.textSecondary, lineHeight: 24, textAlign: 'center', fontWeight: '500' },
  
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
  
  // Modern Video Review Section Styles
  videoReviewSection: {
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
  },
  videoReviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  videoReviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.brand.accentOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  videoReviewIcon: {
    fontSize: 28,
  },
  videoReviewTitleContainer: {
    flex: 1,
  },
  videoReviewTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.brand.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  videoReviewSubtitle: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    fontWeight: '500',
    lineHeight: 22,
  },
  videoReviewContent: {
    marginTop: 8,
  },
  videoReviewFeatureList: {
    marginBottom: 20,
  },
  videoReviewFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  videoReviewFeatureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  videoReviewFeatureText: {
    fontSize: 15,
    color: Colors.brand.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  videoReviewStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  videoReviewStartButtonIcon: {
    fontSize: 20,
    color: Colors.brand.textOnGradient,
    marginRight: 10,
    fontWeight: '900',
  },
  videoReviewStartButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.textOnGradient,
    letterSpacing: 0.5,
  },
  videoReviewCompleteContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 20,
    backgroundColor: Colors.brand.status.completed + '15',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand.status.completed,
    alignItems: 'center',
  },
  videoReviewCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoReviewCompleteIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  videoReviewCompleteText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.status.completed,
    letterSpacing: 0.3,
  },
  videoReviewCompleteHint: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
  },
  videoReviewSubmitButton: {
    marginTop: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  videoReviewSubmitButtonActive: {
    backgroundColor: Colors.brand.accentOrange,
  },
  videoReviewSubmitButtonDisabled: {
    backgroundColor: Colors.brand.border,
    opacity: 0.6,
  },
  videoReviewSubmitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    letterSpacing: 0.35,
  },
});
