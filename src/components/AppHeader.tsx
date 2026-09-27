import { View, Text, StyleSheet } from 'react-native';

interface AppHeaderProps {
  colors: any;
}

export function AppHeader({ colors }: AppHeaderProps) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.logo, { color: colors.primary }]}>🐾 GRRR Care</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
