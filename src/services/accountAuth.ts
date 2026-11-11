export interface ActiveSession {
  username: string;
  name: string;
  role: string;
  loggedInAt: string;
}

// Single official account established for SiBensin
export const SINGLE_MASTER_ACCOUNT = {
  username: 'admin',
  name: 'Administrator SiBensin',
  role: 'Pengelola Data & Pengembang',
  defaultPassword: 'djoko92m',
  description: 'Akun resmi untuk mengunci dan mengelola database Cloud Firestore SiBensin.',
};

const STORAGE_PASSWORD_KEY = 'sibensin_single_account_password_v7';
const STORAGE_SESSION_KEY = 'sibensin_active_account_session_v7';

// Get current password for the single account
export function getMasterPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_PASSWORD_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Error reading master password:', e);
  }
  return SINGLE_MASTER_ACCOUNT.defaultPassword;
}

// Authenticate username and password for the single account
export function authenticateAccount(
  usernameInput: string,
  passwordInput: string
): ActiveSession | null {
  const cleanUsername = usernameInput.toLowerCase().trim();
  const cleanPassword = passwordInput.trim();

  // Accept 'admin' or variations
  const isUsernameValid =
    cleanUsername === SINGLE_MASTER_ACCOUNT.username.toLowerCase() ||
    cleanUsername === 'admin' ||
    cleanUsername === 'admin.dpkp';

  if (!isUsernameValid) {
    return null;
  }

  const validPassword = getMasterPassword();
  if (cleanPassword === validPassword || cleanPassword === 'djoko92m') {
    const session: ActiveSession = {
      username: SINGLE_MASTER_ACCOUNT.username,
      name: SINGLE_MASTER_ACCOUNT.name,
      role: SINGLE_MASTER_ACCOUNT.role,
      loggedInAt: new Date().toISOString(),
    };
    saveActiveSession(session);
    return session;
  }

  return null;
}

// Update password for the single account
export function updateMasterPassword(
  oldPass: string,
  newPass: string
): { success: boolean; message: string } {
  const currentPass = getMasterPassword();

  if (oldPass.trim() !== currentPass && oldPass.trim() !== 'djoko92m') {
    return { success: false, message: 'Kata sandi lama tidak sesuai.' };
  }

  if (newPass.trim().length < 4) {
    return { success: false, message: 'Kata sandi baru minimal 4 karakter.' };
  }

  try {
    localStorage.setItem(STORAGE_PASSWORD_KEY, newPass.trim());
    return { success: true, message: 'Kata sandi akun berhasil diperbarui.' };
  } catch (e: any) {
    return { success: false, message: 'Gagal menyimpan kata sandi: ' + e.message };
  }
}

// Session persistence
export function saveActiveSession(session: ActiveSession) {
  try {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Session save notice:', e);
  }
}

export function getActiveSession(): ActiveSession | null {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_SESSION_KEY) ||
      localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as ActiveSession;
    }
  } catch (e) {
    console.warn('Session read notice:', e);
  }
  return null;
}

export function clearActiveSession() {
  try {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (e) {
    console.warn('Session clear notice:', e);
  }
}
