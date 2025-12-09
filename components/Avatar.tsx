import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';
import { BorderRadius } from '@/constants/DesignSystem';
import { getSignedAvatarUrl } from '@/lib/profile';

export type AvatarProps = { 
  uri?: string | null; 
  name?: string | null; 
  size?: number;
  accessibilityLabel?: string;
};

export default function Avatar({ uri, name, size = 48, accessibilityLabel }: AvatarProps) {
  const [showSpinner, setShowSpinner] = React.useState(!!uri);
  const [imageError, setImageError] = React.useState(false);
  const [signedUri, setSignedUri] = React.useState<string | null>(null);
  const [isSigning, setIsSigning] = React.useState(false);
  
  // Auto-sign storage paths that aren't already full HTTP URLs
  React.useEffect(() => {
    if (!uri || !uri.trim()) {
      console.log('[Avatar] No URI provided for', name);
      setSignedUri(null);
      setIsSigning(false);
      return;
    }
    
    const trimmed = uri.trim();
    console.log('[Avatar] Processing URI for', name, 'URI:', trimmed.substring(0, 80));
    
    // If it's already a full HTTP URL, use it directly
    if (/^https?:\/\//i.test(trimmed)) {
      console.log('[Avatar] URI is already HTTP URL, using directly');
      setSignedUri(trimmed);
      setIsSigning(false);
      return;
    }
    
    // If it's a storage path, try to sign it
    setIsSigning(true);
    (async () => {
      try {
        console.log('[Avatar] Attempting to sign storage path for', name);
        const signed = await getSignedAvatarUrl(trimmed, 3600);
        if (signed) {
          console.log('[Avatar] Successfully signed URL for', name, 'signed:', signed.substring(0, 80));
          setSignedUri(signed);
        } else {
          console.log('[Avatar] Signing returned null for', name, 'using raw path');
          setSignedUri(trimmed);
        }
      } catch (err) {
        console.error('[Avatar] Error signing URL for', name, 'error:', err);
        // If signing fails, try using the raw path anyway (might be public)
        setSignedUri(trimmed);
      } finally {
        setIsSigning(false);
      }
    })();
  }, [uri, name]);
  
  // Use signed URI if available, otherwise fall back to original URI (which might be a full URL)
  const displayUri = signedUri || (uri && uri.trim() ? uri.trim() : null);
  
  React.useEffect(() => {
    if (displayUri) {
      setShowSpinner(true);
      setImageError(false);
      // Hide spinner after a short delay to let image load
      const timer = setTimeout(() => setShowSpinner(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
      setImageError(false);
    }
  }, [displayUri]);
  
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
      {displayUri && !imageError ? (
        <Image
          key={displayUri}
          source={{ uri: displayUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={(error) => {
            console.error('[Avatar] Image load error for', name, 'URI:', displayUri?.substring(0, 80), 'error:', error);
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


