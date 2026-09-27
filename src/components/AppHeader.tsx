import { View, Text, StyleSheet } from 'react-native';

interface AppHeaderProps {
  colors: any;
}

export function AppHeader({ colors }: AppHeaderProps) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.logo, { color: colors.primary }]}>🐾 GRRR Care</Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>Pet Care Companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
  },
});
