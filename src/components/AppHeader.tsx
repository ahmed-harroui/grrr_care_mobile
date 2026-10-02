import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { DailyRewards } from '@/components/DailyRewards';

const LOGO = require('../../assets/logo/grrrr.png');

interface AppHeaderProps {
  colors: any;
}

export function AppHeader({ colors }: AppHeaderProps) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.brand}>
        <Image source={LOGO} style={styles.logoImage} contentFit="contain" />
        <Text style={[styles.logo, { color: colors.text }]}>
          GRRR <Text style={{ color: colors.primary }}>Care</Text>
        </Text>
      </View>
      {/* Daily gifts: the week's chain, shared with the GRRRR app */}
      <DailyRewards />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: { width: 30, height: 30 },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
