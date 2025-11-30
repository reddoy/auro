import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, View as RNView, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { View, Text } from './Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
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

  // Handle Escape key on web
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, submitting]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Review your reviewer"
    >
      <View style={styles.backdrop} lightColor="rgba(0, 0, 0, 0.5)" darkColor="rgba(0, 0, 0, 0.5)">
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]} lightColor={Colors.brand.cardBackground} darkColor={Colors.brand.cardBackground}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.header} lightColor="transparent" darkColor="transparent">
                <Text style={styles.title}>
                  {existingReview ? 'Update Your Review' : 'Review Your Reviewer'}
                </Text>
                <Text style={styles.subtitle}>
                  How was your experience with {reviewerName}?
                </Text>
              </View>

              {loading ? (
                <RNView style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
                  <ActivityIndicator size="large" color={Colors.brand.accentMagenta} />
                </RNView>
              ) : (
                <>
                  {/* Rating Selection */}
                  <View style={styles.ratingSection} lightColor="transparent" darkColor="transparent">
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
                      accessibilityLabel={`Rate ${r} out of 5: ${r === 1 ? 'Poor' : r === 2 ? 'Fair' : r === 3 ? 'Good' : r === 4 ? 'Very Good' : 'Excellent'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: rating === r }}
                    >
                      <RNView style={styles.starsContainer}>
                        {r <= 3 ? (
                          // For 1-3 stars, show in a single row
                          Array.from({ length: r }).map((_, index) => (
                            <FontAwesome
                              key={index}
                              name="star"
                              size={14}
                              color={rating === r ? Colors.brand.accentMagenta : Colors.brand.textSecondary}
                              style={styles.starIcon}
                            />
                          ))
                        ) : r === 4 ? (
                          // For 4 stars (Very Good), show 2x2 grid
                          <RNView style={styles.starsGrid}>
                            <RNView style={styles.starsRow}>
                              {[0, 1].map((index) => (
                                <FontAwesome
                                  key={index}
                                  name="star"
                                  size={12}
                                  color={rating === r ? Colors.brand.accentMagenta : Colors.brand.textSecondary}
                                  style={styles.starIcon}
                                />
                              ))}
                            </RNView>
                            <RNView style={styles.starsRow}>
                              {[2, 3].map((index) => (
                                <FontAwesome
                                  key={index}
                                  name="star"
                                  size={12}
                                  color={rating === r ? Colors.brand.accentMagenta : Colors.brand.textSecondary}
                                  style={styles.starIcon}
                                />
                              ))}
                            </RNView>
                          </RNView>
                        ) : (
                          // For 5 stars (Excellent), show 2 on top, 3 on bottom
                          <RNView style={styles.starsGrid}>
                            <RNView style={styles.starsRow}>
                              {[0, 1].map((index) => (
                                <FontAwesome
                                  key={index}
                                  name="star"
                                  size={12}
                                  color={rating === r ? Colors.brand.accentMagenta : Colors.brand.textSecondary}
                                  style={styles.starIcon}
                                />
                              ))}
                            </RNView>
                            <RNView style={styles.starsRow}>
                              {[2, 3, 4].map((index) => (
                                <FontAwesome
                                  key={index}
                                  name="star"
                                  size={12}
                                  color={rating === r ? Colors.brand.accentMagenta : Colors.brand.textSecondary}
                                  style={styles.starIcon}
                                />
                              ))}
                            </RNView>
                          </RNView>
                        )}
                      </RNView>
                      <Text
                        style={[
                          styles.ratingButtonLabel,
                          rating === r && styles.ratingButtonLabelSelected,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {r === 1 ? 'Poor' : r === 2 ? 'Fair' : r === 3 ? 'Good' : r === 4 ? 'Very Good' : 'Excellent'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </RNView>
              </View>

              {/* Comment Section */}
              <View style={styles.commentSection} lightColor="transparent" darkColor="transparent">
                <Text style={styles.sectionLabel}>Comment (Optional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={Colors.brand.textSecondary}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!submitting}
                  accessibilityLabel="Review comment"
                  accessibilityHint="Optional comment about your experience with the reviewer"
                />
              </View>

                  {/* Action Buttons */}
                  <RNView style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={handleClose}
                      disabled={submitting}
                      accessibilityLabel="Cancel review"
                      accessibilityRole="button"
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
                      accessibilityLabel={existingReview ? 'Update review' : 'Submit review'}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: submitting || rating === 0 }}
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  scrollView: {
    maxHeight: 600,
  },
  scrollViewContent: {
    paddingBottom: 0,
  },
  modalContent: {
    backgroundColor: Colors.brand.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 32,
    maxHeight: 600,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.brand.border,
    width: '100%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ratingSection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    fontFamily: 'Poppins_700Bold',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderWidth: 2,
    borderColor: Colors.brand.border,
    minHeight: 95,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ratingButtonSelected: {
    borderColor: Colors.brand.accentMagenta,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  starsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    minHeight: 32,
  },
  starsGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  starIcon: {
    marginHorizontal: 0,
  },
  ratingButtonLabel: {
    fontSize: 10,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    paddingHorizontal: 2,
  },
  ratingButtonLabelSelected: {
    color: Colors.brand.accentMagenta,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  commentSection: {
    marginBottom: 28,
  },
  commentInput: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 16,
    padding: 16,
    color: Colors.brand.textPrimary,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    fontFamily: 'Poppins_400Regular',
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
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  submitButton: {
    backgroundColor: Colors.brand.accentMagenta,
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
  },
});

