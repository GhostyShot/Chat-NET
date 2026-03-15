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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ProgressBar } from '../components/ProgressBar';
import { getEventRotation, getPlayerRankings } from '../api/brawlstars';
import type { EventRotation, RankingPlayer } from '../types';
import type { MetaStackParamList } from '../App';

type NavProp = NativeStackNavigationProp<MetaStackParamList, 'Meta'>;

const GAME_MODES = ['All', 'Gem Grab', 'Brawl Ball', 'Knockout', 'Hot Zone', 'Bounty'];

const MOCK_BRAWLER_WIN_RATES: Array<{ name: string; rate: number; mode: string }> = [
  { name: 'Meg', rate: 0.62, mode: 'Gem Grab' },
  { name: 'Buzz', rate: 0.59, mode: 'Knockout' },
  { name: 'Ash', rate: 0.58, mode: 'Brawl Ball' },
  { name: 'Lola', rate: 0.57, mode: 'Hot Zone' },
  { name: 'Belle', rate: 0.56, mode: 'Bounty' },
  { name: 'Surge', rate: 0.55, mode: 'Gem Grab' },
  { name: 'Griff', rate: 0.54, mode: 'Brawl Ball' },
  { name: 'Colette', rate: 0.53, mode: 'Hot Zone' },
  { name: 'Janet', rate: 0.52, mode: 'Knockout' },
  { name: 'Mandy', rate: 0.51, mode: 'Bounty' },
];

const TROPHY_THRESHOLDS = [
  { label: 'Bronze I-III', range: '0 – 500', color: '#CD7F32' },
  { label: 'Silver I-III', range: '500 – 1,500', color: '#C0C0C0' },
  { label: 'Gold I-III', range: '1,500 – 5,000', color: C.accent },
  { label: 'Diamond I-III', range: '5,000 – 15,000', color: C.blue },
  { label: 'Mythic I-III', range: '15,000 – 35,000', color: C.purple },
  { label: 'Legendary', range: '35,000+', color: C.danger },
];

function modeEmoji(mode: string): string {
  const map: Record<string, string> = {
    gemGrab: '💎', brawlBall: '⚽', bounty: '⭐', heist: '💰',
    siege: '🤖', hotZone: '🔥', knockout: '🥊', duels: '⚔️',
    showdown: '☠️', duoShowdown: '👥',
  };
  return map[mode] ?? '🎮';
}

export function MetaScreen() {
  const navigation = useNavigation<NavProp>();
  const [events, setEvents] = useState<EventRotation[]>([]);
  const [topPlayers, setTopPlayers] = useState<RankingPlayer[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedMode, setSelectedMode] = useState('All');

  useEffect(() => {
    Promise.all([getEventRotation(), getPlayerRankings('global')])
      .then(([evs, rankings]) => {
        setEvents(evs);
        setTopPlayers(rankings.items.slice(0, 10));
      })
      .catch(() => {
        setEvents([]);
        setTopPlayers([]);
      })
      .finally(() => setLoadingEvents(false));
  }, []);

  const filteredBrawlers =
    selectedMode === 'All'
      ? MOCK_BRAWLER_WIN_RATES
      : MOCK_BRAWLER_WIN_RATES.filter((b) =>
          b.mode.toLowerCase().replaceAll(' ', '') ===
          selectedMode.toLowerCase().replaceAll(' ', ''),
        );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Meta" subtitle="Insights & current rotation" />

        {/* Intro */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🧠 Current Meta Overview</Text>
          <Text style={styles.infoText}>
            Tank brawlers dominate objective modes this season. Long-range brawlers
            excel in Bounty and Knockout. Watch for Meg and Buzz in competitive play.
          </Text>
        </View>

        {/* Event Rotation */}
        <Text style={styles.sectionHeader}>Event Rotation</Text>
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
            {events.slice(0, 8).map((ev) => (
              <View key={ev.slotId} style={styles.eventCard}>
                <Text style={styles.eventEmoji}>{modeEmoji(ev.event.mode)}</Text>
                <Text style={styles.eventMode}>{ev.event.mode}</Text>
                <Text style={styles.eventMap} numberOfLines={2}>
                  {ev.event.map?.name ?? 'Unknown'}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Mode Filter */}
        <Text style={styles.sectionHeader}>Top Brawlers by Win Rate</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
          style={{ marginBottom: 12 }}
        >
          {GAME_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeTab,
                selectedMode === mode && styles.modeTabActive,
              ]}
              onPress={() => setSelectedMode(mode)}
            >
              <Text
                style={[
                  styles.modeText,
                  selectedMode === mode && styles.modeTextActive,
                ]}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.winRateCard}>
          {filteredBrawlers.length === 0 ? (
            <Text style={styles.emptyText}>No data for this mode.</Text>
          ) : (
            filteredBrawlers.map((b, i) => (
              <View key={b.name} style={styles.winRateRow}>
                <Text style={styles.winRateRank}>#{i + 1}</Text>
                <View style={styles.winRateInfo}>
                  <View style={styles.winRateNameRow}>
                    <Text style={styles.winRateName}>{b.name}</Text>
                    <Text style={styles.winRateMode}>{b.mode}</Text>
                  </View>
                  <ProgressBar
                    value={b.rate}
                    color={i < 3 ? C.accent : C.purple}
                    height={8}
                    showPercent
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Top Players */}
        <Text style={styles.sectionHeader}>Global Top Players</Text>
        {topPlayers.slice(0, 5).map((p, i) => (
          <View key={p.tag} style={styles.playerRow}>
            <Text style={styles.playerRank}>#{i + 1}</Text>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.club && <Text style={styles.playerClub}>{p.club.name}</Text>}
            </View>
            <Text style={styles.playerTrophies}>🏆 {p.trophies.toLocaleString()}</Text>
          </View>
        ))}

        {/* Trophy Thresholds */}
        <Text style={styles.sectionHeader}>Trophy Road Thresholds</Text>
        <View style={styles.thresholdCard}>
          {TROPHY_THRESHOLDS.map((t) => (
            <View key={t.label} style={styles.thresholdRow}>
              <View style={[styles.thresholdDot, { backgroundColor: t.color }]} />
              <Text style={styles.thresholdLabel}>{t.label}</Text>
              <Text style={styles.thresholdRange}>{t.range}</Text>
            </View>
          ))}
        </View>

        {/* Browse All Brawlers CTA */}
        <TouchableOpacity
          style={styles.browseCTA}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BrawlerList')}
        >
          <Text style={styles.browseCTAText}>Browse All Brawlers →</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  infoText: { fontSize: 13, color: C.sub, lineHeight: 20 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  emptyText: { color: C.muted, marginHorizontal: 16, marginBottom: 12 },
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
  modeRow: { paddingHorizontal: 16, gap: 8 },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: S.borderRadius.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  modeTabActive: { backgroundColor: C.accent, borderColor: C.accent },
  modeText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  modeTextActive: { color: C.bg },
  winRateCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  winRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  winRateRank: { width: 28, fontSize: 13, color: C.muted, fontWeight: '700' },
  winRateInfo: { flex: 1, gap: 4 },
  winRateNameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  winRateName: { fontSize: 14, fontWeight: '700', color: C.text },
  winRateMode: { fontSize: 11, color: C.sub },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  playerRank: { width: 32, fontSize: 14, fontWeight: '800', color: C.accent },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: '600', color: C.text },
  playerClub: { fontSize: 12, color: C.sub },
  playerTrophies: { fontSize: 13, color: C.accent, fontWeight: '600' },
  thresholdCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thresholdDot: { width: 12, height: 12, borderRadius: 6 },
  thresholdLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
  thresholdRange: { fontSize: 13, color: C.sub },
  browseCTA: {
    backgroundColor: C.accent,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  browseCTAText: { color: C.bg, fontWeight: '800', fontSize: 15 },
});
