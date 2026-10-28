import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet } from 'react-native';

import { useColors } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} color={color as string} size={24} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Marché', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: 'Portefeuille', tabBarIcon: icon('pie-chart-outline', 'pie-chart') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Compte', tabBarIcon: icon('person-circle-outline', 'person-circle') }}
      />
    </Tabs>
  );
}
