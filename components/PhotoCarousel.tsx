import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';

type Props = {
  uris: string[];
  onPressItem?: (index: number) => void;
  onLongPressItem?: (index: number) => void;
  height?: number;
  showScrollIndicator?: boolean;
};

export default function PhotoCarousel({ uris, onPressItem, onLongPressItem, height = 110, showScrollIndicator = false }: Props) {
  if (!Array.isArray(uris) || uris.length === 0) return null;
  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={showScrollIndicator}
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
          <Pressable 
            onPress={showScrollIndicator ? undefined : () => onPressItem?.(index)} 
            onLongPress={showScrollIndicator ? undefined : () => onLongPressItem?.(index)} 
            style={styles.thumbWrap} 
            accessibilityLabel={showScrollIndicator ? `Photo ${index + 1}` : `Open photo ${index + 1}`}
          >
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
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  thumbWrap: {
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});


