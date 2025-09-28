import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export default function SimplePhotoModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImagePress = () => {
    if (isZoomed) {
      // Reset zoom
      setScale(1);
      setIsZoomed(false);
    } else {
      // Zoom in
      setScale(2);
      setIsZoomed(true);
    }
  };

  const handleClose = () => {
    setScale(1);
    setIsZoomed(false);
    onClose();
  };

  const { width, height } = Dimensions.get('window');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <Image
            source={{ uri }}
            style={[
              styles.image,
              {
                width: width * 0.9,
                height: height * 0.7,
                transform: [{ scale }]
              }
            ]}
            contentFit="contain"
            onPress={handleImagePress}
          />
          
          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isZoomed ? 'Tap to zoom out • Tap outside to close' : 'Tap to zoom in • Tap outside to close'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    borderRadius: 8,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});

