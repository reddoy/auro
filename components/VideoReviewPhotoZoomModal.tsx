import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, StyleSheet, View, Dimensions, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  runOnJS, 
  useAnimatedReaction, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming 
} from 'react-native-reanimated';
import MediaRecorder from '@/components/MediaRecorder';

type Props = {
  visible: boolean;
  uri: string;
  onClose: () => void;
  reviewerName?: string;
  revieweeName?: string;
  showVideoRecorder?: boolean;
  recorderTop?: number;
  recorderLeft?: number;
  recorderSize?: number;
  // MediaRecorder props
  videoUri?: string | null;
  onRecorded?: (uri: string) => void;
  onVideoUriChange?: (uri: string | null) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  showScreenRecordingMode?: boolean;
  onRecorderPress?: () => void;
};

export default function VideoReviewPhotoZoomModal({ 
  visible, 
  uri, 
  onClose,
  reviewerName,
  revieweeName,
  showVideoRecorder = false,
  recorderTop = 16,
  recorderLeft = 16,
  recorderSize = 130,
  videoUri,
  onRecorded,
  onVideoUriChange,
  onRecordingStart,
  onRecordingStop,
  showScreenRecordingMode = false,
  onRecorderPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const maxScale = 5;
  const containerAspect = useMemo(() => windowWidth / windowHeight, [windowWidth, windowHeight]);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  const imageAspectRatio = useSharedValue(containerAspect);
  const [isZoomed, setIsZoomed] = useState(false);

  const resetTransforms = useCallback((shouldAnimate = false) => {
    const animator = shouldAnimate ? withTiming : (value: number) => value;
    scale.value = animator(1, { duration: 200 });
    translateX.value = animator(0, { duration: 200 });
    translateY.value = animator(0, { duration: 200 });
  }, [scale, translateX, translateY]);

  useEffect(() => {
    if (!visible) {
      resetTransforms(false);
      setIsZoomed(false);
      return;
    }
  }, [visible, resetTransforms]);

  const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
  };

  const getPanBoundaries = () => {
    'worklet';
    const imageAspect = imageAspectRatio.value || containerAspect;
    let displayedWidth = windowWidth;
    let displayedHeight = windowHeight;

    if (imageAspect > containerAspect) {
      displayedWidth = windowWidth;
      displayedHeight = windowWidth / imageAspect;
    } else {
      displayedHeight = windowHeight;
      displayedWidth = windowHeight * imageAspect;
    }

    const scaledWidth = displayedWidth * scale.value;
    const scaledHeight = displayedHeight * scale.value;
    const maxTranslateX = Math.max(0, (scaledWidth - windowWidth) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - windowHeight) / 2);

    return { maxTranslateX, maxTranslateY };
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(startScale.value * event.scale, 1, maxScale);
      scale.value = nextScale;
      const { maxTranslateX, maxTranslateY } = getPanBoundaries();
      translateX.value = clamp(translateX.value, -maxTranslateX, maxTranslateX);
      translateY.value = clamp(translateY.value, -maxTranslateY, maxTranslateY);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 180 });
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.01) return;
      const { maxTranslateX, maxTranslateY } = getPanBoundaries();
      translateX.value = clamp(startTranslateX.value + event.translationX, -maxTranslateX, maxTranslateX);
      translateY.value = clamp(startTranslateY.value + event.translationY, -maxTranslateY, maxTranslateY);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        translateX.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(0, { duration: 160 });
      } else {
        const { maxTranslateX, maxTranslateY } = getPanBoundaries();
        translateX.value = clamp(translateX.value, -maxTranslateX, maxTranslateX);
        translateY.value = clamp(translateY.value, -maxTranslateY, maxTranslateY);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        resetTransforms(true);
      } else {
        scale.value = withTiming(2, { duration: 200 });
      }
    });

  const combinedGesture = Gesture.Simultaneous(doubleTapGesture, pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleImageLoad = (event: any) => {
    const { width, height } = event.source || {};
    const naturalWidth = event?.nativeEvent?.source?.width || width;
    const naturalHeight = event?.nativeEvent?.source?.height || height;
    if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0) {
      imageAspectRatio.value = naturalWidth / naturalHeight;
    }
  };

  useAnimatedReaction(
    () => scale.value > 1.02,
    (currentZoomed, previousZoomed) => {
      if (currentZoomed === previousZoomed) return;
      runOnJS(setIsZoomed)(currentZoomed);
    }
  );

  const handleClose = useCallback(() => {
    resetTransforms(true);
    setTimeout(() => {
      onClose();
      setIsZoomed(false);
    }, 200);
  }, [onClose, resetTransforms]);

  // Handle Escape key on web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleClose]);

  if (!visible) return null;

  // If showVideoRecorder is false, render as overlay (not a separate modal) so parent's MediaRecorder stays visible
  const containerStyle = showVideoRecorder 
    ? styles.container 
    : [styles.container, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }];

  const content = (
    <View style={containerStyle}>
        {/* Tap outside to close - only when not zoomed */}
        {!isZoomed && (
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        )}
        
        {/* Close button - top right */}
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 16, right: 16, zIndex: 200, elevation: 200 }]} 
          onPress={handleClose}
          activeOpacity={0.7}
          accessibilityLabel="Close photo viewer"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Video recorder, reviewer name, and reviewee name overlay - always visible on top when zooming */}
        {visible && onRecorded && (
          <View style={[styles.recorderOverlay, { top: insets.top + recorderTop, left: recorderLeft, zIndex: 200, elevation: 200 }]} pointerEvents="box-none">
            <View style={{ zIndex: 201, elevation: 201, backgroundColor: 'transparent' }}>
              <MediaRecorder
                onRecorded={onRecorded}
                variant="corner"
                circleSize={recorderSize}
                hideButtons={true}
                value={videoUri || undefined}
                onVideoUriChange={onVideoUriChange}
                onRecordingStart={onRecordingStart}
                onRecordingStop={onRecordingStop}
                showScreenRecordingMode={showScreenRecordingMode}
                onPress={onRecorderPress}
              />
            </View>
            {reviewerName && (
              <View style={[styles.reviewerNamePanel, { zIndex: 201, elevation: 201 }]}>
                <Text style={styles.reviewerNameText}>{reviewerName}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Zoomable image */}
        <View style={styles.imageContainer} pointerEvents="box-none">
          <GestureDetector gesture={combinedGesture}>
            <Animated.View style={[styles.animatedContainer, animatedStyle]}>
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="contain"
                onLoad={handleImageLoad}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
  );

  // If showVideoRecorder is false, render as overlay instead of Modal
  if (!showVideoRecorder) {
    return content;
  }

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      onRequestClose={handleClose}
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      accessibilityViewIsModal={true}
      accessibilityLabel="Full screen photo viewer"
    >
      {content}
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
  hintContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 5,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  recorderOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  reviewerNamePanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 90,
    alignItems: 'center',
  },
  reviewerNameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  revieweeNameOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
