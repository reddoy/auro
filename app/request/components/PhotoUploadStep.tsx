import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import type { RequestData } from '../index';
import { uploadRequestMedia } from '@/lib/uploads';

type Props = {
  requestData: RequestData;
  onPhotosChange: (photos: RequestData['photos']) => void;
  onNext: () => void;
  onBack: () => void;
  supabase: any;
};

const MAX_PHOTOS = 10;

export default function PhotoUploadStep({ requestData, onPhotosChange, onNext, onBack, supabase }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    // Request permissions
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload photos.'
        );
      }
    })();
  }, []);

  const handlePickImages = async (category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots') => {
    try {
      const currentPhotos = requestData.photos[category];
      const remaining = MAX_PHOTOS - currentPhotos.length;

      if (remaining <= 0) {
        Alert.alert('Limit Reached', `You can only upload up to ${MAX_PHOTOS} photos.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: remaining,
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      if (assets.length === 0) return;

      setUploading(true);

      // Upload each image
      const uploadPromises = assets.map(async (asset, index) => {
        const uploadKey = `${category}_${Date.now()}_${index}`;
        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));

        try {
          // Map category to RequestMediaCategory
          let mediaCategory: 'outfit' | 'roomTour' | 'roomPhoto' | 'datingProfile' | 'other' = 'other';
          if (category === 'datingProfileScreenshots') {
            mediaCategory = 'datingProfile';
          } else if (category === 'outfits') {
            mediaCategory = 'outfit';
          } else if (category === 'roomTourPhotos') {
            mediaCategory = 'roomTour';
          }

          const { publicUrl, path } = await uploadRequestMedia(asset.uri, {
            category: mediaCategory,
            onProgress: (percent) => {
              setUploadProgress(prev => ({ ...prev, [uploadKey]: percent }));
            },
          });

          return publicUrl || path;
        } catch (error: any) {
          console.error(`Upload error for ${uploadKey}:`, error);
          throw error;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Update photos
      onPhotosChange({
        ...requestData.photos,
        [category]: [...currentPhotos, ...uploadedUrls],
      });

      Alert.alert('Success', `${uploadedUrls.length} photo(s) uploaded successfully!`);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const removePhoto = (category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', index: number) => {
    const currentPhotos = requestData.photos[category];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    onPhotosChange({
      ...requestData.photos,
      [category]: newPhotos,
    });
  };

  const renderPhotoGrid = (
    category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots',
    title: string,
    description: string
  ) => {
    const photos = requestData.photos[category];
    const remaining = MAX_PHOTOS - photos.length;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>

        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <ExpoImage
                source={{ uri: photo }}
                style={styles.photoImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(category, index)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          {remaining > 0 && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={() => handlePickImages(category)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.brand.accentOrange} />
              ) : (
                <>
                  <Ionicons name="add" size={32} color={Colors.brand.accentOrange} />
                  <Text style={styles.addPhotoText}>
                    Add{remaining < MAX_PHOTOS ? ` (${remaining} left)` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const totalPhotos =
    requestData.photos.outfits.length +
    requestData.photos.roomTourPhotos.length +
    requestData.photos.datingProfileScreenshots.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Upload Your Photos</Text>
        <Text style={styles.description}>
          Upload up to {MAX_PHOTOS} photos from your dating profile for personalized feedback
        </Text>
        {totalPhotos > 0 && (
          <Text style={styles.photoCount}>
            {totalPhotos} / {MAX_PHOTOS} photos uploaded
          </Text>
        )}
      </View>

      {renderPhotoGrid(
        'datingProfileScreenshots',
        'Dating Profile Photos',
        'Upload photos from your dating profile (Hinge, Bumble, Tinder, etc.)'
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={onNext}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={uploading}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  photoCount: {
    fontSize: 14,
    color: Colors.brand.accentOrange,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: '30%', // 3 columns with gap
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  addPhotoButton: {
    width: '30%', // 3 columns with gap
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackground,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.brand.accentOrange,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
  },
  button: {
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
});
