import React, { useEffect, useState } from 'react';
import { StyleSheet, View as RNView, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Dimensions, Platform } from 'react-native';
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
  const [recordingModeOpen, setRecordingModeOpen] = useState(false);
  const [galleryUris, setGalleryUris] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Section ratings
  const [outfitsRating, setOutfitsRating] = useState(0);
  const [roomTourRating, setRoomTourRating] = useState(0);
  const [socialsRating, setSocialsRating] = useState(0);

  // Section notes
  const [outfitsNotes, setOutfitsNotes] = useState('');
  const [roomNotes, setRoomNotes] = useState('');
  const [socialsNotes, setSocialsNotes] = useState('');

  // Submission can proceed only when all three sections are rated
  const canSubmit = outfitsRating > 0 && roomTourRating > 0 && socialsRating > 0;

  // Compute overall automatically from section ratings
  useEffect(() => {
    if (!canSubmit) {
      setOverall(0);
      return;
    }
    const sum = outfitsRating + roomTourRating + socialsRating;
    const avg = sum / 3;
    setOverall(Math.round(avg));
  }, [outfitsRating, roomTourRating, socialsRating]);

  // Per-photo notes
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteUri, setNoteUri] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

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
    if (!canSubmit) {
      Alert.alert('Missing ratings', 'Please rate Outfits, Room, and Socials.');
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
      const updated = await submitRequestReview({
        requestId: request.id,
        review: {
          ratings: { overall, wardrobe: outfitsRating || undefined, room: roomTourRating || undefined, socials: socialsRating || undefined },
          feedback: { strengths: selectedTags, improvements: [], generalFeedback: notes, sectionNotes: { outfits: outfitsNotes, room: roomNotes, socials: socialsNotes }, photoNotes } as any,
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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <RNView style={styles.avatarWrap}>
            <Avatar uri={avatarUri} name={reviewee?.displayName || 'User'} size={84} />
          </RNView>
          <Text style={styles.name}>{reviewee?.displayName || 'User'}</Text>
          <RNView style={{ marginTop: 6 }}>
            <StatusBadge status={request.status as any} />
          </RNView>
          <RNView style={{ marginTop: 6, alignItems: 'center' }}>
            {request.status === 'in_progress' ? (
              <Text style={{ color: Colors.brand.textSecondary, fontSize: 12, textAlign: 'center' }}>
                You have 30 days to complete this review. After 30 days, the requester is refunded.
              </Text>
            ) : null}
          </RNView>
          <Text style={styles.requestDate}>
            Requested on {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {parsedNotes?.message && (
          <View style={styles.section}>
            <Text style={styles.label}>About Me</Text>
            <Text style={styles.value}>{parsedNotes.message}</Text>
          </View>
        )}

        {signedSelfie && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Selfie</Text>
            <TouchableOpacity onPress={() => { setGalleryUris([signedSelfie]); setGalleryIndex(0); setGalleryOpen(true); }}>
              <Image source={{ uri: signedSelfie }} style={styles.selfie} contentFit="cover" cachePolicy="none" />
            </TouchableOpacity>
          </View>
        )}

        {signedOutfits.length > 0 && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Outfits</Text>
            <PhotoCarousel 
              uris={signedOutfits}
              onPressItem={(i) => { setGalleryUris(signedOutfits); setGalleryIndex(i); setGalleryOpen(true); }}
              onLongPressItem={request.status === 'in_progress' ? (i) => { setNoteUri(signedOutfits[i]); setNoteText(photoNotes[signedOutfits[i]] || ''); setNoteModalOpen(true); } : undefined}
            />
            {request.status === 'in_progress' && (
              <>
                <RNView style={{ height: 8 }} />
                <RatingBar value={outfitsRating} onChange={setOutfitsRating} label="Rate Outfits" />
                <View style={styles.cardBlock}>
                  <Text style={styles.sectionHint}>What to consider:</Text>
                  <View style={styles.guideList}>
                    <Text style={styles.guideItem}>• Fit, coordination, and color harmony</Text>
                    <Text style={styles.guideItem}>• Personal style and occasion-appropriateness</Text>
                    <Text style={styles.guideItem}>• One thing they do well and one actionable improvement</Text>
                  </View>
                </View>
                <TextInput
                  value={outfitsNotes}
                  onChangeText={setOutfitsNotes}
                  placeholder="Notes for outfits (strengths, suggestions, next steps)"
                  placeholderTextColor={Colors.brand.textSecondary}
                  style={[styles.sectionNoteInput, styles.cardInput, { fontFamily: 'Poppins_400Regular' }]}
                  multiline
                />
              </>
            )}
          </View>
        )}

        {signedRoom.length > 0 && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Room Tour</Text>
            <PhotoCarousel 
              uris={signedRoom}
              onPressItem={(i) => { setGalleryUris(signedRoom); setGalleryIndex(i); setGalleryOpen(true); }}
              onLongPressItem={request.status === 'in_progress' ? (i) => { setNoteUri(signedRoom[i]); setNoteText(photoNotes[signedRoom[i]] || ''); setNoteModalOpen(true); } : undefined}
            />
            {request.status === 'in_progress' && (
              <>
                <RNView style={{ height: 8 }} />
                <RatingBar value={roomTourRating} onChange={setRoomTourRating} label="Rate Room Tour" />
                <View style={styles.cardBlock}>
                  <Text style={styles.sectionHint}>What to consider:</Text>
                  <View style={styles.guideList}>
                    <Text style={styles.guideItem}>• Lighting, declutter, and focal points</Text>
                    <Text style={styles.guideItem}>• Cohesive theme and composition of decor</Text>
                    <Text style={styles.guideItem}>• One quick win to level up presentation</Text>
                  </View>
                </View>
                <TextInput
                  value={roomNotes}
                  onChangeText={setRoomNotes}
                  placeholder="Notes for room tour (ambience, focal points, quick wins)"
                  placeholderTextColor={Colors.brand.textSecondary}
                  style={[styles.sectionNoteInput, styles.cardInput, { fontFamily: 'Poppins_400Regular' }]}
                  multiline
                />
              </>
            )}
          </View>
        )}

        {signedSocials.length > 0 && (
          <View style={[styles.section, styles.mediaSection]}>
            <Text style={styles.label}>Socials</Text>
            <PhotoCarousel 
              uris={signedSocials}
              onPressItem={(i) => { setGalleryUris(signedSocials); setGalleryIndex(i); setGalleryOpen(true); }}
              onLongPressItem={request.status === 'in_progress' ? (i) => { setNoteUri(signedSocials[i]); setNoteText(photoNotes[signedSocials[i]] || ''); setNoteModalOpen(true); } : undefined}
            />
            {request.status === 'in_progress' && (
              <>
                <RNView style={{ height: 8 }} />
                <RatingBar value={socialsRating} onChange={setSocialsRating} label="Rate Socials" />
                <View style={styles.cardBlock}>
                  <Text style={styles.sectionHint}>What to consider:</Text>
                  <View style={styles.guideList}>
                    <Text style={styles.guideItem}>• First impression and clarity of profile</Text>
                    <Text style={styles.guideItem}>• Photo curation and bio effectiveness</Text>
                    <Text style={styles.guideItem}>• One specific change to improve engagement</Text>
                  </View>
                </View>
                <TextInput
                  value={socialsNotes}
                  onChangeText={setSocialsNotes}
                  placeholder="Notes for socials (first impression, curation, actionable change)"
                  placeholderTextColor={Colors.brand.textSecondary}
                  style={[styles.sectionNoteInput, styles.cardInput, { fontFamily: 'Poppins_400Regular' }]}
                  multiline
                />
              </>
            )}
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
            <Text style={styles.label}>Review Summary</Text>

            {/* Progress header */}
            <View style={styles.progressRow}>
              <View style={[styles.progressChip, outfitsRating > 0 && styles.progressChipDone]}>
                <Text style={styles.progressChipText}>Outfits {outfitsRating > 0 ? `(${outfitsRating}/5)` : ''}</Text>
              </View>
              <View style={[styles.progressChip, roomTourRating > 0 && styles.progressChipDone]}>
                <Text style={styles.progressChipText}>Room {roomTourRating > 0 ? `(${roomTourRating}/5)` : ''}</Text>
              </View>
              <View style={[styles.progressChip, socialsRating > 0 && styles.progressChipDone]}>
                <Text style={styles.progressChipText}>Socials {socialsRating > 0 ? `(${socialsRating}/5)` : ''}</Text>
              </View>
            </View>

            {/* Overall (auto) */}
            <View style={styles.overallCapsule}>
              <Text style={styles.overallTitle}>Overall (auto)</Text>
              <RNView pointerEvents="none">
                <RatingBar value={overall} onChange={() => {}} label="" />
              </RNView>
              {!canSubmit && (
                <Text style={styles.sectionHint}>Rate Outfits, Room, and Socials to compute Overall.</Text>
              )}
            </View>

            {/* Optional general tags and notes retained */}
            <RNView style={{ height: 12 }} />
            <Text style={styles.label}>Optional video review</Text>
            {Platform.OS !== 'web' && (
              <RNView style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton, { flex: 1 }]} onPress={() => setRecordingModeOpen(true)}>
                  <Text style={styles.actionButtonText}>Open Immersive Recorder</Text>
                </TouchableOpacity>
              </RNView>
            )}
            <RNView style={{ height: 10 }} />
            <MediaRecorder
              photos={request.photos || []}
              value={videoUri}
              onRecorded={(uri) => {
                setVideoUri(uri);
                setRecordingModeOpen(false);
                Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
              }}
            />
            <RNView style={{ height: 12 }} />

            <TouchableOpacity
              style={[styles.actionButton, canSubmit ? styles.primaryButton : styles.disabledButton, { marginBottom: 24 }]}
              onPress={handleSubmitReview}
              disabled={!canSubmit || submitting}
            >
              <Text style={styles.actionButtonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {/* Immersive recording modal */}
      <Modal visible={recordingModeOpen} animationType="slide" onRequestClose={() => setRecordingModeOpen(false)}>
        <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
          {/* Background image under everything */}
          <Image
            source={require('../../../../auro_video_bg.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          {/* Pager of cards: title cards then individual photos */}
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingTop: insets.top + 180 }}>
            {/* Card 1: Person summary (center vertically) */}
            <RNView style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
              <RNView style={[styles.overlayCard, { alignSelf: 'center', maxWidth: 640 }] }>
                <Text style={styles.overlayTitle}>{reviewee?.displayName || 'User'}</Text>
                {parsedNotes?.message ? (<Text style={styles.overlayText}>{parsedNotes?.message}</Text>) : null}
                {signedSelfie ? (<Image source={{ uri: signedSelfie }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12, marginTop: 12 }} contentFit="cover" />) : null}
                
              </RNView>
            </RNView>

            {/* Outfits: title card then each photo */}
            {signedOutfits.length > 0 && (
              <RNView style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Text style={styles.overlayTitle}>Outfits</Text>
                  <Text style={styles.overlayText}>Swipe to review each outfit photo.</Text>
                </RNView>
              </RNView>
            )}
            {signedOutfits.map((uri, i) => (
              <RNView key={`outfit-${i}`} style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayPhotoCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3/4, borderRadius: 12 }} contentFit="cover" />
                </RNView>
              </RNView>
            ))}

            {/* Room: title card then each photo */}
            {signedRoom.length > 0 && (
              <RNView style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Text style={styles.overlayTitle}>Room Tour</Text>
                  <Text style={styles.overlayText}>Swipe to review each room photo.</Text>
                </RNView>
              </RNView>
            )}
            {signedRoom.map((uri, i) => (
              <RNView key={`room-${i}`} style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayPhotoCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3/4, borderRadius: 12 }} contentFit="cover" />
                </RNView>
              </RNView>
            ))}

            {/* Socials: title card then each screenshot */}
            {signedSocials.length > 0 && (
              <RNView style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Text style={styles.overlayTitle}>Socials</Text>
                  <Text style={styles.overlayText}>Swipe to review each profile screenshot.</Text>
                </RNView>
              </RNView>
            )}
            {signedSocials.map((uri, i) => (
              <RNView key={`social-${i}`} style={{ width: Dimensions.get('window').width, padding: 16, justifyContent: 'center' }}>
                <RNView style={[styles.overlayPhotoCard, { alignSelf: 'center', maxWidth: 640 }] }>
                  <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3/4, borderRadius: 12 }} contentFit="cover" />
                </RNView>
              </RNView>
            ))}
          </ScrollView>

          {/* Circular selfie recorder centered at top-middle; ensure above content and clickable */}
          <RNView style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center', zIndex: 10, elevation: 10 }}>
            <MediaRecorder
              onRecorded={(uri) => {
                setVideoUri(uri);
                setRecordingModeOpen(false);
                Alert.alert('Video Attached', 'Once you submit your review, you can easily post straight to TikTok and Instagram Reels.');
              }}
              variant="overlay"
              circleSize={160}
            />
          </RNView>

          {/* Close */}
          <RNView style={{ position: 'absolute', top: insets.top + 16, right: 16, flexDirection: 'row', gap: 8, zIndex: 11, elevation: 11 }}>
            <TouchableOpacity onPress={() => setRecordingModeOpen(false)} style={[styles.actionButton, styles.denyButton, { paddingHorizontal: 14, paddingVertical: 8 }]}>
              <Text style={[styles.actionButtonText, styles.denyButtonText]}>Close</Text>
            </TouchableOpacity>
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
  mediaSection: { alignItems: 'stretch' },
  label: { fontSize: 18, color: Colors.brand.textPrimary, marginBottom: 8, fontWeight: '900', letterSpacing: 0.4 },
  value: { fontSize: 15, color: Colors.brand.textPrimary, lineHeight: 22 },
  selfie: { width: '100%', aspectRatio: 1.2, borderRadius: 12, marginTop: 8, maxHeight: 280 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  actionsSection: { margin: 16, gap: 12 },
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: Colors.brand.status.completed },
  primaryButton: { backgroundColor: Colors.brand.accentOrange },
  denyButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.brand.status.rejected },
  actionButtonText: { fontSize: 16, fontWeight: '700', color: Colors.brand.textOnGradient },
  denyButtonText: { color: Colors.brand.status.rejected },
  statusMessage: { fontSize: 16, fontWeight: '600', color: Colors.brand.textSecondary, textAlign: 'center', padding: 16 },
  emptyText: { color: Colors.brand.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  noteInput: { minHeight: 100, borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, padding: 12, color: Colors.brand.textPrimary, marginBottom: 12 },
  sectionHint: { fontSize: 13, color: Colors.brand.textSecondary, marginTop: 2, fontWeight: '900' },
  guideList: { marginTop: 6, gap: 6, padding: 8, borderRadius: 8, backgroundColor: Colors.brand.cardBackground },
  guideItem: { fontSize: 13, color: Colors.brand.textPrimary, fontWeight: '600' },
  sectionNoteInput: { minHeight: 72, borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, padding: 10, color: Colors.brand.textPrimary, marginTop: 8, backgroundColor: Colors.brand.cardBackground },
  cardBlock: { marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.brand.border, backgroundColor: Colors.brand.cardBackground },
  cardInput: { backgroundColor: Colors.brand.cardBackgroundLight },

  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 8, justifyContent: 'center', backgroundColor: 'transparent' },
  progressChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Colors.brand.cardBackground, borderWidth: 1, borderColor: Colors.brand.accentOrange },
  progressChipDone: { backgroundColor: Colors.brand.accentOrange + '11', borderColor: Colors.brand.accentOrange },
  progressChipText: { fontSize: 12, color: Colors.brand.textPrimary, fontWeight: '600' },

  overallCapsule: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, padding: 12, backgroundColor: Colors.brand.cardBackground, marginBottom: 8 },
  overallTitle: { fontSize: 14, fontWeight: '700', color: Colors.brand.textPrimary, marginBottom: 4 },

  disabledButton: { backgroundColor: Colors.brand.border },
  overlayCard: { backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.brand.border, opacity: 0.96 },
  overlayPhotoCard: { backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.brand.border, opacity: 0.96 },
  overlayTitle: { fontSize: 20, fontWeight: '900', color: Colors.brand.textPrimary, marginBottom: 8 },
  overlayText: { fontSize: 15, color: Colors.brand.textPrimary, lineHeight: 21 },
});
