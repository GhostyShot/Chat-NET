import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { TrophyBadge } from '../components/TrophyBadge';
import { StatRow } from '../components/StatRow';
import { getClub, BrawlApiError } from '../api/brawlstars';
import type { Club } from '../types';

const ROLE_COLORS: Record<string, string> = {
  president: C.accent,
  vicePresident: C.purple,
  senior: C.blue,
  member: C.sub,
  unknown: C.muted,
};

function normaliseTag(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function ClubScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [club, setClub] = useState<Club | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!input.trim()) return;
    const tag = normaliseTag(input);
    setLoading(true);
    setError(null);
    setClub(null);
    try {
      const data = await getClub(tag);
      setClub(data);
    } catch (err) {
      if (err instanceof BrawlApiError && err.status === 404) {
        setError('Club not found. Check the tag and try again.');
      } else if (err instanceof BrawlApiError) {
        setError(err.message);
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedMembers = club
    ? [...club.members].sort((a, b) => b.trophies - a.trophies)
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Club Explorer" subtitle="Search any Brawl Stars club" />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="#CLUBTAG"
            placeholderTextColor={C.muted}
            value={input}
            onChangeText={setInput}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
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

        {club !== null && (
          <>
            <View style={styles.clubCard}>
              <Text style={styles.clubName}>{club.name}</Text>
              <Text style={styles.clubTag}>{club.tag}</Text>
              {club.description.length > 0 && (
                <Text style={styles.clubDesc}>{club.description}</Text>
              )}
              <View style={styles.clubStatsRow}>
                <TrophyBadge count={club.trophies} size="md" />
                <View style={styles.clubTypeBadge}>
                  <Text style={styles.clubTypeText}>{club.type}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <StatRow
                label="Members"
                value={`${club.members.length} / 30`}
                icon="👥"
              />
              <StatRow
                label="Required Trophies"
                value={club.requiredTrophies.toLocaleString()}
                icon="🏆"
              />
              <StatRow
                label="Total Trophies"
                value={club.trophies.toLocaleString()}
                icon="🌟"
                color={C.accent}
              />
            </View>

            <Text style={styles.sectionHeader}>
              Members ({sortedMembers.length})
            </Text>
            {sortedMembers.map((member) => (
              <View key={member.tag} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberTag}>{member.tag}</Text>
                </View>
                <View style={styles.memberRight}>
                  <View
                    style={[
                      styles.roleBadge,
                      { borderColor: ROLE_COLORS[member.role] ?? C.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: ROLE_COLORS[member.role] ?? C.muted },
                      ]}
                    >
                      {member.role}
                    </Text>
                  </View>
                  <TrophyBadge count={member.trophies} size="sm" />
                </View>
              </View>
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
  clubCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 8,
  },
  clubName: { fontSize: 22, fontWeight: '800', color: C.text },
  clubTag: { fontSize: 13, color: C.sub },
  clubDesc: { fontSize: 14, color: C.sub, lineHeight: 20 },
  clubStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  clubTypeBadge: {
    backgroundColor: C.purple + '33',
    borderRadius: S.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.purple,
  },
  clubTypeText: { color: C.purple, fontSize: 12, fontWeight: '600' },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: C.text },
  memberTag: { fontSize: 11, color: C.muted, marginTop: 2 },
  memberRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: {
    borderRadius: S.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
});
