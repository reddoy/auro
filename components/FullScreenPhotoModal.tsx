import React, { useRef, useState } from 'react';
import { Modal, StyleSheet, View, Dimensions, Text, PanResponder, Animated, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export default function FullScreenPhotoModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const [lastScale, setLastScale] = useState(1);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);
  const [currentScale, setCurrentScale] = useState(1);
  
  // Use refs to track current values during gesture
  const gestureScale = useRef(1);
  const gestureTranslateX = useRef(0);
  const gestureTranslateY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only capture if 2 touches (pinch) or already zoomed
        return evt.nativeEvent.touches.length === 2 || currentScale > 1;
      },
      onMoveShouldSetPanResponder: (evt) => {
        // Enable if there are 2 touches (pinch) or if already zoomed
        return evt.nativeEvent.touches.length === 2 || currentScale > 1;
      },
      
      onPanResponderGrant: (evt) => {
        // Set initial values
        scale.setOffset(lastScale);
        translateX.setOffset(lastTranslateX);
        translateY.setOffset(lastTranslateY);
        
        // Initialize gesture refs
        gestureScale.current = lastScale;
        gestureTranslateX.current = lastTranslateX;
        gestureTranslateY.current = lastTranslateY;
        
        // Store initial pinch distance if 2 touches
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          (evt as any).initialDistance = distance;
          (evt as any).initialScale = lastScale;
        }
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
          
          const initialDistance = (evt as any).initialDistance || distance;
          const initialScale = (evt as any).initialScale || lastScale;
          
          const scaleFactor = distance / initialDistance;
          const newScale = Math.max(1, Math.min(4, initialScale * scaleFactor));
          
          gestureScale.current = newScale;
          scale.setValue(newScale);
          setCurrentScale(newScale);
        } else if (currentScale > 1) {
          // Pan when zoomed
          gestureTranslateX.current = gestureState.dx;
          gestureTranslateY.current = gestureState.dy;
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      
      onPanResponderRelease: () => {
        // Get current values from refs
        const scaleVal = gestureScale.current;
        const txVal = gestureTranslateX.current;
        const tyVal = gestureTranslateY.current;
        
        // Clamp scale
        const clampedScale = Math.max(1, Math.min(4, scaleVal));
        
        // Clamp translation based on zoom level
        const imageWidth = width;
        const imageHeight = height;
        const maxTranslate = (clampedScale - 1) * Math.max(imageWidth, imageHeight) / 2;
        const clampedTranslateX = Math.max(-maxTranslate, Math.min(maxTranslate, txVal));
        const clampedTranslateY = Math.max(-maxTranslate, Math.min(maxTranslate, tyVal));
        
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
          setCurrentScale(clampedScale);
          
          // Update refs
          gestureScale.current = clampedScale;
          gestureTranslateX.current = clampedTranslateX;
          gestureTranslateY.current = clampedTranslateY;
          
          // Reset offsets
          scale.flattenOffset();
          translateX.flattenOffset();
          translateY.flattenOffset();
          
          scale.setValue(clampedScale);
          translateX.setValue(clampedTranslateX);
          translateY.setValue(clampedTranslateY);
        });
      },
      
      onPanResponderTerminationRequest: () => {
        // Don't allow parent to take over if we're zoomed
        return currentScale <= 1;
      },
    })
  ).current;

  const handleClose = () => {
    // Reset zoom state
    setLastScale(1);
    setLastTranslateX(0);
    setLastTranslateY(0);
    setCurrentScale(1);
    gestureScale.current = 1;
    gestureTranslateX.current = 0;
    gestureTranslateY.current = 0;
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

  // Handle Escape key on web
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  return (
    <Modal 
      visible={visible} 
      transparent={false} 
      animationType="fade" 
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
      accessibilityViewIsModal={true}
      accessibilityLabel="Full screen photo viewer"
    >
      <View style={styles.container}>
        {/* Close button - top right */}
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 16, right: 16 }]} 
          onPress={handleClose}
          activeOpacity={0.7}
          accessibilityLabel="Close photo viewer"
          accessibilityRole="button"
          accessibilityHint="Double tap to close"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        {/* Zoomable image */}
        <View 
          style={styles.imageContainer}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.animatedContainer, animatedStyle]}>
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});


