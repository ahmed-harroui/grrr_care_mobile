import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface GRRRBannerProps {
  title?: string;
  subtitle?: string;
}

export function GRRRBanner({ title, subtitle }: GRRRBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          borderBottomColor: colors.primaryDeep,
        },
      ]}
    >
      <View style={styles.content}>
        <Image
          source={{ uri: 'file:///./assets/logo/grrrr.png' }}
          style={styles.logo}
        />
        <View style={styles.text}>
          {title && <Text style={[styles.title, { color: 'white' }]}>{title}</Text>}
          {subtitle && (
            <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.85)' }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
});
