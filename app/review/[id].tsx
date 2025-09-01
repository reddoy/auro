import React from 'react';
import { StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { getRequestById } from '@/lib/api';
import { getReviewerById } from '@/lib/api';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = React.useState(true);
  const [influencerName, setInfluencerName] = React.useState<string>('');
  const [influencerImage, setInfluencerImage] = React.useState<string>('');
  const [request, setRequest] = React.useState<any>(null);
  const review = request?.review;

  const parsedNotes = React.useMemo(() => {
    try {
      if (!request?.notes) return null;
      return typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes;
    } catch {
      return null;
    }
  }, [request?.notes]);

  const hasConsent = React.useMemo(() => typeof parsedNotes?.consent?.shareOnSocial === 'boolean', [parsedNotes]);
  const shareConsent = React.useMemo(() => !!parsedNotes?.consent?.shareOnSocial, [parsedNotes]);

  React.useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const req = await getRequestById(String(id));
        setRequest(req);
        if (req?.influencerId) {
          const rev = await getReviewerById(String(req.influencerId));
          if (rev) {
            setInfluencerName(rev.displayName);
            setInfluencerImage(rev.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Review not found</Text>
      </View>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return '#4CAF50';
    if (rating >= 6) return '#FF9800';
    return '#ff6b6b';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 8) return 'Excellent';
    if (rating >= 6) return 'Good';
    if (rating >= 4) return 'Fair';
    return 'Needs Work';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: influencerImage }} style={styles.influencerImage} />
        <View style={styles.headerInfo}>
          <Text style={styles.influencerName}>{influencerName}</Text>
          <Text style={styles.reviewDate}>
            {review?.createdAt ? `Reviewed on ${new Date(review.createdAt).toLocaleDateString()}` : 'Not completed'}
          </Text>
        </View>
      </View>

      {hasConsent ? (
        <View style={styles.consentBadge}>
          <Text style={[styles.consentBadgeText, { color: shareConsent ? '#4CAF50' : '#F44336' }]}>
            Sharing consent: {shareConsent ? 'Yes' : 'No'}
          </Text>
        </View>
      ) : null}

      {review ? (<View style={styles.ratingsSection}>
        <Text style={styles.sectionTitle}>Your Ratings</Text>
        <View style={styles.ratingsGrid}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Overall</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.overall ?? 0) }]}>
              {review?.ratings?.overall ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.overall ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Attractiveness</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.attractiveness ?? 0) }]}>
              {review?.ratings?.attractiveness ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.attractiveness ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Wardrobe</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.wardrobe ?? 0) }]}>
              {review?.ratings?.wardrobe ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.wardrobe ?? 0)}</Text>
          </View>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCategory}>Room</Text>
            <Text style={[styles.ratingNumber, { color: getRatingColor(review?.ratings?.room ?? 0) }]}>
              {review?.ratings?.room ?? 0}/10
            </Text>
            <Text style={styles.ratingLabel}>{getRatingLabel(review?.ratings?.room ?? 0)}</Text>
          </View>
        </View>
      </View>) : (
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Not completed</Text>
          <Text style={{ color: '#C7BFD9' }}>This request has not been reviewed yet.</Text>
        </View>
      )}

      {review && (<View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Feedback</Text>
        
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>✨ Your Strengths</Text>
          {review?.feedback?.strengths?.map((strength: string, index: number) => (
            <Text key={index} style={styles.feedbackItem}>• {strength}</Text>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>🎯 Areas for Improvement</Text>
          {review?.feedback?.improvements?.map((improvement: string, index: number) => (
            <Text key={index} style={styles.feedbackItem}>• {improvement}</Text>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>💬 General Feedback</Text>
          <Text style={styles.generalFeedback}>{review?.feedback?.generalFeedback}</Text>
        </View>
      </View>)}

      <View style={styles.photosSection}>
        <Text style={styles.sectionTitle}>Your Photos</Text>
        <View style={styles.photosGrid}>
          {request?.photos?.map((photo: string, index: number) => (
            <Image key={index} source={{ uri: photo }} style={styles.photo} />
          ))}
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/requests/new')}
        >
          <Text style={styles.actionButtonText}>Request Another Review</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/(tabs)/requests')}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0B2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#24123B',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  influencerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  influencerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 14,
    color: '#C7BFD9',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 15,
  },
  ratingsSection: {
    margin: 15,
    backgroundColor: '#24123B',
    borderRadius: 15,
    padding: 20,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ratingCard: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 10,
  },
  ratingCategory: {
    fontSize: 14,
    color: '#C7BFD9',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#C7BFD9',
  },
  feedbackSection: {
    margin: 15,
  },
  feedbackCard: {
    backgroundColor: '#24123B',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  feedbackItem: {
    fontSize: 14,
    color: '#C7BFD9',
    lineHeight: 22,
    marginBottom: 6,
  },
  generalFeedback: {
    fontSize: 14,
    color: '#C7BFD9',
    lineHeight: 22,
  },
  photosSection: {
    margin: 15,
    backgroundColor: '#24123B',
    borderRadius: 15,
    padding: 20,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photo: {
    width: '48%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionsSection: {
    margin: 15,
    marginBottom: 30,
  },
  consentBadge: {
    marginHorizontal: 15,
    marginTop: 12,
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#24123B',
    alignSelf: 'flex-start',
  },
  consentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#FF2D55',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF2D55',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#FF2D55',
  },
  errorText: {
    fontSize: 18,
    color: '#C7BFD9',
    textAlign: 'center',
    marginTop: 50,
  },
});
