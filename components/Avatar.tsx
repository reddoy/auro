import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';
import { BorderRadius } from '@/constants/DesignSystem';

export type AvatarProps = { 
  uri?: string | null; 
  name?: string | null; 
  size?: number;
  accessibilityLabel?: string;
};

export default function Avatar({ uri, name, size = 48, accessibilityLabel }: AvatarProps) {
  const [showSpinner, setShowSpinner] = React.useState(!!uri);
  const [imageError, setImageError] = React.useState(false);
  
  React.useEffect(() => {
    if (uri) {
      setShowSpinner(true);
      setImageError(false);
      // Hide spinner after a short delay to let image load
      const timer = setTimeout(() => setShowSpinner(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
      setImageError(false);
    }
  }, [uri]);
  
  const initials = React.useMemo(() => {
    const safe = (name || '').trim();
    if (!safe) return '·';
    const parts = safe.split(/\s+/).filter(Boolean);
    const chars = parts.map(p => p[0]?.toUpperCase()).slice(0, 2).join('');
    return chars || '·';
  }, [name]);

  const displayName = name || 'User';
  const defaultAccessibilityLabel = accessibilityLabel || `Avatar for ${displayName}`;

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
        borderWidth: 2,
        borderColor: Colors.brand.accentOrange,
      }}
      accessibilityRole="image"
      accessibilityLabel={defaultAccessibilityLabel}
    >
      {uri && !imageError ? (
        <Image
          key={uri}
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => {
            setImageError(true);
            setShowSpinner(false);
          }}
          onLoad={() => {
            setShowSpinner(false);
          }}
        />
      ) : (
        <Text 
          style={{ 
            color: Colors.brand.textPrimary, 
            fontWeight: '700',
            fontSize: size * 0.4,
          }}
          accessibilityLabel={`Initials: ${initials}`}
        >
          {initials}
        </Text>
      )}
      
      {showSpinner && !imageError && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner 
            size={size * 0.4} 
            color={Colors.brand.accentMagenta} 
            borderColor={Colors.brand.border}
          />
        </View>
      )}
    </View>
  );
}


