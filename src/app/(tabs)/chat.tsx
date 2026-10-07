import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  Linking,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { usePetSelector } from '../../context/PetSelectorContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { grrrCareApi, type SuggestedPartner } from '../../lib/grrrr-care-api';
import { AppHeader } from '../../components/AppHeader';
import { PetAvatar } from '../../components/PetAvatar';
import { TAB_BAR_CLEARANCE } from '../../components/FloatingTabBar';
import { CareSubscription } from '../../components/CareSubscription';

const GRRR_LOGO = require('../../../assets/logo/grrrr.png');

// The assistant's three specialities (must match the modes of the grrr-chat Edge Function)
type ChatStyle = 'vet' | 'nutrition' | 'behavior';
interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  partners?: SuggestedPartner[];
  error?: boolean;
  /** The day's message limit was hit: Care+ is offered under the message */
  limit?: boolean;
}

const PARTNER_EMOJI: Record<string, string> = { clinic: '🏥', pharmacy: '💊', supplies: '🛍️', insurance: '🛡️', food: '🥣', grooming: '✂️' };

// The owner's position, only if location is already allowed (the Find Vet tab asks for it): the chat never prompts
async function currentPosition() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const found = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
    return found ? { latitude: found.coords.latitude, longitude: found.coords.longitude } : null;
  } catch {
    return null;
  }
}

function openDirections(partner: SuggestedPartner) {
  const destination = partner.latitude != null && partner.longitude != null ? `${partner.latitude},${partner.longitude}` : partner.address || partner.name;
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`).catch(() => {});
}

const MODES: { key: ChatStyle; emoji: string; label: string; intro: string; placeholder: string; suggestions: string[] }[] = [
  { key: 'vet', emoji: '🩺', label: 'chat.modeVet', intro: 'chat.introVet', placeholder: 'chat.askVet', suggestions: ['chat.vaccines', 'chat.concerns', 'chat.scratching'] },
  { key: 'nutrition', emoji: '🥕', label: 'chat.modeNutrition', intro: 'chat.introNutrition', placeholder: 'chat.askNutrition', suggestions: ['chat.food', 'chat.toxicFoods', 'chat.changeFood'] },
  { key: 'behavior', emoji: '🧠', label: 'chat.modeBehavior', intro: 'chat.introBehavior', placeholder: 'chat.askBehavior', suggestions: ['chat.stressed', 'chat.sounds', 'chat.followsMe'] },
];

export default function ChatScreen() {
  const { selectedPetId } = usePetSelector();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [pet, setPet] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<ChatStyle>('vet');
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (selectedPetId) {
      grrrCareApi.getPetById(selectedPetId).then(setPet);
      setMessages([]);
      setInput('');
      setFeedback({});
    }
  }, [selectedPetId]);

  // The floating tab bar hides while typing, so the input only needs to clear it when the keyboard is closed
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || !selectedPetId || loading) return;

    const history = messages.filter(m => !m.error).map(m => ({ role: m.role, text: m.text }));
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const location = await currentPosition();
      const response = await grrrCareApi.sendChatMessage(selectedPetId, question, style, { language, history, location });
      setMessages(prev => [...prev, { role: 'assistant', text: response.response, sources: response.sources, partners: response.partners }]);
    } catch (error: any) {
      console.error('Chat error:', error?.message || error);
      setMessages(prev => [...prev, { role: 'assistant', text: error?.message || 'Error', error: true, limit: error?.code === 'daily_limit' }]);
    } finally {
      setLoading(false);
    }
  };

  // Google Play asks generative-AI apps to let users report an answer from inside the app
  const [reported, setReported] = useState<Record<number, boolean>>({});
  const report = (idx: number) => {
    const answer = messages[idx];
    const question = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user')?.text ?? '';
    const send = () =>
      grrrCareApi
        .reportAnswer({ petId: selectedPetId, mode: style, question, answer: answer.text })
        .then(() => setReported(r => ({ ...r, [idx]: true })))
        .catch(error => Alert.alert(t('chat.reportError'), error?.message));
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('chat.reportTitle')}\n\n${t('chat.reportText')}`)) void send();
      return;
    }
    Alert.alert(t('chat.reportTitle'), t('chat.reportText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('chat.report'), style: 'destructive', onPress: () => void send() },
    ]);
  };

  const petName = pet?.pet_name ?? '';

  if (!selectedPetId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader colors={colors} />
        <View style={[styles.center, { paddingBottom: TAB_BAR_CLEARANCE }]}>
          <View style={[styles.heroLogo, { backgroundColor: colors.primary + '14' }]}>
            <Image source={GRRR_LOGO} style={[styles.heroLogoImg, { tintColor: colors.primary }]} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('chat.askGRRR')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noPetsDesc')}</Text>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/pet/[id]', params: { id: 'new' } })}
          >
            <Text style={styles.ctaText}>{t('onboarding.create')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const current = MODES.find(m => m.key === style) ?? MODES[0];
  const suggestions = current.suggestions.map(key => t(key, { pet: petName, breed: pet?.breed || petName }));
  const canSend = input.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {/* Assistant header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
              <Image source={GRRR_LOGO} style={styles.botAvatarImg} />
              <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.card }]} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.askGRRR')}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {t('chat.chattingAbout')} {petName}
              </Text>
            </View>
            <PetAvatar photoUrl={pet?.photo_url} species={pet?.species} size={38} />
          </View>

          <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
            {MODES.map(mode => {
              const active = style === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  onPress={() => setStyle(mode.key)}
                  style={[styles.segmentItem, active && [styles.segmentActive, { backgroundColor: colors.card }]]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.segmentEmoji}>{mode.emoji}</Text>
                  <Text
                    style={[styles.segmentLabel, { color: active ? colors.primary : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {t(mode.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <View style={[styles.heroLogo, { backgroundColor: colors.primary + '14' }]}>
                <Image source={GRRR_LOGO} style={[styles.heroLogoImg, { tintColor: colors.primary }]} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('chat.startConversation')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t(current.intro, { pet: petName })}
              </Text>
              <Text style={[styles.tryLabel, { color: colors.textTertiary }]}>{t('chat.tryAsking')}</Text>
              {suggestions.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => send(s)}
                  style={[styles.suggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                  <Text style={[styles.suggestionArrow, { color: colors.primary }]}>↗</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((msg, idx) =>
            msg.role === 'user' ? (
              <View key={idx} style={[styles.userBubble, { backgroundColor: colors.primary }]}>
                <Text style={styles.userText}>{msg.text}</Text>
              </View>
            ) : (
              <View key={idx} style={styles.botRow}>
                <View style={[styles.botMini, { backgroundColor: colors.primary }]}>
                  <Image source={GRRR_LOGO} style={styles.botMiniImg} />
                </View>
                <View style={styles.flexShrink}>
                  <View
                    style={[
                      styles.botBubble,
                      {
                        backgroundColor: msg.error ? colors.error + '14' : colors.card,
                        borderColor: msg.error ? colors.error : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.botText, { color: msg.error ? colors.error : colors.text }]}>{msg.text}</Text>
                    {msg.limit && (
                      <View style={styles.limitCard}>
                        <CareSubscription variant="limit" />
                      </View>
                    )}
                    {!!msg.sources?.length && (
                      <View style={[styles.sources, { borderTopColor: colors.border }]}>
                        <Text style={[styles.sourcesLabel, { color: colors.textSecondary }]}>
                          📚 {t('chat.medicalSources')}
                        </Text>
                        {msg.sources.map((src, i) => (
                          <Text key={i} style={[styles.sourceItem, { color: colors.primary }]} numberOfLines={2}>
                            • {src}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  {msg.partners?.map(partner => (
                    <View key={partner.id} style={[styles.partnerCard, { backgroundColor: colors.card, borderColor: colors.primary + '55' }]}>
                      <Text style={styles.partnerEmoji}>{PARTNER_EMOJI[partner.category] ?? '📍'}</Text>
                      <View style={styles.flex}>
                        <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>{partner.name}</Text>
                        <Text style={[styles.partnerMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {partner.distance_km != null ? `${partner.distance_km < 10 ? partner.distance_km.toFixed(1) : Math.round(partner.distance_km)} km · ` : ''}
                          {partner.address || t('chat.partner')}
                        </Text>
                        <View style={styles.partnerActions}>
                          {!!partner.phone && (
                            <TouchableOpacity style={[styles.partnerBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${partner.phone}`).catch(() => {})}>
                              <Text style={styles.partnerBtnText}>📞 {t('chat.call')}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={[styles.partnerBtn, { backgroundColor: colors.backgroundElement }]} onPress={() => openDirections(partner)}>
                            <Text style={[styles.partnerBtnText, { color: colors.text }]}>🧭 {t('chat.directions')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  {!msg.error && (
                    <View style={styles.feedbackRow}>
                      {(['up', 'down'] as const).map(v => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => setFeedback(f => ({ ...f, [idx]: v }))}
                          style={[
                            styles.feedbackBtn,
                            { borderColor: colors.border },
                            feedback[idx] === v && { backgroundColor: colors.primary + '1A', borderColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.feedbackEmoji}>{v === 'up' ? '👍' : '👎'}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        onPress={() => report(idx)}
                        disabled={reported[idx]}
                        style={[styles.feedbackBtn, { borderColor: reported[idx] ? colors.primary : colors.border }]}
                      >
                        <Text style={[styles.reportText, { color: colors.textSecondary }]}>
                          🚩 {reported[idx] ? t('chat.reported') : t('chat.report')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )
          )}

          {loading && (
            <View style={styles.botRow}>
              <View style={[styles.botMini, { backgroundColor: colors.primary }]}>
                <Image source={GRRR_LOGO} style={styles.botMiniImg} />
              </View>
              <View style={[styles.botBubble, styles.typing, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputArea, { paddingBottom: keyboardOpen ? 10 : TAB_BAR_CLEARANCE }]}>
          <View style={[styles.inputPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t(current.placeholder)}
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.backgroundElement }]}
              onPress={() => send(input)}
              disabled={!canSend}
            >
              <Text style={[styles.sendIcon, { color: canSend ? '#FFFFFF' : colors.textTertiary }]}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  botAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  botAvatarImg: { width: 26, height: 26, tintColor: '#FFFFFF', resizeMode: 'contain' },
  onlineDot: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 1 },

  segment: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  segmentActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentEmoji: { fontSize: 13 },
  segmentLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },

  messages: { padding: 16, paddingBottom: 12, gap: 12 },
  welcome: { alignItems: 'center', paddingTop: 16 },
  heroLogo: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroLogoImg: { width: 50, height: 50, resizeMode: 'contain' },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20, maxWidth: 300 },
  tryLabel: { fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestion: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  suggestionText: { flex: 1, fontSize: 14, fontWeight: '600' },
  suggestionArrow: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  cta: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  userBubble: { alignSelf: 'flex-end', maxWidth: '82%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20, borderBottomRightRadius: 6 },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '90%' },
  botMini: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  botMiniImg: { width: 16, height: 16, tintColor: '#FFFFFF', resizeMode: 'contain' },
  botBubble: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, borderTopLeftRadius: 6, borderWidth: 1 },
  botText: { fontSize: 15, lineHeight: 22 },
  limitCard: { marginTop: 12 },
  typing: { paddingHorizontal: 20 },
  sources: { borderTopWidth: 1, marginTop: 10, paddingTop: 8, gap: 3 },
  sourcesLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  sourceItem: { fontSize: 12 },
  partnerCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 8, padding: 12, borderRadius: 16, borderWidth: 1 },
  partnerEmoji: { fontSize: 22, marginTop: 2 },
  partnerName: { fontSize: 15, fontWeight: '800' },
  partnerMeta: { fontSize: 12, marginTop: 2 },
  partnerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  partnerBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12 },
  partnerBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  feedbackRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  feedbackBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  feedbackEmoji: { fontSize: 13 },
  reportText: { fontSize: 12, fontWeight: '600' },

  inputArea: { paddingHorizontal: 16, paddingTop: 8 },
  inputPill: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderRadius: 26, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  input: { flex: 1, fontSize: 15, maxHeight: 110, paddingTop: 10, paddingBottom: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendIcon: { fontSize: 20, fontWeight: '800' },
});
