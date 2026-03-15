import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, S } from '../theme';

interface ProgressBarProps {
  value: number;
  color: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  color,
  height = 8,
  label,
  showPercent = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);

  return (
    <View style={styles.wrapper}>
      {(label !== undefined || showPercent) && (
        <View style={styles.labelRow}>
          {label !== undefined && (
            <Text style={styles.label}>{label}</Text>
          )}
          {showPercent && (
            <Text style={[styles.label, { color }]}>{pct}%</Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          { height, borderRadius: S.borderRadius.full },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              height,
              backgroundColor: color,
              borderRadius: S.borderRadius.full,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: C.sub,
  },
  track: {
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  fill: {},
});
