import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const LOGO_MAP: Record<string, any> = {
  index: require('../../assets/logo/home.png'),
  findvet: require('../../assets/logo/vet.png'),
  chat: require('../../assets/logo/grrrr.png'),
  health: require('../../assets/logo/care.png'),
  pets: require('../../assets/logo/pets.png'),
  settings: require('../../assets/logo/parametre.png'),
};

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const { colors } = useTheme();
  const animValues = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    animValues.forEach((anim: Animated.Value, index: number) => {
      Animated.spring(anim, {
        toValue: index === state.index ? 1 : 0,
        useNativeDriver: false,
        speed: 10,
        bounciness: 6,
      }).start();
    });
  }, [state.index, animValues]);

  const renderTabItem = (route: any, index: number) => {
    const isFocused = state.index === index;
    const scale = animValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.6],
    });

    const opacity = animValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });

    const tabKey = route.name.replace(/^.*\//, '');
    const logoSource = LOGO_MAP[tabKey] || LOGO_MAP.index;

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
        style={styles.tabItem}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View
            style={[
              styles.logoBg,
              {
                backgroundColor: isFocused ? colors.primary : colors.backgroundElement,
              },
            ]}
          >
            <Image
              source={logoSource}
              style={[
                styles.logo,
                {
                  tintColor: isFocused ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.floatingContainer, { pointerEvents: 'box-none' }]}>
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) =>
          renderTabItem(route, index)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 100,
  },
  floatingBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 32,
    borderWidth: 1,
    height: 72,
    width: '100%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 4,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBg: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
