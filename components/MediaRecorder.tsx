import React, { useRef, useState } from 'react';
import { View, Pressable, Image as RNImage, FlatList, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';

type Props = {
  photos?: string[];
  onRecorded: (uri: string) => void;
  variant?: 'inline' | 'overlay';
  circleSize?: number;
};

export default function MediaRecorder({ photos = [], onRecorded, variant = 'inline', circleSize = 140 }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [type, setType] = useState<CameraType>('front');
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();

  if (Platform.OS === 'web') {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: '700', color: Colors.brand.textPrimary }}>Recording not supported in web preview</Text>
        <Text style={{ opacity: 0.8, color: Colors.brand.textSecondary }}>Open this screen in the mobile app to record a video review, or proceed without a video.</Text>
      </View>
    );
  }

  if (variant === 'overlay') {
    return (
      <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, overflow: 'hidden', backgroundColor: 'transparent' }}>
        {!permission?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackground }}>
            <Pressable onPress={requestPermission} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.brand.status.accepted }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enable Camera</Text>
            </Pressable>
          </View>
        ) : videoUri ? (
          <Video
            style={{ width: '100%', height: '100%' }}
            source={{ uri: videoUri || undefined }}
            resizeMode={"cover" as any}
            shouldPlay={false}
            isMuted={false}
            useNativeControls={false}
          />
        ) : (
          <CameraView ref={r => (cameraRef.current = r)} style={{ width: '100%', height: '100%' }} facing={type as any} />
        )}
        {/* Controls */}
        <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {!recording && !videoUri && (
            <Pressable
              onPress={async () => {
                if (!cameraRef.current) return;
                setRecording(true);
                try {
                  await cameraRef.current.startRecording({
                    maxDuration: 180,
                    onRecordingFinished: (v: any) => { setVideoUri(v?.uri || null); setRecording(false); },
                    onRecordingError: () => { setRecording(false); },
                  });
                } catch {
                  setRecording(false);
                }
              }}
              accessibilityLabel="Start recording"
              style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#ff3b30', borderWidth: 2, borderColor: '#fff' }}
            />
          )}
          {recording && (
            <Pressable
              onPress={async () => { if (!cameraRef.current) return; try { await cameraRef.current.stopRecording(); } catch {} }}
              accessibilityLabel="Stop recording"
              style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff' }}
            >
              <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Stop</Text>
            </Pressable>
          )}
          {videoUri && (
            <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
              <Pressable onPress={() => { onRecorded(videoUri); }} accessibilityLabel="Use this video" style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.brand.status.completed }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Use</Text>
              </Pressable>
              <Pressable onPress={() => setVideoUri(null)} accessibilityLabel="Re-record" style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.brand.cardBackground }}>
                <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Re-record</Text>
              </Pressable>
            </View>
          )}
        </View>
        {/* Flip */}
        {!videoUri && (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Pressable onPress={() => setType(prev => (prev === 'front' ? 'back' : 'front'))} accessibilityLabel="Flip camera">
              <Text style={{ color: '#fff', fontWeight: '700' }}>Flip</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {!videoUri ? (
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          {!permission?.granted ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: Colors.brand.textPrimary, marginBottom: 8 }}>Camera permission is required to record.</Text>
              <Pressable onPress={requestPermission} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.status.accepted }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView ref={r => (cameraRef.current = r)} style={{ aspectRatio: 9/16 }} facing={type as any} />
          )}
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
        <Video
          style={{ aspectRatio: 9/16, borderRadius: 16 }}
          source={{ uri: videoUri || undefined }}
          useNativeControls
          resizeMode={"contain" as any}
          shouldPlay={false}
          isMuted={false}
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        {!recording && !videoUri && <Pressable onPress={async () => { if (!cameraRef.current) return; setRecording(true); try { await cameraRef.current.startRecording({ maxDuration: 180, onRecordingFinished: (v: any) => { setVideoUri(v?.uri || null); setRecording(false); }, onRecordingError: () => { setRecording(false); } }); } catch { setRecording(false); } }}><Text>Record</Text></Pressable>}
        {recording && <Pressable onPress={async () => { if (!cameraRef.current) return; try { await cameraRef.current.stopRecording(); } catch {} }}><Text>Stop</Text></Pressable>}
        {videoUri && <Pressable onPress={() => { onRecorded(videoUri); }}><Text>Use Video</Text></Pressable>}
        {videoUri && <Pressable onPress={() => setVideoUri(null)}><Text>Re-record</Text></Pressable>}
      </View>
    </View>
  );
}


