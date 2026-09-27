import { grrrCareApi, isDemoMode } from '../grrrr-care-api';
import { supabase } from '../supabase';
import defaultProfiles from './default-profiles.json';
import { computeHealthScore } from './engine';
import type { HealthData, HealthProfile, HealthScoreResult, PetForScore } from './types';

export * from './engine';
export * from './types';

const BUNDLED = defaultProfiles as HealthProfile[];
let cache: { profiles: HealthProfile[]; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

/**
 * Profiles come from the `health_profiles` table (edited and validated outside the app).
 * The bundled copy is only a fallback: first launch offline, or before the table exists.
 */
export async function loadHealthProfiles(): Promise<HealthProfile[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.profiles;
  let profiles = BUNDLED;
  if (!isDemoMode()) {
    const { data, error } = await supabase.from('health_profiles').select('*');
    if (!error && data && data.length > 0) profiles = data as HealthProfile[];
  }
  cache = { profiles, at: Date.now() };
  return profiles;
}

export async function getPetHealthScore(pet: PetForScore & { id: string }): Promise<HealthScoreResult> {
  const [profiles, vaccinations, vet_visits, medications, documents] = await Promise.all([
    loadHealthProfiles(),
    grrrCareApi.getVaccinations(pet.id),
    grrrCareApi.getVetVisits(pet.id),
    grrrCareApi.getMedications(pet.id),
    grrrCareApi.getPetDocuments(pet.id).catch(() => []),
  ]);
  const data: HealthData = { vaccinations, vet_visits, medications, documents };
  return computeHealthScore(pet, data, profiles);
}
