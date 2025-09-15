import React from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { View } from '@/components/Themed';
import Colors from '@/constants/Colors';

type Props = {
  uris: string[];
  onPressItem?: (index: number) => void;
  onLongPressItem?: (index: number) => void;
  height?: number;
};

export default function PhotoCarousel({ uris, onPressItem, onLongPressItem, height = 110 }: Props) {
  if (!Array.isArray(uris) || uris.length === 0) return null;
  return (
    <View style={{ backgroundColor: Colors.brand.cardBackground }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={uris}
        keyExtractor={(u, i) => `${u}-${i}`}
        getItemLayout={(_, i) => ({ length: height * 0.66 + 10, offset: (height * 0.66 + 10) * i, index: i })}
        onScrollToIndexFailed={(info) => {
          try {
            // Jump near the item then retry
            (info as any)._listRef?.scrollToOffset?.({ offset: info.averageItemLength * info.index, animated: false });
          } catch {}
        }}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => onPressItem?.(index)} onLongPress={() => onLongPressItem?.(index)} style={styles.thumbWrap} accessibilityLabel={`Open photo ${index + 1}`}>
            <Image
              source={{ uri: item }}
              style={{ width: height * 0.66, height, borderRadius: 12 }}
              contentFit="cover"
              cachePolicy="none"
              transition={200}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  thumbWrap: {
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
});


