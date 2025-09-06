import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, View as RNView, KeyboardAvoidingView, Platform, ActivityIndicator, BackHandler, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Image } from 'expo-image';
import { useToast } from '@/components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { getReviewers, createRequest, getUserProfile } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import { uploadRequestMedia, type RequestMediaCategory } from '@/lib/uploads';

type DraftPayload = {
  reviewerId: string | null;
  selfie?: string;
  outfits: string[];
  roomPhotos: string[];
  datingProfile?: string;
  aboutYouText: string;
  consentToSocial: boolean | null;
  step?: number;
};

const ACCEPT = {
  images: ['jpg','jpeg','png','heic','heif'],
  videos: ['mp4','mov','webm'],
};

const LIMITS = {
  imageMaxMB: 10,
  videoMaxMB: 200,
  videoMaxSeconds: 60,
  aboutMin: 20,
  aboutMax: 500,
  outfitCount: 3,
  roomCount: 3,
};

const TOTAL_STEPS = 7 as const;

export default function NewRequestScreen() {
  const { show } = useToast();
  const { influencerId } = useLocalSearchParams<{ influencerId?: string }>();
  const navigation = useNavigation();
  const [reviewers, setReviewers] = useState<DbReviewerSummary[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<null | { id: string; reviewerName: string; counts: { outfits: number; rooms: number }; }>(null);
  
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [media, setMedia] = useState<{ selfie?: string; outfits: string[]; roomTourPhotos: string[]; datingProfile?: string }>({ outfits: [], roomTourPhotos: [] });
  const [videoThumbs, setVideoThumbs] = useState<{ datingProfile?: string }>({});
  const [selfieProgress, setSelfieProgress] = useState<number | null>(null);
  const [outfitsProgress, setOutfitsProgress] = useState<number | null>(null);
  const [roomTourProgress, setRoomTourProgress] = useState<number | null>(null);
  const [datingProfileProgress, setDatingProfileProgress] = useState<number | null>(null);
  const [shareConsent, setShareConsent] = useState<boolean | null>(null);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const consentText = `By selecting \"Agree\", you grant Auro and the assigned reviewer a non-exclusive, worldwide, royalty-free license to use, reproduce, publish, display, distribute, and create derivative works from your submitted media and the resulting review content (including images, videos, screen recordings, text, and ratings) for marketing and promotional purposes on social media platforms and other online channels. You represent that you own or have all necessary rights to the submitted content and that it does not infringe any third-party rights. You waive any right of prior approval and, to the extent permitted by law, waive and release claims arising out of such uses, including rights of publicity and privacy. No compensation will be provided for these uses. You may withdraw consent for future uses at any time by contacting Auro support; withdrawal will not affect posts already published. Selecting \"Do Not Agree\" means Auro and the reviewer will not share your content on social platforms. This consent does not affect your ability to receive a review.`;
  // Some devices report video duration in milliseconds; normalize to seconds
  const durationToSeconds = (raw: number | undefined | null): number => {
    if (!raw) return 0;
    return raw > 1000 ? raw / 1000 : raw;
  };


  const DRAFT_KEY = 'requestDraftV1';

  useEffect(() => {
    const run = async () => {
      const list = await getReviewers();
      setReviewers(list);
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

      // Load draft if exists
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft: DraftPayload = JSON.parse(raw);
          if (draft.reviewerId) setSelectedReviewer(draft.reviewerId);
          setMessage((draft.aboutYouText || '').slice(0, LIMITS.aboutMax));
          setShareConsent(draft.consentToSocial ?? null);
          setMedia({ selfie: draft.selfie, outfits: draft.outfits || [], roomTourPhotos: draft.roomPhotos || [], datingProfile: draft.datingProfile });
          if (draft.step && draft.step >= 1 && draft.step <= TOTAL_STEPS) setCurrentStep(draft.step);
        }
      } catch {}
    };
    run();
  }, [influencerId]);

  const isDirtyRef = useRef(false);
  const saveDraft = useCallback(async (nextStep?: number) => {
    try {
      const payload: DraftPayload = {
        reviewerId: selectedReviewer,
        selfie: media.selfie,
        outfits: media.outfits,
        roomPhotos: media.roomTourPhotos,
        datingProfile: media.datingProfile,
        aboutYouText: message,
        consentToSocial: shareConsent,
        step: nextStep ?? currentStep,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      isDirtyRef.current = false;
    } catch {}
  }, [selectedReviewer, media, message, shareConsent, currentStep]);

  // Mark dirty on changes
  useEffect(() => { isDirtyRef.current = true; }, [selectedReviewer, media, message, shareConsent]);

  // Warn on exit with unsaved changes
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      Alert.alert('Discard changes?', 'You have unsaved changes. Do you want to discard them?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isDirtyRef.current) return false;
      Alert.alert('Discard changes?', 'You have unsaved changes. Do you want to discard them?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
      return true;
    });
    if (Platform.OS === 'web') {
      const handler = (e: any) => { if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', handler);
      return () => { sub && sub(); backHandler.remove(); window.removeEventListener('beforeunload', handler); };
    }
    return () => { sub && sub(); backHandler.remove(); };
  }, [navigation]);

  const selectedReviewerObj = useMemo(() => reviewers.find(r => r.id === selectedReviewer) || null, [reviewers, selectedReviewer]);
  const filteredReviewers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviewers;
    return reviewers.filter(r =>
      (r.displayName || r.username || '').toLowerCase().includes(q) ||
      (r.skills || []).join(',').toLowerCase().includes(q)
    );
  }, [reviewers, search]);

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return !!selectedReviewer;
      case 2: return !!media.selfie;
      case 3: return Array.isArray(media.outfits) && media.outfits.length === LIMITS.outfitCount;
      case 4: return Array.isArray(media.roomTourPhotos) && media.roomTourPhotos.length === LIMITS.roomCount;
      case 5: return !!media.datingProfile;
      case 6: {
        const len = message.trim().length;
        return len >= LIMITS.aboutMin && len <= LIMITS.aboutMax;
      }
      case 7: return shareConsent !== null;
      default: return false;
    }
  };

  const canSubmit = () => [1,2,3,4,5,6,7].every(isStepValid);

  const handleSubmit = async () => {
    if (!canSubmit()) {
      setAttemptedNext(true);
      Alert.alert('Missing info', 'Please complete all required steps.');
      return;
    }
    try {
      setSubmitting(true);
      const profile = await getUserProfile();
      if (!profile?.id || !selectedReviewer) throw new Error('Not signed in');
      const photos: string[] = [];
      if (media.selfie) photos.push(media.selfie);
      if (media.outfits?.length) photos.push(...media.outfits);
      if (media.roomTourPhotos?.length) photos.push(...media.roomTourPhotos);
      // Store videos in notes, keep photos array for images
      const composedNotes = JSON.stringify({
        message,
        media,
        consent: { shareOnSocial: !!shareConsent, legalTextVersion: 'v1', agreedAt: new Date().toISOString() },
      });
      const created = await createRequest({ userId: profile.id, influencerId: selectedReviewer, photos, notes: composedNotes });
      setSubmittedSummary({ id: created?.id || 'ok', reviewerName: selectedReviewerObj?.displayName || selectedReviewerObj?.username || 'Reviewer', counts: { outfits: media.outfits.length, rooms: media.roomTourPhotos.length } });
      await AsyncStorage.removeItem(DRAFT_KEY);
      isDirtyRef.current = false;
      show('Request sent for reviewer approval');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const getExtFromUri = (uri: string): string | null => {
    const m = uri.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
    return m ? m[1].toLowerCase() : null;
  };

  const pickMedia = async (type: 'image' | 'video', category: RequestMediaCategory, replaceIndex?: number) => {
    try {
      if (type === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        const ext = getExtFromUri(asset.uri);
        if (ext && !ACCEPT.images.includes(ext)) {
          Alert.alert('Unsupported type', `Allowed: ${ACCEPT.images.join(', ').toUpperCase()}`);
          return;
        }
        if ((asset.fileSize ?? 0) > LIMITS.imageMaxMB * 1024 * 1024) {
          Alert.alert('File too large', `Please choose an image under ${LIMITS.imageMaxMB}MB.`);
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, {
          category,
          onProgress: (p) => {
            if (category === 'selfie') setSelfieProgress(p);
            if (category === 'outfit') setOutfitsProgress(p);
            if (category === 'roomPhoto') setRoomTourProgress(p);
          },
        });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'selfie') {
            next.selfie = uploaded.publicUrl || uri;
          } else if (category === 'outfit') {
            const current: string[] = Array.isArray(prev.outfits) ? prev.outfits : [];
            if (typeof replaceIndex === 'number') {
              const repl = [...current];
              repl[replaceIndex] = uploaded.publicUrl || uri;
              next.outfits = repl;
            } else {
              if (current.length >= LIMITS.outfitCount) {
                Alert.alert('Limit reached', `You can upload exactly ${LIMITS.outfitCount} outfit photos.`);
                return prev;
              }
              next.outfits = [...current, uploaded.publicUrl || uri];
            }
          } else if (category === 'roomPhoto') {
            const current: string[] = Array.isArray(prev.roomTourPhotos) ? prev.roomTourPhotos : [];
            if (typeof replaceIndex === 'number') {
              const repl = [...current];
              repl[replaceIndex] = uploaded.publicUrl || uri;
              next.roomTourPhotos = repl;
            } else {
              if (current.length >= LIMITS.roomCount) {
                Alert.alert('Limit reached', `You can upload exactly ${LIMITS.roomCount} room photos.`);
                return prev;
              }
              next.roomTourPhotos = [...current, uploaded.publicUrl || uri];
            }
          }
          return next;
        });
        if (category === 'selfie') setSelfieProgress(null);
        if (category === 'outfit') setOutfitsProgress(null);
        if (category === 'roomPhoto') setRoomTourProgress(null);
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: ImagePicker.UIImagePickerControllerQualityType.High });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        const ext = getExtFromUri(asset.uri);
        if (ext && !ACCEPT.videos.includes(ext)) {
          Alert.alert('Unsupported type', `Allowed: ${ACCEPT.videos.join(', ').toUpperCase()}`);
          return;
        }
        const secs = durationToSeconds(asset.duration);
        if (secs > LIMITS.videoMaxSeconds + 0.5) {
          Alert.alert('Too long', `Please choose a video that is ${LIMITS.videoMaxSeconds}s or less.`);
          return;
        }
        if ((asset.fileSize ?? 0) > LIMITS.videoMaxMB * 1024 * 1024) {
          Alert.alert('File too large', `Please choose a video under ${LIMITS.videoMaxMB}MB.`);
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category, onProgress: (p) => { if (category === 'datingProfile') setDatingProfileProgress(p); } });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'datingProfile') next.datingProfile = uploaded.publicUrl || uri;
          return next;
        });
        try {
          const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          setVideoThumbs(prev => {
            const next = { ...prev } as any;
            if (category === 'datingProfile') next.datingProfile = thumb;
            return next;
          });
        } catch {}
        if (category === 'datingProfile') setDatingProfileProgress(null);
      }
      show('Uploaded successfully');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    }
  };

  const selectImage = (category: Extract<RequestMediaCategory, 'selfie' | 'outfit' | 'roomPhoto'>, replaceIndex?: number) => {
    Alert.alert(
      'Add photo',
      undefined,
      [
        { text: 'Choose Photo', onPress: () => pickMedia('image', category, replaceIndex) },
        { text: 'Capture Photo', onPress: () => captureMedia('image', category) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
          else if (category === 'outfit') {
            const current: string[] = Array.isArray(prev.outfits) ? prev.outfits : [];
            if (current.length >= 3) {
              Alert.alert('Limit reached', 'You can upload up to 3 outfit photos.');
              return prev;
            }
            next.outfits = [...current, uploaded.publicUrl || uri];
          }
          return next;
        });
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 20, quality: ImagePicker.UIImagePickerControllerQualityType.High });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        if ((asset.fileSize ?? 0) > 150 * 1024 * 1024) {
          Alert.alert('File too large', 'Please capture a video under 150MB.');
          return;
        }
        const secs = durationToSeconds(asset.duration);
        if (secs > LIMITS.videoMaxSeconds + 0.5) {
          Alert.alert('Too long', `Please capture a video that is ${LIMITS.videoMaxSeconds}s or less.`);
          return;
        }
        const uri = asset.uri;
        const uploaded = await uploadRequestMedia(uri, { category });
        setMedia(prev => {
          const next = { ...prev } as any;
          if (category === 'roomTour') next.roomTour = uploaded.publicUrl || uri;
          else if (category === 'datingProfile') next.datingProfile = uploaded.publicUrl || uri;
          return next;
        });
        try {
          const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          setVideoThumbs(prev => {
            const next = { ...prev } as any;
            if (category === 'roomTour') next.roomTour = thumb;
            else if (category === 'datingProfile') next.datingProfile = thumb;
            return next;
          });
        } catch {}
      }
      Alert.alert('Uploaded', 'Your media was uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    }
  };

  const moveItem = (arr: string[], from: number, to: number): string[] => {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  };

  const goNext = async () => {
    setAttemptedNext(true);
    if (!isStepValid(currentStep)) return;
    const next = Math.min(TOTAL_STEPS, currentStep + 1);
    setCurrentStep(next);
    setAttemptedNext(false);
    await saveDraft(next);
  };

  const goBack = async () => {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    setAttemptedNext(false);
    await saveDraft(prev);
  };

  const renderStepper = () => (
    <View style={styles.stepper}>
      <Text style={styles.progressText}>{currentStep}/{TOTAL_STEPS}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${(currentStep - 1) / (TOTAL_STEPS - 1) * 100}%` }]} /></View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepLabelsRow}
      >
        {['Select Reviewer','Selfie','Outfits','Room','Dating','About You','Consent'].map((label, idx) => (
          <Text key={label} style={[styles.stepLabel, currentStep === idx + 1 && styles.stepLabelActive]}>{label}</Text>
        ))}
      </ScrollView>
    </View>
  );

  const errorText = (text: string) => (
    <Text style={styles.errorText}>{text}</Text>
  );

  const renderStep = () => {
    if (submittedSummary) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Submitted</Text>
          <Text style={styles.helperText}>Your request has been sent for reviewer approval.</Text>
          <Text style={styles.helperText}>Reviewer: {submittedSummary.reviewerName}</Text>
          <Text style={styles.helperText}>Selfie: {media.selfie ? 'Yes' : 'No'} | Outfits: {submittedSummary.counts.outfits}/{LIMITS.outfitCount} | Room: {submittedSummary.counts.rooms}/{LIMITS.roomCount}</Text>
          <RNView style={{ height: 12 }} />
          <TouchableOpacity style={styles.submitButton} onPress={() => router.replace('/(tabs)/requests')}>
            <Text style={styles.submitButtonText}>Return to My Requests</Text>
          </TouchableOpacity>
        </View>
      );
    }
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select a Reviewer</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search reviewers" style={styles.searchInput} placeholderTextColor={Colors.brand.textSecondary} accessibilityLabel="Search reviewers" />
            {filteredReviewers.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.influencerOption, selectedReviewer === r.id && styles.selectedInfluencer]}
                onPress={() => setSelectedReviewer(prev => prev === r.id ? null : r.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select reviewer ${r.displayName || r.username}`}
              >
                <Image source={{ uri: avatarMap[r.id] || r.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={styles.influencerImage} />
                <View style={styles.influencerInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.influencerName}>{r.displayName || r.username || 'Unknown reviewer'}</Text>
                  </View>
                  {!!r.skills?.length && <Text style={styles.specialties}>{r.skills.join(', ')}</Text>}
                  {r.pricePerReview != null && <Text style={styles.price}>${r.pricePerReview}/review</Text>}
                </View>
                <View style={styles.radioButton}>{selectedReviewer === r.id && <View style={styles.radioButtonSelected} />}</View>
              </TouchableOpacity>
            ))}
            {attemptedNext && !isStepValid(1) && errorText('Please select a reviewer to continue.')}
          </View>
        );
      case 2:
        return (
          <View style={[styles.section, { padding: 26 }]}>
            <Text style={styles.sectionTitle}>Upload Selfie</Text>
            <Text style={styles.helperText}>Accepted: JPG/PNG/HEIC • Max {LIMITS.imageMaxMB}MB</Text>
            <RNView style={styles.mediaGridRow}>
              <TouchableOpacity
                style={[styles.dropSquare, !media.selfie ? styles.dropSquareEmpty : null]}
                onPress={() => selectImage('selfie')}
                activeOpacity={0.8}
                accessibilityLabel="Add selfie"
              >
                {media.selfie ? (
                  <Image source={{ uri: media.selfie }} style={styles.dropSquareImage} />
                ) : (
                  <Text style={styles.plus}>+</Text>
                )}
              </TouchableOpacity>
              {media.selfie ? (
                <TouchableOpacity style={styles.clearOverlay} onPress={() => setMedia(prev => ({ ...prev, selfie: undefined }))} accessibilityLabel="Remove selfie">
                  <Text style={styles.clearOverlayText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </RNView>
            {selfieProgress != null && (
              <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, selfieProgress))}%` }]} /></View>
            )}
            {attemptedNext && !isStepValid(2) && errorText('Please upload exactly 1 selfie.')}
          </View>
        );
      case 3:
        return (
          <View style={[styles.section, { padding: 26 }]}>
            <Text style={styles.sectionTitle}>Upload Outfit Photos</Text>
            <Text style={styles.helperText}>Accepted: JPG/PNG/HEIC • Max {LIMITS.imageMaxMB}MB each • {media.outfits.length}/{LIMITS.outfitCount}</Text>
            <RNView style={styles.mediaGridRow}>
              {[0,1,2].map((slotIdx) => {
                const uri = media.outfits[slotIdx];
                return (
                  <RNView key={slotIdx} style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.dropSquare, !uri ? styles.dropSquareEmpty : null]}
                      onPress={() => selectImage('outfit', uri ? slotIdx : undefined)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Slot ${slotIdx + 1} ${uri ? 'replace' : 'add'} outfit photo`}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.dropSquareImage} />
                      ) : (
                        <Text style={styles.plus}>+</Text>
                      )}
                      {uri ? (
                        <TouchableOpacity
                          style={styles.removeBadge}
                          onPress={() => setMedia(prev => ({ ...prev, outfits: prev.outfits.filter((_, i) => i !== slotIdx) }))}
                          accessibilityLabel={`Remove outfit photo ${slotIdx + 1}`}
                        >
                          <Text style={styles.removeBadgeText}>×</Text>
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                    {uri ? (
                      <RNView style={styles.reorderRow}>
                        <TouchableOpacity disabled={slotIdx === 0} onPress={() => setMedia(prev => ({ ...prev, outfits: moveItem(prev.outfits, slotIdx, slotIdx - 1) }))} style={[styles.reorderBtn, slotIdx === 0 && styles.reorderBtnDisabled]} accessibilityLabel={`Move left outfit photo ${slotIdx + 1}`}>
                          <Text style={styles.reorderText}>{'‹'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={slotIdx === 2} onPress={() => setMedia(prev => ({ ...prev, outfits: moveItem(prev.outfits, slotIdx, slotIdx + 1) }))} style={[styles.reorderBtn, slotIdx === 2 && styles.reorderBtnDisabled]} accessibilityLabel={`Move right outfit photo ${slotIdx + 1}`}>
                          <Text style={styles.reorderText}>{'›'}</Text>
                        </TouchableOpacity>
                      </RNView>
                    ) : null}
                  </RNView>
                );
              })}
            </RNView>
            {outfitsProgress != null && (
              <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, outfitsProgress))}%` }]} /></View>
            )}
            {attemptedNext && !isStepValid(3) && errorText('Please upload exactly 3 outfit photos.')}
          </View>
        );
      case 4:
        return (
          <View style={[styles.section, { padding: 26 }]}>
            <Text style={styles.sectionTitle}>Upload Room Tour Photos</Text>
            <Text style={styles.helperText}>Accepted: JPG/PNG/HEIC • Max {LIMITS.imageMaxMB}MB each • {media.roomTourPhotos.length}/{LIMITS.roomCount}</Text>
            <RNView style={styles.mediaGridRow}>
              {[0,1,2].map((slotIdx) => {
                const uri = media.roomTourPhotos[slotIdx];
                return (
                  <RNView key={`room-${slotIdx}`} style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.dropSquare, !uri ? styles.dropSquareEmpty : null]}
                      onPress={() => selectImage('roomPhoto', uri ? slotIdx : undefined)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Slot ${slotIdx + 1} ${uri ? 'replace' : 'add'} room photo`}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.dropSquareImage} />
                      ) : (
                        <Text style={styles.plus}>+</Text>
                      )}
                      {uri ? (
                        <TouchableOpacity
                          style={styles.removeBadge}
                          onPress={() => setMedia(prev => ({ ...prev, roomTourPhotos: prev.roomTourPhotos.filter((_, i) => i !== slotIdx) }))}
                          accessibilityLabel={`Remove room photo ${slotIdx + 1}`}
                        >
                          <Text style={styles.removeBadgeText}>×</Text>
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                    {uri ? (
                      <RNView style={styles.reorderRow}>
                        <TouchableOpacity disabled={slotIdx === 0} onPress={() => setMedia(prev => ({ ...prev, roomTourPhotos: moveItem(prev.roomTourPhotos, slotIdx, slotIdx - 1) }))} style={[styles.reorderBtn, slotIdx === 0 && styles.reorderBtnDisabled]} accessibilityLabel={`Move left room photo ${slotIdx + 1}`}>
                          <Text style={styles.reorderText}>{'‹'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={slotIdx === 2} onPress={() => setMedia(prev => ({ ...prev, roomTourPhotos: moveItem(prev.roomTourPhotos, slotIdx, slotIdx + 1) }))} style={[styles.reorderBtn, slotIdx === 2 && styles.reorderBtnDisabled]} accessibilityLabel={`Move right room photo ${slotIdx + 1}`}>
                          <Text style={styles.reorderText}>{'›'}</Text>
                        </TouchableOpacity>
                      </RNView>
                    ) : null}
                  </RNView>
                );
              })}
            </RNView>
            {roomTourProgress != null && (
              <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, roomTourProgress))}%` }]} /></View>
            )}
            {attemptedNext && !isStepValid(4) && errorText('Please upload exactly 3 room photos.')}
          </View>
        );
      case 5:
        return (
          <View style={[styles.section, { padding: 26 }]}>
            <Text style={styles.sectionTitle}>Upload Dating Profile Screen Recording</Text>
            <Text style={styles.helperText}>Accepted: MP4/MOV/WebM • Max {LIMITS.videoMaxMB}MB • ≤{LIMITS.videoMaxSeconds}s</Text>
            <RNView style={styles.mediaGridRow}>
              <TouchableOpacity
                style={[styles.dropSquare, !videoThumbs.datingProfile ? styles.dropSquareEmpty : null]}
                onPress={() => Alert.alert('Add screen recording', undefined, [
                  { text: 'Choose Video', onPress: () => pickMedia('video', 'datingProfile') },
                  { text: 'Capture Video', onPress: () => captureMedia('video', 'datingProfile') },
                  { text: 'Cancel', style: 'cancel' },
                ])}
                activeOpacity={0.8}
                accessibilityLabel="Add dating profile video"
              >
                {videoThumbs.datingProfile ? (
                  <Image source={{ uri: videoThumbs.datingProfile }} style={styles.dropSquareImage} />
                ) : (
                  <Text style={styles.plus}>+</Text>
                )}
                {videoThumbs.datingProfile ? (
                  <TouchableOpacity style={styles.removeBadge} onPress={() => { setMedia(prev => ({ ...prev, datingProfile: undefined })); setVideoThumbs(prev => ({ ...prev, datingProfile: undefined })); }} accessibilityLabel="Remove video">
                    <Text style={styles.removeBadgeText}>×</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            </RNView>
            {datingProfileProgress != null && (
              <RNView style={styles.progressTrack}><RNView style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, datingProfileProgress))}%` }]} /></RNView>
            )}
            {attemptedNext && !isStepValid(5) && errorText('Please upload exactly 1 video.')}
          </View>
        );
      case 6:
        return (
          <View style={[styles.section, { padding: 26 }]}>
            <Text style={styles.sectionTitle}>Tell Us About Yourself</Text>
            <Text style={styles.helperText}>Share goals, preferences, and what feedback you want. {LIMITS.aboutMin}-{LIMITS.aboutMax} characters.</Text>
            <TextInput style={[styles.notesInput, { minHeight: 140, fontSize: 16 }]} value={message} onChangeText={(t) => setMessage(t.slice(0, LIMITS.aboutMax))} placeholder="Write your message here" multiline numberOfLines={7} textAlignVertical="top" accessibilityLabel="About you" maxLength={LIMITS.aboutMax} />
            <Text style={styles.helperText}>{message.trim().length} characters</Text>
            {message.trim().length >= 450 ? (
              <Text style={styles.helperText}>500 max</Text>
            ) : null}
            {attemptedNext && !isStepValid(6) && errorText(`Please write between ${LIMITS.aboutMin} and ${LIMITS.aboutMax} characters.`)}
          </View>
        );
      case 7:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consent to Social</Text>
            <Text style={styles.helperText} numberOfLines={consentExpanded ? undefined : 3}>{consentText}</Text>
            <TouchableOpacity onPress={() => setConsentExpanded((s) => !s)}>
              <Text style={styles.expandToggle}>{consentExpanded ? 'Show less' : 'Show more'}</Text>
            </TouchableOpacity>
            <RNView style={styles.consentRow}>
              <TouchableOpacity style={[styles.consentOption, shareConsent === true && styles.selectedInfluencer]} onPress={() => setShareConsent(true)} accessibilityRole="checkbox" accessibilityState={{ checked: shareConsent === true }}>
                <Text style={styles.influencerName}>I consent to social sharing</Text>
                <View style={[styles.radioButton, { marginLeft: 12 }]}>{shareConsent === true && <View style={styles.radioButtonSelected} />}</View>
              </TouchableOpacity>
            </RNView>
            <RNView style={{ marginTop: 8 }}>
              <Text style={styles.helperText}>Read our <Text onPress={() => Linking.openURL('https://example.com/terms')} style={styles.link}>Terms</Text> and <Text onPress={() => Linking.openURL('https://example.com/privacy')} style={styles.link}>Privacy</Text>.</Text>
            </RNView>
            {attemptedNext && !isStepValid(7) && errorText('Consent is required to submit.')}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
        contentInsetAdjustmentBehavior="always"
      >
        <View style={styles.centerWrap}>
          <View style={styles.header}>
            <Text style={styles.title}>Request a Review</Text>
            <Text style={styles.subtitle}>Get feedback from top influencer women</Text>
          </View>

          {renderStepper()}

          {renderStep()}

          {!submittedSummary && (
            <View style={styles.navRow}>
              {currentStep > 1 ? (
                <TouchableOpacity style={[styles.secondaryBtn, styles.navBtn]} onPress={goBack} accessibilityLabel="Back">
                  <Text style={styles.mediaButtonText}>Back</Text>
                </TouchableOpacity>
              ) : <RNView />}
              {currentStep < TOTAL_STEPS ? (
                <TouchableOpacity style={[styles.mediaButton, styles.navBtn, !isStepValid(currentStep) && styles.submitButtonDisabled]} onPress={goNext} disabled={!isStepValid(currentStep)} accessibilityLabel="Next">
                  <Text style={styles.mediaButtonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.submitButton, !canSubmit() && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit() || submitting} accessibilityLabel="Submit">
                  <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {!submittedSummary && (
            <Text style={styles.submitNote}>Progress is saved automatically on each step.</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  contentContainer: { paddingBottom: 72 },
  centerWrap: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  header: { padding: 24, backgroundColor: Colors.brand.cardBackground, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: Colors.brand.textPrimary, fontFamily: 'Poppins_700Bold' },
  subtitle: { fontSize: 16, color: Colors.brand.textSecondary, fontFamily: 'Inter_600SemiBold' },
  section: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 20, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.brand.textPrimary, fontFamily: 'Poppins_700Bold', marginBottom: 15 },
  influencerOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 2, borderColor: Colors.brand.border, marginBottom: 10 },
  selectedInfluencer: { borderColor: Colors.brand.accentMagenta, backgroundColor: 'rgba(255,45,85,0.08)' },
  influencerImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  influencerInfo: { flex: 1 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  influencerName: { fontSize: 16, fontWeight: 'bold', color: Colors.brand.textPrimary, fontFamily: 'Inter_600SemiBold' },
  verifiedBadge: { marginLeft: 5, color: Colors.brand.status.completed, fontSize: 14 },
  specialties: { fontSize: 12, color: Colors.brand.textSecondary, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: Colors.brand.accentMagenta },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.brand.textSecondary, justifyContent: 'center', alignItems: 'center' },
  radioButtonSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.brand.accentMagenta },
  questionLabel: { fontSize: 12, color: Colors.brand.textSecondary, marginBottom: 6, marginTop: 6 },
  notesInput: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, padding: 15, fontSize: 16, minHeight: 80, color: Colors.brand.textPrimary, backgroundColor: Colors.brand.cardBackground, marginBottom: 10 },
  submitSection: { margin: 15, marginBottom: 30 },

  // Stepper and labels
  stepper: { paddingHorizontal: 16, marginTop: 8, marginBottom: 6 },
  progressText: { color: Colors.brand.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  stepLabelsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  stepLabelsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4, paddingRight: 16 },
  stepLabel: { color: Colors.brand.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  stepLabelActive: { color: Colors.brand.textPrimary, fontWeight: '700', backgroundColor: 'rgba(255,45,85,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },

  // Search input (for better sizing)
  searchInput: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.brand.textPrimary, fontSize: 16, marginBottom: 12, backgroundColor: Colors.brand.cardBackground },

  // Nav row and pill buttons
  navRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  navBtn: { flex: 1 },
  mediaButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 999, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 999 },
  submitButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 18, paddingHorizontal: 30, borderRadius: 999, alignItems: 'center', marginBottom: 10 },
  submitButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  submitNote: { fontSize: 12, color: Colors.brand.textSecondary, textAlign: 'center' },
  helperText: { fontSize: 12, color: '#C7BFD9', marginBottom: 8 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaGridRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mediaButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  mediaThumb: { width: 54, height: 54, borderRadius: 10, marginLeft: 12 },
  thumbRow: { flexDirection: 'row', alignItems: 'center' },
  clearBtn: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)' },
  clearBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dropSquare: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative' },
  dropSquareEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)' },
  dropSquareImage: { width: '100%', height: '100%' },
  plus: { color: 'rgba(255,255,255,0.9)', fontSize: 36, fontWeight: '800' },
  removeBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  removeBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 16 },
  consentRow: { flexDirection: 'row', gap: 10 },
  consentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 10, borderWidth: 2, borderColor: Colors.brand.border, marginTop: 8 },
  mediaItemTitle: { fontSize: 14, color: Colors.brand.textPrimary, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  mediaItemDesc: { fontSize: 12, color: Colors.brand.textSecondary, marginBottom: 6 },
  expandToggle: { color: Colors.brand.accentMagenta, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  sectionDivider: { height: 2, borderRadius: 2, marginTop: 18 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressBar: { height: '100%', backgroundColor: Colors.brand.accentMagenta },
});


