import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, Platform } from 'react-native';
import Colors from '@/constants/Colors';

interface ThemeContextType {
  colorScheme: ColorSchemeName;
  colors: typeof Colors.light | typeof Colors.dark;
  brandColors: typeof Colors.brand;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function shadowStyle({
  color = 'rgba(0,0,0,0.2)',
  offsetY = 4,
  blur = 12,
  spread = 0,
}: {
  color?: string;
  offsetY?: number;
  blur?: number;
  spread?: number;
}) {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${offsetY}px ${blur}px ${spread}px ${color}`,
      // On web, the RN shadow* props are deprecated, so we return only boxShadow
    } as any;
  }
  return {} as any;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

