import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { usePetSelector } from '../context/PetSelectorContext';
import { useTheme } from '../context/ThemeContext';
import { grrrCareApi } from '../lib/grrrr-care-api';
import { AppHeader } from '../components/AppHeader';

export function ChatScreen({ navigation }: any) {
  const { selectedPetId } = usePetSelector();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pet, setPet] = useState<any>(null);
  const [currentStyle, setCurrentStyle] = useState<'care' | 'pet_voice' | 'cute'>('care');
  const [feedback, setFeedback] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (selectedPetId) {
      loadPetData();
    }
  }, [selectedPetId]);

  const loadPetData = async () => {
    try {
      const petData = await grrrCareApi.getPetById(selectedPetId!);
      setPet(petData);
    } catch (error) {
      console.error('Error loading pet:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedPetId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await grrrCareApi.sendChatMessage(selectedPetId, userMessage, currentStyle);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPetId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Please select a pet to chat</Text>
      </View>
    );
  }

  const styleConfig = {
    care: { emoji: '💚', label: 'Care Tips' },
    pet_voice: { emoji: '🐾', label: 'Pet Voice' },
    cute: { emoji: '💕', label: 'Cute Mode' },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader colors={colors} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.innerContainer, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🐾</Text>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Ask GRRR</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Chatting about {pet?.name}</Text>
            </View>
          </View>
          <Text style={styles.styleEmoji}>{styleConfig[currentStyle].emoji}</Text>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {(['care', 'pet_voice', 'cute'] as const).map(style => (
            <TouchableOpacity
              key={style}
              onPress={() => setCurrentStyle(style)}
              style={[
                styles.modeButton,
                {
                  backgroundColor: currentStyle === style ? colors.primary : colors.backgroundElement,
                  borderColor: currentStyle === style ? colors.primaryDeep : colors.border,
                },
              ]}
            >
              <Text style={[
                styles.modeEmoji,
                { fontSize: currentStyle === style ? 14 : 12 }
              ]}>
                {styleConfig[style].emoji}
              </Text>
              <Text style={[
                styles.modeLabel,
                {
                  color: currentStyle === style ? 'white' : colors.text,
                  fontWeight: currentStyle === style ? '700' : '500',
                  fontSize: currentStyle === style ? 11 : 10,
                }
              ]}>
                {styleConfig[style].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start the conversation</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ask anything about {pet?.name}'s health, behavior, or diet
            </Text>
            <View style={[styles.suggestionsBox, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Try asking:</Text>
              <Text style={[styles.suggestionItem, { color: colors.textSecondary }]}>• What vaccines does {pet?.name} need?</Text>
              <Text style={[styles.suggestionItem, { color: colors.textSecondary }]}>• How much should {pet?.name} eat daily?</Text>
              <Text style={[styles.suggestionItem, { color: colors.textSecondary }]}>• Are there any health concerns for {pet?.breed}?</Text>
            </View>
          </View>
        )}
        {messages.map((msg, idx) => (
          <View key={idx} style={styles.messageRow}>
            <View
              style={[
                styles.messageBubble,
                msg.role === 'user'
                  ? [styles.userMessage, { backgroundColor: colors.primary }]
                  : [styles.assistantMessage, { backgroundColor: colors.cardSecondary, borderColor: colors.border }],
              ]}
            >
              {msg.role === 'assistant' && (
                <Text style={styles.assistantEmoji}>🐾</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  {
                    color: msg.role === 'user' ? 'white' : colors.text,
                  },
                ]}
              >
                {msg.content}
              </Text>
            </View>

            {/* Medical Notes Callout */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <View style={[styles.medicalNotesBox, { backgroundColor: colors.blush, borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
                <View style={styles.notesHeader}>
                  <Text style={styles.notesEmoji}>📋</Text>
                  <Text style={[styles.notesTitle, { color: colors.text }]}>Medical Sources</Text>
                </View>
                <View style={styles.sourcesList}>
                  {msg.sources.map((source: any, i: number) => (
                    <View key={i} style={styles.sourceItem}>
                      <Text style={[styles.sourceDot, { color: colors.secondary }]}>•</Text>
                      <Text
                        style={[styles.sourceText, { color: colors.textSecondary }]}
                      >
                        {source}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Feedback Buttons */}
            {msg.role === 'assistant' && (
              <View style={styles.feedbackContainer}>
                <TouchableOpacity
                  onPress={() => setFeedback({ ...feedback, [idx]: feedback[idx] === 'like' ? '' : 'like' })}
                  style={[
                    styles.feedbackButton,
                    feedback[idx] === 'like' && { backgroundColor: colors.softPink }
                  ]}
                >
                  <Text style={styles.feedbackEmoji}>{feedback[idx] === 'like' ? '👍' : '👍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFeedback({ ...feedback, [idx]: feedback[idx] === 'dislike' ? '' : 'dislike' })}
                  style={[
                    styles.feedbackButton,
                    feedback[idx] === 'dislike' && { backgroundColor: colors.softPink }
                  ]}
                >
                  <Text style={styles.feedbackEmoji}>{feedback[idx] === 'dislike' ? '👎' : '👎'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={[styles.typingIndicator, { backgroundColor: colors.cardSecondary }]}>
              <View style={[styles.typingDot, { backgroundColor: colors.secondary }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.secondary }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.secondary }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              { color: colors.text }
            ]}
            placeholder="Ask about health, diet, behavior..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: !input.trim() || loading ? 0.5 : 1 },
          ]}
          onPress={handleSendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendEmoji}>{loading ? '⏳' : '→'}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold' },

  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  styleEmoji: { fontSize: 20 },

  modeSelector: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, gap: 4 },
  modeEmoji: { fontWeight: '700' },
  modeLabel: { textAlign: 'center' },

  messagesContainer: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 12 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, maxWidth: 280, lineHeight: 20 },
  suggestionsBox: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginTop: 12, width: '100%', maxWidth: 300 },
  suggestionsTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  suggestionItem: { fontSize: 11, marginBottom: 6, lineHeight: 16 },

  messageRow: { marginVertical: 8 },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginVertical: 4 },
  userMessage: { alignSelf: 'flex-end' },
  assistantMessage: { alignSelf: 'flex-start', borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  assistantEmoji: { fontSize: 16, marginTop: 2 },
  messageText: { fontSize: 14, lineHeight: 20, flex: 1 },

  medicalNotesBox: { marginTop: 8, marginBottom: 8, marginLeft: 0, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, maxWidth: '85%' },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  notesEmoji: { fontSize: 14 },
  notesTitle: { fontSize: 12, fontWeight: '700' },
  sourcesList: { gap: 6 },
  sourceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  sourceDot: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  sourceText: { fontSize: 11, lineHeight: 16, flex: 1 },

  feedbackContainer: { flexDirection: 'row', gap: 8, marginTop: 6 },
  feedbackButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  feedbackEmoji: { fontSize: 14 },

  loadingContainer: { paddingVertical: 16, alignItems: 'flex-start' },
  typingIndicator: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', gap: 4, width: 70 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },

  inputContainer: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', gap: 8, borderTopWidth: 1 },
  inputWrapper: { flex: 1, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1 },
  input: { paddingVertical: 10, fontSize: 14, maxHeight: 100 },

  sendButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  sendEmoji: { fontSize: 18, fontWeight: '700' },
});
