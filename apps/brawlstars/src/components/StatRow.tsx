import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../theme';

interface StatRowProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  big?: boolean;
}

export function StatRow({
  label,
  value,
  icon,
  color = C.text,
  big = false,
}: StatRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon !== undefined && (
          <Text style={styles.icon}>{icon}</Text>
        )}
        <Text style={[styles.label, big && styles.bigLabel]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color }, big && styles.bigValue]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    color: C.sub,
  },
  bigLabel: {
    fontSize: 16,
    color: C.text,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  bigValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
