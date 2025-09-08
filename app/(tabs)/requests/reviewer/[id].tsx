import React, { useEffect, useState } from 'react';
import { StyleSheet, View as RNView, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import Avatar from '@/components/Avatar';

function normalizeUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
  return null;
}

function normalizeSocialUrl(platform: string, raw?: string | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  
  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(s)) return s;
  
  // Remove @ prefix if present
  if (s.startsWith('@')) s = s.slice(1);
  
  // Convert username to platform URL
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${s}`;
    case 'tiktok':
      return `https://tiktok.com/@${s}`;
    case 'x':
      return `https://x.com/${s}`;
    case 'youtube':
      return `https://youtube.com/@${s}`;
    case 'onlyfans':
      return `https://onlyfans.com/${s}`;
    default:
      return normalizeUrl(raw);
  }
}

function renderLink(label: string, raw?: string | null) {
  const url = normalizeSocialUrl(label, raw);
  if (!url) return null;
  return (
    <Text
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      style={{ color: Colors.brand.accentMagenta, marginTop: 6 }}
    >
      {label}
    </Text>
  );
}

export default function ReviewerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reviewer, setReviewer] = useState<DbReviewerSummary | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        console.log('Reviewer ID:', id);
        if (!id) {
          console.log('No ID found in params');
          return;
        }
        const r = await getReviewerById(String(id));
        console.log('Reviewer result:', r);
        setReviewer(r);
        if (r?.avatarUrl) {
          let uri = r.avatarUrl;
          if (uri && !/^https?:\/\//i.test(uri)) {
            try { uri = (await getSignedAvatarUrl(uri, 3600)) || uri; } catch {}
          }
          setAvatarUri(uri);
        }
      } catch (error) {
        console.error('Error loading reviewer:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

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

        {!!reviewer.bio && (
          <RNView style={{ marginBottom: 10 }}>
            <Text style={styles.label}>About</Text>
            <Text style={styles.value}>{reviewer.bio}</Text>
          </RNView>
        )}

        {!!reviewer.links && (
          <RNView style={{ marginTop: 4 }}>
            <Text style={styles.label}>Socials</Text>
            {renderLink('Instagram', (reviewer.links as any).instagram)}
            {renderLink('TikTok', (reviewer.links as any).tiktok)}
            {renderLink('X', (reviewer.links as any).x)}
            {renderLink('YouTube', (reviewer.links as any).youtube)}
            {renderLink('OnlyFans', (reviewer.links as any).onlyfans)}
          </RNView>
        )}
      </View>

      {/* Removed price and external CTA to keep app purchase-free */}
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
  emptyText: { color: Colors.brand.textSecondary },
});
