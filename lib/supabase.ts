import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra as any)?.supabaseUrl ||
  (Constants.manifest2 as any)?.extra?.supabaseUrl ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ||
  (Constants.manifest2 as any)?.extra?.supabaseAnonKey ||
  '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('⚠️  Supabase configuration missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
		storage: {
			getItem: (key: string) => AsyncStorage.getItem(key),
			setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
			removeItem: (key: string) => AsyncStorage.removeItem(key),
		},
	},
});
