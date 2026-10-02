import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// "Continue with Google", as in the GRRRR app (same Google Cloud project, same Supabase
// provider): Android's own account picker, then the Google ID token signs in to Supabase.
// The Android OAuth client (com.aharroui.grrrccare + the EAS keystore's SHA-1) is the one
// Firebase made for this app. Expo Go and the web have no Google Sign-In module.

/** The "Web application" OAuth client Supabase checks the token against (public, not a secret). */
const WEB_CLIENT_ID = '1097182535628-qdrm143si24fqivlba66ksdgdphnja48.apps.googleusercontent.com';
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export const googleSignInAvailable = Platform.OS === 'android' && !isExpoGo;

export type GoogleSignInResult = { error: string | null; cancelled?: boolean };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!googleSignInAvailable) return { error: 'Google Sign-In is not available here.' };
  // Loaded here so that Expo Go (without the native module) never imports it.
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { error: null, cancelled: true };
    const idToken: string | null = response.data.idToken;
    if (!idToken) return { error: 'Google did not return an identity token.' };
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { error: error.message };
    await fillProfileFromGoogle(response.data.user.name, response.data.user.photo);
    return { error: null };
  } catch (error: any) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) return { error: null, cancelled: true };
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { error: 'Google Play services are needed to sign in with Google.' };
    return { error: error?.message ?? String(error) };
  }
}

/** A new account takes its name and photo from Google (an existing one keeps its own). */
async function fillProfileFromGoogle(name: string | null, photo: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle();
  const changes: Record<string, string> = {};
  if (!profile?.display_name && name) changes.display_name = name;
  if (!profile?.avatar_url && photo) changes.avatar_url = photo;
  if (Object.keys(changes).length) await supabase.from('profiles').upsert({ user_id: userId, ...changes }, { onConflict: 'user_id' });
}

/** At sign-out: the next "Continue with Google" lets the user pick an account again. */
export async function signOutGoogle() {
  if (!googleSignInAvailable) return;
  try {
    await require('@react-native-google-signin/google-signin').GoogleSignin.signOut();
  } catch {
    // Not signed in with Google.
  }
}
