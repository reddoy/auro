import React, { useRef, useState } from 'react';
import { View, Pressable, Image as RNImage, FlatList, Platform, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Audio } from 'expo-audio';

type Props = {
  photos?: string[];
  onRecorded: (uri: string) => void;
  variant?: 'inline' | 'overlay' | 'centered';
  circleSize?: number;
  value?: string | null;
};

export default function MediaRecorder({ photos = [], onRecorded, variant = 'inline', circleSize = 140, value = null }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [type, setType] = useState<CameraType>('front');
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const videoPlayer = useVideoPlayer(videoUri || '');
  const [activeIdx, setActiveIdx] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    // Ensure microphone permission for video with audio (iOS will silently fail otherwise)
    try {
      const mic = await Audio.getPermissionsAsync();
      if (!mic.granted) {
        const ask = await Audio.requestPermissionsAsync();
        if (!ask.granted) {
          Alert.alert('Microphone Access Needed', 'Please allow microphone access to record video with sound.');
          return;
        }
      }
    } catch {}
    if (!isCameraReady) {
      // Pace: give it a brief moment if it just mounted
      let waited = 0; const step = 100; const max = 2500;
      while (!isCameraReady && waited < max) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, step));
        waited += step;
      }
      if (!isCameraReady) {
        Alert.alert('Camera is still initializing', 'Please wait a second and try again.');
        return;
      }
    }
    setStarting(true);
    setRecording(true);
    try {
      const v: any = await cameraRef.current.recordAsync({ maxDuration: 180 } as any);
      setVideoUri(v?.uri || null);
    } catch (e: any) {
      Alert.alert('Recording error', e?.message || 'Unable to start recording.');
    } finally {
      setRecording(false);
      setStarting(false);
    }
  };

  // Temporarily disabled for testing on web
  // if (Platform.OS === 'web') {
  //   return (
  //     <View style={{ gap: 12 }}>
  //       <Text style={{ fontWeight: '700', color: Colors.brand.textPrimary }}>Recording not supported in web preview</Text>
  //       <Text style={{ opacity: 0.8, color: Colors.brand.textSecondary }}>Open this screen in the mobile app to record a video review, or proceed without a video.</Text>
  //     </View>
  //   );
  // }

  if (variant === 'overlay') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {/* Circular camera surface */}
          <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, overflow: 'hidden', backgroundColor: 'transparent' }}>
            {!permission?.granted ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackground }}>
                <Pressable onPress={requestPermission} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.brand.status.accepted }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Enable Camera</Text>
                </Pressable>
              </View>
            ) : videoUri ? (
              <>
                <VideoView
                  style={{ width: '100%', height: '100%' }}
                  player={videoPlayer}
                  contentFit="cover"
                  nativeControls={false}
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Pressable
                    onPress={async () => {
                      try {
                        if (isPlaying) { videoPlayer.pause(); setIsPlaying(false); }
                        else { videoPlayer.play(); setIsPlaying(true); }
                      } catch {}
                    }}
                    accessibilityLabel={isPlaying ? 'Pause playback' : 'Play playback'}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }}>{isPlaying ? '❚❚' : '▶'}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <CameraView
                ref={r => (cameraRef.current = r)}
                style={{ width: '100%', height: '100%' }}
                facing={type as any}
                mode={"video" as any}
                onCameraReady={() => setIsCameraReady(true)}
                onError={() => setIsCameraReady(false)}
              />
            )}
          </View>

          {/* Controls to the right of the circle */}
          <View style={{ marginLeft: 16, flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {!recording && !videoUri && (
              <Pressable
                onPress={startRecording}
                accessibilityLabel="Start recording"
                disabled={!isCameraReady || starting}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isCameraReady && !starting ? '#ff3b30' : 'rgba(255,59,48,0.4)', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
              />
            )}
            {recording && (
              <Pressable
                onPress={async () => { if (!cameraRef.current) return; try { await cameraRef.current.stopRecording(); } catch {} }}
                accessibilityLabel="Stop recording"
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', marginHorizontal: 2 }}
              >
                <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Stop</Text>
              </Pressable>
            )}
            {!videoUri && (
              <Pressable onPress={() => setType(prev => (prev === 'front' ? 'back' : 'front'))} accessibilityLabel="Flip camera" style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Flip</Text>
              </Pressable>
            )}
            {videoUri && (
              <View style={{ flexDirection: 'column', gap: 8 }}>
                <Pressable onPress={() => { onRecorded(videoUri); }} accessibilityLabel="Use this video" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.status.completed }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Use</Text>
                </Pressable>
                <Pressable onPress={() => setVideoUri(null)} accessibilityLabel="Re-record" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.cardBackground }}>
                  <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Re-record</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'centered') {
    return (
      <View style={{ alignItems: 'center', position: 'relative' }}>
        {/* Circular camera surface - centered */}
        <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, overflow: 'hidden', backgroundColor: 'transparent' }}>
          {!permission?.granted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.cardBackground }}>
              <Pressable onPress={requestPermission} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.brand.status.accepted }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Enable Camera</Text>
              </Pressable>
            </View>
          ) : videoUri ? (
            <>
              <VideoView
                style={{ width: '100%', height: '100%' }}
                player={videoPlayer}
                contentFit="cover"
                nativeControls={false}
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Pressable
                  onPress={async () => {
                    try {
                      if (isPlaying) { videoPlayer.pause(); setIsPlaying(false); }
                      else { videoPlayer.play(); setIsPlaying(true); }
                    } catch {}
                  }}
                  accessibilityLabel={isPlaying ? 'Pause playback' : 'Play playback'}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900' }}>{isPlaying ? '❚❚' : '▶'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <CameraView
              ref={r => (cameraRef.current = r)}
              style={{ width: '100%', height: '100%' }}
              facing={type as any}
              mode={"video" as any}
              onCameraReady={() => setIsCameraReady(true)}
              onError={() => setIsCameraReady(false)}
            />
          )}
        </View>

        {/* Controls positioned to the right side */}
        <View style={{ position: 'absolute', top: circleSize / 2 - 50, left: circleSize + 16, flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {!videoUri && (
            <Pressable onPress={() => setType(prev => (prev === 'front' ? 'back' : 'front'))} accessibilityLabel="Flip camera" style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Flip</Text>
            </Pressable>
          )}
          {!recording && !videoUri && (
            <Pressable
              onPress={startRecording}
              accessibilityLabel="Start recording"
              disabled={!isCameraReady || starting}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isCameraReady && !starting ? '#ff3b30' : 'rgba(255,59,48,0.4)', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
            />
          )}
          {recording && (
            <Pressable
              onPress={async () => { if (!cameraRef.current) return; try { await cameraRef.current.stopRecording(); } catch {} }}
              accessibilityLabel="Stop recording"
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', marginHorizontal: 2 }}
            >
              <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Stop</Text>
            </Pressable>
          )}
          {videoUri && (
            <View style={{ flexDirection: 'column', gap: 8 }}>
              <Pressable onPress={() => { onRecorded(videoUri); }} accessibilityLabel="Use this video" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.status.completed }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Use</Text>
              </Pressable>
              <Pressable onPress={() => setVideoUri(null)} accessibilityLabel="Re-record" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.cardBackground }}>
                <Text style={{ color: Colors.brand.textPrimary, fontWeight: '700' }}>Re-record</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {!(videoUri || value) ? (
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          {!permission?.granted ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: Colors.brand.textPrimary, marginBottom: 8 }}>Camera permission is required to record.</Text>
              <Pressable onPress={requestPermission} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.brand.status.accepted }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              ref={r => (cameraRef.current = r)}
              style={{ aspectRatio: 9/16 }}
              facing={type as any}
              mode={"video" as any}
              onCameraReady={() => setIsCameraReady(true)}
              onError={() => setIsCameraReady(false)}
            />
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
        <VideoView
          style={{ aspectRatio: 9/16, borderRadius: 16 }}
          player={videoPlayer}
          nativeControls={true}
          contentFit="contain"
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        {!recording && !videoUri && <Pressable disabled={!isCameraReady || starting} onPress={startRecording}><Text>Record</Text></Pressable>}
        {recording && <Pressable onPress={async () => { if (!cameraRef.current) return; try { await cameraRef.current.stopRecording(); } catch {} }}><Text>Stop</Text></Pressable>}
        {videoUri && <Pressable onPress={() => { onRecorded(videoUri); }}><Text>Use Video</Text></Pressable>}
        {videoUri && <Pressable onPress={() => setVideoUri(null)}><Text>Re-record</Text></Pressable>}
      </View>
    </View>
  );
}


