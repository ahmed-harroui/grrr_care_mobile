/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Text
    text: '#292929',
    textSecondary: '#77716F',
    textTertiary: '#B0ADA8',

    // Backgrounds
    background: '#FFF8F2',
    backgroundElement: '#F5F2EF',
    backgroundSelected: '#FFE4E8',
    blush: '#FFF0F2',

    // Cards & Surfaces
    card: '#FFFFFF',
    cardSecondary: '#FAFAF8',

    // Actions - Blue family
    primary: '#208AEF',
    primaryDeep: '#1565C0',
    primaryLight: '#64B5F6',

    // Health - Mint family
    secondary: '#5BC7C2',
    secondaryDeep: '#299E99',
    secondaryLight: '#9FE0DB',

    // Functional
    success: '#5BC7C2',
    warning: '#F5A623',
    error: '#E74C3C',
    info: '#3498DB',

    // Borders & Dividers
    border: '#EDE5E2',
    borderLight: '#F5EFEB',

    // Accents
    softPink: '#FFE4E8',
    lavender: '#E8D4F0',
    peach: '#F5D5C8',
  },
  dark: {
    // Text
    text: '#FFFFFF',
    textSecondary: '#B0ADA8',
    textTertiary: '#7A7774',

    // Backgrounds
    background: '#0F0E0D',
    backgroundElement: '#1A1917',
    backgroundSelected: '#2D2B29',
    blush: '#2B1F22',

    // Cards & Surfaces
    card: '#1A1917',
    cardSecondary: '#242220',

    // Actions - Blue family
    primary: '#208AEF',
    primaryDeep: '#42A5F5',
    primaryLight: '#64B5F6',

    // Health - Mint family
    secondary: '#5BC7C2',
    secondaryDeep: '#7DDBD8',
    secondaryLight: '#9FE0DB',

    // Functional
    success: '#5BC7C2',
    warning: '#F5A623',
    error: '#E74C3C',
    info: '#3498DB',

    // Borders & Dividers
    border: '#2D2B29',
    borderLight: '#3A3835',

    // Accents
    softPink: '#4A2D38',
    lavender: '#3D2E47',
    peach: '#4A3531',
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
