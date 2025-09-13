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
    <View style={{ backgroundColor: 'transparent' }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={uris}
        keyExtractor={(u, i) => `${u}-${i}`}
        contentContainerStyle={{ paddingHorizontal: 4 }}
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
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
});


