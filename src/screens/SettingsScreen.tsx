import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Switch, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppHeader } from '../components/AppHeader';

export function SettingsScreen() {
  const { colors, isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Theme Mode */}
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  {themeMode === 'auto' ? 'Follow system' : themeMode === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
                </Text>
              </View>
              <View style={styles.themeToggle}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'light' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setThemeMode('light')}
                >
                  <Text style={[styles.themeEmoji, { color: themeMode === 'light' ? 'white' : colors.textSecondary }]}>☀️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'dark' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setThemeMode('dark')}
                >
                  <Text style={[styles.themeEmoji, { color: themeMode === 'dark' ? 'white' : colors.textSecondary }]}>🌙</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    themeMode === 'auto' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setThemeMode('auto')}
                >
                  <Text style={[styles.themeEmoji, { color: themeMode === 'auto' ? 'white' : colors.textSecondary }]}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Language Selection */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.language')}</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  {language === 'en' ? 'English' : 'Français'}
                </Text>
              </View>
              <View style={styles.languageToggle}>
                <TouchableOpacity
                  style={[
                    styles.langOption,
                    language === 'en' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={[styles.langText, { color: language === 'en' ? 'white' : colors.textSecondary }]}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langOption,
                    language === 'fr' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setLanguage('fr')}
                >
                  <Text style={[styles.langText, { color: language === 'fr' ? 'white' : colors.textSecondary }]}>FR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.about')}</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.version')}</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.contact')}</Text>
              <Text style={[styles.settingValue, { color: colors.accent }]}>support@grrr.care</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  settingLabel: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  themeEmoji: {
    fontSize: 20,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
