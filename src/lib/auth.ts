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

  // Register new user (creates account in shared GRRRR system).
  // The profiles row is created by the on_auth_user_created trigger; the name is kept in the user metadata
  // until the first session can write it (no session yet when the email must be confirmed first).
  async register(email: string, password: string, name: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (authError) throw authError;

    // No session back: either the email already has an account (Supabase answers with an empty
    // identities list rather than an error) or the email must be confirmed first. Either way the
    // owner is not signed in yet, so say why instead of opening a half-signed-in app.
    if (!authData.session) {
      throw Object.assign(new Error(authData.user?.identities?.length === 0 ? 'already registered' : 'confirm email'), {
        code: authData.user?.identities?.length === 0 ? 'EMAIL_TAKEN' : 'CONFIRM_EMAIL',
      });
    }
    if (authData.user) {
      await this.updateProfile(authData.user.id, { name }).catch(e => console.warn('Profile name not saved:', e));
    }

    return authData;
  },

  // Profile shared with the GRRRR apps (table profiles, one row per account)
  async getProfile(userId: string): Promise<{ display_name: string | null; avatar_url: string | null } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Also mirrors the name into the auth metadata, which is what the session carries
  async updateProfile(userId: string, fields: { name?: string; avatarUrl?: string | null }) {
    const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    if (fields.name !== undefined) row.display_name = fields.name;
    if (fields.avatarUrl !== undefined) row.avatar_url = fields.avatarUrl;
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;

    if (fields.name !== undefined) {
      const { error: metaError } = await supabase.auth.updateUser({ data: { name: fields.name } });
      if (metaError) throw metaError;
    }
  },

  // Supabase emails a confirmation link; the address only changes once it is opened
  async updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
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

  // Deletes the signed-in account for good (GRRRR migration 026): its photos and documents are
  // removed from Storage first, then the account, and with it its pets and their records.
  async deleteAccount(userId: string) {
    for (const bucket of ['pet-photos', 'pet-documents']) {
      const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      if (files?.length) await supabase.storage.from(bucket).remove(files.map(file => `${userId}/${file.name}`));
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
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
