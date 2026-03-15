import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { C, S } from '../theme';
import type { BrawlerStat } from '../types';

interface BrawlerCardProps {
  brawler: BrawlerStat;
  onPress?: () => void;
}

function rankColor(rank: number): string {
  if (rank >= 35) return '#FFB800';
  if (rank >= 25) return '#E040FB';
  if (rank >= 15) return '#4FC3F7';
  if (rank >= 5) return '#4CAF50';
  return C.sub;
}

export function BrawlerCard({ brawler, onPress }: BrawlerCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={onPress === undefined}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {brawler.name}
        </Text>
        <View style={styles.powerBadge}>
          <Text style={styles.powerText}>P{brawler.power}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.trophies}>🏆 {brawler.trophies.toLocaleString()}</Text>
        <Text style={[styles.rank, { color: rankColor(brawler.rank) }]}>
          Rank {brawler.rank}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    flex: 1,
    marginRight: 6,
  },
  powerBadge: {
    backgroundColor: C.accent,
    borderRadius: S.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  powerText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.bg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trophies: {
    fontSize: 12,
    color: C.sub,
  },
  rank: {
    fontSize: 12,
    fontWeight: '700',
  },
});
