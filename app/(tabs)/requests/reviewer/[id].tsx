import React, { useEffect, useState } from 'react';
import { StyleSheet, View as RNView, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRequestById, updateRequestStatus, getProfileById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbRequestSummary } from '@/types';
import Avatar from '@/components/Avatar';
import { Image } from 'expo-image';

// Removed unused URL helper functions since we're not showing social links in this screen

export default function ReviewerRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
      // Change status to 'in_progress' (paid + pending review)
      await updateRequestStatus(request.id, 'in_progress');
      Alert.alert('Request Accepted', 'You can now submit your review for this request.');
      router.back();
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
              // Change status to 'rejected' and payment_status will be handled by webhook/refund logic
              await updateRequestStatus(request.id, 'rejected');
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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}>
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

        {parsedNotes?.selfieUrl && (
          <View style={styles.section}>
            <Text style={styles.label}>Selfie</Text>
            <Image source={{ uri: parsedNotes.selfieUrl }} style={styles.selfie} contentFit="cover" />
          </View>
        )}

        {Array.isArray(request.photos) && request.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Photos</Text>
            <View style={styles.photosGrid}>
              {request.photos.slice(0, 6).map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} contentFit="cover" />
              ))}
            </View>
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
      </ScrollView>
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
