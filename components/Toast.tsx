import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { MotionDurations, MotionPressable, MotionSpring } from '@/components/motion';

type ToastContextValue = {
  show: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMessage(null);
  }, []);

  const show = useCallback((msg: string, durationMs = 2200) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMessage(msg);
    hideTimer.current = setTimeout(() => hide(), durationMs);
  }, [hide]);

  const value = useMemo(() => ({ show }), [show]);

  const toastEntering = FadeInDown.duration(MotionDurations.sm)
    .springify()
    .damping(MotionSpring.soft.damping)
    .stiffness(MotionSpring.soft.stiffness)
    .mass(MotionSpring.soft.mass);

  const toastExiting = FadeOutUp.duration(MotionDurations.sm);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View style={styles.container} pointerEvents="box-none">
          <MotionPressable
            key={message}
            entering={toastEntering}
            exiting={toastExiting}
            onPress={hide}
            accessibilityRole="button"
            accessibilityLabel="Hide notification"
            style={styles.toast}
          >
            <Text style={styles.text}>{message}</Text>
          </MotionPressable>
        </View>
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


