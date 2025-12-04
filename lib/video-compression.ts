import * as FileSystem from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system';

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB - compress if larger
const TARGET_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB target after compression

/**
 * Compresses a video file if it's too large or in HEVC format
 * Uses react-native-compressor to automatically compress videos
 * 
 * @param videoUri - URI of the video file
 * @returns Compressed video URI or original URI if compression not needed/failed
 */
export async function compressVideoIfNeeded(videoUri: string): Promise<string> {
  try {
    // Get file info to check size
    const fileInfo = await getInfoAsync(videoUri);
    
    if (!fileInfo.exists) {
      console.warn('[VideoCompression] File does not exist:', videoUri);
      return videoUri;
    }

    const fileSize = fileInfo.size || 0;
    const ext = videoUri.toLowerCase().split('.').pop() || '';
    const isHEVC = ['hevc', 'hvc', 'mov'].includes(ext) || videoUri.toLowerCase().includes('hevc');
    
    // Always compress videos to reduce file size and convert HEVC to H.264
    console.log('[VideoCompression] Compressing video:', {
      originalSize: (fileSize / 1024 / 1024).toFixed(2) + 'MB',
      ext,
      isHEVC
    });

    try {
      // Dynamically import react-native-compressor to avoid Metro bundler issues
      // This will only load the module when compression is actually needed
      let Video: any;
      try {
        const compressorModule = require('react-native-compressor');
        Video = compressorModule?.Video;
      } catch (requireError) {
        console.warn('[VideoCompression] Compression library not available. Returning original video.');
        console.warn('[VideoCompression] To enable compression, create a development build: npx expo prebuild && npx expo run:ios (or run:android)');
        return videoUri;
      }

      if (!Video || typeof Video.compress !== 'function') {
        console.warn('[VideoCompression] Video.compress not available. Returning original video.');
        return videoUri;
      }

      // Use react-native-compressor to compress the video
      // It automatically handles HEVC to H.264 conversion and compression
      const compressedUri = await Video.compress(videoUri, {
        compressionMethod: 'auto', // Automatically choose best compression method
        // The library will automatically convert HEVC to H.264 and compress
      });

      // Check compressed file size
      const compressedInfo = await getInfoAsync(compressedUri);
      const compressedSize = compressedInfo.size || 0;
      const sizeReduction = ((1 - compressedSize / fileSize) * 100).toFixed(1);

      console.log('[VideoCompression] Compression completed:', {
        originalSize: (fileSize / 1024 / 1024).toFixed(2) + 'MB',
        compressedSize: (compressedSize / 1024 / 1024).toFixed(2) + 'MB',
        reduction: sizeReduction + '%'
      });

      // If compression didn't help much (less than 5% reduction), use original
      if (compressedSize >= fileSize * 0.95) {
        console.log('[VideoCompression] Compression didn\'t reduce size significantly, using original');
        return videoUri;
      }

      return compressedUri;
    } catch (error) {
      console.error('[VideoCompression] Compression failed:', error);
      // Return original file if compression fails
      return videoUri;
    }
  } catch (error) {
    console.error('[VideoCompression] Error during compression:', error);
    return videoUri; // Return original on any error
  }
}

/**
 * Gets video file size in MB
 */
export async function getVideoFileSize(videoUri: string): Promise<number> {
  try {
    const fileInfo = await getInfoAsync(videoUri);
    if (fileInfo.exists && fileInfo.size) {
      return fileInfo.size / 1024 / 1024; // Return size in MB
    }
    return 0;
  } catch (error) {
    console.error('[VideoCompression] Error getting file size:', error);
    return 0;
  }
}

