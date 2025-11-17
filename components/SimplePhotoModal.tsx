import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, Dimensions, Text, PanResponder, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export default function SimplePhotoModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const [lastScale, setLastScale] = useState(1);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Enable if there are 2 touches (pinch) or if already zoomed
        return evt.nativeEvent.touches.length === 2 || lastScale > 1;
      },
      
      onPanResponderGrant: () => {
        // Set initial values
        scale.setOffset(lastScale);
        translateX.setOffset(lastTranslateX);
        translateY.setOffset(lastTranslateY);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;
        
        if (touches.length === 2) {
          // Pinch to zoom
          const touch1 = touches[0];
          const touch2 = touches[1];
          
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          // Use initial distance as reference (stored in gestureState)
          if (!(gestureState as any).initialDistance) {
            (gestureState as any).initialDistance = distance;
            (gestureState as any).initialScale = lastScale;
          }
          
          const scaleFactor = distance / (gestureState as any).initialDistance;
          const newScale = Math.max(1, Math.min(4, (gestureState as any).initialScale * scaleFactor));
          
          scale.setValue(newScale);
          setIsZoomed(newScale > 1);
        } else if (lastScale > 1) {
          // Pan when zoomed
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      
      onPanResponderRelease: () => {
        // Flatten offset and value
        const currentScale = lastScale + (scale as any)._value;
        const currentTranslateX = lastTranslateX + (translateX as any)._value;
        const currentTranslateY = lastTranslateY + (translateY as any)._value;
        
        // Clamp scale
        const clampedScale = Math.max(1, Math.min(4, currentScale));
        
        // Clamp translation based on zoom level
        const imageWidth = width * 0.9;
        const imageHeight = height * 0.7;
        const maxTranslate = (clampedScale - 1) * Math.max(imageWidth, imageHeight) / 2;
        const clampedTranslateX = Math.max(-maxTranslate, Math.min(maxTranslate, currentTranslateX));
        const clampedTranslateY = Math.max(-maxTranslate, Math.min(maxTranslate, currentTranslateY));
        
        // Animate to clamped values
        Animated.parallel([
          Animated.spring(scale, {
            toValue: clampedScale,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          }),
          Animated.spring(translateX, {
            toValue: clampedTranslateX,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          }),
          Animated.spring(translateY, {
            toValue: clampedTranslateY,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          }),
        ]).start(() => {
          // Update last values after animation
          setLastScale(clampedScale);
          setLastTranslateX(clampedTranslateX);
          setLastTranslateY(clampedTranslateY);
          setIsZoomed(clampedScale > 1);
          
          // Reset offsets
          scale.flattenOffset();
          translateX.flattenOffset();
          translateY.flattenOffset();
          
          scale.setValue(clampedScale);
          translateX.setValue(clampedTranslateX);
          translateY.setValue(clampedTranslateY);
        });
      },
    })
  ).current;

  const handleClose = () => {
    // Reset zoom state
    setLastScale(1);
    setLastTranslateX(0);
    setLastTranslateY(0);
    setIsZoomed(false);
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    onClose();
  };

  const animatedStyle = {
    transform: [
      { scale: scale },
      { translateX: translateX },
      { translateY: translateY },
    ],
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <View 
          style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={animatedStyle}>
            <Image
              source={{ uri }}
              style={[
                styles.image,
                {
                  width: width * 0.9,
                  height: height * 0.7,
                }
              ]}
              contentFit="contain"
            />
          </Animated.View>
          
          {/* Instructions */}
          <View style={styles.instructions} pointerEvents="none">
            <Text style={styles.instructionText}>
              {isZoomed ? 'Pinch to zoom • Drag to pan • Tap outside to close' : 'Pinch to zoom • Tap outside to close'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
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

