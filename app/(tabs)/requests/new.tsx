import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, View as RNView, FlatList, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewers } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import Avatar from '@/components/Avatar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterType = 'all' | 'new' | 'highlyRated';
type SortType = 'default' | 'priceLow' | 'priceHigh' | 'ratingHigh';

export default function DiscoverReviewersScreen() {
  const [reviewers, setReviewers] = useState<DbReviewerSummary[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('default');
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

  const filteredAndSorted = useMemo(() => {
    let result = [...reviewers];

    // Apply search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        (r.displayName || r.username || '').toLowerCase().includes(q)
      );
    }

    // Apply category filter
    if (filter === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((r) => {
        if (!r.createdAt) return false;
        return new Date(r.createdAt) >= thirtyDaysAgo;
      });
    } else if (filter === 'highlyRated') {
      result = result.filter((r) => r.rating !== null && r.rating !== undefined && r.rating >= 4.0);
    }

    // Apply sorting
    if (sort === 'priceLow') {
      result.sort((a, b) => {
        const aPrice = a.pricePerReview ?? Infinity;
        const bPrice = b.pricePerReview ?? Infinity;
        return aPrice - bPrice;
      });
    } else if (sort === 'priceHigh') {
      result.sort((a, b) => {
        const aPrice = a.pricePerReview ?? 0;
        const bPrice = b.pricePerReview ?? 0;
        return bPrice - aPrice;
      });
    } else if (sort === 'ratingHigh') {
      result.sort((a, b) => {
        const aRating = a.rating ?? 0;
        const bRating = b.rating ?? 0;
        return bRating - aRating;
      });
    }
    // 'default' keeps the original order from API (sorted by rating)

    return result;
  }, [reviewers, search, filter, sort]);

  const openReviewerProfile = (rev: DbReviewerSummary) => {
    try { router.push({ pathname: '/(tabs)/requests/reviewer/profile', params: { id: rev.id } } as any); } catch {}
  };

  const renderItem = ({ item }: { item: DbReviewerSummary }) => (
    <TouchableOpacity style={styles.row} onPress={() => openReviewerProfile(item)} activeOpacity={0.7}>
      <RNView style={styles.avatarWrap}>
        <Avatar uri={avatarMap[item.id] || item.avatarUrl || undefined} name={item.displayName} size={56} />
      </RNView>
      <RNView style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.displayName || item.username || 'Reviewer'}</Text>
        {item.skills && item.skills.length > 0 && (
          <Text style={styles.rowSkills} numberOfLines={1}>
            {item.skills.slice(0, 3).join(' • ')}
          </Text>
        )}
        <RNView style={styles.rowMeta}>
          {item.rating !== null && item.rating !== undefined && (
            <RNView style={styles.ratingContainer}>
              <RNView style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = n <= Math.round(item.rating!);
                  return (
                    <Text 
                      key={n} 
                      style={[
                        styles.star, 
                        filled ? styles.starFilled : styles.starEmpty
                      ]}
                    >
                      {filled ? '★' : '☆'}
                    </Text>
                  );
                })}
              </RNView>
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </RNView>
          )}
          {item.pricePerReview !== null && item.pricePerReview !== undefined && (
            <Text style={styles.rowPrice}>${item.pricePerReview}/hr</Text>
          )}
        </RNView>
      </RNView>
    </TouchableOpacity>
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
      
      {/* Filter Buttons */}
      <RNView style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'new' && styles.filterButtonActive]}
          onPress={() => setFilter('new')}
        >
          <Text style={[styles.filterButtonText, filter === 'new' && styles.filterButtonTextActive]}>
            New
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'highlyRated' && styles.filterButtonActive]}
          onPress={() => setFilter('highlyRated')}
        >
          <Text style={[styles.filterButtonText, filter === 'highlyRated' && styles.filterButtonTextActive]}>
            Highly Rated
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </RNView>

      {/* Sort Selector */}
      <RNView style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
          contentContainerStyle={styles.sortContent}
        >
          <TouchableOpacity
            style={[styles.sortButton, sort === 'default' && styles.sortButtonActive]}
            onPress={() => setSort('default')}
          >
            <Text style={[styles.sortButtonText, sort === 'default' && styles.sortButtonTextActive]}>
              Default
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sort === 'priceLow' && styles.sortButtonActive]}
            onPress={() => setSort('priceLow')}
          >
            <Text style={[styles.sortButtonText, sort === 'priceLow' && styles.sortButtonTextActive]}>
              Price: Low to High
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sort === 'priceHigh' && styles.sortButtonActive]}
            onPress={() => setSort('priceHigh')}
          >
            <Text style={[styles.sortButtonText, sort === 'priceHigh' && styles.sortButtonTextActive]}>
              Price: High to Low
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sort === 'ratingHigh' && styles.sortButtonActive]}
            onPress={() => setSort('ratingHigh')}
          >
            <Text style={[styles.sortButtonText, sort === 'ratingHigh' && styles.sortButtonTextActive]}>
              Rating: High to Low
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </RNView>

      <FlatList
        data={filteredAndSorted}
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
  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.brand.textPrimary, backgroundColor: Colors.brand.cardBackground, fontSize: 16 },
  filterContainer: { marginBottom: 6, paddingVertical: 6, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  filterScroll: { flexGrow: 0 },
  filterContent: { gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  filterButton: { 
    paddingHorizontal: 14, 
    paddingVertical: 4, 
    borderRadius: 16, 
    backgroundColor: Colors.brand.cardBackground, 
    borderWidth: 1, 
    borderColor: Colors.brand.border,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: { 
    backgroundColor: Colors.brand.accentMagenta, 
    borderColor: Colors.brand.accentMagenta,
  },
  filterButtonText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: Colors.brand.textPrimary,
    lineHeight: 16,
  },
  filterButtonTextActive: { 
    color: '#FFFFFF',
  },
  sortContainer: { 
    paddingHorizontal: 16, 
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.brand.textSecondary, 
    marginRight: 12,
  },
  sortScroll: { flex: 1 },
  sortContent: { gap: 8 },
  sortButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: Colors.brand.cardBackground, 
    borderWidth: 1, 
    borderColor: Colors.brand.border,
    marginRight: 8,
  },
  sortButtonActive: { 
    backgroundColor: Colors.brand.accentMagenta, 
    borderColor: Colors.brand.accentMagenta,
  },
  sortButtonText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: Colors.brand.textPrimary,
  },
  sortButtonTextActive: { 
    color: '#FFFFFF',
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.brand.cardBackground, 
    padding: 16, 
    borderRadius: 14, 
    marginHorizontal: 16, 
    marginBottom: 12,
  },
  avatarWrap: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    overflow: 'hidden', 
    marginRight: 12, 
    backgroundColor: Colors.brand.avatarPlaceholder,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 18, fontWeight: '700', color: Colors.brand.textPrimary, marginBottom: 4 },
  rowSkills: { fontSize: 13, color: Colors.brand.textSecondary, marginBottom: 8 },
  rowMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap',
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 12,
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    marginRight: 1,
  },
  starFilled: {
    color: Colors.brand.accentOrange,
  },
  starEmpty: {
    color: Colors.brand.border,
  },
  ratingText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: Colors.brand.textPrimary,
  },
  rowPrice: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: Colors.brand.accentMagenta,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.brand.textSecondary },
});
