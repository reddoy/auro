import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View as RNView, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { getReviewerById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';

export default function ReviewerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [reviewer, setReviewer] = useState<DbReviewerSummary | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) return;
        const r = await getReviewerById(String(id));
        setReviewer(r);
        let uri = r?.avatarUrl || '';
        if (uri) {
          try { uri = (await getSignedAvatarUrl(uri, 60 * 60 * 24 * 30)) || uri; } catch {}
        }
        setAvatarUri(uri || undefined);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const openLink = (url?: string | null) => {
    if (!url) return;
    const hasScheme = /^https?:\/\//i.test(url);
    const finalUrl = hasScheme ? url : `https://${url}`;
    try { Linking.openURL(finalUrl); } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <RNView style={{ alignItems: 'center' }}>
            <Avatar uri={avatarUri} name={reviewer?.displayName} size={96} />
            <Text style={styles.name}>{reviewer?.displayName || 'Reviewer'}</Text>
            {!!reviewer?.bio && (
              <Text style={styles.bio}>{reviewer.bio}</Text>
            )}
          </RNView>

          {/* Social links */}
          {!!reviewer?.links && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social Links</Text>
              <RNView style={{ gap: 10 }}>
                {Object.entries(reviewer.links).map(([key, value]) => {
                  if (!value) return null;
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <TouchableOpacity key={key} style={styles.linkRow} onPress={() => openLink(String(value))} accessibilityRole="link" accessibilityLabel={`Open ${label}`}>
                      <Text style={styles.linkText}>{label}</Text>
                      <Text style={styles.linkUrl} numberOfLines={1}>{String(value)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </RNView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  card: { backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.brand.border },
  name: { marginTop: 12, fontSize: 24, fontWeight: '800', color: Colors.brand.textPrimary, textAlign: 'center' },
  bio: { marginTop: 8, fontSize: 15, color: Colors.brand.textPrimary, textAlign: 'center', lineHeight: 21 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.brand.textPrimary, marginBottom: 10 },
  linkRow: { backgroundColor: Colors.brand.cardBackground, borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, padding: 12 },
  linkText: { fontSize: 16, fontWeight: '700', color: Colors.brand.textPrimary },
  linkUrl: { fontSize: 12, color: Colors.brand.textSecondary, marginTop: 4 },
});


