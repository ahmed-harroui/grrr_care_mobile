import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listGuides, listThreads, setThreadUpvote, SITE_URL, THREAD_CATEGORIES, type Guide, type Thread } from '@/lib/community';

// Home's community block: the latest guides (horizontal cards) and the best threads of the
// GRRRR community, with the ▲ upvote. Guides and threads open on the website.

/** [English, French] and an emoji per guide category (website's CATEGORIES). */
const GUIDE_CATEGORIES: Record<string, [string, string, string]> = {
  BEHAVIOUR: ['Behaviour', 'Comportement', '🧠'],
  'PUPPY LIFE': ['Puppy life', 'Vie de chiot', '🐶'],
  WELLBEING: ['Wellbeing', 'Bien-être', '🌿'],
  HEALTH: ['Health', 'Santé', '🩺'],
  NUTRITION: ['Nutrition', 'Nutrition', '🥣'],
  TRAINING: ['Training', 'Éducation', '🎾'],
  CATS: ['Cats', 'Chats', '🐱'],
};

export function CommunityFeed({ colors }: { colors: any }) {
  const { user, isDemo } = useAuth();
  const { language } = useLanguage();
  const tx = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listGuides().then(setGuides);
      void listThreads(isDemo ? undefined : user?.id).then(setThreads);
    }, [user?.id, isDemo])
  );

  const open = (path: string) => WebBrowser.openBrowserAsync(`${SITE_URL}${path}`).catch(() => {});

  const upvote = async (thread: Thread) => {
    if (!user?.id || isDemo) return;
    const next = !thread.upvoted;
    const apply = (on: boolean) =>
      setThreads((list) => list.map((t) => (t.id === thread.id ? { ...t, upvoted: on, upvotes: t.upvotes + (on === thread.upvoted ? 0 : on ? 1 : -1) } : t)));
    apply(next);
    if (!(await setThreadUpvote(thread.id, user.id, next))) apply(thread.upvoted);
  };

  if (guides.length === 0 && threads.length === 0) return null;

  return (
    <View style={styles.section}>
      {guides.length > 0 && (
        <>
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{tx('GUIDES', 'GUIDES')}</Text>
            <Pressable onPress={() => open('/guides')} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{tx('See all', 'Tout voir')}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.guides}>
            {guides.map((guide) => {
              const category = GUIDE_CATEGORIES[guide.category];
              return (
                <Pressable
                  key={guide.id}
                  onPress={() => open(`/guides/${guide.slug}`)}
                  style={({ pressed }) => [styles.guide, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
                >
                  <View style={[styles.guideBadge, { backgroundColor: colors.primary + '14' }]}>
                    <Text style={styles.guideEmoji}>{category?.[2] ?? '📖'}</Text>
                  </View>
                  <Text style={[styles.guideCategory, { color: colors.primary }]}>
                    {(category ? tx(category[0], category[1]) : guide.category).toUpperCase()} · {guide.readMinutes} MIN
                  </Text>
                  <Text style={[styles.guideTitle, { color: colors.text }]} numberOfLines={2}>{guide.title}</Text>
                  <Text style={[styles.guideExcerpt, { color: colors.textSecondary }]} numberOfLines={3}>{guide.excerpt}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {threads.length > 0 && (
        <>
          <View style={[styles.header, { marginTop: guides.length > 0 ? 22 : 0 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{tx('COMMUNITY THREADS', 'THREADS DE LA COMMUNAUTÉ')}</Text>
            <Pressable onPress={() => open('/threads')} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{tx('See all', 'Tout voir')}</Text>
            </Pressable>
          </View>
          {threads.map((thread) => {
            const category = THREAD_CATEGORIES[thread.category];
            return (
              <Pressable
                key={thread.id}
                onPress={() => open(`/threads/${thread.id}`)}
                style={({ pressed }) => [styles.thread, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
              >
                <Pressable
                  onPress={() => upvote(thread)}
                  hitSlop={6}
                  style={[styles.vote, { backgroundColor: thread.upvoted ? colors.primary : colors.cardSecondary, borderColor: thread.upvoted ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.voteArrow, { color: thread.upvoted ? '#FFFFFF' : colors.textSecondary }]}>▲</Text>
                  <Text style={[styles.voteCount, { color: thread.upvoted ? '#FFFFFF' : colors.text }]}>{thread.upvotes}</Text>
                </Pressable>
                <View style={styles.threadBody}>
                  <View style={styles.threadMeta}>
                    {thread.official && (
                      <View style={[styles.official, { backgroundColor: colors.primary }]}>
                        <Text style={styles.officialText}>GRRRR</Text>
                      </View>
                    )}
                    <Text style={[styles.threadCategory, { color: colors.textTertiary }]} numberOfLines={1}>
                      {category ? tx(category[0], category[1]) : thread.category}
                      {!thread.official && thread.authorName ? ` · ${thread.authorName}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={2}>{thread.title}</Text>
                  <Text style={[styles.threadText, { color: colors.textSecondary }]} numberOfLines={2}>{thread.body}</Text>
                  <Text style={[styles.threadComments, { color: colors.textTertiary }]}>💬 {thread.comments}</Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, marginBottom: 28 },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontWeight: '700' },
  scroller: { marginHorizontal: -20 },
  guides: { paddingHorizontal: 20, gap: 12 },
  guide: { width: 230, padding: 14, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  guideBadge: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  guideEmoji: { fontSize: 20 },
  guideCategory: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  guideTitle: { fontSize: 15, fontWeight: '800', marginTop: 4, lineHeight: 20 },
  guideExcerpt: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  thread: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 10 },
  vote: { width: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignSelf: 'flex-start' },
  voteArrow: { fontSize: 13, fontWeight: '900' },
  voteCount: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  threadBody: { flex: 1 },
  threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  official: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  officialText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.6 },
  threadCategory: { flex: 1, fontSize: 11, fontWeight: '600' },
  threadTitle: { fontSize: 15, fontWeight: '800', marginTop: 4, lineHeight: 20 },
  threadText: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  threadComments: { fontSize: 11, fontWeight: '600', marginTop: 6 },
});
