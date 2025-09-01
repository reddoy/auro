import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Colors from '@/constants/Colors';
import { Text } from '@/components/Themed';
import { uploadAvatar, removeAvatar } from '@/lib/profile';

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

  const radius = useMemo(() => size / 2, [size]);

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
      style={[styles.container, { width: size, height: size, borderRadius: radius }]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
      {uploading && (
        <View style={[styles.overlay, { borderRadius: radius }]}> 
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackground },
  placeholderText: { color: Colors.brand.textSecondary, fontSize: 12 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});


