import { useEffect, useState } from 'react';
import { useDevice } from '../lib/device';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { googleSignInAvailable } from '../lib/google-auth';

// Sign-in and sign-up as a short conversation with the assistant: one question per screen, the
// logo talks, the button wakes up once the answer is valid, and mistakes shake the field instead
// of opening an alert. Same account as the GRRRR app.

const LOGO = require('../../assets/logo/grrrr.png');

type Flow = 'welcome' | 'login' | 'register';
type Field = 'name' | 'email' | 'password';

const STEPS: Record<Exclude<Flow, 'welcome'>, Field[]> = {
  login: ['email', 'password'],
  register: ['name', 'email', 'password'],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0..4
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const { narrow } = useDevice();
  const { login, register, loginWithGoogle, demoMode } = useAuth();
  const { language } = useLanguage();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);

  const [flow, setFlow] = useState<Flow>('welcome');
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The logo floats gently; the field shakes on a mistake.
  const float = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * float.value }, { rotate: `${(float.value - 0.5) * 6}deg` }] }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const doShake = () => {
    shake.set(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(0, { duration: 50 })));
  };

  const steps = flow === 'welcome' ? [] : STEPS[flow];
  const field = steps[step];
  const value = field ? values[field] : '';
  const firstName = values.name.trim().split(' ')[0];

  const valid =
    field === 'name' ? value.trim().length >= 2 : field === 'email' ? EMAIL.test(value.trim()) : field === 'password' ? value.length >= 6 : false;

  const start = (next: Flow) => {
    setFlow(next);
    setStep(0);
    setError(null);
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
    else setFlow('welcome');
  };

  const next = async () => {
    if (!field || loading) return;
    if (!valid) {
      setError(
        field === 'name'
          ? tx('Just your first name is enough.', 'Ton prénom suffit.')
          : field === 'email'
            ? tx("That email doesn't look right.", "Cet email n'a pas l'air correct.")
            : tx('At least 6 characters.', 'Au moins 6 caractères.')
      );
      doShake();
      return;
    }
    setError(null);
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    try {
      setLoading(true);
      if (flow === 'login') await login(values.email.trim(), values.password);
      else await register(values.email.trim(), values.password, values.name.trim());
    } catch (e: any) {
      const message = String(e?.message ?? '');
      if (e?.code === 'CONFIRM_EMAIL') {
        // The account exists: once the email link is opened, signing in works.
        setFlow('login');
        setStep(1);
        setError(tx('Account created! Open the link we emailed you, then sign in here.', 'Compte créé ! Ouvre le lien reçu par email, puis connecte-toi ici.'));
        return;
      }
      setError(
        e?.code === 'EMAIL_TAKEN'
          ? tx('This email already has an account (GRRRR or Care): sign in instead.', 'Cet email a déjà un compte (GRRRR ou Care) : connecte-toi plutôt.')
          : /email not confirmed/i.test(message)
          ? tx('Confirm your email first: open the link we sent you.', "Confirme d'abord ton email : ouvre le lien qu'on t'a envoyé.")
          : /invalid login|invalid credentials/i.test(message)
          ? tx('Wrong email or password.', 'Email ou mot de passe incorrect.')
          : /already registered|already exists/i.test(message)
            ? tx('This email already has an account: sign in instead.', 'Cet email a déjà un compte : connecte-toi plutôt.')
            : message || tx('Something went wrong, try again.', "Un souci est survenu, réessaie.")
      );
      doShake();
    } finally {
      setLoading(false);
    }
  };

  // Google: a new account is made on the first time, then gets the pet setup like any other.
  const [googleBusy, setGoogleBusy] = useState(false);
  const continueWithGoogle = async () => {
    if (googleBusy || loading) return;
    setGoogleBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setError(/DEVELOPER_ERROR|10:/.test(String(e?.message)) ? tx("Google sign-in isn't ready on this build yet.", "La connexion Google n'est pas encore prête sur cette version.") : String(e?.message ?? e));
    } finally {
      setGoogleBusy(false);
    }
  };

  const googleButton = googleSignInAvailable ? (
    <>
      <Pressable
        onPress={continueWithGoogle}
        disabled={googleBusy}
        style={({ pressed }) => [styles.google, { backgroundColor: '#FFFFFF', borderColor: '#DADCE0' }, pressed && styles.pressed]}
      >
        {googleBusy ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <Text style={styles.googleG}>
              <Text style={{ color: '#4285F4' }}>G</Text>
            </Text>
            <Text style={styles.googleText}>{tx('Continue with Google', 'Continuer avec Google')}</Text>
          </>
        )}
      </Pressable>
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{tx('or with your email', 'ou avec ton email')}</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>
    </>
  ) : null;

  // What the assistant says at each step.
  const bubble =
    flow === 'welcome'
      ? tx("Hi! I'm GRRR, your companion's health assistant.", "Salut ! Moi c'est GRRR, l'assistant santé de ton compagnon.")
      : field === 'name'
        ? tx("Let's get acquainted. What's your name?", 'Faisons connaissance. Comment tu t’appelles ?')
        : field === 'email'
          ? flow === 'register'
            ? tx(`Nice to meet you, ${firstName}! Your email?`, `Enchanté ${firstName} ! Ton email ?`)
            : tx('Welcome back! Your email?', 'Content de te revoir ! Ton email ?')
          : flow === 'register'
            ? tx("Last one: pick a password. I'm not looking 🙈", 'Dernière étape : choisis un mot de passe. Je ne regarde pas 🙈')
            : tx("Your password, I'm not looking 🙈", 'Ton mot de passe, je ne regarde pas 🙈');

  const strength = passwordStrength(values.password);
  const strengthColors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];
  const strengthLabels = [tx('Too short', 'Trop court'), tx('Weak', 'Faible'), tx('Fair', 'Moyen'), tx('Good', 'Bon'), tx('Strong', 'Solide')];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.blob, styles.blobA, { backgroundColor: colors.primary }]} />
      <View style={[styles.blob, styles.blobB, { backgroundColor: '#FFB35C' }]} />

      <ScrollView contentContainerStyle={[styles.content, narrow]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Top bar: back + progress */}
        <View style={styles.topBar}>
          {flow !== 'welcome' ? (
            <Pressable onPress={back} hitSlop={10} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.backText, { color: colors.text }]}>←</Text>
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          {flow !== 'welcome' && (
            <View style={styles.progress}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.progressStep, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
              ))}
            </View>
          )}
        </View>

        {/* The assistant and what it says */}
        <View style={styles.mascotRow}>
          <Animated.View style={[styles.logoWrap, flow === 'welcome' && styles.logoWrapBig, floatStyle]}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
          </Animated.View>
          <Animated.View key={`${flow}-${step}`} entering={FadeInDown.duration(350)} style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bubbleText, { color: colors.text }]}>{bubble}</Text>
          </Animated.View>
        </View>

        {flow === 'welcome' ? (
          <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.welcome}>
            <Text style={[styles.title, { color: colors.text }]}>GRRR Care</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              {tx('Health records, reminders and an assistant that knows your pet.', 'Carnet de santé, rappels et un assistant qui connaît ton compagnon.')}
            </Text>

            {googleButton}
            {error && <Text style={[styles.error, { color: colors.error, marginTop: 0, marginBottom: 6 }]}>{error}</Text>}

            <Pressable onPress={() => start('register')} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, shadowColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>{tx('Create my account', 'Créer mon compte')}</Text>
            </Pressable>
            <Pressable onPress={() => start('login')} style={({ pressed }) => [styles.secondary, { borderColor: colors.primary, backgroundColor: colors.card }, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.primary }]}>{tx('I already have an account', "J'ai déjà un compte")}</Text>
            </Pressable>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>{tx('Same account as the GRRRR app 🐾', "Le même compte que l'app GRRRR 🐾")}</Text>

            <Pressable onPress={demoMode} style={({ pressed }) => [styles.demo, pressed && styles.pressed]}>
              <Text style={[styles.demoText, { color: colors.textSecondary }]}>{tx('Just looking? Try the demo →', 'Juste curieux ? Essaie la démo →')}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View key={`${flow}-${field}`} entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepBox}>
            {step === 0 && googleButton}
            <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
              {field === 'name' ? tx('YOUR FIRST NAME', 'TON PRÉNOM') : field === 'email' ? 'EMAIL' : tx('PASSWORD', 'MOT DE PASSE')}
            </Text>
            <Animated.View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: error ? colors.error : valid ? colors.primary : colors.border }, shakeStyle]}>
              <TextInput
                autoFocus
                style={[styles.input, { color: colors.text }]}
                value={value}
                onChangeText={(text) => {
                  setValues((v) => ({ ...v, [field]: text }));
                  if (error) setError(null);
                }}
                placeholder={field === 'name' ? tx('Alex', 'Camille') : field === 'email' ? tx('you@email.com', 'toi@email.com') : '••••••••'}
                placeholderTextColor={colors.textTertiary}
                keyboardType={field === 'email' ? 'email-address' : 'default'}
                autoCapitalize={field === 'name' ? 'words' : 'none'}
                autoComplete={field === 'name' ? 'given-name' : field === 'email' ? 'email' : flow === 'register' ? 'new-password' : 'current-password'}
                secureTextEntry={field === 'password' && !showPassword}
                returnKeyType={step === steps.length - 1 ? 'done' : 'next'}
                onSubmitEditing={next}
                submitBehavior="submit"
                editable={!loading}
              />
              {field === 'password' ? (
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                  <Text style={styles.eye}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              ) : valid ? (
                <Animated.Text entering={FadeIn} style={[styles.check, { color: colors.primary }]}>✓</Animated.Text>
              ) : null}
            </Animated.View>

            {field === 'password' && flow === 'register' && values.password.length > 0 && (
              <View style={styles.strength}>
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.strengthStep, { backgroundColor: i < strength ? strengthColors[strength] : colors.border }]} />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
              </View>
            )}

            {error && (
              <Animated.Text entering={FadeIn} style={[styles.error, { color: colors.error }]}>
                {error}
              </Animated.Text>
            )}

            <Pressable
              onPress={next}
              disabled={loading}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: valid ? colors.primary : colors.backgroundElement, shadowColor: colors.primary, shadowOpacity: valid ? 0.3 : 0 },
                pressed && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryText, !valid && { color: colors.textTertiary }]}>
                  {step < steps.length - 1 ? tx('Continue', 'Continuer') : flow === 'login' ? tx('Sign in', 'Me connecter') : tx('Create my account', 'Créer mon compte')}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => start(flow === 'login' ? 'register' : 'login')} style={styles.switch}>
              <Text style={[styles.switchText, { color: colors.primary }]}>
                {flow === 'login' ? tx('No account yet? Create one', 'Pas encore de compte ? Crée-le') : tx('Already have an account? Sign in', 'Déjà un compte ? Connecte-toi')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: { width: 320, height: 320, top: -140, right: -120, opacity: 0.12 },
  blobB: { width: 260, height: 260, bottom: -110, left: -100, opacity: 0.16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 40, marginBottom: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  backText: { fontSize: 18, fontWeight: '700' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressStep: { flex: 1, height: 5, borderRadius: 3 },

  mascotRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 28 },
  logoWrap: { width: 64, height: 64 },
  logoWrapBig: { width: 92, height: 92 },
  logo: { width: '100%', height: '100%' },
  bubble: { flex: 1, padding: 14, borderRadius: 20, borderBottomLeftRadius: 6, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: '600' },

  welcome: { flex: 1 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  tagline: { fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 30 },
  primary: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondary: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1.5 },
  secondaryText: { fontSize: 16, fontWeight: '800' },
  hint: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 14 },
  demo: { alignItems: 'center', marginTop: 28, paddingVertical: 8 },
  demoText: { fontSize: 14, fontWeight: '700' },

  stepBox: { flex: 1 },
  stepLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 62, borderRadius: 18, borderWidth: 2, paddingHorizontal: 18, gap: 10 },
  input: { flex: 1, fontSize: 19, fontWeight: '600' },
  eye: { fontSize: 20 },
  check: { fontSize: 20, fontWeight: '900' },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthStep: { flex: 1, height: 5, borderRadius: 3 },
  strengthText: { fontSize: 12, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  error: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  switch: { alignItems: 'center', marginTop: 22, paddingVertical: 6 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  googleG: { fontSize: 22, fontWeight: '900' },
  googleText: { fontSize: 16, fontWeight: '700', color: '#3C4043' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  switchText: { fontSize: 14, fontWeight: '700' },
});
