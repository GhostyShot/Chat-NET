import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, S } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { TrophyBadge } from '../components/TrophyBadge';
import { StatRow } from '../components/StatRow';
import { getPlayer, BrawlApiError } from '../api/brawlstars';
import type { PlayerProfile } from '../types';
import type { AccountStackParamList } from '../App';

type NavProp = NativeStackNavigationProp<AccountStackParamList, 'Account'>;

const APP_VERSION = '0.1.0';

function normaliseTag(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function AccountScreen() {
  const navigation = useNavigation<NavProp>();
  const [tagInput, setTagInput] = useState('');
  const [linked, setLinked] = useState<PlayerProfile | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleLink = async () => {
    if (!tagInput.trim()) return;
    const tag = normaliseTag(tagInput);
    setLinking(true);
    setLinkError(null);
    try {
      const player = await getPlayer(tag);
      setLinked(player);
      setTagInput('');
    } catch (err) {
      if (err instanceof BrawlApiError && err.status === 404) {
        setLinkError('Player not found. Check your tag and try again.');
      } else if (err instanceof BrawlApiError) {
        setLinkError(err.message);
      } else {
        setLinkError('Network error. Please check your connection.');
      }
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = () => {
    setLinked(null);
    setTagInput('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Account" subtitle="Manage your BrawlScope profile" />

        {linked !== null ? (
          /* Linked Account Card */
          <View style={styles.linkedCard}>
            <View style={styles.linkedHeader}>
              <View>
                <Text style={styles.linkedName}>{linked.name}</Text>
                <Text style={styles.linkedTag}>{linked.tag}</Text>
              </View>
              <TrophyBadge count={linked.trophies} size="md" />
            </View>
            <View style={styles.linkedStats}>
              <StatRow
                label="Level"
                value={linked.expLevel}
                icon="⚡"
                color={C.accent}
              />
              <StatRow
                label="3v3 Wins"
                value={linked['3vs3Victories'].toLocaleString()}
                icon="⚔️"
              />
              <StatRow
                label="Brawlers"
                value={linked.brawlers.length}
                icon="🥊"
              />
              <StatRow
                label="Highest Trophies"
                value={linked.highestTrophies.toLocaleString()}
                icon="🌟"
                color={C.accent}
              />
            </View>
            <View style={styles.linkedActions}>
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={handleUnlink}
                activeOpacity={0.8}
              >
                <Text style={styles.unlinkBtnText}>Unlink Account</Text>
              </TouchableOpacity>
              {linked.club?.tag && (
                <TouchableOpacity
                  style={styles.clubBtn}
                  onPress={() => navigation.navigate('Club')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clubBtnText}>🏰 View Club</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Link Account */
          <View style={styles.linkCard}>
            <Text style={styles.linkTitle}>🔗 Link Your Account</Text>
            <Text style={styles.linkSub}>
              Enter your Brawl Stars player tag to sync your profile.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="#PLAYERTAG"
              placeholderTextColor={C.muted}
              value={tagInput}
              onChangeText={setTagInput}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLink}
            />
            {linkError !== null && (
              <Text style={styles.errorText}>⚠️ {linkError}</Text>
            )}
            <TouchableOpacity
              style={[styles.linkBtn, linking && { opacity: 0.6 }]}
              onPress={handleLink}
              disabled={linking}
              activeOpacity={0.8}
            >
              <Text style={styles.linkBtnText}>
                {linking ? 'Linking…' : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <Text style={styles.sectionHeader}>Settings</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🌙 Theme</Text>
              <Text style={styles.settingDesc}>Dark mode only</Text>
            </View>
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>Dark</Text>
            </View>
          </View>
          <View style={[styles.settingRow, styles.settingBorder]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔔 Notifications</Text>
              <Text style={styles.settingDesc}>Match reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: C.muted, true: C.accent }}
              thumbColor={C.text}
            />
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.aboutCard}>
          <StatRow label="App Version" value={APP_VERSION} icon="📱" />
          <StatRow label="Data Source" value="Brawl Stars API" icon="🌐" />
        </View>

        <TouchableOpacity
          style={styles.disclaimerBtn}
          onPress={() => Linking.openURL('https://brawlstars.com')}
          activeOpacity={0.8}
        >
          <Text style={styles.disclaimerText}>
            🎮 Visit Official Brawl Stars Website
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          BrawlScope is not affiliated with or endorsed by Supercell. Brawl Stars
          is a trademark of Supercell.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  linkedCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 16,
  },
  linkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkedName: { fontSize: 22, fontWeight: '800', color: C.text },
  linkedTag: { fontSize: 13, color: C.sub, marginTop: 2 },
  linkedStats: {
    borderRadius: S.borderRadius.md,
    overflow: 'hidden',
  },
  linkedActions: { flexDirection: 'row', gap: 10 },
  unlinkBtn: {
    flex: 1,
    backgroundColor: C.danger + '33',
    borderRadius: S.borderRadius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.danger,
  },
  unlinkBtnText: { color: C.danger, fontWeight: '700', fontSize: 13 },
  clubBtn: {
    flex: 1,
    backgroundColor: C.purple + '33',
    borderRadius: S.borderRadius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.purple,
  },
  clubBtnText: { color: C.purple, fontWeight: '700', fontSize: 13 },
  linkCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  linkTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  linkSub: { fontSize: 13, color: C.sub, lineHeight: 20 },
  input: {
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  errorText: { color: C.danger, fontSize: 13 },
  linkBtn: {
    backgroundColor: C.accent,
    borderRadius: S.borderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  linkBtnText: { color: C.bg, fontWeight: '800', fontSize: 15 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  settingsCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingBorder: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, color: C.text, fontWeight: '600' },
  settingDesc: { fontSize: 12, color: C.sub, marginTop: 2 },
  themeBadge: {
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  themeBadgeText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  aboutCard: {
    backgroundColor: C.card,
    borderRadius: S.borderRadius.lg,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  disclaimerBtn: {
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  disclaimerText: { color: C.blue, fontSize: 14, fontWeight: '600' },
  disclaimer: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginHorizontal: 24,
    lineHeight: 18,
  },
});
