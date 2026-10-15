import { supabase } from './supabase';
import { DEMO_PETS, DEMO_VACCINATIONS, DEMO_MEDICATIONS, DEMO_VET_VISITS } from './demo-data';
import { addDays, isoDay, type NewPlanItem, type PlanItem } from './care-plan';

const API_BASE = 'http://192.168.56.1:3000/api';

export interface PetFields {
  pet_name?: string;
  species?: string;
  breed?: string;
  age?: number;
  gender?: string | null;
  photo_url?: string;
  weight?: number | null;
  birthday?: string | null;
  color?: string | null;
  microchip?: string | null;
  sterilized?: boolean | null;
  allergies?: string | null;
  care_notes?: string | null;
  distinguishing_marks?: string | null;
  tattoo?: string | null;
  registration_number?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  owner_address?: string | null;
  setup_pending?: boolean;
}

// Kept in public.pet_private (owner only, migration 017), not on the pets table every GRRRR user can read
const PRIVATE_FIELDS = [
  'owner_name',
  'owner_phone',
  'owner_email',
  'owner_address',
  'tattoo',
  'registration_number',
  'distinguishing_marks',
  'care_notes',
] as const;

function splitPrivate(fields: PetFields) {
  const shared: Record<string, unknown> = { ...fields };
  const privateFields: Record<string, unknown> = {};
  for (const key of PRIVATE_FIELDS) {
    if (key in shared) {
      privateFields[key] = shared[key];
      delete shared[key];
    }
  }
  return { shared, privateFields };
}

async function savePrivate(petId: string, ownerId: string, privateFields: Record<string, unknown>) {
  if (!Object.keys(privateFields).length) return {};
  const { data, error } = await supabase
    .from('pet_private')
    .upsert({ ...privateFields, pet_id: petId, owner_id: ownerId, updated_at: new Date().toISOString() }, { onConflict: 'pet_id' })
    .select()
    .single();
  if (error) throw error;
  const { pet_id, owner_id, updated_at, ...saved } = data;
  return saved;
}

export const DOCUMENT_TYPES = [
  'passport',
  'microchip_certificate',
  'adoption',
  'ownership',
  'registration',
  'import_export',
  'other',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface PetDocumentFields {
  doc_type: DocumentType;
  title?: string | null;
  document_number?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  issuer?: string | null;
  notes?: string | null;
  file_path?: string | null;
  file_mime?: string | null;
  file_name?: string | null;
  file_size?: number | null;
}

// Demo mode keeps picked files on the device instead of uploading them
const isLocalUri = (path: string) => /^(file|content|data|blob|ph):/.test(path);

export interface PetDocument extends PetDocumentFields {
  id: string;
  pet_id: string;
  created_at: string;
  // Written by the grrr-doc-read Edge Function, never by the app
  ai_summary?: string | null;
  ai_summary_status?: 'done' | 'unsupported' | 'failed' | null;
  ai_summary_path?: string | null;
}

// A file is waiting to be read by the assistant when its summary was made from another file (or not yet)
export const isAwaitingRead = (doc: PetDocument) => !!doc.file_path && doc.ai_summary_path !== doc.file_path;

const demoDocuments: PetDocument[] = [];

// The demo keeps what is added for the time of the visit (nothing is saved)
const demoLists: Record<string, Record<string, any[]>> = { vaccinations: DEMO_VACCINATIONS, medications: DEMO_MEDICATIONS, vet_visits: DEMO_VET_VISITS, care_plan: {} };
const demoList = (table: string, petId: string) => (demoLists[table][petId] ??= []);
const demoAdd = (table: string, petId: string, row: Record<string, unknown>) => {
  const saved = { id: `demo-${table}-${Date.now()}-${Math.round(Math.random() * 1e6)}`, pet_id: petId, ...row };
  demoLists[table][petId] = [saved, ...demoList(table, petId)];
  return saved;
};
const demoRemove = (table: string, id: string) => {
  for (const petId of Object.keys(demoLists[table])) demoLists[table][petId] = demoLists[table][petId].filter(row => row.id !== id);
};

let demoMode = false;

export const setDemoMode = (enabled: boolean) => {
  demoMode = enabled;
};

export const isDemoMode = () => demoMode;

// A partner of the map that the assistant recommends in an answer
export interface SuggestedPartner {
  id: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
}

export const grrrCareApi = {
  // Pets (filtered by owner)
  async getPets(userId?: string) {
    if (demoMode) {
      return DEMO_PETS;
    }

    let query = supabase.from('pets').select('*');

    if (userId) {
      query = query.eq('owner_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPetById(petId: string) {
    if (demoMode) {
      return DEMO_PETS.find(p => p.id === petId) || DEMO_PETS[0];
    }

    if (!petId) {
      return null;
    }

    const [{ data, error }, { data: details }] = await Promise.all([
      supabase.from('pets').select('*').eq('id', petId).single(),
      supabase.from('pet_private').select('*').eq('pet_id', petId).maybeSingle(),
    ]);

    if (error) {
      console.warn('getPetById error:', error);
      return null;
    }
    if (!details) return data;
    const { pet_id, owner_id, updated_at, ...privateFields } = details;
    return { ...data, ...privateFields };
  },

  async createPet(ownerId: string, fields: PetFields) {
    if (demoMode) {
      const pet = { ...fields, id: `demo-pet-${Date.now()}`, owner_id: ownerId, created_at: new Date().toISOString() };
      (DEMO_PETS as any[]).unshift(pet);
      return pet;
    }

    const { shared, privateFields } = splitPrivate(fields);
    const { data, error } = await supabase
      .from('pets')
      .insert({ ...shared, owner_id: ownerId })
      .select()
      .single();
    if (error) throw error;
    return { ...data, ...(await savePrivate(data.id, ownerId, privateFields)) };
  },

  async updatePet(petId: string, fields: PetFields) {
    if (demoMode) {
      const pet = (DEMO_PETS as any[]).find(p => p.id === petId);
      if (pet) Object.assign(pet, fields);
      return pet;
    }

    const { shared, privateFields } = splitPrivate(fields);
    const { data, error } = await supabase
      .from('pets')
      .update({ ...shared, updated_at: new Date().toISOString() })
      .eq('id', petId)
      .select()
      .single();
    if (error) throw error;
    return { ...data, ...(await savePrivate(petId, data.owner_id, privateFields)) };
  },

  // Returns a public https URL so the photo also shows in the GRRRR app and on other devices
  async uploadPetPhoto(ownerId: string, base64: string, mimeType = 'image/jpeg') {
    if (demoMode) {
      return `data:${mimeType};base64,${base64}`;
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const path = `${ownerId}/${Date.now()}.${ext}`;
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const { error } = await supabase.storage
      .from('pet-photos')
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('pet-photos').getPublicUrl(path).data.publicUrl;
  },

  // Official documents (passport, certificates...). Files sit in the private pet-documents bucket.
  async getPetDocuments(petId: string): Promise<PetDocument[]> {
    if (demoMode) {
      return demoDocuments.filter(d => d.pet_id === petId);
    }

    const { data, error } = await supabase
      .from('pet_documents')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async savePetDocument(petId: string, fields: PetDocumentFields, documentId?: string): Promise<PetDocument> {
    if (demoMode) {
      const existing = documentId ? demoDocuments.find(d => d.id === documentId) : undefined;
      if (existing) return Object.assign(existing, fields);
      const doc = { ...fields, id: `demo-doc-${Date.now()}`, pet_id: petId, created_at: new Date().toISOString() };
      demoDocuments.unshift(doc);
      return doc;
    }

    const query = documentId
      ? supabase.from('pet_documents').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', documentId)
      : supabase.from('pet_documents').insert({ ...fields, pet_id: petId });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async deletePetDocument(doc: PetDocument) {
    if (demoMode) {
      const index = demoDocuments.findIndex(d => d.id === doc.id);
      if (index >= 0) demoDocuments.splice(index, 1);
      return;
    }

    const { error } = await supabase.from('pet_documents').delete().eq('id', doc.id);
    if (error) throw error;
    if (doc.file_path) {
      await this.removeDocumentFile(doc.file_path);
    }
  },

  // Has the assistant read the new or replaced files once (Edge Function grrr-doc-read), so chat never resends them
  async readPetDocumentFiles(petId: string, language: string): Promise<{ remaining: number }> {
    if (demoMode) return { remaining: 0 };
    const { data, error } = await supabase.functions.invoke('grrr-doc-read', { body: { petId, language } });
    if (error) throw error;
    return data;
  },

  async removeDocumentFile(filePath: string) {
    if (demoMode || isLocalUri(filePath)) return;
    const { error } = await supabase.storage.from('pet-documents').remove([filePath]);
    if (error) throw error;
  },

  // Returns the storage path (not a URL): the bucket is private, use getDocumentFileUrl to view it
  async uploadDocumentFile(ownerId: string, file: { uri: string; bytes: ArrayBuffer; mimeType: string; name: string }) {
    if (demoMode) {
      return file.uri;
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : file.mimeType.split('/')[1] || 'bin';
    const path = `${ownerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('pet-documents')
      .upload(path, file.bytes, { contentType: file.mimeType, upsert: false });
    if (error) throw error;
    return path;
  },

  async getDocumentFileUrl(filePath: string) {
    if (isLocalUri(filePath)) return filePath;
    const { data, error } = await supabase.storage.from('pet-documents').createSignedUrl(filePath, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  },

  // Vaccinations
  async getVaccinations(petId: string) {
    if (demoMode) return demoList('vaccinations', petId);

    const { data, error } = await supabase
      .from('vaccinations')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('Vaccinations fetch error:', error);
      return [];
    }
    return data || [];
  },

  async addVaccination(petId: string, vaccine: {
    name: string;
    date?: string;
    nextDue?: string | null;
    vetName?: string;
  }) {
    const row = {
      vaccine: vaccine.name,
      date: vaccine.date || new Date().toISOString(),
      next_due: vaccine.nextDue || null,
      vet_name: vaccine.vetName || null,
    };
    if (demoMode) return demoAdd('vaccinations', petId, row);
    const { data, error } = await supabase
      .from('vaccinations')
      .insert([{ pet_id: petId, ...row }])
      .select()
      .single();
    if (error) {
      console.error('Add vaccination error:', error);
      throw error;
    }
    return data;
  },

  async deleteVaccination(vaccinationId: string) {
    if (demoMode) return demoRemove('vaccinations', vaccinationId);
    const { error } = await supabase
      .from('vaccinations')
      .delete()
      .eq('id', vaccinationId);
    if (error) {
      console.error('Delete vaccination error:', error);
      throw error;
    }
  },

  // Medications
  async getMedications(petId: string) {
    if (demoMode) return demoList('medications', petId);

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('pet_id', petId)
      .order('start_date', { ascending: false });

    if (error) {
      console.warn('Medications fetch error:', error);
      return [];
    }
    return data || [];
  },

  async addMedication(petId: string, med: {
    name: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string | null;
    notes?: string;
    /** Given every… days (1: every day), so that reminders only come on those days */
    everyDays?: number;
  }) {
    const row = {
      name: med.name,
      dosage: med.dosage || null,
      frequency: med.frequency || null,
      start_date: med.startDate || new Date().toISOString(),
      end_date: med.endDate || null,
      notes: med.notes || null,
      every_days: med.everyDays || 1,
    };
    if (demoMode) return demoAdd('medications', petId, row);
    const { data, error } = await supabase
      .from('medications')
      .insert([{ pet_id: petId, ...row }])
      .select()
      .single();
    if (error) {
      console.error('Add medication error:', error);
      throw error;
    }
    return data;
  },

  async deleteMedication(medicationId: string) {
    if (demoMode) return demoRemove('medications', medicationId);
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId);
    if (error) {
      console.error('Delete medication error:', error);
      throw error;
    }
  },

  // Vet Visits
  async getVetVisits(petId: string) {
    if (demoMode) return demoList('vet_visits', petId);

    const { data, error } = await supabase
      .from('vet_visits')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('Vet visits fetch error:', error);
      return [];
    }
    return data || [];
  },

  async addVetVisit(petId: string, visit: {
    reason?: string;
    date?: string;
    vetName?: string;
    diagnosis?: string;
    notes?: string;
  }) {
    const row = {
      date: visit.date || new Date().toISOString(),
      vet_name: visit.vetName || null,
      reason: visit.reason || null,
      diagnosis: visit.diagnosis || null,
      notes: visit.notes || null,
    };
    if (demoMode) return demoAdd('vet_visits', petId, row);
    const { data, error } = await supabase
      .from('vet_visits')
      .insert([{ pet_id: petId, ...row }])
      .select()
      .single();
    if (error) {
      console.error('Add vet visit error:', error);
      throw error;
    }
    return data;
  },

  async deleteVetVisit(visitId: string) {
    if (demoMode) return demoRemove('vet_visits', visitId);
    const { error } = await supabase
      .from('vet_visits')
      .delete()
      .eq('id', visitId);
    if (error) {
      console.error('Delete vet visit error:', error);
      throw error;
    }
  },

  // Care plan: what is coming that is not yet in the record (lib/care-plan)
  async getCarePlan(petId: string): Promise<PlanItem[]> {
    if (demoMode) return demoList('care_plan', petId);
    const { data, error } = await supabase.from('care_plan').select('*').eq('pet_id', petId).order('due_date', { ascending: true });
    if (error) {
      console.warn('Care plan fetch error:', error.message);
      return [];
    }
    return data || [];
  },

  /** The wand's dates replace the ones it proposed before that are still to do; what was added by hand stays. */
  async replaceGeneratedPlan(petId: string, items: NewPlanItem[]) {
    if (demoMode) {
      demoLists.care_plan[petId] = demoList('care_plan', petId).filter(item => item.source !== 'wand' || item.done_at);
      items.forEach(item => demoAdd('care_plan', petId, { ...item, done_at: null }));
      return;
    }
    const { error: clearError } = await supabase.from('care_plan').delete().eq('pet_id', petId).eq('source', 'wand').is('done_at', null);
    if (clearError) throw clearError;
    if (items.length === 0) return;
    const { error } = await supabase.from('care_plan').upsert(items.map(item => ({ pet_id: petId, ...item })), { onConflict: 'pet_id,plan_key', ignoreDuplicates: true });
    if (error) throw error;
  },

  async addPlanItem(petId: string, item: NewPlanItem) {
    if (demoMode) return demoAdd('care_plan', petId, { ...item, done_at: null });
    const { data, error } = await supabase.from('care_plan').insert([{ pet_id: petId, ...item }]).select().single();
    if (error) throw error;
    return data;
  },

  async deletePlanItem(itemId: string) {
    if (demoMode) return demoRemove('care_plan', itemId);
    const { error } = await supabase.from('care_plan').delete().eq('id', itemId);
    if (error) throw error;
  },

  /**
   * Ticked as done today. The follow-up is automatic: a vaccine goes in the record with its next
   * dose, a visit too, and what comes back (deworming, flea care, check-up) is planned again.
   */
  async completePlanItem(item: PlanItem, nextVaccineDue: string | null) {
    const now = new Date();
    if (demoMode) demoList('care_plan', item.pet_id).forEach(row => { if (row.id === item.id) row.done_at = now.toISOString(); });
    else {
      const { error } = await supabase.from('care_plan').update({ done_at: now.toISOString() }).eq('id', item.id);
      if (error) throw error;
    }
    if (item.kind === 'vaccine') {
      // "Vaccin X : dose 2" is kept in the record as "Vaccin X"
      await this.addVaccination(item.pet_id, { name: item.title.replace(/ : [^:]*$/, ''), date: now.toISOString(), nextDue: nextVaccineDue });
      return;
    }
    if (item.kind === 'checkup') await this.addVetVisit(item.pet_id, { date: now.toISOString(), reason: item.title });
    if (item.repeat_days) {
      const due = isoDay(addDays(now, item.repeat_days));
      const next: NewPlanItem = { kind: item.kind, title: item.title, title_en: item.title_en, due_date: due, repeat_days: item.repeat_days, source: item.source, plan_key: item.plan_key ? item.plan_key.replace(/[^:]*$/, due) : null };
      if (demoMode) demoAdd('care_plan', item.pet_id, { ...next, done_at: null });
      else {
        const { error } = await supabase.from('care_plan').upsert([{ pet_id: item.pet_id, ...next }], { onConflict: 'pet_id,plan_key', ignoreDuplicates: true });
        if (error) throw error;
      }
    }
  },

  /** A finished game of "help your pets": it unlocks day 7 of the weekly gifts. */
  async recordGame(result: { solved: number; missed: number; kibble: number; health: number }): Promise<boolean> {
    if (demoMode) return false;
    const { data, error } = await supabase.rpc('record_care_game', { p_solved: result.solved, p_missed: result.missed, p_kibble: result.kibble, p_health: Math.round(result.health) });
    if (error) {
      console.warn('Game not recorded', error.message);
      return false;
    }
    return !!data?.counted;
  },

  // Knowledge Base Search
  async searchKnowledge(petSpecies: string, query: string, limit: number = 5) {
    try {
      // Fetch ALL documents (no filter first)
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*');

      if (error) {
        console.warn('Knowledge search error:', error);
        return [];
      }

      console.log('Total docs found:', data?.length);
      if (data && data.length > 0) {
        console.log('First doc:', data[0]);
      }
      console.log('Looking for species:', petSpecies);

      // Filter in code for species match
      const filtered = (data || []).filter(doc => {
        if (!doc.species) return false;

        // Species might be string or array
        const speciesStr = typeof doc.species === 'string' ? doc.species : JSON.stringify(doc.species);
        const matches = speciesStr.toLowerCase().includes(petSpecies.toLowerCase());

        console.log(`Doc "${doc.title}" species:`, speciesStr, 'matches:', matches);
        return matches;
      });

      console.log('Filtered results:', filtered.length);
      return filtered.slice(0, limit);
    } catch (error) {
      console.warn('Knowledge search failed:', error);
      return [];
    }
  },

  // Emergency Guides Search
  async searchEmergencyGuides(query: string, petSpecies: string) {
    try {
      // Fetch all published emergency guides
      const { data, error } = await supabase
        .from('emergency_guides')
        .select('*')
        .eq('is_published', true);

      if (error) {
        console.warn('Emergency guides search error:', error);
        return [];
      }

      // Filter in code for species match
      const filtered = (data || []).filter(guide => {
        if (!guide.species) return false;
        const species = Array.isArray(guide.species) ? guide.species : [guide.species];
        return species.some((s: string) => s.toLowerCase().includes(petSpecies.toLowerCase()));
      });

      return filtered.slice(0, 2);
    } catch (error) {
      console.warn('Emergency guides search failed:', error);
      return [];
    }
  },

  // Claude-backed assistant (Edge Function grrr-chat). Throws with a user-facing message on failure or quota.
  async sendChatMessage(
    petId: string,
    message: string,
    style: string = 'vet',
    options: {
      language?: string;
      history?: { role: 'user' | 'assistant'; text: string }[];
      // Lets the assistant recommend the nearest partners; left out when the owner hasn't allowed location
      location?: { latitude: number; longitude: number } | null;
    } = {}
  ): Promise<{ response: string; sources: string[]; partners?: SuggestedPartner[]; style: string; remaining?: number }> {
    if (demoMode) {
      return this.localChatAnswer(petId, message, style);
    }

    const { data, error } = await supabase.functions.invoke('grrr-chat', {
      body: { petId, message, style, language: options.language, history: options.history ?? [], location: options.location ?? undefined },
    });
    if (error) {
      let detail: string | undefined;
      let code: string | undefined;
      try {
        const body = await (error as any).context?.json();
        detail = body?.error;
        code = body?.code;
      } catch {}
      // code 'daily_limit': the chat then offers Care+ (CareSubscription)
      throw Object.assign(new Error(detail || error.message), { code });
    }
    return data;
  },

  // "Report this answer": kept in ai_reports for review in the Supabase dashboard (migration 017)
  async reportAnswer(report: { petId: string | null; mode: string; question: string; answer: string }) {
    if (demoMode) return;
    const { error } = await supabase.from('ai_reports').insert({
      pet_id: report.petId,
      mode: report.mode,
      question: report.question.slice(0, 2000),
      answer: report.answer.slice(0, 4000),
    });
    if (error) throw error;
  },

  // Keyword answers from the knowledge base, used offline in demo mode (no account, so no Edge Function)
  async localChatAnswer(petId: string, message: string, style: string = 'vet') {
    try {
      // Get pet species for knowledge search
      const pet = await this.getPetById(petId);
      console.log('Pet found:', pet?.pet_name, 'Species:', pet?.species);

      const species = pet?.species || 'dog';
      console.log('Using species for search:', species);

      // Search knowledge base in parallel
      console.log('Starting knowledge search...');
      const [knowledge, emergencies] = await Promise.all([
        this.searchKnowledge(species, message),
        this.searchEmergencyGuides(message, species),
      ]);

      console.log('Knowledge results:', knowledge.length, 'Emergency results:', emergencies.length);

      // If we have knowledge, build response from it
      if (knowledge.length > 0 || emergencies.length > 0) {
        const msgLower = message.toLowerCase();

        // Pick best matching document based on keywords
        let topDoc = knowledge[0];
        if (msgLower.includes('vaccine') || msgLower.includes('health')) {
          topDoc = knowledge.find(d => d.category === 'prevention') || knowledge[0];
        } else if (msgLower.includes('medication') || msgLower.includes('medicine')) {
          topDoc = knowledge.find(d => d.category === 'medication') || knowledge[0];
        } else if (msgLower.includes('eat') || msgLower.includes('food') || msgLower.includes('nutrition')) {
          topDoc = knowledge.find(d => d.category === 'nutrition') || knowledge[0];
        }

        const topEmergency = emergencies[0];

        let responseText = '';
        const sources: string[] = [];

        // Check for emergency keywords
        if (topEmergency && (msgLower.includes('emergency') ||
                             msgLower.includes('urgent') ||
                             msgLower.includes('help') ||
                             msgLower.includes('choking') ||
                             msgLower.includes('poison'))) {
          responseText = `🚨 EMERGENCY GUIDE: ${topEmergency.title || topEmergency.emergency_type}\n\n`;
          if (topEmergency.immediate_actions) {
            responseText += 'Immediate actions:\n';
            topEmergency.immediate_actions.forEach((action: string) => {
              responseText += `• ${action}\n`;
            });
          }
          responseText += `\n⚠️ When to call vet: ${topEmergency.when_to_call_vet}`;
          if (topEmergency.title) sources.push(topEmergency.title);
        } else if (topDoc) {
          // Only return if it matches what user asked about
          if (msgLower.includes('eat') || msgLower.includes('food') || msgLower.includes('nutrition') || msgLower.includes('diet')) {
            if (topDoc.category !== 'nutrition') {
              responseText = `I don't have specific info about that, but I found: ${topDoc.title}.\n\nFor ${pet?.pet_name || 'your pet'} (${species}), I can help with:\n• Nutrition & feeding\n• Health & vaccines\n• Medications & safety`;
            } else {
              responseText = `📚 ${topDoc.title}\n\n${topDoc.content || 'Information available'}`;
              sources.push(topDoc.title);
            }
          } else if (msgLower.includes('vaccine') || msgLower.includes('health')) {
            if (topDoc.category !== 'prevention') {
              responseText = `I don't have specific info about that, but I found: ${topDoc.title}.\n\nFor ${pet?.pet_name || 'your pet'} (${species}), I can help with:\n• Nutrition & feeding\n• Health & vaccines\n• Medications & safety`;
            } else {
              responseText = `📚 ${topDoc.title}\n\n${topDoc.content || 'Information available'}`;
              sources.push(topDoc.title);
            }
          } else if (msgLower.includes('medication') || msgLower.includes('medicine')) {
            if (topDoc.category !== 'medication') {
              responseText = `I don't have specific info about that, but I found: ${topDoc.title}.\n\nFor ${pet?.pet_name || 'your pet'} (${species}), I can help with:\n• Nutrition & feeding\n• Health & vaccines\n• Medications & safety`;
            } else {
              responseText = `📚 ${topDoc.title}\n\n${topDoc.content || 'Information available'}`;
              sources.push(topDoc.title);
            }
          } else {
            responseText = `For ${pet?.pet_name || 'your pet'} (${species}), I can help with:\n• Nutrition & feeding\n• Health & vaccines\n• Medications & safety\n\nAsk me something specific! 🐾`;
          }
        }

        return {
          response: responseText,
          sources: sources,
          style: style,
        };
      }

      // Fallback if no knowledge found
      const petName = pet?.pet_name || 'your pet';
      const petSpeciesDisplay = species.charAt(0).toUpperCase() + species.slice(1);
      return {
        response: `Hi! I'm GRRR Care assistant for ${petName}. I can help with nutrition, health, vaccines, medications, and emergencies for ${petSpeciesDisplay}s! 🐾`,
        sources: [],
        style: style,
      };

    } catch (error) {
      console.error('Chat error:', error);
      // Return helpful message
      return {
        response: `Hi! I'm GRRR Care assistant. Ask me about pet nutrition, health, behavior, or emergencies! 🐾`,
        sources: [],
        style: style,
      };
    }
  },

  // Partners & Clinics
  async getFeaturedPartner() {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_featured', true)
        .eq('is_published', true);

      if (error) {
        console.warn('Featured partner fetch error:', error);
        return null;
      }
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.warn('Featured partner error:', error);
      return null;
    }
  },

  async getPartnersByCategory(category: string) {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('rating', { ascending: false });

      if (error) {
        console.warn('Partners fetch error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('Partners error:', error);
      return [];
    }
  },

  // The map holds every vet, pet shop and groomer of the country (imported from OpenStreetMap, migration 018):
  // with a position, the places around it, nearest first; without one, only the establishments that are partners.
  /** The places around a point, nearest first (km: how far around it, limit: how many at most) */
  async getAllPartners(location?: { latitude: number; longitude: number } | null, km = 30, limit = 200) {
    try {
      const { data, error } = location
        ? await supabase.rpc('partners_near', { p_latitude: location.latitude, p_longitude: location.longitude, p_km: km, p_limit: limit })
        : await supabase
            .from('partners')
            .select('*')
            .eq('is_published', true)
            .eq('is_partner', true)
            .order('partner_since', { ascending: false })
            .limit(200);

      if (error) {
        console.warn('All partners fetch error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('All partners error:', error);
      return [];
    }
  },

  // Health Summary
  async getHealthSummary(petId: string) {
    try {
      const [vaccinations, medications, vetVisits] = await Promise.all([
        this.getVaccinations(petId),
        this.getMedications(petId),
        this.getVetVisits(petId),
      ]);

      return {
        status: 'healthy',
        vaccinations: vaccinations.length,
        medications: medications.length,
        // Visits also hold the appointments to come: the last one that took place
        lastVetVisit: vetVisits.find((visit: any) => new Date(visit.date).getTime() <= Date.now())?.date || null,
      };
    } catch (error) {
      console.warn('Health summary error:', error);
      return {
        status: 'healthy',
        vaccinations: 0,
        medications: 0,
        lastVetVisit: null,
      };
    }
  },
};
