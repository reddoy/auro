import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

type ToastContextValue = {
  show: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => {
      setMessage(null);
    });
  }, [opacity]);

  const show = useCallback((msg: string, durationMs = 2200) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMessage(msg);
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => hide(), durationMs);
  }, [hide, opacity]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View style={[styles.container, { opacity }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity activeOpacity={0.9} onPress={hide} accessibilityLabel="Hide notification">
            <View style={styles.toast}>
              <Text style={styles.text}>{message}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Platform.select({ ios: 60, android: 20, default: 10 }) as number,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.divider,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
});


