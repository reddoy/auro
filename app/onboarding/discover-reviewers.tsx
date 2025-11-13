import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput, View as RNView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewers } from '@/lib/api';
import { getSignedAvatarUrl, updateProfilePreferences } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import Avatar from '@/components/Avatar';
import Spinner from '@/components/Spinner';

export default function DiscoverReviewersScreen() {
  const insets = useSafeAreaInsets();
  const [reviewers, setReviewers] = useState<DbReviewerSummary[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filteredReviewers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviewers;
    return reviewers.filter((r) =>
      (r.displayName || r.username || '').toLowerCase().includes(q)
    );
  }, [reviewers, search]);

  const handleSelectReviewer = async (reviewer: DbReviewerSummary) => {
    await updateProfilePreferences({
      onboarding_step: 'completed',
      onboarding_completed: true,
    }).catch(() => {});
    router.push({ pathname: '/(tabs)/requests/reviewer/profile', params: { id: reviewer.id } } as any);
  };

  const handleSkip = async () => {
    await updateProfilePreferences({
      onboarding_step: 'completed',
      onboarding_completed: true,
    }).catch(() => {});
    router.push('/onboarding/thank-you?type=get-reviewed');
  };

  const renderReviewer = ({ item }: { item: DbReviewerSummary }) => (
    <TouchableOpacity 
      style={styles.reviewerCard}
      onPress={() => handleSelectReviewer(item)}
      activeOpacity={0.7}
    >
      <Avatar 
        uri={avatarMap[item.id]} 
        size={64} 
        name={item.displayName || item.username || 'Reviewer'}
      />
      <View style={styles.reviewerInfo}>
        <Text style={styles.reviewerName}>{item.displayName || item.username || 'Reviewer'}</Text>
        {item.bio && (
          <Text style={styles.reviewerBio} numberOfLines={2}>{item.bio}</Text>
        )}
        {item.pricePerReview && (
          <Text style={styles.reviewerPrice}>${item.pricePerReview.toFixed(2)} per review</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Discover Reviewers</Text>
        <Text style={styles.subtitle}>Here’s the full list of Auro reviewers. Tap one to explore or skip for now.</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviewers..."
            placeholderTextColor={Colors.brand.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Spinner size={40} color={Colors.brand.accentMagenta} />
        </View>
      ) : (
        <>
          <FlatList
            data={filteredReviewers}
            renderItem={renderReviewer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No reviewers found</Text>
              </View>
            }
          />
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>I'll do it later</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 20,
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.brand.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  reviewerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: 'transparent',
  },
  reviewerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  reviewerBio: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 8,
  },
  reviewerPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.accentOrange,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  skipButton: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
});


