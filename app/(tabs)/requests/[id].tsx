import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View as RNView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRequestById, submitRequestReview, updateRequestStatus, getProfileById, getUserProfile, acceptRequest, denyRequest } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import StatusBadge from '@/components/StatusBadge';
import LightboxImage from '@/components/LightboxImage';
import { Image } from 'expo-image';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';

export default function ReviewerSubmitScreen() {
  const { show } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [reviewee, setReviewee] = useState<{ id: string; displayName: string; avatarUrl?: string | null } | null>(null);
  const [revieweeAvatar, setRevieweeAvatar] = useState<string | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const parsedNotes = React.useMemo(() => {
    try {
      if (!request?.notes) return null;
      return typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes;
    } catch {
      return null;
    }
  }, [request?.notes]);
  const [overall, setOverall] = useState('3');
  const [attractiveness, setAttractiveness] = useState('3');
  const [wardrobe, setWardrobe] = useState('3');
  const [room, setRoom] = useState('3');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [generalFeedback, setGeneralFeedback] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        try {
          const profile = await getUserProfile();
          setCurrentUserId(profile?.id || null);
        } catch {}
        const req = await getRequestById(String(id));
        setRequest(req);
        // Do not auto-advance to in_progress; reviewer must explicitly accept after payment

        // Load reviewee profile and sign avatar if needed
        if (req?.userId) {
          try {
            const u = await getProfileById(req.userId);
            if (u) {
              let uri = u.avatarUrl || '';
              if (uri && !/^https?:\/\//i.test(uri)) {
                try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
              }
              setReviewee({ id: u.id, displayName: u.displayName, avatarUrl: uri });
              setRevieweeAvatar(uri || undefined);
            }
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  

  const canModerate = !!currentUserId && !!request && currentUserId === request.influencerId;

  const onAccept = async () => {
    if (!id || !request) return;
    if (request.status !== 'paid') {
      Alert.alert('Payment required', 'You can accept only after payment is completed.');
      return;
    }
    try {
      const updated = await acceptRequest(String(id));
      setRequest(updated);
      show('Accepted! You can start the review. ✅');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept request');
    }
  };

  const onDeny = async () => {
    if (!id || !request) return;
    if (request.status !== 'paid') {
      Alert.alert('Payment required', 'You can deny only after payment is completed.');
      return;
    }
    try {
      const updated = await denyRequest(String(id));
      setRequest(updated);
      show('Declined the request. ❌');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to decline request');
    }
  };

  const onSubmit = async () => {
    if (!id) return;
    try {
      // Validate ratings are between 1 and 5
      const overallNum = Number(overall);
      const attractivenessNum = Number(attractiveness);
      const wardrobeNum = Number(wardrobe);
      const roomNum = Number(room);
      
      if (!overallNum || overallNum < 1 || overallNum > 5) {
        Alert.alert('Invalid Rating', 'Overall rating must be between 1 and 5');
        return;
      }
      if (attractiveness && (attractivenessNum < 1 || attractivenessNum > 5)) {
        Alert.alert('Invalid Rating', 'Attractiveness rating must be between 1 and 5');
        return;
      }
      if (wardrobe && (wardrobeNum < 1 || wardrobeNum > 5)) {
        Alert.alert('Invalid Rating', 'Wardrobe rating must be between 1 and 5');
        return;
      }
      if (room && (roomNum < 1 || roomNum > 5)) {
        Alert.alert('Invalid Rating', 'Room rating must be between 1 and 5');
        return;
      }
      
      const toList = (txt: string) => txt.split('\n').map(s => s.trim()).filter(Boolean);
      await submitRequestReview({
        requestId: String(id),
        review: {
          ratings: {
            overall: overallNum,
            attractiveness: attractivenessNum || undefined,
            wardrobe: wardrobeNum || undefined,
            room: roomNum || undefined,
          },
          feedback: {
            strengths: toList(strengths),
            improvements: toList(improvements),
            generalFeedback: generalFeedback.trim(),
          },
        },
      });
      show('Review submitted! ✨');
      router.back();
    } catch (e: any) {
      Alert.alert('Failed to submit', e?.message || 'Please try again');
    }
  };

  if (loading) return <View style={styles.container}><Text style={{ color: Colors.brand.textSecondary }}>Loading...</Text></View>;
  if (!request) return <View style={styles.container}><Text style={{ color: Colors.brand.textSecondary }}>Request not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 24 : 24, paddingHorizontal: 16 }}>
      <Text style={styles.title}>Write Review</Text>

      {!!request && (
        <RNView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={request.status as any} />
            {request.status === 'in_progress' ? (
              <Text style={{ color: Colors.brand.textSecondary, fontSize: 12 }}>
                Reviewer is working on your review. They have 48 hours to complete it or your money back.
              </Text>
            ) : null}
          </RNView>
          {canModerate && request.status === 'paid' && (
            <RNView style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={onAccept} style={{ backgroundColor: Colors.brand.status.completed, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDeny} style={{ backgroundColor: Colors.brand.status.rejected, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Deny</Text>
              </TouchableOpacity>
            </RNView>
          )}
        </RNView>
      )}

      <RNView style={styles.headerBox}>
        <RNView style={styles.avatarWrapper}>
          <Avatar uri={revieweeAvatar} name={reviewee?.displayName} size={48} />
        </RNView>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{reviewee?.displayName || 'User'}</Text>
          <Text style={{ color: Colors.brand.textSecondary, fontSize: 12 }}>Submitted on {new Date(request.createdAt).toLocaleDateString()}</Text>
        </View>
      </RNView>

      {!!request?.photos?.length && (
        <View style={styles.mediaBox}>
          <Text style={styles.label}>Submitted media</Text>
          <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {request.photos.map((p: string, idx: number) => (
              <LightboxImage key={idx} uri={p} thumbStyle={styles.thumb} />
            ))}
          </RNView>
        </View>
      )}

      {!!parsedNotes?.message && (
        <View style={styles.mediaBox}>
          <Text style={styles.label}>Reviewee message</Text>
          <Text style={{ color: Colors.brand.textPrimary }}>{parsedNotes.message}</Text>
        </View>
      )}

      {!!parsedNotes?.media && (
        <View style={styles.mediaBox}>
          <Text style={styles.label}>Breakdown by section</Text>
          {/* Selfie section removed - now using profile picture */}
          {Array.isArray(parsedNotes.media.outfits) && parsedNotes.media.outfits.length ? (
            <RNView style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.brand.textSecondary, marginBottom: 6 }}>Outfits</Text>
              <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {parsedNotes.media.outfits.map((p: string, i: number) => (
                  <LightboxImage key={`o-${i}`} uri={p} thumbStyle={styles.thumb} />
                ))}
              </RNView>
            </RNView>
          ) : null}
          {Array.isArray(parsedNotes.media.roomTourPhotos) && parsedNotes.media.roomTourPhotos.length ? (
            <RNView style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.brand.textSecondary, marginBottom: 6 }}>Room tour</Text>
              <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {parsedNotes.media.roomTourPhotos.map((p: string, i: number) => (
                  <LightboxImage key={`r-${i}`} uri={p} thumbStyle={styles.thumb} />
                ))}
              </RNView>
            </RNView>
          ) : null}
          {parsedNotes.media.datingProfile ? (
            <RNView style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.brand.textSecondary, marginBottom: 6 }}>Dating profile screen recording</Text>
              <Image source={{ uri: parsedNotes.media.datingProfile }} style={styles.thumb} contentFit="cover" transition={200} />
            </RNView>
          ) : null}
        </View>
      )}

      {typeof parsedNotes?.consent?.shareOnSocial === 'boolean' && (
        <View style={styles.mediaBox}>
          <Text style={styles.label}>Social sharing consent</Text>
          <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RNView style={{ backgroundColor: parsedNotes.consent.shareOnSocial ? '#22c55e' : '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{parsedNotes.consent.shareOnSocial ? 'Agreed' : 'Did not agree'}</Text>
            </RNView>
            {!!parsedNotes.consent?.agreedAt && (
              <Text style={{ color: Colors.brand.textSecondary }}>on {new Date(parsedNotes.consent.agreedAt).toLocaleDateString()}</Text>
            )}
          </RNView>
        </View>
      )}

      {(request?.status === 'paid' || request?.status === 'in_progress') ? (
        <>
          <Text style={styles.label}>Ratings (1-5)</Text>
          <View style={styles.row}>
            <TextInput style={styles.input} keyboardType="numeric" value={overall} onChangeText={setOverall} placeholder="Overall" placeholderTextColor="#9ca3af" />
            <TextInput style={styles.input} keyboardType="numeric" value={attractiveness} onChangeText={setAttractiveness} placeholder="Attractiveness" placeholderTextColor="#9ca3af" />
          </View>
          <View style={styles.row}>
            <TextInput style={styles.input} keyboardType="numeric" value={wardrobe} onChangeText={setWardrobe} placeholder="Wardrobe" placeholderTextColor="#9ca3af" />
            <TextInput style={styles.input} keyboardType="numeric" value={room} onChangeText={setRoom} placeholder="Room" placeholderTextColor="#9ca3af" />
          </View>

          <Text style={styles.label}>Strengths (one per line)</Text>
          <TextInput style={styles.textarea} multiline value={strengths} onChangeText={setStrengths} placeholder="e.g., Great lighting" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>Improvements (one per line)</Text>
          <TextInput style={styles.textarea} multiline value={improvements} onChangeText={setImprovements} placeholder="e.g., Try neutral backgrounds" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>General Feedback</Text>
          <TextInput style={styles.textarea} multiline value={generalFeedback} onChangeText={setGeneralFeedback} placeholder="Share overall thoughts" placeholderTextColor="#9ca3af" />

          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
            <Text style={styles.submitText}>Submit Review</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ backgroundColor: Colors.brand.cardBackground, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: Colors.brand.textSecondary }}>
            {request?.status === 'pending' ? 'Payment pending. Reviewer actions are disabled until payment is complete.' : request?.status === 'accepted' ? 'Payment pending. Actions will unlock after payment.' : 'This request is not ready for review yet.'}
          </Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  title: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 20, marginBottom: 12 },
  headerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.cardBackground, borderRadius: 12, padding: 12, marginBottom: 12, overflow: 'hidden' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.brand.cardBackgroundSecondary },
  avatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(199,191,217,0.25)' },
  avatarOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  name: { color: Colors.brand.textPrimary, fontWeight: '700' },
  mediaBox: { backgroundColor: Colors.brand.cardBackground, borderRadius: 12, padding: 12, marginBottom: 12 },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  label: { color: Colors.brand.textSecondary, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: Colors.brand.cardBackground, color: Colors.brand.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 90, backgroundColor: Colors.brand.cardBackground, color: Colors.brand.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  submitBtn: { marginTop: 16, backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
});

