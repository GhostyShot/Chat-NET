import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp as RNRouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatRow } from '../components/StatRow';
import { TrophyBadge } from '../components/TrophyBadge';
import { ProgressBar } from '../components/ProgressBar';
import { BrawlerCard } from '../components/BrawlerCard';
import { getPlayer, getBattleLog, BrawlApiError } from '../api/brawlstars';
import type { PlayerProfile, BattleLogEntry } from '../types';
import type { SearchStackParamList } from '../App';

type RouteProp = RNRouteProp<SearchStackParamList, 'PlayerStats'>;
type NavProp = NativeStackNavigationProp<SearchStackParamList, 'PlayerStats'>;

function resultColor(result: string | undefined): string {
  if (result === 'victory') return C.success;
  if (result === 'defeat') return C.danger;
  return C.sub;
}

function resultLabel(result: string | undefined): string {
  if (result === 'victory') return 'Win';
  if (result === 'defeat') return 'Loss';
  return 'Draw';
}

function modeEmoji(mode: string): string {
  const map: Record<string, string> = {
    gemGrab: '💎', brawlBall: '⚽', bounty: '⭐', heist: '💰',
    siege: '🤖', hotZone: '🔥', knockout: '🥊', duels: '⚔️',
    showdown: '☠️', duoShowdown: '👥',
  };
  return map[mode] ?? '🎮';
}

export function PlayerStatsScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavProp>();
  const { tag } = route.params;

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [battles, setBattles] = useState<BattleLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brawlerSearch, setBrawlerSearch] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: 'Player Stats' });
    Promise.all([getPlayer(tag), getBattleLog(tag)])
      .then(([p, b]) => {
        setProfile(p);
        setBattles(b.items);
      })
      .catch((err) => {
        setError(
          err instanceof BrawlApiError ? err.message : 'Failed to load player data.',
        );
      })
      .finally(() => setLoading(false));
  }, [tag, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading player…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error !== null || profile === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error ?? 'Player not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedBrawlers = [...profile.brawlers].sort(
    (a, b) => b.trophies - a.trophies,
  );
  const topBrawlers = sortedBrawlers.slice(0, 5);
  const maxTrophies = topBrawlers[0]?.highestTrophies || 1;

  const filteredBrawlers = sortedBrawlers.filter((b) =>
    b.name.toLowerCase().includes(brawlerSearch.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{profile.name}</Text>
              <Text style={styles.heroTag}>{profile.tag}</Text>
              {profile.club?.name ? (
                <Text style={styles.heroClub}>🏰 {profile.club.name}</Text>
              ) : null}
            </View>
            <View style={styles.heroRight}>
              <TrophyBadge count={profile.trophies} size="lg" />
              <Text style={styles.expBadge}>Lvl {profile.expLevel}</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionHeader}>Statistics</Text>
        <View style={styles.statsGrid}>
          {[
            { label: '3v3 Wins', value: profile['3vs3Victories'].toLocaleString(), icon: '⚔️' },
            { label: 'Solo Wins', value: profile.soloVictories.toLocaleString(), icon: '☠️' },
            { label: 'Duo Wins', value: profile.duoVictories.toLocaleString(), icon: '👥' },
            { label: 'Highest 🏆', value: profile.highestTrophies.toLocaleString(), icon: '🌟' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Top Brawlers */}
        <Text style={styles.sectionHeader}>Top Brawlers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topBrawlerRow}
        >
          {topBrawlers.map((b) => (
            <View key={b.id} style={styles.topBrawlerCard}>
              <Text style={styles.topBrawlerName} numberOfLines={1}>{b.name}</Text>
              <View style={styles.powerBadge}>
                <Text style={styles.powerBadgeText}>P{b.power}</Text>
              </View>
              <Text style={styles.topBrawlerTrophies}>🏆 {b.trophies.toLocaleString()}</Text>
              <View style={{ marginTop: 6 }}>
                <ProgressBar
                  value={b.trophies / maxTrophies}
                  color={C.accent}
                  height={6}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Battle Log Preview */}
        <View style={styles.battleLogHeader}>
          <Text style={styles.sectionHeader}>Recent Battles</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('BattleLog', { tag })}
          >
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        {battles.slice(0, 3).map((entry, idx) => (
          <View key={idx} style={styles.battleRow}>
            <Text style={styles.battleEmoji}>{modeEmoji(entry.event.mode)}</Text>
            <View style={styles.battleInfo}>
              <Text style={styles.battleMode}>{entry.event.mode}</Text>
              <Text style={styles.battleMap}>{entry.event.map}</Text>
            </View>
            <View style={styles.battleRight}>
              <Text
                style={[
                  styles.battleResult,
                  { color: resultColor(entry.battle.result) },
                ]}
              >
                {resultLabel(entry.battle.result)}
              </Text>
              {entry.battle.trophyChange !== undefined && (
                <Text
                  style={[
                    styles.trophyChange,
                    {
                      color:
                        (entry.battle.trophyChange ?? 0) >= 0 ? C.success : C.danger,
                    },
                  ]}
                >
                  {(entry.battle.trophyChange ?? 0) >= 0 ? '+' : ''}
                  {entry.battle.trophyChange}
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Full Brawler Grid */}
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
          All Brawlers ({profile.brawlers.length})
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search brawlers…"
          placeholderTextColor={C.muted}
          value={brawlerSearch}
          onChangeText={setBrawlerSearch}
        />
        <View style={styles.brawlerGrid}>
          {filteredBrawlers.map((b) => (
            <View key={b.id} style={styles.brawlerCell}>
              <BrawlerCard brawler={b} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { color: C.sub, fontSize: 15 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center' },
  heroCard: {
    backgroundColor: C.card,
    margin: 16,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: '800', color: C.text },
  heroTag: { fontSize: 13, color: C.sub, marginTop: 2 },
  heroClub: { fontSize: 13, color: C.purple, marginTop: 4 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  expBadge: {
    backgroundColor: C.purple,
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: S.borderRadius.full,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 24,
    gap: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 12, color: C.sub },
  topBrawlerRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  topBrawlerCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 12,
    width: 120,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  topBrawlerName: { fontSize: 13, fontWeight: '700', color: C.text },
  powerBadge: {
    backgroundColor: C.accent,
    borderRadius: S.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  powerBadgeText: { fontSize: 11, fontWeight: '800', color: C.bg },
  topBrawlerTrophies: { fontSize: 12, color: C.sub },
  battleLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 16,
  },
  viewAllText: { color: C.accent, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  battleEmoji: { fontSize: 24 },
  battleInfo: { flex: 1 },
  battleMode: { fontSize: 14, color: C.text, fontWeight: '600' },
  battleMap: { fontSize: 12, color: C.sub, marginTop: 2 },
  battleRight: { alignItems: 'flex-end', gap: 2 },
  battleResult: { fontSize: 13, fontWeight: '700' },
  trophyChange: { fontSize: 12, fontWeight: '600' },
  searchInput: {
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  brawlerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 8,
  },
  brawlerCell: { width: '47%' },
});
