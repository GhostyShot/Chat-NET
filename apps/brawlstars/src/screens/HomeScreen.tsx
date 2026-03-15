import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { getEventRotation } from '../api/brawlstars';
import type { EventRotation } from '../types';

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Search Player', tab: 'Search' },
  { icon: '🥊', label: 'Browse Brawlers', tab: 'Meta' },
  { icon: '🏆', label: 'Esports Hub', tab: 'Esports' },
  { icon: '📊', label: 'Current Meta', tab: 'Meta' },
] as const;

function modeEmoji(mode: string): string {
  const map: Record<string, string> = {
    gemGrab: '💎',
    brawlBall: '⚽',
    bounty: '⭐',
    heist: '💰',
    siege: '🤖',
    hotZone: '🔥',
    knockout: '🥊',
    duels: '⚔️',
    showdown: '☠️',
    duoShowdown: '👥',
    wipeout: '💥',
    payload: '🛒',
    botDrop: '🤖',
  };
  return map[mode] ?? '🎮';
}

export function HomeScreen() {
  const [events, setEvents] = useState<EventRotation[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    getEventRotation()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="BrawlScope"
          subtitle="Your ultimate Brawl Stars companion"
        />

        {/* Welcome Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🥊</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Ready to Brawl?</Text>
            <Text style={styles.bannerSub}>
              Track stats, explore brawlers, and dominate the meta.
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Events */}
        <Text style={styles.sectionHeader}>Current Events</Text>
        {loadingEvents ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>No events available right now.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsRow}
          >
            {events.slice(0, 6).map((ev) => (
              <View key={ev.slotId} style={styles.eventCard}>
                <Text style={styles.eventEmoji}>{modeEmoji(ev.event.mode)}</Text>
                <Text style={styles.eventMode}>{ev.event.mode}</Text>
                <Text style={styles.eventMap} numberOfLines={2}>
                  {ev.event.map?.name ?? 'Unknown Map'}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Quick Stats Placeholder */}
        <Text style={styles.sectionHeader}>Quick Stats</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderEmoji}>👤</Text>
          <Text style={styles.placeholderTitle}>No Account Linked</Text>
          <Text style={styles.placeholderSub}>
            Link your account in the Account tab to see your personal stats here.
          </Text>
        </View>

        {/* Trending */}
        <Text style={styles.sectionHeader}>Trending</Text>
        <View style={styles.trendingRow}>
          {[
            { icon: '🌟', label: 'Top Player Today', value: 'StarPlayer99', sub: '75,420 🏆' },
            { icon: '🥊', label: 'Best Brawler', value: 'Meg', sub: '62% win rate' },
          ].map((item) => (
            <View key={item.label} style={styles.trendCard}>
              <Text style={styles.trendIcon}>{item.icon}</Text>
              <Text style={styles.trendLabel}>{item.label}</Text>
              <Text style={styles.trendValue}>{item.value}</Text>
              <Text style={styles.trendSub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  bannerEmoji: { fontSize: 40 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  bannerSub: { fontSize: 13, color: C.sub, marginTop: 4 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 24,
    gap: 8,
  },
  actionCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  eventsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  eventCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 14,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  eventEmoji: { fontSize: 28 },
  eventMode: { fontSize: 11, color: C.accent, fontWeight: '700', textAlign: 'center' },
  eventMap: { fontSize: 11, color: C.sub, textAlign: 'center' },
  emptyText: { color: C.muted, textAlign: 'center', marginBottom: 24, marginHorizontal: 16 },
  placeholderCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  placeholderEmoji: { fontSize: 36 },
  placeholderTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  placeholderSub: { fontSize: 13, color: C.sub, textAlign: 'center' },
  trendingRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 24,
    gap: 10,
  },
  trendCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  trendIcon: { fontSize: 24 },
  trendLabel: { fontSize: 11, color: C.sub, textAlign: 'center' },
  trendValue: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center' },
  trendSub: { fontSize: 12, color: C.accent, textAlign: 'center' },
});
