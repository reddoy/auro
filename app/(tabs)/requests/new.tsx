import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, View as RNView, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewers } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import Avatar from '@/components/Avatar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverReviewersScreen() {
  const [reviewers, setReviewers] = useState<DbReviewerSummary[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const run = async () => {
      try {
        const list = await getReviewers();
        setReviewers(list);
        try {
          const pairs = await Promise.all(
            list.map(async (r) => {
              let uri = r.avatarUrl || '';
              if (uri) {
                try {
                  const signed = await getSignedAvatarUrl(uri, 3600);
                  if (signed) uri = signed;
                } catch {}
              }
              return [r.id, uri] as const;
            })
          );
          setAvatarMap(Object.fromEntries(pairs));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviewers;
    return reviewers.filter((r) =>
      (r.displayName || r.username || '').toLowerCase().includes(q)
    );
  }, [reviewers, search]);

  const openReviewerProfile = (rev: DbReviewerSummary) => {
    try { router.push({ pathname: '/(tabs)/requests/reviewer/profile', params: { id: rev.id } } as any); } catch {}
  };

  const renderItem = ({ item }: { item: DbReviewerSummary }) => (
    <RNView style={styles.row}>
      <RNView style={styles.avatarWrap}>
        <Avatar uri={avatarMap[item.id] || item.avatarUrl || undefined} name={item.displayName} size={56} />
      </RNView>
      <RNView style={styles.rowInfo}>
        <TouchableOpacity onPress={() => openReviewerProfile(item)} accessibilityRole="link" accessibilityLabel={`Open ${item.displayName || item.username} profile`}>
          <Text style={styles.rowName}>{item.displayName || item.username || 'Reviewer'}</Text>
        </TouchableOpacity>
      </RNView>
    </RNView>
  );

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <View style={[styles.header, { paddingTop: 20 }]}> 
        <Text style={styles.title}>Discover Reviewers</Text>
      </View>
      <RNView style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or username"
          placeholderTextColor={Colors.brand.textSecondary}
          style={styles.searchInput}
          accessibilityLabel="Search reviewers"
        />
      </RNView>
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{loading ? 'Loading…' : 'No reviewers found'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  header: { padding: 16, paddingTop: 20, backgroundColor: Colors.brand.cardBackground, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.brand.textPrimary },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.brand.textPrimary, backgroundColor: Colors.brand.cardBackground, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.cardBackground, padding: 16, borderRadius: 14, marginHorizontal: 16, marginBottom: 12 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', marginRight: 12, backgroundColor: Colors.brand.avatarPlaceholder },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 20, fontWeight: '700', color: Colors.brand.textPrimary },
  rowSkills: { fontSize: 14, color: Colors.brand.textSecondary, marginTop: 2 },
  rowPrice: { fontSize: 14, fontWeight: '700', color: Colors.brand.accentMagenta, marginLeft: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.brand.textSecondary },
});
