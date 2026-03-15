import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { C, S, RARITY_COLORS } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { getBrawlers } from '../api/brawlstars';
import type { Brawler } from '../types';
import type { MetaStackParamList } from '../App';

type NavProp = NativeStackNavigationProp<MetaStackParamList, 'BrawlerList'>;

const RARITIES = ['All', 'Trophy_Road', 'Rare', 'Super_Rare', 'Epic', 'Mythic', 'Legendary'];

export function BrawlerListScreen() {
  const navigation = useNavigation<NavProp>();
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('All');

  useEffect(() => {
    getBrawlers()
      .then((res) => setBrawlers(res.items))
      .catch(() => setError('Failed to load brawlers.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = brawlers.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Brawlers" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error !== null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Brawlers" />
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Brawlers" subtitle={`${brawlers.length} total`} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search brawlers…"
        placeholderTextColor={C.muted}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        horizontal
        data={RARITIES}
        keyExtractor={(r) => r}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.rarityTab,
              rarityFilter === item && { borderColor: RARITY_COLORS[item] ?? C.accent, backgroundColor: (RARITY_COLORS[item] ?? C.accent) + '22' },
            ]}
            onPress={() => setRarityFilter(item)}
          >
            <Text
              style={[
                styles.rarityText,
                rarityFilter === item && { color: RARITY_COLORS[item] ?? C.accent },
              ]}
            >
              {item.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.rarityRow}
        showsHorizontalScrollIndicator={false}
        style={styles.rarityList}
      />
      <FlatList
        data={filtered}
        keyExtractor={(b) => String(b.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('BrawlerDetail', {
                brawlerId: item.id,
                brawlerName: item.name,
              })
            }
          >
            <View style={styles.cardIdBadge}>
              <Text style={styles.cardIdText}>#{item.id}</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.cardStats}>
              <Text style={styles.cardStatItem}>⭐ {item.starPowers.length} SP</Text>
              <Text style={styles.cardStatItem}>🔧 {item.gadgets.length} G</Text>
            </View>
          </TouchableOpacity>
        )}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: C.danger, fontSize: 15 },
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
    marginBottom: 10,
  },
  rarityList: { maxHeight: 44 },
  rarityRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  rarityTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: S.borderRadius.full,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  rarityText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  listContent: { padding: 12, paddingBottom: 32 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: S.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  cardIdBadge: {
    backgroundColor: C.surface,
    borderRadius: S.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  cardIdText: { fontSize: 10, color: C.muted, fontWeight: '600' },
  cardName: { fontSize: 15, fontWeight: '700', color: C.text },
  cardStats: { flexDirection: 'row', gap: 10 },
  cardStatItem: { fontSize: 12, color: C.sub },
});
