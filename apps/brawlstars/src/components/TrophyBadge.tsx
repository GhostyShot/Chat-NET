import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, S } from '../theme';

type BadgeSize = 'sm' | 'md' | 'lg';

interface TrophyBadgeProps {
  count: number;
  size?: BadgeSize;
}

function format(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

const SIZES: Record<BadgeSize, { fontSize: number; padding: number; emoji: number }> = {
  sm: { fontSize: 11, padding: 4, emoji: 12 },
  md: { fontSize: 14, padding: 6, emoji: 15 },
  lg: { fontSize: 18, padding: 8, emoji: 20 },
};

export function TrophyBadge({ count, size = 'md' }: TrophyBadgeProps) {
  const s = SIZES[size];
  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: s.padding * 2,
          paddingVertical: s.padding,
          borderRadius: S.borderRadius.full,
        },
      ]}
    >
      <Text style={{ fontSize: s.emoji }}>🏆</Text>
      <Text style={[styles.count, { fontSize: s.fontSize }]}>
        {format(count)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  count: {
    color: C.accent,
    fontWeight: '700',
  },
});
