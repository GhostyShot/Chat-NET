import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { C } from '../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      {right !== undefined && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: C.bg,
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: C.sub,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
});
