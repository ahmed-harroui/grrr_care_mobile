import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SIDEBAR_WIDTH } from '../lib/device';

interface SideBarProps {
  state: any;
  navigation: any;
}

const LOGO = require('../../assets/logo/grrrr.png');

// [icon, English, French] for each tab, in the order of the bottom bar
const ITEMS: Record<string, [any, string, string]> = {
  index: [require('../../assets/logo/home.png'), 'Home', 'Accueil'],
  findvet: [require('../../assets/logo/vet.png'), 'Around you', 'Autour de toi'],
  chat: [require('../../assets/logo/grrrr.png'), 'Assistant', 'Assistant'],
  health: [require('../../assets/logo/care.png'), 'Health', 'Santé'],
  pets: [require('../../assets/logo/pets.png'), 'My pets', 'Mes compagnons'],
  settings: [require('../../assets/logo/parametre.png'), 'Settings', 'Réglages'],
};

/** The navigation on a laptop: the tabs of the floating bar, as a labelled column on the left. */
export function SideBar({ state, navigation }: SideBarProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      <View style={styles.brand}>
        <Image source={LOGO} style={[styles.brandLogo, { tintColor: colors.primary }]} />
        <Text style={[styles.brandText, { color: colors.text }]}>
          GRRR <Text style={{ color: colors.primary }}>Care</Text>
        </Text>
      </View>

      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const [icon, en, fr] = ITEMS[route.name.replace(/^.*\//, '')] ?? ITEMS.index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            style={[styles.item, focused && { backgroundColor: colors.primary + '1A' }]}
          >
            <Image source={icon} style={[styles.icon, { tintColor: focused ? colors.primary : colors.textSecondary }]} />
            <Text style={[styles.label, { color: focused ? colors.primary : colors.text, fontWeight: focused ? '800' : '600' }]}>
              {language === 'fr' ? fr : en}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, borderRightWidth: 1, paddingHorizontal: 14, paddingTop: 22, gap: 4, zIndex: 100 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 22 },
  brandLogo: { width: 32, height: 32, resizeMode: 'contain' },
  brandText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 },
  icon: { width: 22, height: 22, resizeMode: 'contain' },
  label: { fontSize: 15 },
});
