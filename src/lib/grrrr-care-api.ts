import { supabase } from './supabase';
import { DEMO_PETS, DEMO_VACCINATIONS, DEMO_MEDICATIONS, DEMO_VET_VISITS } from './demo-data';

const API_BASE = 'http://192.168.56.1:3000/api';

let demoMode = false;

export const setDemoMode = (enabled: boolean) => {
  demoMode = enabled;
};

export const isDemoMode = () => demoMode;

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

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (error) {
      console.warn('getPetById error:', error);
      return null;
    }
    return data;
  },

  // Vaccinations
  async getVaccinations(petId: string) {
    if (demoMode) {
      return DEMO_VACCINATIONS[petId as keyof typeof DEMO_VACCINATIONS] || [];
    }

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
    nextDue?: string;
  }) {
    const { data, error } = await supabase
      .from('vaccinations')
      .insert([{
        pet_id: petId,
        vaccine: vaccine.name,
        date: vaccine.date || new Date().toISOString(),
        next_due: vaccine.nextDue || null,
      }])
      .select()
      .single();
    if (error) {
      console.error('Add vaccination error:', error);
      throw error;
    }
    return data;
  },

  async deleteVaccination(vaccinationId: string) {
    if (demoMode) {
      // In demo mode, we can't really delete, but app will reload fresh data
      return;
    }
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
    if (demoMode) {
      return DEMO_MEDICATIONS[petId as keyof typeof DEMO_MEDICATIONS] || [];
    }

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
    endDate?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('medications')
      .insert([{
        pet_id: petId,
        name: med.name,
        dosage: med.dosage || 'As prescribed',
        frequency: med.frequency || null,
        start_date: med.startDate || new Date().toISOString(),
        end_date: med.endDate || null,
        notes: med.notes || null,
      }])
      .select()
      .single();
    if (error) {
      console.error('Add medication error:', error);
      throw error;
    }
    return data;
  },

  async deleteMedication(medicationId: string) {
    if (demoMode) {
      return;
    }
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
    if (demoMode) {
      return DEMO_VET_VISITS[petId as keyof typeof DEMO_VET_VISITS] || [];
    }

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
    const { data, error } = await supabase
      .from('vet_visits')
      .insert([{
        pet_id: petId,
        date: visit.date || new Date().toISOString(),
        vet_name: visit.vetName || null,
        reason: visit.reason || null,
        diagnosis: visit.diagnosis || null,
        notes: visit.notes || null,
      }])
      .select()
      .single();
    if (error) {
      console.error('Add vet visit error:', error);
      throw error;
    }
    return data;
  },

  async deleteVetVisit(visitId: string) {
    if (demoMode) {
      return;
    }
    const { error } = await supabase
      .from('vet_visits')
      .delete()
      .eq('id', visitId);
    if (error) {
      console.error('Delete vet visit error:', error);
      throw error;
    }
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

  // AI Chat with Knowledge Base Integration
  async sendChatMessage(petId: string, message: string, style: string = 'care') {
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

  async getAllPartners() {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_published', true)
        .order('rating', { ascending: false });

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
        lastVetVisit: vetVisits[0]?.date || null,
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
