import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp as RNRouteProp } from '@react-navigation/native';
import { C, S } from '../theme';
import { ProgressBar } from '../components/ProgressBar';
import { TrophyBadge } from '../components/TrophyBadge';
import { getBrawler, getBrawlerRankings, BrawlApiError } from '../api/brawlstars';
import type { Brawler, RankingPlayer } from '../types';
import type { MetaStackParamList } from '../App';

type RouteProp = RNRouteProp<MetaStackParamList, 'BrawlerDetail'>;

const MOCK_USAGE = [
  { label: 'Gem Grab', rate: 0.72 },
  { label: 'Brawl Ball', rate: 0.65 },
  { label: 'Knockout', rate: 0.58 },
  { label: 'Hot Zone', rate: 0.49 },
];

export function BrawlerDetailScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation();
  const { brawlerId, brawlerName } = route.params;

  const [brawler, setBrawler] = useState<Brawler | null>(null);
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: brawlerName });
    Promise.all([
      getBrawler(brawlerId),
      getBrawlerRankings('global', brawlerId),
    ])
      .then(([b, r]) => {
        setBrawler(b);
        setRankings(r.items.slice(0, 3));
      })
      .catch((err) =>
        setError(err instanceof BrawlApiError ? err.message : 'Failed to load brawler.'),
      )
      .finally(() => setLoading(false));
  }, [brawlerId, brawlerName, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error !== null || brawler === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error ?? 'Brawler not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🥊</Text>
          <Text style={styles.heroName}>{brawler.name}</Text>
          <Text style={styles.heroId}>ID: {brawler.id}</Text>
        </View>

        {/* Star Powers */}
        <Text style={styles.sectionHeader}>Star Powers</Text>
        {brawler.starPowers.length === 0 ? (
          <Text style={styles.emptyText}>No star powers available.</Text>
        ) : (
          brawler.starPowers.map((sp) => (
            <View key={sp.id} style={styles.abilityCard}>
              <Text style={styles.abilityEmoji}>⭐</Text>
              <View style={styles.abilityInfo}>
                <Text style={styles.abilityName}>{sp.name}</Text>
                <Text style={styles.abilityId}>ID: {sp.id}</Text>
              </View>
            </View>
          ))
        )}

        {/* Gadgets */}
        <Text style={styles.sectionHeader}>Gadgets</Text>
        {brawler.gadgets.length === 0 ? (
          <Text style={styles.emptyText}>No gadgets available.</Text>
        ) : (
          brawler.gadgets.map((g) => (
            <View key={g.id} style={styles.abilityCard}>
              <Text style={styles.abilityEmoji}>🔧</Text>
              <View style={styles.abilityInfo}>
                <Text style={styles.abilityName}>{g.name}</Text>
                <Text style={styles.abilityId}>ID: {g.id}</Text>
              </View>
            </View>
          ))
        )}

        {/* Rankings */}
        <Text style={styles.sectionHeader}>Top Players</Text>
        {rankings.length === 0 ? (
          <Text style={styles.emptyText}>No ranking data available.</Text>
        ) : (
          rankings.map((player, idx) => (
            <View key={player.tag} style={styles.rankRow}>
              <Text style={styles.rankPos}>#{idx + 1}</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{player.name}</Text>
                {player.club && (
                  <Text style={styles.rankClub}>{player.club.name}</Text>
                )}
              </View>
              <TrophyBadge count={player.trophies} size="sm" />
            </View>
          ))
        )}

        {/* Usage Stats */}
        <Text style={styles.sectionHeader}>Usage Stats (Mock)</Text>
        <View style={styles.usageCard}>
          {MOCK_USAGE.map((u) => (
            <View key={u.label} style={styles.usageRow}>
              <ProgressBar
                value={u.rate}
                color={C.purple}
                height={10}
                label={u.label}
                showPercent
              />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: C.danger, fontSize: 15, textAlign: 'center' },
  hero: {
    backgroundColor: C.card,
    margin: 16,
    borderRadius: S.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.accent,
    gap: 6,
  },
  heroEmoji: { fontSize: 56 },
  heroName: { fontSize: 28, fontWeight: '800', color: C.accent },
  heroId: { fontSize: 13, color: C.sub },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  emptyText: { color: C.muted, marginHorizontal: 16, marginBottom: 12, fontSize: 14 },
  abilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  abilityEmoji: { fontSize: 24 },
  abilityInfo: { flex: 1 },
  abilityName: { fontSize: 15, fontWeight: '700', color: C.text },
  abilityId: { fontSize: 11, color: C.muted, marginTop: 2 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  rankPos: { fontSize: 18, fontWeight: '800', color: C.accent, width: 32, textAlign: 'center' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '700', color: C.text },
  rankClub: { fontSize: 12, color: C.sub, marginTop: 2 },
  usageCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  usageRow: {},
});
