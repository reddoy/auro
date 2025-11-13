import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, View as RNView, Platform } from 'react-native';
import { View, Text } from './Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { submitReviewerReview, getReviewerReviewByRequestId, type ReviewerReview } from '@/lib/api';

type Props = {
  visible: boolean;
  requestId: string;
  reviewerName: string;
  onClose: () => void;
  onSuccess?: (review: ReviewerReview) => void;
};

export default function ReviewerReviewModal({ visible, requestId, reviewerName, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingReview, setExistingReview] = useState<ReviewerReview | null>(null);

  // Load existing review if it exists
  useEffect(() => {
    if (visible && requestId) {
      setLoading(true);
      getReviewerReviewByRequestId(requestId)
        .then((review) => {
          if (review) {
            setExistingReview(review);
            setRating(review.rating);
            setComment(review.comment || '');
          } else {
            setExistingReview(null);
            setRating(0);
            setComment('');
          }
        })
        .catch((error) => {
          console.error('Failed to load existing review:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, requestId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const review = await submitReviewerReview({
        requestId,
        rating,
        comment: comment.trim() || undefined,
      });
      
      Alert.alert('Success', 'Your review has been submitted!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess?.(review);
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setComment('');
      setExistingReview(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingReview ? 'Update Your Review' : 'Review Your Reviewer'}
            </Text>
            <Text style={styles.subtitle}>
              How was your experience with {reviewerName}?
            </Text>
          </View>

          {loading ? (
            <RNView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.brand.accentMagenta} />
            </RNView>
          ) : (
            <>
              {/* Rating Selection */}
              <View style={styles.ratingSection}>
                <Text style={styles.sectionLabel}>Rating</Text>
                <RNView style={styles.ratingButtons}>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRating(r)}
                      style={[
                        styles.ratingButton,
                        rating === r && styles.ratingButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingButtonText,
                          rating === r && styles.ratingButtonTextSelected,
                        ]}
                      >
                        {r === 1 ? '★' : r === 2 ? '★★' : r === 3 ? '★★★' : r === 4 ? '★★★★' : '★★★★★'}
                      </Text>
                      <Text
                        style={[
                          styles.ratingButtonLabel,
                          rating === r && styles.ratingButtonLabelSelected,
                        ]}
                      >
                        {r === 1 ? 'Poor' : r === 2 ? 'Fair' : r === 3 ? 'Good' : r === 4 ? 'Very Good' : 'Excellent'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </RNView>
              </View>

              {/* Comment Section */}
              <View style={styles.commentSection}>
                <Text style={styles.sectionLabel}>Comment (Optional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your thoughts about the reviewer..."
                  placeholderTextColor={Colors.brand.textSecondary}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!submitting}
                />
              </View>

              {/* Action Buttons */}
              <RNView style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    rating === 0 && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || rating === 0}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.brand.textOnGradient} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {existingReview ? 'Update Review' : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </RNView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.brand.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.border,
  },
  ratingButtonSelected: {
    borderColor: Colors.brand.accentMagenta,
    backgroundColor: 'rgba(255, 0, 255, 0.1)',
  },
  ratingButtonText: {
    fontSize: 20,
    color: Colors.brand.textSecondary,
    marginBottom: 4,
  },
  ratingButtonTextSelected: {
    color: Colors.brand.accentMagenta,
  },
  ratingButtonLabel: {
    fontSize: 10,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
  },
  ratingButtonLabelSelected: {
    color: Colors.brand.accentMagenta,
    fontWeight: '600',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 12,
    padding: 16,
    color: Colors.brand.textPrimary,
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.border,
  },
  cancelButtonText: {
    color: Colors.brand.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.brand.accentMagenta,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

