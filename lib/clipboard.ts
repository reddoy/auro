import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

// Web-compatible clipboard implementation
const copyToClipboardWeb = async (text: string): Promise<void> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

export const copyToClipboard = async (text: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await copyToClipboardWeb(text);
  } else {
    // Use Expo's clipboard for native platforms (iOS/Android)
    await Clipboard.setStringAsync(text);
  }
};
