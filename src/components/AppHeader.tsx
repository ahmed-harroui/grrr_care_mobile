import { View, Text, StyleSheet } from 'react-native';
import { DailyRewards } from '@/components/DailyRewards';

interface AppHeaderProps {
  colors: any;
}

export function AppHeader({ colors }: AppHeaderProps) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.logo, { color: colors.primary }]}>🐾 GRRR Care</Text>
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
  logo: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
  },
});
