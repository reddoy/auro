import * as FileSystem from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';
import Constants from 'expo-constants';

const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB - warn if larger
const TARGET_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB target after compression
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB - hard limit for uploads

/**
 * Compresses a video file if it's too large or in HEVC format
 * Uses react-native-compressor to automatically compress videos
 * 
 * @param videoUri - URI of the video file
 * @returns Compressed video URI or original URI if compression not needed/failed
 */
export async function compressVideoIfNeeded(videoUri: string): Promise<string> {
  try {
    // Get file info to check size first
    const fileInfo = await getInfoAsync(videoUri);
    
    if (!fileInfo.exists) {
      console.warn('[VideoCompression] File does not exist:', videoUri);
      return videoUri;
    }

    const fileSize = fileInfo.size || 0;
    const ext = videoUri.toLowerCase().split('.').pop() || '';
    const isHEVC = ['hevc', 'hvc', 'mov'].includes(ext) || videoUri.toLowerCase().includes('hevc');
    
    // Check if file is too large to upload
    if (fileSize > MAX_UPLOAD_SIZE) {
      const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
      const maxMB = (MAX_UPLOAD_SIZE / 1024 / 1024).toFixed(0);
      throw new Error(`Video file is too large (${sizeMB}MB). Maximum size is ${maxMB}MB. Please compress the video or use a shorter recording.`);
    }
    
    // Check if we're in Expo Go - compression requires native modules
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
      // In Expo Go, warn if file is large but can't compress
      const fileSizeMB = fileSize / 1024 / 1024;
      if (fileSizeMB > 30) {
        console.warn(`[VideoCompression] Large video (${fileSizeMB.toFixed(2)}MB) in Expo Go - compression not available. Upload may timeout. Consider using a development build for compression.`);
      }
      return videoUri;
    }
    
    // Always compress videos to reduce file size and convert HEVC to H.264
    console.log('[VideoCompression] Compressing video:', {
      originalSize: (fileSize / 1024 / 1024).toFixed(2) + 'MB',
      ext,
      isHEVC
    });

    try {
      // Try to load the compression module
      // This will fail silently in Expo Go where native modules aren't available
      let Video: any = null;
      
      try {
        const compressorModule = require('react-native-compressor');
        if (compressorModule?.Video && typeof compressorModule.Video.compress === 'function') {
          Video = compressorModule.Video;
        }
      } catch (requireError: any) {
        // Module not available - this is expected in Expo Go
        // Return original video without logging (error is expected)
        return videoUri;
      }

      if (!Video) {
        return videoUri;
      }

      // Use react-native-compressor to compress the video
      // Use aggressive compression settings to reduce file size significantly
      const fileSizeMB = fileSize / 1024 / 1024;
      
      // Calculate compression settings based on file size
      // Target: reduce to under 20MB for upload
      let compressionOptions: any = {
        compressionMethod: 'auto',
      };
      
      if (fileSizeMB > 40) {
        // Very aggressive compression for very large files (>40MB)
        compressionOptions = {
          compressionMethod: 'auto',
          maxSize: 720, // Reduce resolution to 720p
          bitrate: 1000000, // 1Mbps bitrate for aggressive compression
        };
      } else if (fileSizeMB > 30) {
        // Aggressive compression for large files (30-40MB)
        compressionOptions = {
          compressionMethod: 'auto',
          maxSize: 1080, // Keep at 1080p but reduce bitrate
          bitrate: 2000000, // 2Mbps bitrate
        };
      } else if (fileSizeMB > 20) {
        // Moderate compression (20-30MB)
        compressionOptions = {
          compressionMethod: 'auto',
          maxSize: 1080,
          bitrate: 3000000, // 3Mbps bitrate
        };
      } else {
        // Light compression for smaller files (<20MB)
        compressionOptions = {
          compressionMethod: 'auto',
          maxSize: 1080,
          bitrate: 4000000, // 4Mbps bitrate
        };
      }
      
      console.log('[VideoCompression] Compression options:', compressionOptions);
      
      const compressedUri = await Video.compress(videoUri, compressionOptions);

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

