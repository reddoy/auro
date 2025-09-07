import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import Avatar from '@/components/Avatar';

export default function ReviewerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reviewer, setReviewer] = useState<DbReviewerSummary | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) return;
        const r = await getReviewerById(String(id));
        setReviewer(r);
        if (r?.avatarUrl) {
          let uri = r.avatarUrl;
          if (uri && !/^https?:\/\//i.test(uri)) {
            try { uri = (await getSignedAvatarUrl(uri, 3600)) || uri; } catch {}
          }
          setAvatarUri(uri);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const openCreatorPage = async () => {
    if (!reviewer) return;
    const base = (Constants.expoConfig?.extra as any)?.creatorWebBase || (Constants.manifest2 as any)?.extra?.creatorWebBase || 'https://creators.auro.example';
    const url = reviewer.username ? `${base}/c/${reviewer.username}` : `${base}?id=${reviewer.id}`;
    try { await Linking.openURL(url); } catch {}
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  if (!reviewer) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.emptyText}>Reviewer not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNView style={styles.avatarWrap}>
          <Avatar uri={avatarUri || reviewer.avatarUrl || undefined} name={reviewer.displayName} size={84} />
        </RNView>
        <Text style={styles.name}>{reviewer.displayName}</Text>
        {!!reviewer.username && <Text style={styles.username}>@{reviewer.username}</Text>}
        {!!reviewer.rating && <Text style={styles.rating}>Rating {reviewer.rating.toFixed(1)}/5</Text>}
      </View>

      <View style={styles.section}>
        {!!reviewer.skills?.length && (
          <RNView style={{ marginBottom: 10 }}>
            <Text style={styles.label}>Skills</Text>
            <Text style={styles.value}>{reviewer.skills.join(', ')}</Text>
          </RNView>
        )}
        {reviewer.pricePerReview != null && (
          <RNView>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>${reviewer.pricePerReview} per review</Text>
          </RNView>
        )}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={openCreatorPage} accessibilityLabel="Go to creator page">
        <Text style={styles.primaryBtnText}>Go to creator page</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: Colors.brand.cardBackground, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  avatarWrap: { width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: Colors.brand.avatarPlaceholder, marginBottom: 10 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.brand.textPrimary },
  username: { fontSize: 14, color: Colors.brand.textSecondary, marginTop: 4 },
  rating: { fontSize: 14, color: Colors.brand.textSecondary, marginTop: 4 },
  section: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  label: { fontSize: 12, color: Colors.brand.textSecondary, marginBottom: 6 },
  value: { fontSize: 14, color: Colors.brand.textPrimary, fontWeight: '600' },
  primaryBtn: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', marginHorizontal: 16, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: Colors.brand.textSecondary },
});


