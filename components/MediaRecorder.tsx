import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Image as RNImage, FlatList } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Video } from 'expo-av';

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
        <Video source={{ uri: videoUri }} style={{ aspectRatio: 9/16, borderRadius: 16 }} useNativeControls />
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


