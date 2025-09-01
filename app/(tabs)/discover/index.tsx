import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getInfluencers } from '@/lib/api';
import type { DbInfluencerSummary } from '@/types';

export default function DiscoverScreen() {
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<DbInfluencerSummary[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getInfluencers();
        setInfluencers(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleInfluencerPress = (influencerId: string) => {
    router.push(`/(tabs)/discover/influencer/${influencerId}`);
  };

  const handleRequestReview = () => {
    router.push('/(tabs)/requests/new');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/auro_mirror_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Discover Influencers</Text>
          <Text style={styles.subtitle}>Get reviewed by top influencer women</Text>
          
          <Pressable style={styles.requestButton} onPress={handleRequestReview}>
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestButtonGradient}
            />
            <Text style={styles.requestButtonText}>Request a Review</Text>
          </Pressable>
        </View>
      </ExpoLinearGradient>

      <View style={[styles.influencersGrid, { paddingBottom: 80 + insets.bottom }]}>
        {loading ? (
          <Text style={{ color: Colors.brand.textSecondary }}>Loading...</Text>
        ) : influencers.length === 0 ? (
          <Text style={{ color: Colors.brand.textSecondary }}>No influencers found.</Text>
        ) : influencers.map((influencer) => (
          <TouchableOpacity
            key={influencer.id}
            style={styles.influencerCard}
            onPress={() => handleInfluencerPress(influencer.id)}
          >
            <Image source={{ uri: influencer.profileImage }} style={styles.profileImage} />
            <View style={styles.cardContent}>
              <View style={styles.nameContainer}>
                <Text style={styles.influencerName}>{influencer.name}</Text>
                {influencer.verified && <Text style={styles.verifiedBadge}>✓</Text>}
              </View>
              <Text style={styles.username}>{influencer.username}</Text>
              <Text style={styles.followerCount}>
                {(influencer.followerCount / 1000000).toFixed(1)}M followers
              </Text>
              <View style={styles.specialtiesContainer}>
                {influencer.specialties.map((specialty, index) => (
                  <Text key={index} style={styles.specialty}>
                    {specialty}
                  </Text>
                ))}
              </View>
              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>⭐ {influencer.rating}</Text>
                <Text style={styles.price}>${influencer.pricePerReview}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    color: Colors.brand.textOnGradient,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textOnGradient,
    marginBottom: 28,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
  },
  requestButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  
  requestButtonGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  requestButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  influencersGrid: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  influencerCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0,
    overflow: 'hidden',
    minHeight: 120,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 0,
    shadowColor: Colors.brand.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  influencerName: {
    fontSize: 19,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
    color: Colors.brand.textPrimary,
  },
  verifiedBadge: {
    marginLeft: 6,
    color: Colors.brand.success,
    fontSize: 18,
  },
  username: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 4,
  },
  followerCount: {
    fontSize: 14,
    color: Colors.brand.textLight,
    marginBottom: 10,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  specialty: {
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    marginRight: 8,
    marginBottom: 6,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
  },
  price: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.brand.accentMagenta,
  },
});



