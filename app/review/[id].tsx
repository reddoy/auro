import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View as RNView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { getRequestById } from '@/lib/api';
import { getReviewerById } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Image } from 'expo-image';
import LightboxImage from '@/components/LightboxImage';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import StatusBadge from '@/components/StatusBadge';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [influencerName, setInfluencerName] = React.useState<string>('');
  
  const [request, setRequest] = React.useState<any>(null);
  const review = request?.review;
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryUris, setGalleryUris] = React.useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = React.useState(0);

  const statusBanner = React.useMemo(() => {
    const s = request?.status as string | undefined;
    if (!s) return null;
    if (s === 'pending') {
      return { labelOverride: undefined, text: 'Pending acceptance means the reviewer has 30 days to accept or deny your request.' };
    }
    if (s === 'accepted') {
      return { labelOverride: undefined, text: 'Accepted means the reviewer agreed to your request. Complete payment to proceed—after payment, they have 30 days to submit your review.' };
    }
    if (s === 'paid' || s === 'in_progress') {
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

  const hasConsent = React.useMemo(() => typeof parsedNotes?.consent?.shareOnSocial === 'boolean', [parsedNotes]);
  const shareConsent = React.useMemo(() => !!parsedNotes?.consent?.shareOnSocial, [parsedNotes]);

  React.useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const req = await getRequestById(String(id));
        setRequest(req);
        if (req?.influencerId) {
          const rev = await getReviewerById(String(req.influencerId));
          if (rev) {
            setInfluencerName(rev.displayName);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}>
        <View style={styles.header}>
          <RNView style={styles.influencerImageWrapper} />
        <View style={styles.headerInfo}>
          <Text style={styles.influencerName}>{influencerName}</Text>
          <Text style={styles.reviewDate}>
            {review?.createdAt ? `Reviewed on ${new Date(review.createdAt).toLocaleDateString()}` : 'Not completed'}
          </Text>
        </View>
        </View>

      {statusBanner && (
        <View style={styles.infoBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={request.status as any} label={statusBanner.labelOverride} />
            <Text style={styles.infoText}>{statusBanner.text}</Text>
          </View>
        </View>
      )}

      {hasConsent ? (
        <View style={styles.consentBadge}>
          <Text style={[styles.consentBadgeText, { color: shareConsent ? Colors.brand.status.completed : Colors.brand.status.rejected }]}>
            Sharing consent: {shareConsent ? 'Yes' : 'No'}
          </Text>
        </View>
      ) : null}

      {review ? (<View style={styles.ratingsSection}>
        <Text style={styles.sectionTitle}>Your Ratings</Text>
        <View style={styles.ratingsGrid}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Overall</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.overall ?? 0) }]}>
              {review?.ratings?.overall ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.overall ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Attractiveness</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.attractiveness ?? 0) }]}>
              {review?.ratings?.attractiveness ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.attractiveness ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Wardrobe</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.wardrobe ?? 0) }]}>
              {review?.ratings?.wardrobe ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.wardrobe ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Room</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.room ?? 0) }]}>
              {review?.ratings?.room ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.room ?? 0)}</Text>
          </View>
        </View>
      </View>) : (
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Not completed</Text>
          <Text style={{ color: '#C7BFD9' }}>This request has not been reviewed yet.</Text>
        </View>
      )}

      {review && (<View style={styles.feedbackSection}>
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
      </View>)}

        {!!parsedNotes?.message && (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Selfie</Text>
            {parsedNotes?.media?.selfie ? (
              <TouchableOpacity onPress={() => { setGalleryUris([parsedNotes.media.selfie]); setGalleryIndex(0); setGalleryOpen(true); }}>
                <Image source={{ uri: parsedNotes.media.selfie }} style={styles.selfie} contentFit="cover" transition={200} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.promptLabel}>Prompt</Text>
            <Text style={styles.promptText}>{parsedNotes.message}</Text>
          </View>
        )}

        {Array.isArray(parsedNotes?.media?.outfits) && parsedNotes.media.outfits.length ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Outfits</Text>
            <View style={styles.photosGrid}> 
              {parsedNotes.media.outfits.map((p: string, i: number) => (
                <TouchableOpacity key={`o-${i}`} onPress={() => { setGalleryUris(parsedNotes.media.outfits); setGalleryIndex(i); setGalleryOpen(true); }}>
                  <Image source={{ uri: p }} style={styles.photo} contentFit="cover" transition={200} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {Array.isArray(parsedNotes?.media?.roomTourPhotos) && parsedNotes.media.roomTourPhotos.length ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Room Tour</Text>
            <View style={styles.photosGrid}>
              {parsedNotes.media.roomTourPhotos.map((p: string, i: number) => (
                <TouchableOpacity key={`r-${i}`} onPress={() => { setGalleryUris(parsedNotes.media.roomTourPhotos); setGalleryIndex(i); setGalleryOpen(true); }}>
                  <Image source={{ uri: p }} style={styles.photo} contentFit="cover" transition={200} />
                </TouchableOpacity>
              ))}
            </View>
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
    </SafeAreaView>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: Colors.brand.avatarPlaceholder,
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
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 15,
    padding: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ratingCard: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 10,
  },
  ratingCategory: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.brand.textPrimary,
  },
  ratingLabel: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
  },
  feedbackSection: {
    margin: 15,
  },
  mediaSection: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 15,
    padding: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  feedbackCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
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
  photosSection: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 15,
    padding: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  selfie: { width: '100%', aspectRatio: 1.5, borderRadius: 12 },
  promptLabel: { color: Colors.brand.textSecondary, marginTop: 10, marginBottom: 6 },
  promptText: { color: Colors.brand.textPrimary },
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
});
