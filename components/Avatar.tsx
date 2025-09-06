import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';

export type AvatarProps = { uri?: string | null; name?: string | null; size?: number };

export default function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    setFailed(false);
  }, [uri]);
  const initials = React.useMemo(() => {
    const safe = (name || '').trim();
    if (!safe) return '·';
    const parts = safe.split(/\s+/).filter(Boolean);
    const chars = parts.map(p => p[0]?.toUpperCase()).slice(0, 2).join('');
    return chars || '·';
  }, [name]);

  const showImage = !!uri && !failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.brand.avatarPlaceholder,
      }}
    >
      {showImage ? (
        <Image
          source={{ uri: uri || undefined }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ color: Colors.brand.textOnGradient, fontWeight: '700' }}>{initials}</Text>
      )}
    </View>
  );
}


