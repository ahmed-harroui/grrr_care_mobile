import { supabase } from '@/lib/supabase';

// Daily gifts, shared with the GRRRR app (same account, same streak; GRRRR migration 023).
// One gift a day; a missed day starts again at day 1; day 7 is a month of the AI assistant
// without the daily limit (read by the grrr-chat Edge Function).

export type DailyReward =
  | { kind: 'treats'; amount: number; petName?: string }
  | { kind: 'voucher'; code?: string }
  | { kind: 'care_ai'; days: number; until?: string };

/** The week of gifts, as the database gives them (daily_reward_for). */
export const WEEK: DailyReward[] = [
  { kind: 'treats', amount: 1 },
  { kind: 'treats', amount: 2 },
  { kind: 'treats', amount: 3 },
  { kind: 'treats', amount: 5 },
  { kind: 'voucher' },
  { kind: 'treats', amount: 8 },
  { kind: 'care_ai', days: 30 },
];

/** The week as this account will get it: the AI month only the first time. */
export function weekFor(aiMonthUsed?: boolean): DailyReward[] {
  return aiMonthUsed ? [...WEEK.slice(0, 6), { kind: 'treats', amount: 12 }] : WEEK;
}

export interface DailyStreak {
  day: number;
  claimedToday: boolean;
  done: number;
  best: number;
  careAiUntil: string | null;
  /** The AI month was already won: day 7 is now a chest of treats */
  aiMonthUsed?: boolean;
}

export async function getDailyStreak(): Promise<DailyStreak | null> {
  const { data, error } = await supabase.rpc('get_daily_streak');
  if (error) {
    console.warn('Daily gifts could not be loaded', error.message);
    return null;
  }
  return data as DailyStreak | null;
}

export async function claimDailyReward(petId?: string | null): Promise<{ reward: (DailyReward & { day: number }) | null; error: 'ALREADY_CLAIMED' | 'UNKNOWN' | null }> {
  const { data, error } = await supabase.rpc('claim_daily_reward', { p_app: 'care', p_pet_id: petId ?? null });
  if (error) return { reward: null, error: error.message.includes('ALREADY_CLAIMED') ? 'ALREADY_CLAIMED' : 'UNKNOWN' };
  return { reward: data, error: null };
}
