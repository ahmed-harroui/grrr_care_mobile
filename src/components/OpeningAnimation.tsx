import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

// The app's opening: it starts exactly where the native splash ends (same background, the logo
// at the same size and place, app.json's expo-splash-screen), so the hand-over is invisible.
// Then the logo bounces, two rings ripple out, the name rises, and the whole layer lifts away
// to reveal the app, which has been loading underneath all along.

const LOGO = require('../../assets/logo/grrrr.png');
/** expo-splash-screen's imageWidth in app.json */
const SIZE = 140;
const DURATION = 2100;

function Ring({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.5 * (1 - progress.value),
    transform: [{ scale: 0.8 + progress.value * 1.6 }],
  }));
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
}

export function OpeningAnimation() {
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#0F172A' : '#EEF2F7';
  const ink = dark ? '#F5F5F5' : '#0B1B3F';
  const [done, setDone] = useState(false);

  const logo = useSharedValue(0);
  const title = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // Bounce, settle a little higher to make room for the name, then lift away.
    logo.value = withSequence(
      withDelay(120, withSpring(1, { damping: 7, stiffness: 140 })),
      withDelay(250, withTiming(2, { duration: 380, easing: Easing.out(Easing.cubic) }))
    );
    title.value = withDelay(700, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    exit.value = withDelay(DURATION - 520, withTiming(1, { duration: 500, easing: Easing.in(Easing.cubic) }));
    const timer = setTimeout(() => setDone(true), DURATION);
    return () => clearTimeout(timer);
  }, [exit, logo, title]);

  const logoStyle = useAnimatedStyle(() => {
    const pop = Math.min(logo.value, 1);
    const rise = Math.max(logo.value - 1, 0);
    return {
      transform: [
        { translateY: -40 * rise },
        { scale: (1 + 0.12 * Math.sin(pop * Math.PI)) * (1 - 0.15 * rise) * (1 + 0.6 * exit.value) },
        { rotate: `${Math.sin(pop * Math.PI * 2) * 6}deg` },
      ],
      opacity: 1 - exit.value,
    };
  });
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value * (1 - exit.value),
    transform: [{ translateY: 18 * (1 - title.value) - 20 * exit.value }],
  }));
  const layerStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  if (done) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: background }, layerStyle]}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      <View style={styles.center}>
        <Ring delay={350} color={dark ? '#60A5FA' : '#2563EB'} />
        <Ring delay={650} color="#FFB35C" />
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </Animated.View>
      </View>
      <Animated.View style={[styles.titleBox, titleStyle]}>
        <Text style={[styles.title, { color: ink }]}>
          GRRR <Text style={styles.titleAccent}>Care</Text>
        </Text>
        <Text style={[styles.tagline, { color: dark ? '#94A3B8' : '#64748B' }]}>🐾</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 1000, elevation: 1000, alignItems: 'center', justifyContent: 'center' },
  center: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  logo: { width: SIZE, height: SIZE },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  titleBox: { position: 'absolute', top: '50%', marginTop: 40, alignItems: 'center' },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  titleAccent: { color: '#2563EB' },
  tagline: { fontSize: 18, marginTop: 4 },
});
