import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe app and auth initialization
let app: any = null;
let authInstance: any = null;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
} catch (e) {
  console.warn('Firebase Auth initialization warning:', e);
}
export const auth = authInstance;

export const TARGET_EMAIL = 'dpkpkabpas@gmail.com';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let providerInstance: GoogleAuthProvider | null = null;
try {
  providerInstance = new GoogleAuthProvider();
  providerInstance.addScope(DRIVE_SCOPE);
  providerInstance.setCustomParameters({
    login_hint: TARGET_EMAIL,
    prompt: 'select_account',
  });
} catch (e) {
  console.warn('GoogleAuthProvider initialization warning:', e);
}
const provider = providerInstance;

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const getStoredToken = (): string | null => {
  return cachedAccessToken;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onSignedOut?: () => void
) => {
  if (!auth) {
    if (onSignedOut) onSignedOut();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onSignedOut) {
        onSignedOut();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('Layanan otentikasi Google belum siap.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle expected user cancellation or browser popup suppression
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('Google sign-in popup was closed by user.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup was blocked by browser.');
      throw new Error('Jendela pop-up diblokir oleh browser. Harap izinkan pop-up untuk situs ini lalu coba lagi.');
    }
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleLogout = async () => {
  cachedAccessToken = null;
  await signOut(auth);
};
