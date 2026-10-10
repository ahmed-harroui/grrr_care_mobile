import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Image, LayoutChangeEvent, Keyboard, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useDevice } from '../lib/device';

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

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BAR_H = 68;
const RADIUS = 22;
const BUMP_H = 22; // how far the bump rises above the bar
const BUMP_HALF = 42; // half width of the bump at its base
const STROKE = 1;
const TOP = BUMP_H + STROKE; // y of the bar's flat top edge inside the svg
const SVG_H = TOP + BAR_H + STROKE;
const ICON_BOX = 34;
const ACTIVE_SCALE = 1.45;
const ACTIVE_LIFT = BAR_H / 2 - (-BUMP_H + 4 + (ICON_BOX * ACTIVE_SCALE) / 2);
const BAR_BOTTOM = 20;
const WIDE_BAR = 520; // the bar's width on a tablet

// Space screens must leave at the bottom so content isn't hidden behind the floating bar
export const TAB_BAR_CLEARANCE = BAR_BOTTOM + SVG_H + 12;

const f = (n: number) => n.toFixed(2);

// Every path has the same command structure, so Animated can interpolate between them number by number.
function barPath(width: number, cx: number) {
  const l = STROKE / 2;
  const r = width - STROKE / 2;
  const b = TOP + BAR_H;
  return [
    `M ${f(l + RADIUS)} ${f(TOP)}`,
    `L ${f(cx - BUMP_HALF)} ${f(TOP)}`,
    `C ${f(cx - 26)} ${f(TOP)} ${f(cx - 28)} ${f(TOP - BUMP_H)} ${f(cx)} ${f(TOP - BUMP_H)}`,
    `C ${f(cx + 28)} ${f(TOP - BUMP_H)} ${f(cx + 26)} ${f(TOP)} ${f(cx + BUMP_HALF)} ${f(TOP)}`,
    `L ${f(r - RADIUS)} ${f(TOP)}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${f(r)} ${f(TOP + RADIUS)}`,
    `L ${f(r)} ${f(b - RADIUS)}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${f(r - RADIUS)} ${f(b)}`,
    `L ${f(l + RADIUS)} ${f(b)}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${f(l)} ${f(b - RADIUS)}`,
    `L ${f(l)} ${f(TOP + RADIUS)}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${f(l + RADIUS)} ${f(TOP)}`,
    'Z',
  ].join(' ');
}

export function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const { colors } = useTheme();
  // On a tablet the bar keeps a phone's proportions, centred, instead of stretching from edge to edge
  const { isWide, width: screenWidth } = useDevice();
  const [width, setWidth] = useState(0);
  const tabCount = state.routes.length;

  // Side inset so the bump over the first/last tab stays on the flat part of the bar, clear of the rounded ends
  const inset = Math.max(12, Math.ceil(((RADIUS + BUMP_HALF + 2 - width / (2 * tabCount)) * tabCount) / (tabCount - 1)));
  const tabWidth = (width - 2 * inset) / tabCount;
  const centers = state.routes.map((_: unknown, i: number) => inset + (i + 0.5) * tabWidth);

  const [animValues] = useState<Animated.Value[]>(() =>
    state.routes.map((_: unknown, i: number) => new Animated.Value(i === state.index ? 1 : 0))
  );
  const [bumpX] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    animValues.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index === state.index ? 1 : 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    });
    Animated.spring(bumpX, {
      toValue: state.index,
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [state.index, animValues, bumpX]);

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const d =
    width > 0
      ? bumpX.interpolate({
          inputRange: centers.map((_: number, i: number) => i),
          outputRange: centers.map((cx: number) => barPath(width, cx)),
          extrapolate: 'clamp',
        })
      : undefined;

  if (keyboardOpen) return null;

  return (
    <View style={[styles.container, isWide && { left: (screenWidth - WIDE_BAR) / 2, right: undefined, width: WIDE_BAR }]} pointerEvents="box-none" onLayout={onLayout}>
      {d && (
        <Svg width={width} height={SVG_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedPath d={d} fill={colors.card} stroke={colors.border} strokeWidth={STROKE} />
        </Svg>
      )}
      <View style={[styles.row, { left: inset, right: inset }]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const anim = animValues[index];
          const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, ACTIVE_SCALE] });
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -ACTIVE_LIFT] });
          const tabKey = route.name.replace(/^.*\//, '');
          const logoSource = LOGO_MAP[tabKey] || LOGO_MAP.index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tab} activeOpacity={0.8}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isFocused ? colors.primary + '1A' : 'transparent',
                    transform: [{ translateY }, { scale }],
                  },
                ]}
              >
                <Image
                  source={logoSource}
                  style={[styles.logo, { tintColor: isFocused ? colors.primary : colors.textSecondary }]}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BAR_BOTTOM,
    left: 16,
    right: 16,
    height: SVG_H,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  row: {
    position: 'absolute',
    top: TOP,
    height: BAR_H,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: ICON_BOX / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
});
