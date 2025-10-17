import { Platform } from 'react-native';

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

// Native clipboard implementation
const copyToClipboardNative = async (text: string): Promise<void> => {
  const Clipboard = require('@react-native-clipboard/clipboard').default;
  await Clipboard.setString(text);
};

export const copyToClipboard = async (text: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await copyToClipboardWeb(text);
  } else {
    await copyToClipboardNative(text);
  }
};
