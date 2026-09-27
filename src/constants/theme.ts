/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Text - Gray scale
    text: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',

    // Backgrounds
    background: '#F8F9FA',
    backgroundElement: '#E8EAF0',
    backgroundSelected: '#DCE4FF',
    blush: '#E8F0FF',

    // Cards & Surfaces
    card: '#FFFFFF',
    cardSecondary: '#F3F5F9',

    // Primary Actions - Modern Blue
    primary: '#2563EB',
    primaryDeep: '#1E40AF',
    primaryLight: '#60A5FA',

    // Secondary - Slate/Gray
    secondary: '#64748B',
    secondaryDeep: '#334155',
    secondaryLight: '#94A3B8',

    // Accent - Teal/Cyan
    accent: '#06B6D4',
    accentDeep: '#0891B2',
    accentLight: '#22D3EE',

    // Functional
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Accents
    softBlue: '#DBEAFE',
    softGray: '#F1F5F9',
    softCyan: '#CFFAFE',
  },
  dark: {
    // Text - Gray scale
    text: '#F5F5F5',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',

    // Backgrounds
    background: '#0F172A',
    backgroundElement: '#1E293B',
    backgroundSelected: '#1E3A8A',
    blush: '#1F2937',

    // Cards & Surfaces
    card: '#1E293B',
    cardSecondary: '#0F172A',

    // Primary Actions - Modern Blue
    primary: '#3B82F6',
    primaryDeep: '#60A5FA',
    primaryLight: '#93C5FD',

    // Secondary - Slate/Gray
    secondary: '#94A3B8',
    secondaryDeep: '#64748B',
    secondaryLight: '#CBD5E1',

    // Accent - Teal/Cyan
    accent: '#22D3EE',
    accentDeep: '#06B6D4',
    accentLight: '#67E8F9',

    // Functional
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',

    // Borders & Dividers
    border: '#334155',
    borderLight: '#475569',

    // Accents
    softBlue: '#1E3A8A',
    softGray: '#1F2937',
    softCyan: '#164E63',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
