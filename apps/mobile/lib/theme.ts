// ─── Global Theme & Shared Styles ────────────────────────────────

import { Platform } from 'react-native';

export const THEME = {
  colors: {
    // Brand
    primary: '#4F46E5', // Indigo 600
    primaryLight: '#EEF2FF', // Indigo 50
    primaryDark: '#4338CA', // Indigo 700

    // Backgrounds
    background: '#F9FAFB', // Gray 50
    card: '#FFFFFF',

    // Text
    text: '#111827', // Gray 900
    textSecondary: '#4B5563', // Gray 600
    textMuted: '#9CA3AF', // Gray 400

    // Borders & UI
    border: '#E5E7EB', // Gray 200
    divider: '#F3F4F6', // Gray 100

    // Semantic
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
  },

  typography: {
    h1: { fontSize: 28, fontWeight: '700', color: '#111827' } as const,
    h2: { fontSize: 24, fontWeight: '700', color: '#111827' } as const,
    h3: { fontSize: 20, fontWeight: '600', color: '#111827' } as const,
    subtitle: { fontSize: 17, fontWeight: '600', color: '#111827' } as const,
    body: { fontSize: 15, color: '#4B5563', lineHeight: 22 } as const,
    bodySm: { fontSize: 14, color: '#6B7280', lineHeight: 20 } as const,
    caption: { fontSize: 13, color: '#9CA3AF' } as const,
    chip: { fontSize: 12, fontWeight: '500' } as const,
  },

  layout: {
    padding: 16,
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      pill: 9999,
    },
  },

  shadows: Platform.select({
    ios: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    },
    android: {
      sm: { elevation: 2 },
      md: { elevation: 4 },
    },
    web: {
      sm: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      md: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' },
    }
  }) as { sm: any, md: any }
};
