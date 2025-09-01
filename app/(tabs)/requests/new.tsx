import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput, View as RNView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { Text, View } from '@/components/Themed';
import { getReviewers, createRequest, getUserProfile } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary, ReviewerPackage } from '@/types';
import { uploadRequestMedia, type RequestMediaCategory } from '@/lib/uploads';

export default function NewRequestScreen() {
  const { influencerId } = useLocalSearchParams<{ influencerId?: string }>();
  const [reviewers, setReviewers] = useState<DbReviewerSummary[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [packageSelection, setPackageSelection] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [media, setMedia] = useState<{ selfie?: string; outfit?: string; roomTour?: string; profilesRecording?: string }>({});
  const [videoThumbs, setVideoThumbs] = useState<{ roomTour?: string; profilesRecording?: string }>({});
  const [shareConsent, setShareConsent] = useState<boolean | null>(null);
  const consentText = `By selecting \"Agree\", you grant Auro and the assigned reviewer a non-exclusive, worldwide, royalty-free license to use, reproduce, publish, display, distribute, and create derivative works from your submitted media and the resulting review content (including images, videos, screen recordings, text, and ratings) for marketing and promotional purposes on social media platforms and other online channels. You represent that you own or have all necessary rights to the submitted content and that it does not infringe any third-party rights. You waive any right of prior approval and, to the extent permitted by law, waive and release claims arising out of such uses, including rights of publicity and privacy. No compensation will be provided for these uses. You may withdraw consent for future uses at any time by contacting Auro support; withdrawal will not affect posts already published. Selecting \"Do Not Agree\" means Auro and the reviewer will not share your content on social platforms. This consent does not affect your ability to receive a review.`;

  useEffect(() => {
    const run = async () => {
      const list = await getReviewers();
      setReviewers(list);
      // Prefetch displayable avatar URIs (signed if needed)
      try {
        const pairs = await Promise.all(
          list.map(async (r) => {
            let uri = r.avatarUrl || '';
            if (uri && !/^https?:\/\//i.test(uri)) {
              try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
            }
            return [r.id, uri] as const;
          })
        );
        setAvatarMap(Object.fromEntries(pairs));
      } catch {}
      if (influencerId) setSelectedReviewer(String(influencerId));
    };
    run();
  }, [influencerId]);

  const selectedReviewerObj = useMemo(() => reviewers.find(r => r.id === selectedReviewer) || null, [reviewers, selectedReviewer]);
  const reviewerPackages: ReviewerPackage[] = useMemo(() => (selectedReviewerObj?.packages || []).slice(0, 5), [selectedReviewerObj?.packages]);

  const canSubmit = () => {
    if (!selectedReviewer) return false;
    if (!packageSelection) return false;
    if (!message.trim()) return false;
    if (shareConsent === null) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      Alert.alert('Incomplete', 'Please select a reviewer, choose a session package, and add a message.');
      return;
    }
    try {
      setSubmitting(true);
      const profile = await getUserProfile();
      if (!profile?.id || !selectedReviewer || !packageSelection) throw new Error('Not signed in');
      const pkg = reviewerPackages.find(p => String(p.id) === String(packageSelection));
      const photos: string[] = [];
      if (media.selfie) photos.push(media.selfie);
      if (media.outfit) photos.push(media.outfit);
      // Store videos in notes, keep photos array for images
      const composedNotes = JSON.stringify({
        package: pkg || { id: packageSelection },
        message,
        media,
        consent: { shareOnSocial: !!shareConsent, legalTextVersion: 'v1', agreedAt: new Date().toISOString() },
      });
      await createRequest({ userId: profile.id, influencerId: selectedReviewer, photos, notes: composedNotes });
      Alert.alert('Request sent', 'Your request was sent for reviewer approval. You’ll pay after they accept.', [{ text: 'OK', onPress: () => router.replace('/(tabs)/requests') }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const pickMedia = async (type: 'image' | 'video', category: RequestMediaCategory) => {
    try {
      if (type === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'Please choose an image under 10MB.');
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'selfie') next.selfie = uploaded.publicUrl || uri;
          else if (category === 'outfit') next.outfit = uploaded.publicUrl || uri;
          return next;
        });
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: ImagePicker.UIImagePickerControllerQualityType.High });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 150 * 1024 * 1024) {
          Alert.alert('File too large', 'Please choose a video under 150MB.');
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'roomTour') next.roomTour = uploaded.publicUrl || uri;
          else if (category === 'profilesRecording') next.profilesRecording = uploaded.publicUrl || uri;
          return next;
        });
        try {
          const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          setVideoThumbs(prev => {
            const next = { ...prev } as any;
            if (category === 'roomTour') next.roomTour = thumb;
            else if (category === 'profilesRecording') next.profilesRecording = thumb;
            return next;
          });
        } catch {}
      }
      Alert.alert('Uploaded', 'Your media was uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    }
  };

  const captureMedia = async (type: 'image' | 'video', category: RequestMediaCategory) => {
    try {
      if (type === 'image') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'Please capture an image under 10MB.');
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'selfie') next.selfie = uploaded.publicUrl || uri;
          else if (category === 'outfit') next.outfit = uploaded.publicUrl || uri;
          return next;
        });
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 120, quality: ImagePicker.UIImagePickerControllerQualityType.High });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 150 * 1024 * 1024) {
          Alert.alert('File too large', 'Please capture a video under 150MB.');
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'roomTour') next.roomTour = uploaded.publicUrl || uri;
          else if (category === 'profilesRecording') next.profilesRecording = uploaded.publicUrl || uri;
          return next;
        });
        try {
          const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          setVideoThumbs(prev => {
            const next = { ...prev } as any;
            if (category === 'roomTour') next.roomTour = thumb;
            else if (category === 'profilesRecording') next.profilesRecording = thumb;
            return next;
          });
        } catch {}
      }
      Alert.alert('Uploaded', 'Your media was uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Request a Review</Text>
        <Text style={styles.subtitle}>Get feedback from top influencer women</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select a Reviewer</Text>
        {reviewers.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.influencerOption, selectedReviewer === r.id && styles.selectedInfluencer]}
            onPress={() => setSelectedReviewer(r.id)}
          >
            <Image source={{ uri: avatarMap[r.id] || r.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={styles.influencerImage} />
            <View style={styles.influencerInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.influencerName}>{r.displayName || r.username || 'Unknown reviewer'}</Text>
              </View>
              {!!r.skills?.length && <Text style={styles.specialties}>{r.skills.join(', ')}</Text>}
              {r.hourlyRate != null && <Text style={styles.price}>${r.hourlyRate}/hr</Text>}
            </View>
            <View style={styles.radioButton}>{selectedReviewer === r.id && <View style={styles.radioButtonSelected} />}</View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedReviewer ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Session Package</Text>
          {reviewerPackages.length === 0 ? (
            <Text style={styles.helperText}>This reviewer hasn’t added session packages yet.</Text>
          ) : (
            reviewerPackages.map((opt) => (
              <TouchableOpacity
                key={String(opt.id)}
                style={[styles.influencerOption, packageSelection === String(opt.id) && styles.selectedInfluencer]}
                onPress={() => setPackageSelection(String(opt.id))}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.influencerName}>{opt.label || 'Session package'}</Text>
                  <Text style={styles.specialties}>
                    {opt.sessions ? `${opt.sessions} session${opt.sessions > 1 ? 's' : ''}` : ''}
                    {opt.sessions && opt.minutes ? ' • ' : ''}
                    {opt.minutes ? `${opt.minutes} min/session` : ''}
                  </Text>
                </View>
                {!!opt.price && <Text style={styles.price}>${opt.price}</Text>}
                <View style={[styles.radioButton, { marginLeft: 12 }]}>{packageSelection === String(opt.id) && <View style={styles.radioButtonSelected} />}</View>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tell the reviewer</Text>
        <Text style={styles.helperText}>Describe why you want a review, what to focus on, and what you hope to get out of the session. The reviewer must accept your request before you can schedule.</Text>
        <TextInput style={styles.notesInput} value={message} onChangeText={setMessage} placeholder="Write your message here" multiline numberOfLines={5} textAlignVertical="top" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consent to Social Sharing (Required)</Text>
        <Text style={styles.helperText}>{consentText}</Text>
        <RNView style={styles.consentRow}>
          <TouchableOpacity style={[styles.consentOption, shareConsent === true && styles.selectedInfluencer]} onPress={() => setShareConsent(true)}>
            <Text style={styles.influencerName}>Agree</Text>
            <View style={[styles.radioButton, { marginLeft: 12 }]}>{shareConsent === true && <View style={styles.radioButtonSelected} />}</View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.consentOption, shareConsent === false && styles.selectedInfluencer]} onPress={() => setShareConsent(false)}>
            <Text style={styles.influencerName}>Do Not Agree</Text>
            <View style={[styles.radioButton, { marginLeft: 12 }]}>{shareConsent === false && <View style={styles.radioButtonSelected} />}</View>
          </TouchableOpacity>
        </RNView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload your media</Text>
        <Text style={styles.helperText}>Selfie and outfit photo recommended. Add a room tour video and a screen recording of your Tinder/Hinge/Bumble profiles for deeper feedback.</Text>
        <RNView style={{ gap: 10 }}>
          <RNView style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image', 'selfie')}>
              <Text style={styles.mediaButtonText}>{media.selfie ? 'Replace Selfie' : 'Upload Selfie'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.secondaryBtn]} onPress={() => captureMedia('image', 'selfie')}>
              <Text style={styles.mediaButtonText}>Capture</Text>
            </TouchableOpacity>
            {media.selfie ? (
              <RNView style={styles.thumbRow}>
                <Image source={{ uri: media.selfie }} style={styles.mediaThumb} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => setMedia(prev => ({ ...prev, selfie: undefined }))}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              </RNView>
            ) : null}
          </RNView>

          <RNView style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image', 'outfit')}>
              <Text style={styles.mediaButtonText}>{media.outfit ? 'Replace Outfit' : 'Upload Outfit Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.secondaryBtn]} onPress={() => captureMedia('image', 'outfit')}>
              <Text style={styles.mediaButtonText}>Capture</Text>
            </TouchableOpacity>
            {media.outfit ? (
              <RNView style={styles.thumbRow}>
                <Image source={{ uri: media.outfit }} style={styles.mediaThumb} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => setMedia(prev => ({ ...prev, outfit: undefined }))}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              </RNView>
            ) : null}
          </RNView>

          <RNView style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video', 'roomTour')}>
              <Text style={styles.mediaButtonText}>{media.roomTour ? 'Replace Room Tour' : 'Upload Room Tour Video'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.secondaryBtn]} onPress={() => captureMedia('video', 'roomTour')}>
              <Text style={styles.mediaButtonText}>Capture</Text>
            </TouchableOpacity>
            {videoThumbs.roomTour ? (
              <RNView style={styles.thumbRow}>
                <Image source={{ uri: videoThumbs.roomTour }} style={styles.mediaThumb} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setMedia(prev => ({ ...prev, roomTour: undefined })); setVideoThumbs(prev => ({ ...prev, roomTour: undefined })); }}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              </RNView>
            ) : null}
          </RNView>

          <RNView style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video', 'profilesRecording')}>
              <Text style={styles.mediaButtonText}>{media.profilesRecording ? 'Replace Profiles Recording' : 'Upload Profiles Screen Recording'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.secondaryBtn]} onPress={() => captureMedia('video', 'profilesRecording')}>
              <Text style={styles.mediaButtonText}>Capture</Text>
            </TouchableOpacity>
            {videoThumbs.profilesRecording ? (
              <RNView style={styles.thumbRow}>
                <Image source={{ uri: videoThumbs.profilesRecording }} style={styles.mediaThumb} />
                <TouchableOpacity style={styles.clearBtn} onPress={() => { setMedia(prev => ({ ...prev, profilesRecording: undefined })); setVideoThumbs(prev => ({ ...prev, profilesRecording: undefined })); }}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              </RNView>
            ) : null}
          </RNView>
        </RNView>
      </View>

      <View style={styles.submitSection}>
        <TouchableOpacity style={[styles.submitButton, !canSubmit() && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit() || submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Review Request'}</Text>
        </TouchableOpacity>
        <Text style={styles.submitNote}>You'll be charged after the reviewer accepts your request</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0B2E' },
  contentContainer: { paddingBottom: 72 },
  header: { padding: 24, backgroundColor: '#24123B', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: 'rgba(0,0,0,0.35)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#FFFFFF', fontFamily: 'Poppins_700Bold' },
  subtitle: { fontSize: 16, color: '#C7BFD9', fontFamily: 'Inter_600SemiBold' },
  section: { margin: 16, backgroundColor: '#24123B', borderRadius: 16, padding: 20, shadowColor: 'rgba(0,0,0,0.35)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Poppins_700Bold', marginBottom: 15 },
  influencerOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10 },
  selectedInfluencer: { borderColor: '#FF2D55', backgroundColor: 'rgba(255,45,85,0.08)' },
  influencerImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  influencerInfo: { flex: 1 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  influencerName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  verifiedBadge: { marginLeft: 5, color: '#3DDC84', fontSize: 14 },
  specialties: { fontSize: 12, color: '#C7BFD9', marginBottom: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: '#FF2D55' },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C7BFD9', justifyContent: 'center', alignItems: 'center' },
  radioButtonSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF2D55' },
  questionLabel: { fontSize: 12, color: '#C7BFD9', marginBottom: 6, marginTop: 6 },
  notesInput: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 15, fontSize: 16, minHeight: 80, color: '#FFFFFF', backgroundColor: '#24123B', marginBottom: 10 },
  submitSection: { margin: 15, marginBottom: 30 },
  submitButton: { backgroundColor: '#FF2D55', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  submitButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  submitNote: { fontSize: 12, color: '#C7BFD9', textAlign: 'center' },
  helperText: { fontSize: 12, color: '#C7BFD9', marginBottom: 8 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaButton: { backgroundColor: '#FF2D55', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  mediaButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  mediaThumb: { width: 54, height: 54, borderRadius: 10, marginLeft: 12 },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  thumbRow: { flexDirection: 'row', alignItems: 'center' },
  clearBtn: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)' },
  clearBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  consentRow: { flexDirection: 'row', gap: 10 },
  consentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)', marginTop: 8 },
});


