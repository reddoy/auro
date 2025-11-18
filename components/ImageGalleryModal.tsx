import React from 'react';
import { Modal, Pressable, StyleSheet, View, FlatList, Dimensions, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
};

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
};

export function ZoomableImage({ uri, width, height }: ZoomableImageProps) {
  // Simple web-compatible version without gesture handlers
  // For native platforms, you'd want to add react-native-gesture-handler support
  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="contain"
        cachePolicy="none"
        transition={200}
      />
    </View>
  );
}

export default function ImageGalleryModal({ visible, uris, initialIndex = 0, onClose }: Props) {
  const listRef = React.useRef<FlatList<string>>(null);
  const [index, setIndex] = React.useState(initialIndex);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      // Scroll after mount; getItemLayout prevents measurement issues
      setTimeout(() => {
        try { listRef.current?.scrollToIndex({ index: initialIndex, animated: false }); } catch {}
      }, 0);
    }
  }, [visible, initialIndex]);

  const { width, height } = Dimensions.get('window');

  const getItemLayout = (_: any, i: number) => ({ length: width, offset: width * i, index: i });

  const onScrollToIndexFailed = (info: { index: number; averageItemLength: number; distance: number }) => {
    // Fallback: scroll to approximate offset, then retry
    try {
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 50);
    } catch {}
  };

  const goTo = (i: number) => {
    if (!uris?.length) return;
    const clamped = Math.max(0, Math.min(uris.length - 1, i));
    setIndex(clamped);
    try { listRef.current?.scrollToIndex({ index: clamped, animated: true }); } catch {}
  };

  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Image gallery"
    >
      <View style={styles.backdrop}>
        <Pressable 
          style={[StyleSheet.absoluteFill, { zIndex: 0 }]} 
          onPress={onClose} 
          accessibilityLabel="Close gallery"
          accessibilityRole="button"
        />
        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(i);
          }}
          renderItem={({ item, index: itemIndex }) => (
            <View 
              accessibilityLabel={`Image ${itemIndex + 1} of ${uris.length}`}
              accessibilityRole="image"
            >
              <ZoomableImage uri={item} width={width} height={height} />
            </View>
          )}
        />
        {/* Counter (top-left) */}
        <View 
          style={[styles.counter, { top: insets.top + 16 }]}
          accessibilityLabel={`Image ${index + 1} of ${uris.length}`}
          accessibilityRole="text"
        >
          <Text style={styles.counterText}>{index + 1}/{uris.length}</Text>
        </View>
        
        {/* Zoom hint (bottom-center) */}
        <View style={[styles.zoomHint, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.zoomHintText}>Pinch to zoom • Drag to pan</Text>
        </View>

        {/* Close button (top-right) - positioned with safe area */}
        <Pressable 
          onPress={onClose} 
          style={[styles.closeButton, { top: insets.top + 16 }]} 
          accessibilityLabel="Close gallery"
          accessibilityRole="button"
          accessibilityHint="Double tap to close the image gallery"
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>

        {/* Arrows for web (and optionally native) */}
        {(Platform.OS === 'web' && uris.length > 1) ? (
          <View style={styles.arrowsWrap} pointerEvents="box-none">
            <Pressable 
              onPress={goPrev} 
              style={[styles.arrowButton, { left: 12 }]} 
              accessibilityLabel="Previous image"
              accessibilityRole="button"
              accessibilityHint={`Go to image ${index} of ${uris.length}`}
              disabled={index === 0}
            >
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Pressable 
              onPress={goNext} 
              style={[styles.arrowButton, { right: 12 }]} 
              accessibilityLabel="Next image"
              accessibilityRole="button"
              accessibilityHint={`Go to image ${index + 2} of ${uris.length}`}
              disabled={index === uris.length - 1}
            >
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  counter: { position: 'absolute', left: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, zIndex: 3 },
  counterText: { color: '#fff', fontWeight: '700' },
  closeButton: { 
    position: 'absolute', 
    right: 16, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 3,
    // Add subtle shadow for better visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: { color: '#fff', fontWeight: '900', fontSize: 24, lineHeight: 24 },
  arrowsWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  arrowButton: { 
    position: 'absolute', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.45)', 
    alignItems: 'center', 
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  arrowText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 28 },
  zoomHint: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
    zIndex: 3 
  },
  zoomHintText: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 12, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
});


