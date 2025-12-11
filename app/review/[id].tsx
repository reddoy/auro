import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View as RNView, Linking, Platform, Pressable, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';

import { Text, View } from '@/components/Themed';
import {
  getRequestById,
  getReviewerReviewByRequestId,
  type ReviewerReview,
  getReviewerById,
  getProfileById,
  markReviewAsViewed,
} from '@/lib/api';
import Colors from '@/constants/Colors';
import { Image } from 'expo-image';
import { signRequestMediaUrls } from '@/lib/uploads';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import PhotoCarousel from '@/components/PhotoCarousel';
import StatusBadge from '@/components/StatusBadge';
import Avatar from '@/components/Avatar';
import { getSignedAvatarUrl } from '@/lib/profile';
import StarRating from '@/components/StarRating';
import ReviewerReviewModal from '@/components/ReviewerReviewModal';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { DbReviewerSummary } from '@/types';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [loading, setLoading] = React.useState(true);
  const [influencerName, setInfluencerName] = React.useState<string>('');
  const [influencerAvatar, setInfluencerAvatar] = React.useState<string | undefined>(undefined);
  const [revieweeName, setRevieweeName] = React.useState<string>('You');
  const [revieweeAvatar, setRevieweeAvatar] = React.useState<string | undefined>(undefined);
  
  const [request, setRequest] = React.useState<any>(null);
  const review = request?.review;
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryUris, setGalleryUris] = React.useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [reviewerReviewModalOpen, setReviewerReviewModalOpen] = React.useState(false);
  const [reviewerReview, setReviewerReview] = React.useState<ReviewerReview | null>(null);
  const [hasViewedReview, setHasViewedReview] = React.useState(false);
  const [autoPromptShown, setAutoPromptShown] = React.useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const [videoModalVisible, setVideoModalVisible] = React.useState(false);
  const [hasViewedVideo, setHasViewedVideo] = React.useState(false);
  const [promptAfterVideoShown, setPromptAfterVideoShown] = React.useState(false);
  const [reviewer, setReviewer] = React.useState<DbReviewerSummary | null>(null);
  
  // Get payment amount
  const amountCents = (request as any)?.amount_cents as number | undefined;

  const statusBanner = React.useMemo(() => {
    const s = request?.status as string | undefined;
    if (!s) return null;
    if (s === 'pending') {
      return { labelOverride: 'Pending', text: 'Please check your email regarding payment. You have 48 hours to complete payment.' };
    }
    if (s === 'accepted') {
      return { labelOverride: undefined, text: 'Please check your email regarding payment. You have 48 hours to complete payment.' };
    }
    if (s === 'paid') {
      return { labelOverride: 'Pending acceptance', text: 'Awaiting reviewer approval — if declined or no response within 2 weeks, you will be automatically refunded.' };
    }
    if (s === 'in_progress') {
      return { labelOverride: undefined, text: 'The reviewer accepted your request and now has 48 hours to submit your review, or you will be refunded.' };
    }
    if (s === 'completed') {
      return { labelOverride: 'Review Submitted', text: 'Review Submitted means the reviewer has completed the review.' };
    }
    if (s === 'rejected') {
      return { labelOverride: undefined, text: 'This request was declined by the reviewer.' };
    }
    return null;
  }, [request?.status]);

  const parsedNotes = React.useMemo(() => {
    try {
      if (!request?.notes) return null;
      return typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes;
    } catch {
      return null;
    }
  }, [request?.notes]);

  const [signedProfilePhotos, setSignedProfilePhotos] = React.useState<string[]>([]);
  // Removed signedSelfie - now using user's profile picture

  React.useEffect(() => {
    (async () => {
      try {
        const datingProfileScreenshots = Array.isArray(parsedNotes?.media?.datingProfileScreenshots)
          ? (parsedNotes.media.datingProfileScreenshots as string[])
          : [];
        const basePhotos = Array.isArray(request?.photos) ? (request.photos as string[]) : [];
        const photosToSign = datingProfileScreenshots.length ? datingProfileScreenshots : basePhotos;

        if (photosToSign.length) {
          setSignedProfilePhotos(await signRequestMediaUrls(photosToSign));
        } else {
          setSignedProfilePhotos([]);
        }
      } catch {}
    })();
  }, [parsedNotes?.media?.datingProfileScreenshots, request?.photos]);

  const hasConsent = React.useMemo(() => typeof parsedNotes?.consent?.shareOnSocial === 'boolean', [parsedNotes]);
  const shareConsent = React.useMemo(() => !!parsedNotes?.consent?.shareOnSocial, [parsedNotes]);

  React.useEffect(() => {
    if (!request?.id || request.status !== 'completed' || !review || hasViewedReview) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await markReviewAsViewed(request.id);
        if (!cancelled) {
          setHasViewedReview(true);
          setRequest((prev: any) => (prev ? { ...prev, review_viewed_at: new Date().toISOString() } : prev));
        }
      } catch (error) {
        console.error('Failed to mark review as viewed:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request?.id, request?.status, review, hasViewedReview]);

  React.useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const req = await getRequestById(String(id));
        setRequest(req);
        setHasViewedReview(!!req?.review_viewed_at);
        if (req?.influencerId) {
          const rev = await getReviewerById(String(req.influencerId));
          if (rev) {
            setReviewer(rev);
            setInfluencerName(rev.displayName);
            try {
              // Normalize known copy/paste artifacts (e.g., leading '@') and re-sign
              const raw = (rev.avatarUrl || '').trim().replace(/^@+/, '');
              const signed = raw ? await getSignedAvatarUrl(raw) : null;
              setInfluencerAvatar(signed || raw || undefined);
            } catch {}
          }
        }
        // Resolve reviewee display name and profile picture for "About {name}" label
        if (req?.userId) {
          try {
            const profile = await getProfileById(String(req.userId));
            if (profile?.displayName) setRevieweeName(profile.displayName);
            // Load user's profile picture
            if (profile?.avatarUrl) {
              try {
                const signed = await getSignedAvatarUrl(profile.avatarUrl);
                setRevieweeAvatar(signed || profile.avatarUrl);
              } catch {}
            }
          } catch {}
        }
        // Load existing reviewer review if it exists
        if (req?.status === 'completed' && req?.review) {
          try {
            const existingReview = await getReviewerReviewByRequestId(String(id));
            setReviewerReview(existingReview);
          } catch (error) {
            console.error('Failed to load reviewer review:', error);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // Show reviewer review modal after they view the video and close it
  React.useEffect(() => {
    if (!hasViewedVideo || promptAfterVideoShown || reviewerReview || !review || request?.status !== 'completed') {
      return;
    }
    
    // Small delay to let the video modal fully close
    const promptTimer = setTimeout(() => {
      setReviewerReviewModalOpen(true);
      setPromptAfterVideoShown(true);
    }, 500);
    
    return () => clearTimeout(promptTimer);
  }, [hasViewedVideo, promptAfterVideoShown, reviewerReview, review, request?.status]);

  // Schedule push notification 1 day after review is viewed if reviewer review not submitted
  React.useEffect(() => {
    // Don't schedule if still loading - wait until reviewer review is loaded
    if (loading || !hasViewedReview || reviewerReview || !review || request?.status !== 'completed' || !request?.id) {
      return;
    }
    
    // Schedule a local notification for 1 day later
    const scheduleReminderNotification = async () => {
      try {
        // Double-check that reviewer review doesn't exist before scheduling
        // This prevents race conditions where the review was loaded after the effect ran
        const existingReview = await getReviewerReviewByRequestId(String(request.id));
        if (existingReview) {
          // Review exists, update state and don't schedule
          setReviewerReview(existingReview);
          return;
        }
        
        const oneDayFromNow = new Date();
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        
        // Check if notification was already scheduled for this request
        const notificationKey = `reviewer_review_reminder_${request.id}`;
        const existingScheduled = await Notifications.getAllScheduledNotificationsAsync();
        const alreadyScheduled = existingScheduled.some(n => n.identifier === notificationKey);
        
        if (!alreadyScheduled) {
          await Notifications.scheduleNotificationAsync({
            identifier: notificationKey,
            content: {
              title: 'Review Your Reviewer',
              body: `You haven't reviewed ${influencerName} yet. Share your experience!`,
              data: { requestId: request.id, type: 'reviewer_review_reminder' },
              sound: true,
            },
            trigger: {
              date: oneDayFromNow,
            },
          });
        }
      } catch (error) {
        console.error('Failed to schedule reviewer review reminder notification:', error);
      }
    };
    
    scheduleReminderNotification();
  }, [loading, hasViewedReview, reviewerReview, review, request?.status, request?.id, influencerName]);

  // Extract media URLs before early returns to ensure hooks are always called
  const mediaVideoUrl = review?.media?.videoUrl as string | undefined;
  const mediaImageUrl = review?.media?.imageUrl as string | undefined;
  
  // Video player setup - must be before early returns to maintain hook order
  const videoPlayer = useVideoPlayer(mediaVideoUrl || '', (player) => {
    if (mediaVideoUrl) {
      player.loop = false;
      player.muted = false;
    }
  });
  
  // Update video source when URL changes
  React.useEffect(() => {
    if (!videoPlayer || !mediaVideoUrl) return;
    videoPlayer.replace(mediaVideoUrl);
  }, [videoPlayer, mediaVideoUrl]);
  
  React.useEffect(() => {
    if (!videoPlayer) return;
    
    const subscription = videoPlayer.addListener('playingChange', (isPlaying) => {
      setIsVideoPlaying(isPlaying);
    });
    
    return () => {
      subscription.remove();
    };
  }, [videoPlayer]);

  // Fullscreen video player for modal - must be before early returns
  const fullscreenVideoPlayer = useVideoPlayer(mediaVideoUrl || '', (player) => {
    if (mediaVideoUrl) {
      player.loop = false;
      player.muted = false;
    }
  });

  React.useEffect(() => {
    if (!fullscreenVideoPlayer || !mediaVideoUrl) return;
    fullscreenVideoPlayer.replace(mediaVideoUrl);
  }, [fullscreenVideoPlayer, mediaVideoUrl]);


  const datingProfileNotes = React.useMemo(() => {
    return (
      review?.feedback?.sectionNotes?.datingProfile ??
      review?.feedback?.sectionNotes?.socials ??
      null
    );
  }, [review?.feedback?.sectionNotes?.datingProfile, review?.feedback?.sectionNotes?.socials]);

  // Rating color and label helpers (matching video review feature)
  // Define these functions early to ensure they're always accessible
  const getRatingColor = React.useCallback((rating: number) => {
    if (rating >= 7) return Colors.brand.status.completed; // Green
    if (rating >= 4) return Colors.brand.status.in_progress; // Amber
    return Colors.brand.status.rejected; // Red
  }, []);

  const getRatingLabel = React.useCallback((rating: number) => {
    if (rating >= 7) return 'Looks great';
    if (rating >= 4) return 'Solid but room to tweak';
    return 'Needs work';
  }, []);

  const toggleVideoPlayback = () => {
    if (!videoPlayer) return;
    if (isVideoPlaying) {
      videoPlayer.pause();
    } else {
      videoPlayer.play();
    }
  };

  const openSocialLink = async (platform: 'instagram' | 'tiktok') => {
    if (!mediaVideoUrl) {
      return;
    }
    
    try {
      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        // Use native share sheet to share the video
        await Sharing.shareAsync(mediaVideoUrl, {
          mimeType: 'video/mp4',
          dialogTitle: `Share on ${platform === 'instagram' ? 'Instagram' : 'TikTok'}`,
        });
      } else {
        // Fallback: try to open the app directly
        if (platform === 'instagram') {
          const igUrl = Platform.select({ 
            ios: 'instagram://camera', 
            android: 'instagram://camera' 
          });
          if (igUrl) {
            const supported = await Linking.canOpenURL(igUrl);
            if (supported) {
              await Linking.openURL(igUrl);
            } else {
              Linking.openURL('https://www.instagram.com');
            }
          }
        } else if (platform === 'tiktok') {
          const tiktokUrl = Platform.select({ 
            ios: 'musically://camera', 
            android: 'snssdk1128://openRecord' 
          });
          if (tiktokUrl) {
            const supported = await Linking.canOpenURL(tiktokUrl);
            if (supported) {
              await Linking.openURL(tiktokUrl);
            } else {
              Linking.openURL('https://www.tiktok.com/upload');
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Review not found</Text>
      </View>
    );
  }

  // Calculate available height for content section
  // Top section (video circle + name): 80px height + 20px marginBottom = 100px
  // Account for: safe area top inset, ScrollView paddingTop (12px), and bottom padding
  const topSectionHeight = 100;
  const scrollViewPaddingTop = 12;
  const scrollViewPaddingBottom = Platform.OS === 'web' ? 24 : 24;
  const availableContentHeight = Math.max(
    400, // Minimum height to ensure content is visible
    windowHeight - topSectionHeight - insets.top - scrollViewPaddingTop - scrollViewPaddingBottom - insets.bottom
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header with Back Button */}
      <TouchableOpacity 
        style={[styles.backButton, { top: Platform.OS === 'ios' ? 48 : 58 }]}
        onPress={() => router.push('/(tabs)/requests')}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.brand.textPrimary} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ paddingTop: 0, paddingBottom: Platform.OS === 'web' ? 24 : 24, paddingHorizontal: 16, flexGrow: 1 }}>
        {/* Top Section: Reviewee (big) and Reviewer (small) profile photos */}
        <View style={styles.topProfileSection}>
          {/* Reviewee - Small circular photo with name */}
          {revieweeAvatar && (
            <RNView style={styles.revieweeProfileContainer}>
              <TouchableOpacity
                onPress={() => {
                  setGalleryUris([revieweeAvatar]);
                  setGalleryIndex(0);
                  setGalleryOpen(true);
                }}
                style={styles.reviewerPhotoWrapper}
              >
                <Avatar uri={revieweeAvatar} name={revieweeName} size={80} />
              </TouchableOpacity>
              <Text style={styles.reviewerName}>{revieweeName}</Text>
            </RNView>
          )}

          {/* Reviewer - Bigger circular photo with name */}
          <RNView style={styles.reviewerProfileContainer}>
            <TouchableOpacity
              onPress={() => {
                if (influencerAvatar) {
                  setGalleryUris([influencerAvatar]);
                  setGalleryIndex(0);
                  setGalleryOpen(true);
                }
              }}
              style={styles.revieweePhotoWrapper}
            >
              <Image 
                source={{ uri: influencerAvatar }} 
                style={styles.revieweePhoto} 
                contentFit="cover" 
                transition={200} 
                cachePolicy="none" 
              />
            </TouchableOpacity>
            {review?.ratings?.overall ? (
              <RNView style={styles.ratingDisplayContainer}>
                <Text style={styles.ratingNameText}>
                  {influencerName.split(' ')[0]} rated you
                </Text>
                <RNView style={styles.ratingNumberContainer}>
                  <Text style={[styles.ratingNumber, { color: getRatingColor(review.ratings.overall) }]}>
                    {review.ratings.overall}
                  </Text>
                  <Text style={styles.ratingOutOf}>/ 10</Text>
                </RNView>
                <Text style={[styles.ratingLabel, { color: getRatingColor(review.ratings.overall) }]}>
                  {getRatingLabel(review.ratings.overall)}
                </Text>
              </RNView>
            ) : (
              <Text style={styles.revieweeName}>{influencerName}</Text>
            )}
          </RNView>

          {/* Status Message */}
          {statusBanner && (
            <RNView style={styles.statusMessageTop}>
              <RNView style={styles.statusBadgeContainer}>
                <StatusBadge status={request.status as any} label={statusBanner.labelOverride} />
              </RNView>
              <Text style={styles.statusMessageText}>{statusBanner.text}</Text>
            </RNView>
          )}
        </View>

        {/* View Video Review Button - moved up here */}
        {request?.status === 'completed' && mediaVideoUrl ? (
          <View style={styles.videoButtonSection}>
            <TouchableOpacity 
              style={[styles.primaryActionButton, { backgroundColor: Colors.brand.accentMagenta }]} 
              onPress={() => setVideoModalVisible(true)}
            >
              <Text style={styles.primaryActionButtonText}>🎥 View Video Review</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* About Section - moved above gallery */}
        {parsedNotes?.message ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>About {revieweeName.split(' ')[0]}</Text>
            <Text style={styles.bioText}>{parsedNotes.message}</Text>
          </View>
        ) : null}

        {/* Dating Profile Gallery Section - Vertical scroll with comments */}
        {signedProfilePhotos.length > 0 && (
          <View style={styles.datingProfileSection}>
            <Text style={styles.sectionTitle}>Dating Profile</Text>
            {signedProfilePhotos.map((photoUri, index) => {
              const photoNote = review?.feedback?.photoNotes?.[index] || 
                               review?.feedback?.photoNotes?.[String(index)] || 
                               null;
              return (
                <RNView key={index} style={styles.photoWithComment}>
                  <TouchableOpacity
                    onPress={() => {
                      setGalleryUris(signedProfilePhotos);
                      setGalleryIndex(index);
                      setGalleryOpen(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <Image 
                      source={{ uri: photoUri }} 
                      style={styles.datingProfilePhoto} 
                      contentFit="cover" 
                      transition={200} 
                    />
                  </TouchableOpacity>
                  {photoNote && (
                    <View style={styles.photoCommentContainer}>
                      <Text style={styles.photoCommentText}>
                        {photoNote}
                      </Text>
                    </View>
                  )}
                </RNView>
              );
            })}
          </View>
        )}

        {/* Review Content Section - Below the gallery */}
        {review && (
          <RNView style={[styles.reviewContentSection, { minHeight: availableContentHeight }]}>

            {/* Consent pill is now shown inside the status card */}



            <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Feedback</Text>
        
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>✨ Your Strengths</Text>
          <RNView style={styles.feedbackItemsContainer}>
            {review?.feedback?.strengths?.map((strength: string, index: number) => (
              <RNView key={index} style={[styles.feedbackPill, styles.strengthPill]}>
                <Text style={styles.feedbackPillText}>{strength}</Text>
              </RNView>
            ))}
          </RNView>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>🎯 Areas for Improvement</Text>
          <RNView style={styles.feedbackItemsContainer}>
            {review?.feedback?.improvements?.map((improvement: string, index: number) => (
              <RNView key={index} style={[styles.feedbackPill, styles.improvementPill]}>
                <Text style={styles.feedbackPillText}>{improvement}</Text>
              </RNView>
            ))}
          </RNView>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>💬 General Feedback</Text>
          <Text style={styles.generalFeedback}>{review?.feedback?.generalFeedback}</Text>
        </View>

        {datingProfileNotes ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>📋 Dating Profile Notes</Text>
            <Text style={styles.generalFeedback}>{datingProfileNotes}</Text>
            </View>
            ) : null}
            </View>
          </RNView>
        )}


            {parsedNotes?.media?.datingProfile ? (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Dating Profile</Text>
                <Image source={{ uri: parsedNotes.media.datingProfile }} style={styles.videoThumb} contentFit="cover" transition={200} />
                <Text style={styles.videoHint}>Open in original app to view the video</Text>
              </View>
            ) : null}

            <View style={styles.actionsSection}>
        {/* Reviewer Review Button - after review content */}
        {request?.status === 'completed' && review ? (
          <>
            {!reviewerReview ? (
              <TouchableOpacity 
                style={[styles.secondaryActionButton, { backgroundColor: Colors.brand.accentMagenta }]}
                onPress={() => setReviewerReviewModalOpen(true)}
              >
                <Text style={styles.secondaryActionButtonText}>
                  ⭐ Review Your Reviewer
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reviewerReviewCard}>
                <Text style={styles.reviewerReviewTitle}>Your Review of {influencerName}</Text>
                <RNView style={styles.reviewerReviewRating}>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Text
                      key={r}
                      style={[
                        styles.reviewerReviewStar,
                        { color: r <= reviewerReview.rating ? Colors.brand.accentMagenta : Colors.brand.border }
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </RNView>
                {reviewerReview.comment && (
                  <Text style={styles.reviewerReviewComment}>{reviewerReview.comment}</Text>
                )}
              </View>
            )}
            <RNView style={{ height: 16 }} />
          </>
        ) : null}

        {/* Share Section - less prominent, at bottom */}
        {request?.status === 'completed' && shareConsent && mediaVideoUrl ? (
          <>
            <Text style={styles.shareSectionTitle}>Share Video Review</Text>
            <Text style={styles.shareSectionSubtitle}>Share your review video on social media</Text>
            <RNView style={styles.socialLinksContainer}>
              <TouchableOpacity 
                style={[styles.socialLinkButton, { backgroundColor: '#E1306C' }]} 
                onPress={() => openSocialLink('instagram')}
              >
                <Text style={styles.socialLinkButtonText}>📷 Share on Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialLinkButton, { backgroundColor: '#161823', borderWidth: 1, borderColor: Colors.brand.border }]} 
                onPress={() => openSocialLink('tiktok')}
              >
                <Text style={styles.socialLinkButtonText}>🎵 Share on TikTok</Text>
              </TouchableOpacity>
            </RNView>
            <RNView style={{ height: 16 }} />
          </>
        ) : null}
        
        {/* Request Another Review - secondary style button at bottom */}
        <TouchableOpacity 
          style={styles.tertiaryActionButton}
          onPress={() => router.push('/(tabs)/requests/new')}
        >
          <Text style={styles.tertiaryActionButtonText}>✨ Request Another Review</Text>
        </TouchableOpacity>
            </View>
      </ScrollView>
      <ImageGalleryModal visible={galleryOpen} uris={galleryUris} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
      {request?.status === 'completed' && review && (
        <ReviewerReviewModal
          visible={reviewerReviewModalOpen}
          requestId={String(id)}
          reviewerName={influencerName}
          onClose={() => setReviewerReviewModalOpen(false)}
          onSuccess={async (review) => {
            setReviewerReview(review);
            setReviewerReviewModalOpen(false);
            // Cancel any scheduled reminder notification for this request
            try {
              const notificationKey = `reviewer_review_reminder_${id}`;
              await Notifications.cancelScheduledNotificationAsync(notificationKey);
            } catch (error) {
              console.error('Failed to cancel reminder notification:', error);
            }
          }}
        />
      )}
      
      {/* Fullscreen Video Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          setVideoModalVisible(false);
          setHasViewedVideo(true);
        }}
      >
        <View style={styles.videoModalContainer}>
          <SafeAreaView style={styles.videoModalSafeArea} edges={['top', 'bottom', 'left', 'right']}>
            <RNView style={styles.videoModalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setVideoModalVisible(false);
                  setHasViewedVideo(true);
                }}
                style={styles.videoModalCloseButton}
              >
                <Text style={styles.videoModalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.videoModalTitle}>Video Review</Text>
              <RNView style={{ width: 40 }} />
            </RNView>
            <RNView style={styles.videoModalContent}>
              {mediaVideoUrl && (
                <RNView style={styles.fullscreenVideoWrapper}>
                  <VideoView
                    style={styles.fullscreenVideo}
                    player={fullscreenVideoPlayer}
                    contentFit="contain"
                    nativeControls={true}
                  />
                </RNView>
              )}
            </RNView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // New Video Review Top Section Styles
  videoReviewTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 0,
    gap: 16,
  },
  videoCircleContainer: {
    width: 80,
    height: 80,
  },
  videoCircleWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  videoCirclePlayer: {
    width: '100%',
    height: '100%',
  },
  videoCirclePlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 40,
  },
  videoCirclePlayButtonTransparent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 40,
  },
  videoCirclePlayIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reviewerNameContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  reviewerNameTop: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 6,
  },
  reviewDateTop: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  reviewContentSection: {
    marginTop: 0,
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  influencerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  influencerImageWrapper: {
    marginRight: 15,
  },
  influencerImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  influencerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 15,
  },
  ratingsSection: {
    margin: 15,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 22,
    padding: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  singleRatingGrid: {
    justifyContent: 'center',
  },
  ratingCard: {
    width: '48%',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 10,
  },
  ratingCardFull: {
    width: '100%',
    paddingVertical: 24,
  },
  ratingDescription: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackSection: {
    margin: 15,
  },
  mediaSection: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  datingProfileSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  photoWithComment: {
    marginBottom: 24,
  },
  datingProfilePhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: Colors.brand.cardBackgroundLight,
  },
  photoCommentContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  photoCommentText: {
    fontSize: 15,
    color: Colors.brand.textPrimary,
    lineHeight: 22,
  },
  photoCommentTextNoComment: {
    color: Colors.brand.textSecondary,
    fontStyle: 'italic',
  },
  feedbackCard: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  feedbackItem: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },
  feedbackItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  feedbackPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  strengthPill: {
    backgroundColor: '#22c55e',
  },
  improvementPill: {
    backgroundColor: '#ef4444',
  },
  feedbackPillText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  generalFeedback: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
  },
  topProfileSection: {
    marginBottom: 24,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
  },
  reviewerProfileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewerPhotoWrapper: {
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
  },
  revieweeProfileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  revieweePhotoWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  revieweePhoto: {
    width: '100%',
    height: '100%',
  },
  revieweeName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  ratingDisplayContainer: {
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  ratingNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  ratingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
    fontFamily: 'Poppins_700Bold',
  },
  ratingOutOf: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textSecondary,
    opacity: 0.7,
    lineHeight: 26,
    paddingBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: 'Poppins_700Bold',
  },
  statusMessageTop: {
    alignItems: 'center',
    width: '100%',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  statusMessageText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  bioLabel: {
    color: Colors.brand.textSecondary,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  bioText: {
    color: Colors.brand.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  selfie: { width: '100%', aspectRatio: 1, borderRadius: 16, marginBottom: 12 },
  promptLabel: { color: Colors.brand.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600', fontSize: 14 },
  promptText: { color: Colors.brand.textPrimary, fontSize: 15, lineHeight: 24 },
  mediaHint: { color: Colors.brand.textSecondary, marginTop: 12, fontSize: 13, lineHeight: 20 },
  mediaHeading: { marginTop: 20 },
  videoThumb: { width: '100%', aspectRatio: 1.77, borderRadius: 12 },
  videoHint: { color: Colors.brand.textSecondary, marginTop: 6, fontSize: 12 },
  videoButtonSection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  primaryActionButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryActionButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
  },
  actionsSection: {
    margin: 15,
    marginBottom: 30,
  },
  secondaryActionButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryActionButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
  },
  tertiaryActionButton: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  tertiaryActionButtonText: {
    color: Colors.brand.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  infoBanner: {
    marginHorizontal: 15,
    marginTop: 12,
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackground,
  },
  statusSection: {
    margin: 15,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 15,
    padding: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 10,
  },
  statusText: {
    color: Colors.brand.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  infoText: {
    color: Colors.brand.textSecondary,
    flex: 1,
  },
  consentBadge: {
    marginHorizontal: 15,
    marginTop: 12,
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.brand.cardBackground,
    alignSelf: 'flex-start',
  },
  consentPill: {
    alignSelf: 'center',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  consentPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  consentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  actionButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.brand.accentMagenta,
  },
  actionButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: Colors.brand.accentMagenta,
  },
  errorText: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  reviewerReviewCard: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  reviewerReviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  reviewerReviewRating: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewerReviewStar: {
    fontSize: 20,
    marginRight: 2,
  },
  reviewerReviewComment: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  shareSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  shareSectionSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  socialLinksContainer: {
    gap: 12,
    marginBottom: 16,
  },
  socialLinkButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  noSocialLinksText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  videoModalSafeArea: {
    flex: 1,
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
  },
  videoModalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalCloseText: {
    fontSize: 24,
    color: Colors.brand.textPrimary,
    fontWeight: '300',
  },
  videoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  videoModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullscreenVideoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
});
