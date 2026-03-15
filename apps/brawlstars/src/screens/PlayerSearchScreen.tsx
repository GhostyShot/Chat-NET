import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { TrophyBadge } from '../components/TrophyBadge';
import { getPlayer } from '../api/brawlstars';
import { BrawlApiError } from '../api/brawlstars';
import type { PlayerProfile } from '../types';
import type { SearchStackParamList } from '../App';

type SearchNavProp = NativeStackNavigationProp<SearchStackParamList, 'PlayerSearch'>;

function normaliseTag(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function PlayerSearchScreen() {
  const navigation = useNavigation<SearchNavProp>();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = async (tagOverride?: string) => {
    const raw = tagOverride ?? input;
    if (!raw.trim()) return;
    const tag = normaliseTag(raw);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const player = await getPlayer(tag);
      setResult(player);
      setRecentSearches((prev) => {
        const next = [tag, ...prev.filter((t) => t !== tag)].slice(0, 5);
        return next;
      });
    } catch (err) {
      if (err instanceof BrawlApiError) {
        if (err.status === 404) {
          setError('Player not found. Check the tag and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewStats = () => {
    if (!result) return;
    navigation.navigate('PlayerStats', { tag: result.tag });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Search Player" subtitle="Find any Brawl Stars profile" />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="#TAG e.g. #ABC123"
            placeholderTextColor={C.muted}
            value={input}
            onChangeText={setInput}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => handleSearch()}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {error !== null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {result !== null && (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={handleViewStats}
            activeOpacity={0.85}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.playerName}>{result.name}</Text>
                <Text style={styles.playerTag}>{result.tag}</Text>
              </View>
              <TrophyBadge count={result.trophies} size="md" />
            </View>
            <View style={styles.resultStats}>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Level</Text>
                <Text style={styles.statChipValue}>{result.expLevel}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>3v3 Wins</Text>
                <Text style={styles.statChipValue}>
                  {result['3vs3Victories'].toLocaleString()}
                </Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Brawlers</Text>
                <Text style={styles.statChipValue}>{result.brawlers.length}</Text>
              </View>
            </View>
            <Text style={styles.viewMore}>Tap to view full stats →</Text>
          </TouchableOpacity>
        )}

        {recentSearches.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Recent Searches</Text>
            {recentSearches.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.recentRow}
                onPress={() => handleSearch(tag)}
                activeOpacity={0.8}
              >
                <Text style={styles.recentIcon}>🕐</Text>
                <Text style={styles.recentTag}>{tag}</Text>
                <Text style={styles.recentArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchBtn: {
    backgroundColor: C.accent,
    borderRadius: S.borderRadius.md,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  searchBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
  errorBox: {
    backgroundColor: '#2D1A1A',
    borderRadius: S.borderRadius.md,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.danger,
  },
  errorText: { color: C.danger, fontSize: 14 },
  resultCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: { fontSize: 20, fontWeight: '800', color: C.text },
  playerTag: { fontSize: 13, color: C.sub, marginTop: 2 },
  resultStats: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.sm,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statChipLabel: { fontSize: 11, color: C.sub },
  statChipValue: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 2 },
  viewMore: { fontSize: 13, color: C.accent, fontWeight: '600', textAlign: 'right' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  recentIcon: { fontSize: 16 },
  recentTag: { flex: 1, color: C.text, fontSize: 15 },
  recentArrow: { color: C.muted, fontSize: 20 },
});
