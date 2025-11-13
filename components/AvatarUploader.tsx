import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View as RNView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import Colors from '@/constants/Colors';
import { Text } from '@/components/Themed';
import { Text as RNText } from 'react-native';
import { uploadAvatar, removeAvatar } from '@/lib/profile';
import Spinner from '@/components/Spinner';

type UploadResult = { publicUrl: string; path: string };

type Props = {
  uri?: string | null;
  onUploaded: (r: UploadResult) => void;
  onRemoved: () => void;
  size?: number;
  accessibilityLabel?: string;
  previousPathOrUrl?: string | null; // if known, used to delete previous image after replace
};

export default function AvatarUploader(props: Props) {
  const { uri, onUploaded, onRemoved, size = 96, accessibilityLabel, previousPathOrUrl } = props;
  const [uploading, setUploading] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const avatarContainerRef = useRef<any>(null);

  const radius = useMemo(() => size / 2, [size]);

  // Force background color on web using ref
  useEffect(() => {
    if (Platform.OS === 'web' && avatarContainerRef.current) {
      const element = avatarContainerRef.current as HTMLElement;
      if (element && element.style) {
        element.style.backgroundColor = '#2A1B3D';
      }
    }
  }, []);

  // Show "Add Photo" only after a delay if no URI is provided
  useEffect(() => {
    if (!uri) {
      const timer = setTimeout(() => setShowAddPhoto(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowAddPhoto(false);
    }
  }, [uri]);

  const requestPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to select an avatar.');
      return false;
    }
    return true;
  }, []);

  const pickAndUpload = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) return;
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.92,
      });
      if (result.canceled || !result.assets?.length) {
        setUploading(false);
        return;
      }
      const fileUri = result.assets[0].uri;
      const uploaded = await uploadAvatar(fileUri);
      // Best-effort clean up of previous avatar
      if (previousPathOrUrl) {
        try { await removeAvatar(previousPathOrUrl); } catch {}
      }
      onUploaded(uploaded);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload avatar.');
    } finally {
      setUploading(false);
    }
  }, [onUploaded, previousPathOrUrl, requestPermission]);

  const handleLongPress = useCallback(() => {
    if (!uri) return;
    Alert.alert('Remove photo', 'Remove your current avatar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            setUploading(true);
            if (uri) {
              try { await removeAvatar(uri); } catch {}
            }
            onRemoved();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to remove avatar');
          } finally {
            setUploading(false);
          }
        }
      }
    ]);
  }, [uri, onRemoved]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || 'Change profile photo'}
      onPress={pickAndUpload}
      onLongPress={handleLongPress}
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: radius,
          backgroundColor: 'transparent', // Explicitly set transparent for web
        }
      ]}
    >
      <RNView 
        ref={avatarContainerRef}
        style={[
          styles.avatarContainer, // Base styles first
          { 
            width: size, 
            height: size, 
            borderRadius: radius,
            alignItems: 'center', 
            justifyContent: 'center', 
            borderWidth: 2,
            borderColor: Colors.brand.accentOrange,
            // Force cardBackground color - use Platform.select to ensure web gets the right color
            backgroundColor: Platform.select({
              web: '#2A1B3D', // Direct hex for web to avoid any theme issues
              default: Colors.brand.cardBackground,
            }),
          },
        ]}
        // Web-specific props to force background
        {...(Platform.OS === 'web' && {
          // @ts-ignore - web-specific prop
          dataSet: { backgroundColor: '#2A1B3D' },
        })}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" transition={200} />
        ) : showAddPhoto ? (
          <RNText style={styles.placeholderText}>Add Photo</RNText>
        ) : (
          <Spinner 
            size={size * 0.4} 
            color={Colors.brand.accentMagenta} 
            borderColor={Colors.brand.border}
          />
        )}
      </RNView>
      
      {uploading && (
        <RNView style={[styles.overlay, { borderRadius: radius }]}> 
          <Spinner 
            size={size * 0.3} 
            color={Colors.brand.accentMagenta} 
            borderColor={Colors.brand.border}
          />
        </RNView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { 
    overflow: 'hidden',
    backgroundColor: 'transparent', // Ensure no background color inheritance
    borderWidth: 0, // Explicitly remove any border
    borderColor: 'transparent',
  },
  avatarContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Platform.select({
      web: '#2A1B3D', // Force cardBackground on web
      default: Colors.brand.cardBackground,
    }),
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackground },
  placeholderText: { color: Colors.brand.textPrimary, fontSize: 12, fontWeight: '600' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});


