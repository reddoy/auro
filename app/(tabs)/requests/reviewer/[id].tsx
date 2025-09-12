import React, { useEffect, useState } from 'react';
import { StyleSheet, View as RNView, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRequestById, getProfileById, acceptRequest, denyRequest, submitRequestReview } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbRequestSummary } from '@/types';
import Avatar from '@/components/Avatar';
import { Image } from 'expo-image';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import PhotoCarousel from '@/components/PhotoCarousel';
import { signRequestMediaUrls, getSignedRequestMediaUrl } from '@/lib/uploads';
import RatingBar from '@/components/RatingBar';
import MediaRecorder from '@/components/MediaRecorder';
import { uploadRequestMedia } from '@/lib/uploads';
import * as Sharing from 'expo-sharing';

// Removed unused URL helper functions since we're not showing social links in this screen

export default function ReviewerRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState<{ key: string; label: string; value: number }[]>([
    { key: 'composition', label: 'Composition', value: 0 },
    { key: 'lighting', label: 'Lighting', value: 0 },
    { key: 'originality', label: 'Originality', value: 0 },
  ]);
  const [tags, setTags] = useState<string[]>(['Great pose', 'Strong wardrobe', 'Good background', 'Try natural light', 'Mind clutter']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [signedPhotos, setSignedPhotos] = useState<string[]>([]); // fallback when categories aren't present
  const [signedOutfits, setSignedOutfits] = useState<string[]>([]);
  const [signedRoom, setSignedRoom] = useState<string[]>([]);
  const [signedSocials, setSignedSocials] = useState<string[]>([]);
  const [signedSelfie, setSignedSelfie] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUris, setGalleryUris] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Move useMemo to the top level, always called
  const parsedNotes = React.useMemo(() => {
    try {
      if (!request?.notes) return null;
      return typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes;
    } catch {
      return null;
    }
  }, [request?.notes]);

  useEffect(() => {
    const run = async () => {
      try {
        console.log('Request ID:', id);
        if (!id) {
          console.log('No ID found in params');
          return;
        }
        const req = await getRequestById(String(id));
        console.log('Request result:', req);
        setRequest(req);
        
        if (req?.userId) {
          const profile = await getProfileById(req.userId);
          console.log('Reviewee profile:', profile);
          setReviewee(profile);
          
          if (profile?.avatarUrl) {
            let uri = profile.avatarUrl;
            if (uri && !/^https?:\/\//i.test(uri)) {
              try { uri = (await getSignedAvatarUrl(uri, 3600)) || uri; } catch {}
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

          const selfieUrl = (() => {
            try {
              return (n?.media?.selfie || n?.selfieUrl) as string | undefined;
            } catch { return undefined; }
          })();
          setSignedSelfie(selfieUrl ? await getSignedRequestMediaUrl(selfieUrl) : null);
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
    setActionLoading(true);
    try {
      // Accept: if already paid, move directly to in_progress; otherwise mark accepted
      if (request.status === 'paid') {
        await updateRequestStatus(request.id, 'in_progress');
      } else {
        await acceptRequest(request.id);
      }
      Alert.alert('Request Accepted', 'You can now submit your review for this request.');
      const refreshed = await getRequestById(request.id);
      setRequest(refreshed);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!request?.id) return;
    Alert.alert(
      'Deny Request',
      'Are you sure you want to deny this request? The payment will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny & Refund',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await denyRequest(request.id);
              Alert.alert('Request Denied', 'The request has been denied and will be refunded.');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to deny request');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!request?.id) return;
    if (overall <= 0) {
      Alert.alert('Missing rating', 'Please provide an overall rating.');
      return;
    }
    setSubmitting(true);
    try {
      let uploadedVideoUrl: string | undefined;
      let uploadedImageUrl: string | undefined;
      if (videoUri) {
        const res = await uploadRequestMedia(videoUri, { category: 'other' });
        uploadedVideoUrl = res.publicUrl;
      }
      if (imageUri) {
        const res = await uploadRequestMedia(imageUri, { category: 'other' });
        uploadedImageUrl = res.publicUrl;
      }
      const subMap = Object.fromEntries(subs.map(s => [s.key, s.value]));
      const updated = await submitRequestReview({
        requestId: request.id,
        review: {
          ratings: { overall, attractiveness: undefined, wardrobe: undefined, room: undefined, ...subMap },
          feedback: { strengths: selectedTags, improvements: [], generalFeedback: notes },
        },
        videoUrl: uploadedVideoUrl || null,
        imageUrl: uploadedImageUrl || null,
      });
      setRequest(updated);
      Alert.alert('Success', 'Review submitted successfully.');
      // If consented, prompt share sheet
      if ((updated as any)?.consent_social && (uploadedVideoUrl || uploadedImageUrl)) {
        try {
          const uri = uploadedVideoUrl || uploadedImageUrl!;
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          }
        } catch {}
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.brand.accentMagenta} />
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <RNView style={styles.avatarWrap}>
            <Avatar uri={avatarUri} name={reviewee?.displayName || 'User'} size={84} />
          </RNView>
          <Text style={styles.name}>{reviewee?.displayName || 'User'}</Text>
          <Text style={styles.requestStatus}>Status: {request.status}</Text>
          <Text style={styles.requestDate}>
            Requested on {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {parsedNotes?.message && (
          <View style={styles.section}>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.value}>{parsedNotes.message}</Text>
          </View>
        )}

        {signedSelfie && (
          <View style={styles.section}>
            <Text style={styles.label}>Selfie</Text>
            <TouchableOpacity onPress={() => { setGalleryUris([signedSelfie]); setGalleryIndex(0); setGalleryOpen(true); }}>
              <Image source={{ uri: signedSelfie }} style={styles.selfie} contentFit="cover" />
            </TouchableOpacity>
          </View>
        )}

        {signedOutfits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Outfits</Text>
            <PhotoCarousel uris={signedOutfits} onPressItem={(i) => { setGalleryUris(signedOutfits); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        )}

        {signedRoom.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Room Tour</Text>
            <PhotoCarousel uris={signedRoom} onPressItem={(i) => { setGalleryUris(signedRoom); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        )}

        {signedSocials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Socials</Text>
            <PhotoCarousel uris={signedSocials} onPressItem={(i) => { setGalleryUris(signedSocials); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        )}

        {signedPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Photos</Text>
            <PhotoCarousel uris={signedPhotos} onPressItem={(i) => { setGalleryUris(signedPhotos); setGalleryIndex(i); setGalleryOpen(true); }} />
          </View>
        )}

        {(request.status === 'pending' || request.status === 'paid') && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>
                {actionLoading ? 'Processing...' : 'Accept Request'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton]}
              onPress={handleDeny}
              disabled={actionLoading}
            >
              <Text style={[styles.actionButtonText, styles.denyButtonText]}>
                {actionLoading ? 'Processing...' : 'Deny Request'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {request.status === 'in_progress' && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => {
                router.push(`/(tabs)/requests/${request.id}` as any);
              }}
            >
              <Text style={styles.actionButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <Text style={styles.label}>Compose Review</Text>
            <RatingBar
              value={overall}
              onChange={setOverall}
              subRatings={subs}
              onChangeSub={(key, v) => setSubs(prev => prev.map(s => s.key === key ? { ...s, value: v } : s))}
              tags={tags}
              selectedTags={selectedTags}
              onToggleTag={(t) => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
            />
            <RNView style={{ height: 12 }} />
            <Text style={styles.label}>Optional video review</Text>
            <MediaRecorder photos={request.photos || []} onRecorded={setVideoUri} />
            <RNView style={{ height: 12 }} />
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              <Text style={styles.actionButtonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <ImageGalleryModal visible={galleryOpen} uris={galleryUris} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: Colors.brand.cardBackground, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  avatarWrap: { width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: Colors.brand.avatarPlaceholder, marginBottom: 10 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.brand.textPrimary },
  requestStatus: { fontSize: 14, color: Colors.brand.accentMagenta, marginTop: 4, fontWeight: '600' },
  requestDate: { fontSize: 14, color: Colors.brand.textSecondary, marginTop: 4 },
  section: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  label: { fontSize: 16, color: Colors.brand.textPrimary, marginBottom: 8, fontWeight: '600' },
  value: { fontSize: 14, color: Colors.brand.textSecondary, lineHeight: 20 },
  selfie: { width: '100%', aspectRatio: 1.5, borderRadius: 12, marginTop: 8 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  actionsSection: { margin: 16, gap: 12 },
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: Colors.brand.status.completed },
  denyButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.brand.status.rejected },
  actionButtonText: { fontSize: 16, fontWeight: '700', color: Colors.brand.textOnGradient },
  denyButtonText: { color: Colors.brand.status.rejected },
  statusMessage: { fontSize: 16, fontWeight: '600', color: Colors.brand.textSecondary, textAlign: 'center', padding: 16 },
  emptyText: { color: Colors.brand.textSecondary },
});
