import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface TabConfig {
  name: string;
  label: string;
  icon: string;
  emoji: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    name: 'Home',
    label: 'Home',
    icon: '🏠',
    emoji: '🏠',
  },
  findvet: {
    name: 'Vet',
    label: 'Vétérinaire',
    icon: '🏥',
    emoji: '🏥',
  },
  chat: {
    name: 'Chat',
    label: 'Chat',
    icon: '💬',
    emoji: '💬',
  },
  health: {
    name: 'Care',
    label: 'Care',
    icon: '❤️',
    emoji: '❤️',
  },
  pets: {
    name: 'Pets',
    label: 'Pets',
    icon: '🐾',
    emoji: '🐾',
  },
  settings: {
    name: 'Settings',
    label: 'Paramètres',
    icon: '⚙️',
    emoji: '⚙️',
  },
};

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const renderTabItem = (_: unknown, index: number) => {
    const route = state.routes[index];
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    const tabKey = route.name.replace(/^.*\//, '');
    const config = TAB_CONFIG[tabKey] || TAB_CONFIG.index;

    const label = language === 'fr'
      ? (config.name === 'Vet' ? 'Vétérinaire' :
         config.name === 'Settings' ? 'Paramètres' :
         config.label)
      : config.label;

    // Center position for GRRR tab
    const isCenter = index === 2; // chat tab (middle)

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={[
          styles.tabItem,
          isCenter && styles.centerTab,
        ]}
        activeOpacity={0.7}
      >
        {isCenter ? (
          <View style={[styles.centerCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.centerEmoji}>🐾</Text>
            <Text style={[styles.centerLabel, { color: 'white' }]}>GRRR</Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.iconContainer,
                isFocused && {
                  backgroundColor: colors.primary + '15',
                },
              ]}
            >
              <Text style={styles.emoji}>{config.emoji}</Text>
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? colors.primary : colors.textSecondary,
                  fontWeight: isFocused ? '600' : '500',
                  fontSize: isFocused ? 11 : 10,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {isFocused && <View style={[styles.indicator, { backgroundColor: colors.primary }]} />}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((item: any, index: number) => renderTabItem(item, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 60,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  centerTab: {
    marginTop: -20,
  },
  centerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  centerEmoji: {
    fontSize: 28,
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    textAlign: 'center',
    maxWidth: 50,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
});
