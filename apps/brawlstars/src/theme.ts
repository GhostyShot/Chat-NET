import { StyleSheet } from 'react-native';

export const C = {
  bg: '#0D0F1A',
  surface: '#161829',
  card: '#1C1E30',
  border: '#2A2D44',
  accent: '#FFB800',
  purple: '#7B5CF0',
  text: '#FFFFFF',
  sub: '#A0A3B1',
  muted: '#5A5D72',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  blue: '#4FC3F7',
} as const;

export const S = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadow: StyleSheet.create({
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
} as const;

export const RARITY_COLORS: Record<string, string> = {
  Trophy_Road: '#5DB9F8',
  Rare: '#4CAF50',
  Super_Rare: '#4FC3F7',
  Epic: '#9C27B0',
  Mythic: '#F44336',
  Legendary: '#FFB800',
  Common: '#A0A3B1',
  Unknown: '#5A5D72',
};
