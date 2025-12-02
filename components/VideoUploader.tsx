import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';

type Props = {
  onVideoSelected: (uri: string) => void;
  existingVideoUri?: string | null;
  onRemove?: () => void;
};

export default function VideoUploader({ onVideoSelected, existingVideoUri, onRemove }: Props) {
  const [uploading, setUploading] = useState(false);
  // useVideoPlayer hook must be called unconditionally, but we only use it when existingVideoUri exists
  const videoPlayer = useVideoPlayer(existingVideoUri || 'file://placeholder');

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your media library to upload your screen recording.'
      );
      return false;
    }
    return true;
  };

  const pickVideo = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 180, // 3 minutes max
      });

      if (result.canceled || !result.assets?.length) {
        setUploading(false);
        return;
      }

      const videoUri = result.assets[0].uri;
      onVideoSelected(videoUri);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not select video.');
    } finally {
      setUploading(false);
    }
  };

  if (existingVideoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.videoContainer}>
          {existingVideoUri && (
            <VideoView
              style={styles.video}
              player={videoPlayer}
              contentFit="cover"
              nativeControls={true}
            />
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={pickVideo}
            style={[styles.button, styles.replaceButton]}
            disabled={uploading}
          >
            <Text style={styles.replaceButtonText}>
              {uploading ? 'Selecting...' : 'Replace Video'}
            </Text>
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Remove Video',
                  'Are you sure you want to remove this video?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: onRemove,
                    },
                  ]
                );
              }}
              style={[styles.button, styles.removeButton]}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={pickVideo}
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        disabled={uploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? 'Selecting Video...' : 'Upload Screen Recording'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Select the screen recording you just created from your device's gallery
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadButton: {
    backgroundColor: Colors.brand.status.accepted,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceButton: {
    backgroundColor: Colors.brand.status.accepted,
  },
  replaceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  removeButton: {
    backgroundColor: Colors.brand.cardBackground,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  removeButtonText: {
    color: Colors.brand.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

