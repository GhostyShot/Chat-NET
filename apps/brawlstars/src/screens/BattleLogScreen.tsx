import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp as RNRouteProp } from '@react-navigation/native';
import { C, S } from '../theme';
import { getBattleLog, BrawlApiError } from '../api/brawlstars';
import type { BattleLogEntry } from '../types';
import type { SearchStackParamList } from '../App';

type RouteProp = RNRouteProp<SearchStackParamList, 'BattleLog'>;

type FilterMode = 'All' | '3v3' | 'Solo' | 'Duo';

const FILTERS: FilterMode[] = ['All', '3v3', 'Solo', 'Duo'];

function modeEmoji(mode: string): string {
  const map: Record<string, string> = {
    gemGrab: '💎', brawlBall: '⚽', bounty: '⭐', heist: '💰',
    siege: '🤖', hotZone: '🔥', knockout: '🥊', duels: '⚔️',
    showdown: '☠️', duoShowdown: '👥', wipeout: '💥',
  };
  return map[mode] ?? '🎮';
}

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

function passesFilter(entry: BattleLogEntry, filter: FilterMode): boolean {
  if (filter === 'All') return true;
  const mode = entry.event.mode.toLowerCase();
  if (filter === 'Solo') return mode.includes('showdown') && !mode.includes('duo');
  if (filter === 'Duo') return mode.includes('duo');
  // 3v3 = everything else
  return (
    !mode.includes('showdown') &&
    !mode.includes('solo') &&
    !mode.includes('duo') &&
    !mode.includes('duel')
  );
}

export function BattleLogScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation();
  const { tag } = route.params;

  const [battles, setBattles] = useState<BattleLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('All');

  useEffect(() => {
    navigation.setOptions({ title: 'Battle Log' });
    getBattleLog(tag)
      .then((log) => setBattles(log.items))
      .catch((err) =>
        setError(err instanceof BrawlApiError ? err.message : 'Failed to load battle log.'),
      )
      .finally(() => setLoading(false));
  }, [tag, navigation]);

  const filtered = battles.filter((e) => passesFilter(e, filter));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading battles…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error !== null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No battles found for this filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => {
            const isStarPlayer = item.battle.starPlayer !== undefined;
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.modeEmoji}>{modeEmoji(item.event.mode)}</Text>
                </View>
                <View style={styles.cardMid}>
                  <Text style={styles.modeName}>{item.event.mode}</Text>
                  <Text style={styles.mapName}>{item.event.map}</Text>
                  {isStarPlayer && (
                    <Text style={styles.starLabel}>
                      ⭐ Star: {item.battle.starPlayer?.name}
                    </Text>
                  )}
                </View>
                <View style={styles.cardRight}>
                  <Text
                    style={[
                      styles.result,
                      { color: resultColor(item.battle.result) },
                    ]}
                  >
                    {resultLabel(item.battle.result)}
                  </Text>
                  {item.battle.trophyChange !== undefined && (
                    <Text
                      style={[
                        styles.trophyChange,
                        {
                          color:
                            (item.battle.trophyChange ?? 0) >= 0
                              ? C.success
                              : C.danger,
                        },
                      ]}
                    >
                      {(item.battle.trophyChange ?? 0) >= 0 ? '+' : ''}
                      {item.battle.trophyChange}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: C.sub, fontSize: 15 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center' },
  emptyText: { color: C.muted, fontSize: 15 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: S.borderRadius.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  tabText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    alignItems: 'center',
  },
  cardLeft: {
    width: 40,
    alignItems: 'center',
  },
  modeEmoji: { fontSize: 28 },
  cardMid: { flex: 1, gap: 2 },
  modeName: { fontSize: 14, fontWeight: '700', color: C.text },
  mapName: { fontSize: 12, color: C.sub },
  starLabel: { fontSize: 11, color: C.accent, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  result: { fontSize: 13, fontWeight: '700' },
  trophyChange: { fontSize: 12, fontWeight: '600' },
});
