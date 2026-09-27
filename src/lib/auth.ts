import { supabase } from './supabase';

export const authService = {
  // Login with GRRRR account
  async loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Register new user (creates account in shared GRRRR system)
  async register(email: string, password: string, name: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      // Create user profile in shared database
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            name,
            app_context: 'pet_care', // Track which app they use
            created_at: new Date().toISOString(),
          },
        ]);
      if (profileError) throw profileError;
    }

    return authData;
  },

  // Get current user
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Get user profile (links to GRRRR dating app)
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  // Get user's pets (auto-synced from GRRRR app)
  async getUserPets(userId: string) {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Logout
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Listen for auth changes
  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((_, session) => {
      callback(session?.user || null);
    });
  },

  // Link pet to user (auto-happens when pet added)
  async linkPetToUser(userId: string, petId: string) {
    const { error } = await supabase
      .from('pets')
      .update({ owner_id: userId })
      .eq('id', petId);
    if (error) throw error;
  },
};
