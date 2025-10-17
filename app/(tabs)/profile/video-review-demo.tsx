import React, { useState, useRef } from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Alert, ScrollView, Modal, Platform, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import * as ImagePicker from 'expo-image-picker';

type DatingProfileData = {
  profilePhoto: string | null;
  reviewerNote: string;
  isSubmitted: boolean;
};

export default function DatingProfileUploadScreen() {
  const insets = useSafeAreaInsets();
  const [profileData, setProfileData] = useState<DatingProfileData>({
    profilePhoto: null,
    reviewerNote: '',
    isSubmitted: false
  });
  const [revieweeName] = useState('Sarah'); // Demo reviewee name

  const handlePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setProfileData(prev => ({ ...prev, profilePhoto: asset.uri }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const handleSubmit = () => {
    if (!profileData.profilePhoto) {
      Alert.alert('Missing Photo', 'Please upload a profile photo before submitting.');
      return;
    }
    if (!profileData.reviewerNote.trim()) {
      Alert.alert('Missing Note', 'Please add a note for the reviewer before submitting.');
      return;
    }
    
    setProfileData(prev => ({ ...prev, isSubmitted: true }));
  };

  const handleShareToTikTok = () => {
    Alert.alert('Share to TikTok', 'This would open TikTok to share the review!');
  };

  const handleShareToInstagram = () => {
    Alert.alert('Share to Instagram', 'This would open Instagram to share the review!');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dating Profile Upload</Text>
        <View style={styles.placeholder} />
      </View>

      {!profileData.isSubmitted ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.demoInfo}>
            <Text style={styles.demoTitle}>💕 Dating Profile Review</Text>
            <Text style={styles.demoDescription}>
              Upload your dating profile photo and add a note for the reviewer to get feedback on your profile.
            </Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Profile Photo</Text>
            <Text style={styles.sectionSubtitle}>Upload your best dating profile photo</Text>
            
            <View style={styles.photoUploadContainer}>
              {profileData.profilePhoto ? (
                <View style={styles.photoPreview}>
                  <Image 
                    source={{ uri: profileData.profilePhoto }} 
                    style={styles.uploadedPhoto}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePhotoUpload}
                  >
                    <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePhotoUpload}
                >
                  <Text style={styles.uploadButtonText}>📷 Upload Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Note for Reviewer</Text>
            <Text style={styles.sectionSubtitle}>Tell the reviewer what you'd like feedback on</Text>
            
            <TextInput
              style={styles.noteInput}
              placeholder="e.g., 'Please review my profile photo and suggest improvements for better matches'"
              placeholderTextColor={Colors.brand.textSecondary}
              value={profileData.reviewerNote}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, reviewerNote: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, (!profileData.profilePhoto || !profileData.reviewerNote.trim()) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!profileData.profilePhoto || !profileData.reviewerNote.trim()}
            >
              <LinearGradient
                colors={(!profileData.profilePhoto || !profileData.reviewerNote.trim()) ? ['#ccc', '#999'] : [Colors.brand.accentOrange, Colors.brand.primary]}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>
                  Submit for Review
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {(!profileData.profilePhoto || !profileData.reviewerNote.trim()) && (
              <Text style={styles.helpText}>
                Please upload a photo and add a note before submitting
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.thankYouContainer}>
            <Text style={styles.thankYouTitle}>🎉 Thank You!</Text>
            <Text style={styles.thankYouMessage}>
              Thank you for submitting {revieweeName}'s review! {revieweeName} said you can share this review!
            </Text>
            
            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareToTikTok}
              >
                <LinearGradient
                  colors={['#000000', '#333333']}
                  style={styles.shareButtonGradient}
                >
                  <Text style={styles.shareButtonText}>🎵 Share to TikTok</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareToInstagram}
              >
                <LinearGradient
                  colors={['#E4405F', '#C13584']}
                  style={styles.shareButtonGradient}
                >
                  <Text style={styles.shareButtonText}>📸 Share to Instagram</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.brand.cardBackground,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  demoInfo: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  demoDescription: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
  },
  sectionContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 16,
  },
  photoUploadContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    alignItems: 'center',
  },
  uploadedPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
  },
  changePhotoButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  changePhotoButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
    fontSize: 16,
  },
  noteInput: {
    backgroundColor: Colors.brand.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
    minHeight: 100,
  },
  submitContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  submitButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  thankYouContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
  },
  thankYouMessage: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shareButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  shareButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shareButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
});

