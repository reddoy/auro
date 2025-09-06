import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { View } from '@/components/Themed';
import Colors from '@/constants/Colors';

type Props = {
  uri: string;
  thumbStyle?: any;
  accessibilityLabel?: string;
};

export default function LightboxImage({ uri, thumbStyle, accessibilityLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [fullError, setFullError] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Pressable onPress={onOpen} accessibilityLabel={accessibilityLabel || 'Open image'}>
        {!thumbError ? (
          <Image source={{ uri }} style={thumbStyle} contentFit="cover" transition={200} cachePolicy="disk" onError={() => setThumbError(true)} />
        ) : (
          <View style={[thumbStyle, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackgroundSecondary, borderRadius: 12 }]}>
            <Text style={{ color: Colors.brand.textSecondary, fontSize: 10 }}>No Img</Text>
          </View>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close image" />
          {!fullError ? (
            <Image
              source={{ uri }}
              style={styles.full}
              contentFit="contain"
              transition={200}
              cachePolicy="disk"
              onError={() => setFullError(true)}
            />
          ) : (
            <View style={[styles.full, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff' }}>Image failed to load</Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%' },
});


