import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, register, demoMode } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (mode === 'register' && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    demoMode();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Gradient background accent */}
        <View style={[styles.bgAccent, { backgroundColor: colors.softPink }]} />

        {/* Premium Logo & Branding */}
        <View style={styles.logoSection}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoBadgeEmoji}>🐾</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>GRRR Care</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Your pet's health, our priority
          </Text>
        </View>

        {/* Premium Auth Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setMode('login')}
            style={[
              styles.tab,
              mode === 'login' && [styles.activeTab, { backgroundColor: colors.card }],
            ]}
          >
            <Text style={[styles.tabText, { color: mode === 'login' ? colors.text : colors.textSecondary, fontWeight: mode === 'login' ? '700' : '500' }]}>
              Sign In
            </Text>
            {mode === 'login' && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('register')}
            style={[
              styles.tab,
              mode === 'register' && [styles.activeTab, { backgroundColor: colors.card }],
            ]}
          >
            <Text style={[styles.tabText, { color: mode === 'register' ? colors.text : colors.textSecondary, fontWeight: mode === 'register' ? '700' : '500' }]}>
              Join
            </Text>
            {mode === 'register' && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Emotional Copy */}
        <View style={styles.copySection}>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            {mode === 'login'
              ? '👋 Welcome back! Your pets missed you.'
              : '✨ Let\'s care for your furry friends together.'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <View>
              <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry
              />
            </View>
          </View>

          {/* Security Info */}
          <View style={[styles.securityBox, { backgroundColor: colors.backgroundElement, borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <Text style={[styles.securityIcon]}>🔒</Text>
            <View style={styles.securityContent}>
              <Text style={[styles.securityTitle, { color: colors.text }]}>Secure & Private</Text>
              <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                {mode === 'login'
                  ? 'Sign in with your GRRRR account'
                  : 'Your data is encrypted end-to-end'}
              </Text>
            </View>
          </View>

          {/* Primary Auth Button */}
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.authButtonContent}>
                <Text style={styles.authButtonEmoji}>{mode === 'login' ? '→' : '✨'}</Text>
                <Text style={styles.authButtonText}>
                  {mode === 'login' ? 'Continue' : 'Create Account'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Helper Text */}
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {mode === 'login'
              ? 'Don\'t have an account? Tap "Join" above'
              : 'Already have an account? Tap "Sign In" above'}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.dividerSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
        </View>

        {/* Demo Mode - CTA Card */}
        <TouchableOpacity
          style={[styles.demoCard, { backgroundColor: colors.secondary, borderColor: colors.secondaryDeep }]}
          onPress={handleDemoMode}
          activeOpacity={0.9}
        >
          <View style={styles.demoCardContent}>
            <Text style={styles.demoCardEmoji}>🚀</Text>
            <View style={styles.demoCardText}>
              <Text style={styles.demoCardTitle}>Explore First</Text>
              <Text style={styles.demoCardDesc}>Try demo with sample pets</Text>
            </View>
          </View>
          <Text style={styles.demoCardArrow}>›</Text>
        </TouchableOpacity>

        {/* Trust Indicators */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>TRUSTED BY PET OWNERS</Text>
          <View style={styles.trustBadges}>
            <View style={[styles.trustBadge, { backgroundColor: colors.backgroundElement }]}>
              <Text style={styles.trustBadgeEmoji}>❤️</Text>
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>Health First</Text>
            </View>
            <View style={[styles.trustBadge, { backgroundColor: colors.backgroundElement }]}>
              <Text style={styles.trustBadgeEmoji}>🔐</Text>
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>Secure</Text>
            </View>
            <View style={[styles.trustBadge, { backgroundColor: colors.backgroundElement }]}>
              <Text style={styles.trustBadgeEmoji}>🐾</Text>
              <Text style={[styles.trustBadgeText, { color: colors.textSecondary }]}>Pet-Focused</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Part of the GRRRR ecosystem
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 40 },
  bgAccent: { position: 'absolute', top: 0, left: -100, width: 300, height: 300, borderRadius: 200, opacity: 0.3 },

  logoSection: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  logoBadgeEmoji: { fontSize: 40 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  tagline: { fontSize: 14, fontWeight: '500', maxWidth: 220, textAlign: 'center' },

  tabBar: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 32, gap: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12, position: 'relative' },
  activeTab: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  tabText: { fontSize: 14 },
  tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: '80%', borderRadius: 2 },

  copySection: { alignItems: 'center', marginBottom: 28 },
  copy: { fontSize: 15, fontWeight: '500', maxWidth: 300, textAlign: 'center', lineHeight: 20 },

  form: { gap: 16, marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, height: 50, gap: 10 },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 14, fontWeight: '500' },

  securityBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, gap: 12 },
  securityIcon: { fontSize: 18 },
  securityContent: { flex: 1 },
  securityTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  securityText: { fontSize: 12, lineHeight: 16 },

  authButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  authButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  authButtonEmoji: { fontSize: 18 },
  authButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },

  helperText: { fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: '500' },

  dividerSection: { marginVertical: 28, borderTopWidth: 1, alignItems: 'center', paddingVertical: 0, position: 'relative' },
  dividerText: { fontSize: 12, position: 'absolute', top: -8, paddingHorizontal: 8, fontWeight: '500' },

  demoCard: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  demoCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  demoCardEmoji: { fontSize: 24 },
  demoCardText: { flex: 1 },
  demoCardTitle: { fontSize: 14, fontWeight: '700', color: 'white', marginBottom: 2 },
  demoCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  demoCardArrow: { fontSize: 18, color: 'white', fontWeight: '300' },

  trustSection: { alignItems: 'center', marginBottom: 28 },
  trustLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  trustBadges: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  trustBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', gap: 4 },
  trustBadgeEmoji: { fontSize: 16 },
  trustBadgeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  footer: { alignItems: 'center', paddingTop: 12, paddingBottom: 40 },
  footerText: { fontSize: 12, fontWeight: '500' },
});
