import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Image as RNImage, FlatList, Platform } from 'react-native';
import Colors from '@/constants/Colors';
import { Camera, CameraType } from 'expo-camera';
import { VideoView } from 'expo-video';

type Props = {
  photos: string[];
  onRecorded: (uri: string) => void;
};

export default function MediaRecorder({ photos, onRecorded }: Props) {
  const cameraRef = useRef<Camera | null>(null);
  const [type, setType] = useState<CameraType>('front');
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  if (Platform.OS === 'web') {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: '700', color: Colors.brand.textPrimary }}>Recording not supported in web preview</Text>
        <Text style={{ opacity: 0.8, color: Colors.brand.textSecondary }}>Open this screen in the mobile app to record a video review, or proceed without a video.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {!videoUri ? (
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <Camera ref={r => (cameraRef.current = r)} style={{ aspectRatio: 9/16 }} type={type as any} />
          <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0 }}>
            <FlatList
              data={photos}
              keyExtractor={(u, i) => `${i}`}
              horizontal
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setActiveIdx(index)} style={{ marginRight: 8 }}>
                  {/* RNImage for RN; expo-image could be used elsewhere */}
                  <RNImage source={{ uri: item }} style={{ width: 56, height: 56, borderRadius: 8, borderWidth: activeIdx === index ? 2 : 0, borderColor: '#fff' }} />
                </Pressable>
              )}
            />
          </View>
          <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setType(prev => (prev === 'front' ? 'back' : 'front'))}><Text>Flip</Text></Pressable>
          </View>
        </View>
      ) : (
        <VideoView
          style={{ aspectRatio: 9/16, borderRadius: 16 }}
          source={{ uri: videoUri || undefined }}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        {!recording && !videoUri && <Pressable onPress={async () => { if (!cameraRef.current) return; setRecording(true); const r = await cameraRef.current.recordAsync({ maxDuration: 180 }); setRecording(false); setVideoUri(r?.uri || null); }}><Text>Record</Text></Pressable>}
        {recording && <Pressable onPress={async () => { if (!cameraRef.current) return; await cameraRef.current.stopRecording(); }}><Text>Stop</Text></Pressable>}
        {videoUri && <Pressable onPress={() => { onRecorded(videoUri); }}><Text>Use Video</Text></Pressable>}
        {videoUri && <Pressable onPress={() => setVideoUri(null)}><Text>Re-record</Text></Pressable>}
      </View>
    </View>
  );
}


