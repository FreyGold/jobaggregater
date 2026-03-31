'use client';

import { useLocalStorage } from '@/hooks/use-local-storage';

export type ColorConfig = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  destructive: string;
  destructiveForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
};

export type ThemeConfig = {
  theme: string;
  radius: string;
  spacing: string;
  letterSpacing: string;
  fontSans: string;
  fontSerif: string;
  fontMono: string;
  shadowColor: string;
  shadowOpacity: string;
  shadowBlur: string;
  light: ColorConfig;
  dark: ColorConfig;
};

export const DEFAULT_CONFIG: ThemeConfig = {
  theme: 'Default',
  radius: '0rem',
  spacing: '0.25rem',
  letterSpacing: '0em',
  fontSans: 'Geist',
  fontSerif: 'Geist',
  fontMono: 'Geist Mono',
  shadowColor: 'oklch(0 0 0)',
  shadowOpacity: '0.1',
  shadowBlur: '3px',
  light: {
    background: 'oklch(0.98 0 0)',
    foreground: 'oklch(0.24 0 0)',
    card: 'oklch(0.99 0 0)',
    cardForeground: 'oklch(0.24 0 0)',
    popover: 'oklch(0.99 0 0)',
    popoverForeground: 'oklch(0.24 0 0)',
    primary: 'oklch(0.43 0.04 42)',
    primaryForeground: 'oklch(1 0 0)',
    secondary: 'oklch(0.92 0.07 76.67)',
    secondaryForeground: 'oklch(0.35 0.07 41.41)',
    muted: 'oklch(0.95 0 0)',
    mutedForeground: 'oklch(0.5 0 0)',
    accent: 'oklch(0.93 0 0)',
    accentForeground: 'oklch(0.24 0 0)',
    destructive: 'oklch(0.63 0.19 33.26)',
    destructiveForeground: 'oklch(1 0 0)',
    border: 'oklch(0.88 0 0)',
    input: 'oklch(0.88 0 0)',
    ring: 'oklch(0.43 0.04 42)',
  },
  dark: {
    background: 'oklch(0.18 0 0)',
    foreground: 'oklch(0.95 0 0)',
    card: 'oklch(0.21 0 0)',
    cardForeground: 'oklch(0.95 0 0)',
    popover: 'oklch(0.21 0 0)',
    popoverForeground: 'oklch(0.95 0 0)',
    primary: 'oklch(0.92 0.05 67.14)',
    primaryForeground: 'oklch(0.2 0.02 201.14)',
    secondary: 'oklch(0.32 0.02 67)',
    secondaryForeground: 'oklch(0.92 0.05 67.14)',
    muted: 'oklch(0.25 0 0)',
    mutedForeground: 'oklch(0.77 0 0)',
    accent: 'oklch(0.29 0 0)',
    accentForeground: 'oklch(0.95 0 0)',
    destructive: 'oklch(0.63 0.19 33.26)',
    destructiveForeground: 'oklch(1 0 0)',
    border: 'oklch(0.24 0.01 88.77)',
    input: 'oklch(0.4 0 0)',
    ring: 'oklch(0.92 0.05 67.14)',
  },
};

export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
  Default: DEFAULT_CONFIG,
  Claude: {
    radius: '0.5rem',
    spacing: '0.25rem',
    light: {
      ...DEFAULT_CONFIG.light,
      background: 'oklch(0.98 0.01 93.48)',
      foreground: 'oklch(0.34 0.03 94.42)',
      card: 'oklch(0.98 0.01 93.48)',
      popover: 'oklch(1.00 0 0)',
      primary: 'oklch(0.62 0.14 39.15)',
      secondary: 'oklch(0.92 0.01 87.42)',
      muted: 'oklch(0.95 0.01 91.46)',
      border: 'oklch(0.91 0.01 106.47)',
    },
    dark: {
      ...DEFAULT_CONFIG.dark,
      background: 'oklch(0.27 0 0)',
      foreground: 'oklch(0.81 0.01 93.53)',
      card: 'oklch(0.27 0 0)',
      primary: 'oklch(0.67 0.13 38.92)',
      secondary: 'oklch(0.98 0.01 93.48)',
      muted: 'oklch(0.22 0 0)',
      border: 'oklch(0.36 0.01 106.85)',
    }
  },
  Zinc: {
    radius: '0.5rem',
    light: {
      ...DEFAULT_CONFIG.light,
      primary: 'oklch(0.21 0.006 285.885)',
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0.013 285.823)',
    },
    dark: {
      ...DEFAULT_CONFIG.dark,
      primary: 'oklch(0.985 0.002 247.839)',
      background: 'oklch(0.145 0.013 285.823)',
      foreground: 'oklch(0.985 0.002 247.839)',
    }
  }
};
