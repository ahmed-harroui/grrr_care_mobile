import { Tabs } from 'expo-router';
import { useColorScheme, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { SideBar } from '@/components/SideBar';
import { SIDEBAR_WIDTH, useDevice } from '@/lib/device';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  const colors = Colors[scheme];
  // A laptop gets a sidebar and the pages beside it; phones and tablets keep the floating bar
  const { isLaptop } = useDevice();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
        sceneStyle: isLaptop ? { paddingLeft: SIDEBAR_WIDTH } : undefined,
      }}
      tabBar={(props) => (isLaptop ? <SideBar {...props} /> : <FloatingTabBar {...props} />)}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="findvet"
        options={{
          title: 'Find Vet',
          tabBarLabel: 'Vet',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏥</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarLabel: 'Health',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarLabel: 'Pets',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🐾</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
