import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View as RNView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { getRequestById } from '@/lib/api';
import { getReviewerById, getProfileById } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Image } from 'expo-image';
import { signRequestMediaUrls, getSignedRequestMediaUrl } from '@/lib/uploads';
import LightboxImage from '@/components/LightboxImage';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import PhotoCarousel from '@/components/PhotoCarousel';
import StatusBadge from '@/components/StatusBadge';
import Avatar from '@/components/Avatar';
import { getSignedAvatarUrl } from '@/lib/profile';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [influencerName, setInfluencerName] = React.useState<string>('');
  const [influencerAvatar, setInfluencerAvatar] = React.useState<string | undefined>(undefined);
  const [revieweeName, setRevieweeName] = React.useState<string>('You');
  
  const [request, setRequest] = React.useState<any>(null);
  const review = request?.review;
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryUris, setGalleryUris] = React.useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = React.useState(0);

  const statusBanner = React.useMemo(() => {
    const s = request?.status as string | undefined;
    if (!s) return null;
    if (s === 'pending') {
      return { labelOverride: 'Pending acceptance', text: 'Awaiting reviewer approval — if declined or no response in 30 days, you will be refunded.' };
    }
    if (s === 'accepted') {
      return { labelOverride: undefined, text: 'Accepted means the reviewer agreed to your request. Complete payment to proceed—after payment, they have 30 days to submit your review.' };
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

  const [signedOutfits, setSignedOutfits] = React.useState<string[]>([]);
  const [signedRoom, setSignedRoom] = React.useState<string[]>([]);
  const [signedSocials, setSignedSocials] = React.useState<string[]>([]);
  const [signedSelfie, setSignedSelfie] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const outfits = Array.isArray(parsedNotes?.media?.outfits) ? parsedNotes?.media?.outfits as string[] : [];
        const room = Array.isArray(parsedNotes?.media?.roomTourPhotos) ? parsedNotes?.media?.roomTourPhotos as string[] : [];
        const socials = Array.isArray(parsedNotes?.media?.datingProfileScreenshots) ? parsedNotes?.media?.datingProfileScreenshots as string[] : [];
        const selfie = (parsedNotes?.media?.selfie || parsedNotes?.selfieUrl) as string | undefined;
        setSignedOutfits(await signRequestMediaUrls(outfits));
        setSignedRoom(await signRequestMediaUrls(room));
        setSignedSocials(await signRequestMediaUrls(socials));
        setSignedSelfie(selfie ? await getSignedRequestMediaUrl(selfie) : null);
      } catch {}
    })();
  }, [parsedNotes?.media]);

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
            try {
              // Normalize known copy/paste artifacts (e.g., leading '@') and re-sign
              const raw = (rev.avatarUrl || '').trim().replace(/^@+/, '');
              const signed = raw ? await getSignedAvatarUrl(raw, 3600) : null;
              setInfluencerAvatar(signed || raw || undefined);
            } catch {}
          }
        }
        // Resolve reviewee display name for "About {name}" label
        if (req?.userId) {
          try {
            const profile = await getProfileById(String(req.userId));
            if (profile?.displayName) setRevieweeName(profile.displayName);
          } catch {}
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
                {`Consent to share review on socials? ${shareConsent ? 'Yes' : 'No'}`}
              </Text>
            </RNView>
          ) : null}
        </View>
      )}

      {/* Consent pill is now shown inside the status card */}

      {review ? (<View style={styles.ratingsSection}>
        <Text style={styles.sectionTitle}>Your Ratings</Text>
        <RNView style={styles.ratingsGrid}>
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
        </RNView>
      </View>) : null}

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
            {signedSelfie ? (
              <TouchableOpacity onPress={() => { setGalleryUris([signedSelfie]); setGalleryIndex(0); setGalleryOpen(true); }}>
                <Image source={{ uri: signedSelfie }} style={styles.selfie} contentFit="cover" transition={200} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.promptLabel}>{`About ${revieweeName || 'You'}`}</Text>
            <Text style={styles.promptText}>{parsedNotes.message}</Text>
          </View>
        )}

        {signedOutfits.length ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Outfits</Text>
            <PhotoCarousel uris={signedOutfits} onPressItem={(i) => { setGalleryUris(signedOutfits); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        ) : null}

        {signedRoom.length ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Room Tour</Text>
            <PhotoCarousel uris={signedRoom} onPressItem={(i) => { setGalleryUris(signedRoom); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        ) : null}

        {signedSocials.length ? (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Socials</Text>
            <PhotoCarousel uris={signedSocials} onPressItem={(i) => { setGalleryUris(signedSocials); setGalleryIndex(i); setGalleryOpen(true); }} />
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
});
