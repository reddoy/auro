import React from 'react';
import { Modal, Pressable, StyleSheet, View, Text, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';

type Props = {
  visible: boolean;
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImageGalleryModal({ visible, uris, initialIndex = 0, onClose }: Props) {
  const listRef = React.useRef<FlatList<string>>(null);
  const [index, setIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 0);
    }
  }, [visible, initialIndex]);

  const { width, height } = Dimensions.get('window');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close gallery" />
        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(i);
          }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height, resizeMode: 'contain' }}
              contentFit="contain"
              cachePolicy="disk"
              transition={200}
            />
          )}
        />
        <View style={styles.counter}><Text style={styles.counterText}>{index + 1}/{uris.length}</Text></View>
        <View style={styles.footer}>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close gallery">
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  counter: { position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  counterText: { color: '#fff', fontWeight: '700' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  closeButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  closeButtonText: { color: '#fff', fontWeight: '700' },
});


