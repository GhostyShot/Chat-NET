import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { C } from './theme';

import { HomeScreen } from './screens/HomeScreen';
import { PlayerSearchScreen } from './screens/PlayerSearchScreen';
import { PlayerStatsScreen } from './screens/PlayerStatsScreen';
import { BattleLogScreen } from './screens/BattleLogScreen';
import { EsportsScreen } from './screens/EsportsScreen';
import { MetaScreen } from './screens/MetaScreen';
import { BrawlerListScreen } from './screens/BrawlerListScreen';
import { BrawlerDetailScreen } from './screens/BrawlerDetailScreen';
import { AccountScreen } from './screens/AccountScreen';
import { ClubScreen } from './screens/ClubScreen';

// ── Stack param lists ──────────────────────────────────────────────────────────

export type SearchStackParamList = {
  PlayerSearch: undefined;
  PlayerStats: { tag: string };
  BattleLog: { tag: string };
};

export type MetaStackParamList = {
  Meta: undefined;
  BrawlerList: undefined;
  BrawlerDetail: { brawlerId: number; brawlerName: string };
};

export type AccountStackParamList = {
  Account: undefined;
  Club: undefined;
};

export type EsportsStackParamList = {
  Esports: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  Search: undefined;
  EsportsTab: undefined;
  MetaTab: undefined;
  AccountTab: undefined;
};

// ── Stack Navigators ───────────────────────────────────────────────────────────

const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MetaStack = createNativeStackNavigator<MetaStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();
const EsportsStack = createNativeStackNavigator<EsportsStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: C.surface },
  headerTintColor: C.text,
  headerTitleStyle: { color: C.text, fontWeight: '700' as const },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: C.bg },
} as const;

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ ...SCREEN_OPTIONS, headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function SearchNavigator() {
  return (
    <SearchStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <SearchStack.Screen
        name="PlayerSearch"
        component={PlayerSearchScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="PlayerStats"
        component={PlayerStatsScreen}
        options={{ title: 'Player Stats' }}
      />
      <SearchStack.Screen
        name="BattleLog"
        component={BattleLogScreen}
        options={{ title: 'Battle Log' }}
      />
    </SearchStack.Navigator>
  );
}

function EsportsNavigator() {
  return (
    <EsportsStack.Navigator screenOptions={{ ...SCREEN_OPTIONS, headerShown: false }}>
      <EsportsStack.Screen name="Esports" component={EsportsScreen} />
    </EsportsStack.Navigator>
  );
}

function MetaNavigator() {
  return (
    <MetaStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <MetaStack.Screen
        name="Meta"
        component={MetaScreen}
        options={{ headerShown: false }}
      />
      <MetaStack.Screen
        name="BrawlerList"
        component={BrawlerListScreen}
        options={{ title: 'All Brawlers' }}
      />
      <MetaStack.Screen
        name="BrawlerDetail"
        component={BrawlerDetailScreen}
        options={{ title: 'Brawler' }}
      />
    </MetaStack.Navigator>
  );
}

function AccountNavigator() {
  return (
    <AccountStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <AccountStack.Screen
        name="Account"
        component={AccountScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="Club"
        component={ClubScreen}
        options={{ title: 'Club Explorer' }}
      />
    </AccountStack.Navigator>
  );
}

// ── Navigation Theme ───────────────────────────────────────────────────────────

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: C.surface,
    text: C.text,
    border: C.border,
    primary: C.accent,
    notification: C.accent,
  },
};

// ── Root App ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.bg,
            borderTopColor: C.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              HomeTab: '🏠',
              Search: '🔍',
              EsportsTab: '🏆',
              MetaTab: '📊',
              AccountTab: '👤',
            };
            return (
              <Text style={{ fontSize: size * 0.85, color }}>{icons[route.name]}</Text>
            );
          },
        })}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeNavigator}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="Search"
          component={SearchNavigator}
          options={{ tabBarLabel: 'Search' }}
        />
        <Tab.Screen
          name="EsportsTab"
          component={EsportsNavigator}
          options={{ tabBarLabel: 'Esports' }}
        />
        <Tab.Screen
          name="MetaTab"
          component={MetaNavigator}
          options={{ tabBarLabel: 'Meta' }}
        />
        <Tab.Screen
          name="AccountTab"
          component={AccountNavigator}
          options={{ tabBarLabel: 'Account' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
