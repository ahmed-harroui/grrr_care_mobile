import { supabase } from '@/lib/supabase';

// The GRRRR community on Care's home: the guides written in the website's Sanity Studio, and the
// members' threads (grr_threads, shared with the GRRRR app and the website; GRRRR migration 014).

export const SITE_URL = 'https://grrrr-main.vercel.app';
const SANITY = 'https://07lbidyz.apicdn.sanity.io/v2026-09-01/data/query/production';

export interface Guide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
}

/** Published guides, newest first (Sanity's public CDN, no token needed). */
export async function listGuides(limit = 8): Promise<Guide[]> {
  const query = `*[_type == "guide" && defined(slug.current) && !(_id in path("drafts.**"))] | order(_createdAt desc)[0...${limit}]{ _id, title, excerpt, category, readMinutes, "slug": slug.current }`;
  try {
    const res = await fetch(`${SANITY}?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const { result } = await res.json();
    return (result ?? []).map((g: any) => ({ id: g._id, slug: g.slug, title: g.title ?? '', excerpt: g.excerpt ?? '', category: g.category ?? '', readMinutes: g.readMinutes ?? 5 }));
  } catch (error) {
    console.warn('Guides could not be loaded', error);
    return [];
  }
}

export interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  official: boolean;
  upvotes: number;
  comments: number;
  authorName: string;
  upvoted: boolean;
}

/** [English, French], the categories of grr_threads. */
export const THREAD_CATEGORIES: Record<string, [string, string]> = {
  fact: ['Fun fact', 'Le savais-tu'],
  history: ['History', 'Histoire'],
  culture: ['Culture', 'Culture'],
  science: ['Science', 'Science'],
  story: ['Story', 'Récit'],
  tip: ['Tip', 'Conseil'],
};

/** The best threads first (most upvoted), then the others in a random order, as in GRRRR. */
export async function listThreads(userId?: string, limit = 5): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('grr_threads')
    .select('id, title, body, category, is_official, like_count, comment_count, created_at, author:grr_members!grr_threads_author_id_fkey(username, display_name)')
    .eq('status', 'published')
    .order('like_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) {
    console.warn('Threads could not be loaded', error.message);
    return [];
  }
  const rows = (data ?? []) as any[];
  let mine = new Set<string>();
  if (userId && rows.length > 0) {
    const { data: likes } = await supabase.from('grr_thread_likes').select('thread_id').eq('user_id', userId).in('thread_id', rows.map((row) => row.id));
    mine = new Set((likes ?? []).map((like: any) => like.thread_id));
  }
  const threads: Thread[] = rows.map((row) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      official: Boolean(row.is_official),
      upvotes: row.like_count ?? 0,
      comments: row.comment_count ?? 0,
      authorName: row.is_official ? 'GRRRR' : author?.display_name || author?.username || '',
      upvoted: mine.has(row.id),
    };
  });
  const best = threads.filter((t) => t.upvotes > 0);
  const rest = threads.filter((t) => t.upvotes <= 0);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...best, ...rest].slice(0, limit);
}

// Accounts made before the community tables have no member row yet (GRRRR migration 014).
let memberReady: string | null = null;

export async function setThreadUpvote(threadId: string, userId: string, upvoted: boolean): Promise<boolean> {
  if (memberReady !== userId) {
    const { error } = await supabase.rpc('ensure_grr_member');
    if (!error) memberReady = userId;
  }
  const { error } = upvoted
    ? await supabase.from('grr_thread_likes').insert({ thread_id: threadId, user_id: userId })
    : await supabase.from('grr_thread_likes').delete().eq('thread_id', threadId).eq('user_id', userId);
  // 23505: already upvoted (from GRRRR or the website), which is what was asked.
  return !error || error.code === '23505';
}
