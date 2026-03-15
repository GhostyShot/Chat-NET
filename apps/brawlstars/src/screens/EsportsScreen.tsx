import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import type { EsportsMatch, EsportsTeam } from '../types';

const TEAMS: EsportsTeam[] = [
  { id: 'queso', name: 'Team Queso', region: 'EU', players: ['Sergio', 'Bobi', 'Zuki'], wins: 12, losses: 3 },
  { id: 'navi', name: 'NAVI', region: 'EU', players: ['s1mple', 'JACKZ', 'flamie'], wins: 9, losses: 5 },
  { id: 'tribe', name: 'Tribe Gaming', region: 'NA', players: ['Chief Pat', 'Klaus', 'Lex'], wins: 11, losses: 4 },
  { id: 'sg', name: 'SG Esports', region: 'LATAM', players: ['PedroLatore', 'Mano', 'Victor'], wins: 8, losses: 6 },
  { id: 'starr', name: 'Starr Force', region: 'APAC', players: ['Kai', 'Luna', 'Zen'], wins: 7, losses: 7 },
  { id: 'nova', name: 'Nova Esports', region: 'CN', players: ['MeiMei', 'Dragon', 'Snow'], wins: 10, losses: 4 },
];

const MOCK_MATCHES: EsportsMatch[] = [
  {
    id: 'm1',
    team1: TEAMS[0],
    team2: TEAMS[2],
    scheduledTime: '2025-08-15T18:00:00Z',
    status: 'upcoming',
  },
  {
    id: 'm2',
    team1: TEAMS[1],
    team2: TEAMS[3],
    scheduledTime: '2025-08-15T20:00:00Z',
    status: 'upcoming',
  },
  {
    id: 'm3',
    team1: TEAMS[4],
    team2: TEAMS[5],
    scheduledTime: '2025-08-14T16:00:00Z',
    status: 'live',
  },
  {
    id: 'm4',
    team1: TEAMS[0],
    team2: TEAMS[1],
    scheduledTime: '2025-08-10T17:00:00Z',
    result: { winner: TEAMS[0].name, score: '3-1' },
    status: 'finished',
  },
  {
    id: 'm5',
    team1: TEAMS[2],
    team2: TEAMS[5],
    scheduledTime: '2025-08-11T19:00:00Z',
    result: { winner: TEAMS[5].name, score: '3-2' },
    status: 'finished',
  },
];

type TabFilter = 'Upcoming' | 'Live' | 'Finished';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EsportsScreen() {
  const [tab, setTab] = useState<TabFilter>('Upcoming');
  const [predictions, setPredictions] = useState<Record<string, string>>({});

  const filtered = MOCK_MATCHES.filter((m) => {
    if (tab === 'Upcoming') return m.status === 'upcoming';
    if (tab === 'Live') return m.status === 'live';
    return m.status === 'finished';
  });

  const predict = (matchId: string, teamName: string) => {
    setPredictions((prev) => ({ ...prev, [matchId]: teamName }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Esports Hub" subtitle="Brawl Stars World Circuit" />

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroBannerEmoji}>🏆</Text>
          <Text style={styles.heroBannerTitle}>World Finals 2025</Text>
          <Text style={styles.heroBannerSub}>
            Top 16 teams compete for the ultimate Brawl Stars championship.
          </Text>
          <TouchableOpacity
            style={styles.watchBtn}
            onPress={() => Linking.openURL('https://www.youtube.com/@BrawlStars')}
            activeOpacity={0.8}
          >
            <Text style={styles.watchBtnText}>▶ Watch Live</Text>
          </TouchableOpacity>
        </View>

        {/* Match Schedule Tabs */}
        <View style={styles.tabRow}>
          {(['Upcoming', 'Live', 'Finished'] as TabFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              {t === 'Live' && <View style={styles.liveDot} />}
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No {tab.toLowerCase()} matches.</Text>
        ) : (
          filtered.map((match) => (
            <View key={match.id} style={styles.matchCard}>
              <Text style={styles.matchTime}>{formatDate(match.scheduledTime)}</Text>
              {match.status === 'live' && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>🔴 LIVE</Text>
                </View>
              )}
              <View style={styles.matchTeams}>
                <TouchableOpacity
                  style={[
                    styles.teamBtn,
                    predictions[match.id] === match.team1.name && styles.teamBtnSelected,
                  ]}
                  onPress={() => predict(match.id, match.team1.name)}
                  disabled={match.status === 'finished'}
                >
                  <Text style={styles.teamName}>{match.team1.name}</Text>
                  <Text style={styles.teamRegion}>{match.team1.region}</Text>
                </TouchableOpacity>

                <View style={styles.vsBadge}>
                  {match.result ? (
                    <Text style={styles.scoreText}>{match.result.score}</Text>
                  ) : (
                    <Text style={styles.vsText}>VS</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.teamBtn,
                    styles.teamBtnRight,
                    predictions[match.id] === match.team2.name && styles.teamBtnSelected,
                  ]}
                  onPress={() => predict(match.id, match.team2.name)}
                  disabled={match.status === 'finished'}
                >
                  <Text style={[styles.teamName, { textAlign: 'right' }]}>
                    {match.team2.name}
                  </Text>
                  <Text style={[styles.teamRegion, { textAlign: 'right' }]}>
                    {match.team2.region}
                  </Text>
                </TouchableOpacity>
              </View>

              {match.result && (
                <Text style={styles.winnerText}>
                  🏆 Winner: {match.result.winner}
                </Text>
              )}
              {predictions[match.id] && match.status !== 'finished' && (
                <Text style={styles.predictionText}>
                  Your pick: {predictions[match.id]}
                </Text>
              )}
            </View>
          ))
        )}

        {/* Tournament Bracket */}
        <Text style={styles.sectionHeader}>Bracket Overview</Text>
        <View style={styles.bracketCard}>
          <Text style={styles.bracketLabel}>Quarter Finals</Text>
          {[
            ['Team Queso', 'Tribe Gaming'],
            ['NAVI', 'SG Esports'],
            ['Starr Force', 'Nova Esports'],
            ['Tribe Gaming', 'Nova Esports'],
          ].map(([t1, t2], i) => (
            <View key={i} style={styles.bracketRow}>
              <Text style={styles.bracketTeam}>{t1}</Text>
              <Text style={styles.bracketVs}>vs</Text>
              <Text style={styles.bracketTeam}>{t2}</Text>
            </View>
          ))}
        </View>

        {/* Team Comparison */}
        <Text style={styles.sectionHeader}>Team Standings</Text>
        {TEAMS.map((team) => (
          <View key={team.id} style={styles.standingRow}>
            <View style={styles.standingInfo}>
              <Text style={styles.standingName}>{team.name}</Text>
              <Text style={styles.standingRegion}>{team.region}</Text>
            </View>
            <View style={styles.standingRecord}>
              <Text style={styles.winsText}>{team.wins}W</Text>
              <Text style={styles.lossesText}>{team.losses}L</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  heroBanner: {
    backgroundColor: C.card,
    margin: 16,
    borderRadius: S.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.accent,
    gap: 8,
  },
  heroBannerEmoji: { fontSize: 48 },
  heroBannerTitle: { fontSize: 24, fontWeight: '800', color: C.accent },
  heroBannerSub: { fontSize: 13, color: C.sub, textAlign: 'center' },
  watchBtn: {
    backgroundColor: C.danger,
    borderRadius: S.borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  watchBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: S.borderRadius.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.bg },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.danger,
  },
  emptyText: { color: C.muted, textAlign: 'center', margin: 24, fontSize: 15 },
  matchCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  matchTime: { fontSize: 12, color: C.sub },
  liveBadge: {
    backgroundColor: C.danger + '22',
    borderRadius: S.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.danger,
  },
  liveBadgeText: { color: C.danger, fontSize: 11, fontWeight: '700' },
  matchTeams: { flexDirection: 'row', alignItems: 'center' },
  teamBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  teamBtnRight: {},
  teamBtnSelected: { borderColor: C.accent, backgroundColor: C.accent + '22' },
  teamName: { fontSize: 13, fontWeight: '700', color: C.text },
  teamRegion: { fontSize: 11, color: C.sub, marginTop: 2 },
  vsBadge: {
    width: 44,
    alignItems: 'center',
  },
  vsText: { color: C.muted, fontWeight: '700', fontSize: 14 },
  scoreText: { color: C.accent, fontWeight: '800', fontSize: 14 },
  winnerText: { fontSize: 13, color: C.accent, fontWeight: '600' },
  predictionText: { fontSize: 12, color: C.purple, fontStyle: 'italic' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  bracketCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  bracketLabel: { fontSize: 13, color: C.accent, fontWeight: '700', marginBottom: 4 },
  bracketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bracketTeam: { flex: 1, fontSize: 13, color: C.text, fontWeight: '600' },
  bracketVs: { fontSize: 11, color: C.muted },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  standingInfo: { flex: 1 },
  standingName: { fontSize: 15, fontWeight: '600', color: C.text },
  standingRegion: { fontSize: 11, color: C.sub },
  standingRecord: { flexDirection: 'row', gap: 10 },
  winsText: { color: C.success, fontWeight: '700', fontSize: 14 },
  lossesText: { color: C.danger, fontWeight: '700', fontSize: 14 },
});
