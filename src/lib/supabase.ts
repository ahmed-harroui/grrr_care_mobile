import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfamxvbepohyeigpnsyi.supabase.co';
const supabaseAnonKey = 'sb_publishable_5G4dWlVi6QbcC38UH-qOkg_L-6Xl1B1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
