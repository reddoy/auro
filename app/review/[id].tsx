import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View as RNView, Linking, Platform, Pressable, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

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
  const [reviewer, setReviewer] = React.useState<DbReviewerSummary | null>(null);

  const statusBanner = React.useMemo(() => {
    const s = request?.status as string | undefined;
    if (!s) return null;
    if (s === 'pending') {
      return { labelOverride: 'Pending', text: 'Please check your email regarding payment. You have 30 days to complete payment.' };
    }
    if (s === 'accepted') {
      return { labelOverride: undefined, text: 'Please check your email regarding payment. You have 30 days to complete payment.' };
    }
    if (s === 'paid') {
      return { labelOverride: 'Pending acceptance', text: 'Awaiting reviewer approval — if declined or no response in 30 days, you will be refunded.' };
    }
    if (s === 'in_progress') {
      return { labelOverride: undefined, text: 'Pending review means the reviewer accepted your request and now has 30 days to submit your review.' };
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

  React.useEffect(() => {
    if (!hasViewedReview || autoPromptShown || reviewerReview || !review || request?.status !== 'completed') {
      return;
    }
    const promptTimer = setTimeout(() => {
      setReviewerReviewModalOpen(true);
      setAutoPromptShown(true);
    }, 1200);
    return () => clearTimeout(promptTimer);
  }, [hasViewedReview, autoPromptShown, reviewerReview, review, request?.status]);

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

  const ratingEntries = React.useMemo(() => {
    if (!review?.ratings) return [];
    const entries = [
      {
        key: 'overall',
        label: 'Overall',
        description: 'Overall dating profile vibe',
        value: review.ratings.overall,
      },
    ];
    return entries.filter(
      (entry) => typeof entry.value === 'number' && (entry.value ?? 0) > 0
    );
  }, [review?.ratings]);

  const datingProfileNotes = React.useMemo(() => {
    return (
      review?.feedback?.sectionNotes?.datingProfile ??
      review?.feedback?.sectionNotes?.socials ??
      null
    );
  }, [review?.feedback?.sectionNotes?.datingProfile, review?.feedback?.sectionNotes?.socials]);

  const toggleVideoPlayback = () => {
    if (!videoPlayer) return;
    if (isVideoPlaying) {
      videoPlayer.pause();
    } else {
      videoPlayer.play();
    }
  };

  const openSocialLink = (platform: 'instagram' | 'tiktok') => {
    if (!reviewer?.links) return;
    const handle = reviewer.links[platform];
    if (!handle) return;
    
    const normalizedHandle = handle.replace(/^@/, '').trim();
    if (platform === 'instagram') {
      Linking.openURL(`https://instagram.com/${normalizedHandle}`);
    } else if (platform === 'tiktok') {
      Linking.openURL(`https://tiktok.com/@${normalizedHandle}`);
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
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 24 : 24, paddingHorizontal: 16, flexGrow: 1 }}>
        {/* Top Section: Circular video player on left, Reviewer name on right */}
        {mediaVideoUrl && review ? (
          <View style={styles.videoReviewTopSection}>
            {/* Circular Video Player - Left Side */}
            <RNView style={styles.videoCircleContainer}>
              <RNView style={styles.videoCircleWrapper}>
                <VideoView
                  style={styles.videoCirclePlayer}
                  player={videoPlayer}
                  contentFit="cover"
                  nativeControls={false}
                />
                {/* Play/Pause Overlay - only show when paused */}
                {!isVideoPlaying && (
                  <Pressable
                    style={styles.videoCirclePlayButton}
                    onPress={toggleVideoPlayback}
                    accessibilityLabel="Play video"
                  >
                    <Text style={styles.videoCirclePlayIcon}>▶</Text>
                  </Pressable>
                )}
                {/* Tap to pause when playing - transparent overlay */}
                {isVideoPlaying && (
                  <Pressable
                    style={styles.videoCirclePlayButtonTransparent}
                    onPress={toggleVideoPlayback}
                    accessibilityLabel="Pause video"
                  >
                    <RNView />
                  </Pressable>
                )}
              </RNView>
            </RNView>
            
            {/* Reviewer Name - Right Side */}
            <RNView style={styles.reviewerNameContainer}>
              <Text style={styles.reviewerNameTop}>{influencerName}</Text>
              {review?.createdAt ? (
                <Text style={styles.reviewDateTop}>
                  {`Reviewed on ${new Date(review.createdAt).toLocaleDateString()}`}
                </Text>
              ) : null}
            </RNView>
          </View>
        ) : (
          /* Fallback header when no video */
          <View style={styles.header}>
            <RNView style={styles.influencerImageWrapper}>
              <Avatar uri={influencerAvatar} name={influencerName} size={60} />
            </RNView>
            <RNView style={styles.headerInfo}>
              <Text style={styles.influencerName}>{influencerName}</Text>
              {review?.createdAt ? (
                <Text style={styles.reviewDate}>
                  {`Reviewed on ${new Date(review.createdAt).toLocaleDateString()}`}
                </Text>
              ) : null}
            </RNView>
          </View>
        )}

        {/* Review Content Section - Below the top section */}
        {review && (
          <RNView style={[styles.reviewContentSection, { minHeight: availableContentHeight }]}>

            {statusBanner && (
              <View style={styles.statusSection}>
                <Text style={styles.statusTitle}>Status</Text>
                <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <StatusBadge status={request.status as any} label={statusBanner.labelOverride} />
                </RNView>
                <Text style={styles.statusText}>{statusBanner.text}</Text>
                {hasConsent ? (
                  <RNView style={[styles.consentPill, { borderColor: shareConsent ? Colors.brand.status.completed : Colors.brand.status.rejected }] }>
                    <Text style={[styles.consentPillText, { color: shareConsent ? Colors.brand.status.completed : Colors.brand.status.rejected }]}>
                      {`Consent to share review publicly? ${shareConsent ? 'Yes' : 'No'}`}
                    </Text>
                  </RNView>
                ) : null}
              </View>
            )}

            {/* Consent pill is now shown inside the status card */}

            {ratingEntries.length > 0 ? (
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Your Ratings</Text>
          <RNView
            style={[
              styles.ratingsGrid,
              ratingEntries.length === 1 && styles.singleRatingGrid,
            ]}
          >
            {ratingEntries.map((entry) => (
              <View
                key={entry.key}
                style={[
                  styles.ratingCard,
                  ratingEntries.length === 1 && styles.ratingCardFull,
                ]}
              >
                <StarRating
                  rating={entry.value ?? 0}
                  category={entry.label}
                  size={ratingEntries.length === 1 ? 'large' : 'medium'}
                />
                {entry.description ? (
                  <Text style={styles.ratingDescription}>{entry.description}</Text>
                ) : null}
              </View>
            ))}
          </RNView>
            </View>
            ) : null}

            <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Feedback</Text>
        
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>✨ Your Strengths</Text>
          {review?.feedback?.strengths?.map((strength: string, index: number) => (
            <Text key={index} style={styles.feedbackItem}>• {strength}</Text>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>🎯 Areas for Improvement</Text>
          {review?.feedback?.improvements?.map((improvement: string, index: number) => (
            <Text key={index} style={styles.feedbackItem}>• {improvement}</Text>
          ))}
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

            {(revieweeAvatar || parsedNotes?.message) && (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Profile Photo</Text>
                {revieweeAvatar ? (
                  <TouchableOpacity
                    onPress={() => {
                      setGalleryUris([revieweeAvatar]);
                      setGalleryIndex(0);
                      setGalleryOpen(true);
                    }}
                  >
                    <Image source={{ uri: revieweeAvatar }} style={styles.selfie} contentFit="cover" transition={200} cachePolicy="none" />
                  </TouchableOpacity>
                ) : null}
                {revieweeAvatar ? (
                  <Text style={styles.mediaHint}>
                    This is the hero photo they lead with on their dating profile.
                  </Text>
                ) : null}
                {parsedNotes?.message ? (
                  <>
                    <Text style={[styles.promptLabel, styles.mediaHeading]}>Profile Bio</Text>
                    <Text style={styles.promptText}>{parsedNotes.message}</Text>
                  </>
                ) : null}
              </View>
            )}

            {signedProfilePhotos.length ? (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Dating Profile Gallery</Text>
                <Text style={styles.mediaHint}>Tap to view each dating profile photo in full resolution.</Text>
                <PhotoCarousel
                  uris={signedProfilePhotos}
                  onPressItem={(i) => {
                    setGalleryUris(signedProfilePhotos);
                    setGalleryIndex(i);
                    setGalleryOpen(true);
                  }}
                />
              </View>
            ) : null}

            {parsedNotes?.media?.datingProfile ? (
              <View style={styles.mediaSection}>
                <Text style={styles.sectionTitle}>Dating Profile</Text>
                <Image source={{ uri: parsedNotes.media.datingProfile }} style={styles.videoThumb} contentFit="cover" transition={200} />
                <Text style={styles.videoHint}>Open in original app to view the video</Text>
              </View>
            ) : null}

            <View style={styles.actionsSection}>
        {request?.status === 'completed' && mediaVideoUrl ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.brand.accentMagenta }]} 
              onPress={() => setVideoModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>View Video Review</Text>
            </TouchableOpacity>
            <RNView style={{ height: 8 }} />
          </>
        ) : null}

        {request?.status === 'completed' && shareConsent && mediaVideoUrl ? (
          <>
            <Text style={styles.shareSectionTitle}>Share Video Review</Text>
            <Text style={styles.shareSectionSubtitle}>Visit {reviewer?.displayName || 'reviewer'}'s social media to share this review</Text>
            <RNView style={styles.socialLinksContainer}>
              {reviewer?.links?.instagram ? (
                <TouchableOpacity 
                  style={[styles.socialLinkButton, { backgroundColor: '#E1306C' }]} 
                  onPress={() => openSocialLink('instagram')}
                >
                  <Text style={styles.socialLinkButtonText}>Share on Instagram</Text>
                </TouchableOpacity>
              ) : null}
              {reviewer?.links?.tiktok ? (
                <TouchableOpacity 
                  style={[styles.socialLinkButton, { backgroundColor: '#000' }]} 
                  onPress={() => openSocialLink('tiktok')}
                >
                  <Text style={styles.socialLinkButtonText}>Share on TikTok</Text>
                </TouchableOpacity>
              ) : null}
              {(!reviewer?.links?.instagram && !reviewer?.links?.tiktok) ? (
                <Text style={styles.noSocialLinksText}>
                  {reviewer?.displayName || 'Reviewer'} hasn't added social media links yet.
                </Text>
              ) : null}
            </RNView>
            <RNView style={{ height: 8 }} />
          </>
        ) : null}
        
        {/* Reviewer Review Button - only show if review is completed */}
        {request?.status === 'completed' && review ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.brand.accentMagenta }]}
              onPress={() => setReviewerReviewModalOpen(true)}
            >
              <Text style={styles.actionButtonText}>
                {reviewerReview ? 'Update Your Review of Reviewer' : 'Review Your Reviewer'}
              </Text>
            </TouchableOpacity>
            {reviewerReview && (
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
            <RNView style={{ height: 8 }} />
          </>
        ) : null}
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/requests/new')}
        >
          <Text style={styles.actionButtonText}>Request Another Review</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/(tabs)/requests')}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Back to Home
          </Text>
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
          onSuccess={(review) => {
            setReviewerReview(review);
            setReviewerReviewModalOpen(false);
          }}
        />
      )}
      
      {/* Fullscreen Video Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.videoModalContainer}>
          <SafeAreaView style={styles.videoModalSafeArea} edges={['top', 'bottom', 'left', 'right']}>
            <RNView style={styles.videoModalHeader}>
              <TouchableOpacity 
                onPress={() => setVideoModalVisible(false)}
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
  generalFeedback: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
  },
  selfie: { width: '100%', aspectRatio: 1, borderRadius: 16, marginBottom: 12 },
  promptLabel: { color: Colors.brand.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600', fontSize: 14 },
  promptText: { color: Colors.brand.textPrimary, fontSize: 15, lineHeight: 24 },
  mediaHint: { color: Colors.brand.textSecondary, marginTop: 12, fontSize: 13, lineHeight: 20 },
  mediaHeading: { marginTop: 20 },
  videoThumb: { width: '100%', aspectRatio: 1.77, borderRadius: 12 },
  videoHint: { color: Colors.brand.textSecondary, marginTop: 6, fontSize: 12 },
  actionsSection: {
    margin: 15,
    marginBottom: 30,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
