import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth } from './googleDriveAuth';
import { YearlyStore, DEFAULT_YEARLY_DATA } from '../data/bbmData';

// Safe app and db initialization
let app: any = null;
let dbInstance: any = null;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (firebaseConfig && firebaseConfig.firestoreDatabaseId) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase Firestore initialization warning:', e);
  try {
    if (app) dbInstance = getFirestore(app);
  } catch (err) {
    console.warn('Firestore fallback warning:', err);
  }
}

export const db = dbInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider: any) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore: Client is offline or configuration requires verification.');
    }
  }
}

export interface CentralDatabasePayload {
  version: string;
  lastSaved: string;
  updatedBy: string;
  yearlyStore: YearlyStore;
}

export const CENTRAL_DOC_PATH = 'bbm_database/latest';

/**
 * Normalizes YearlyStore data from Firestore
 */
function normalizeYearlyStore(raw: any): YearlyStore {
  const store: YearlyStore = { ...DEFAULT_YEARLY_DATA };
  if (!raw || typeof raw !== 'object') return store;

  for (const year of [2026, 2027, 2028, 2029, 2030]) {
    const item = raw[year] || raw[String(year)];
    if (item && Array.isArray(item.data)) {
      store[year] = {
        budget: typeof item.budget === 'number' ? item.budget : DEFAULT_YEARLY_DATA[year]?.budget || 350000000,
        data: item.data,
      };
    }
  }
  return store;
}

/**
 * Fetch the latest shared database from Cloud Firestore
 */
export async function fetchCentralDatabase(): Promise<CentralDatabasePayload | null> {
  if (!db) return null;
  const path = CENTRAL_DOC_PATH;
  try {
    const snapshot = await getDoc(doc(db, 'bbm_database', 'latest'));
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        version: data.version || '2.0.0',
        lastSaved: data.lastSaved || new Date().toISOString(),
        updatedBy: data.updatedBy || 'Pengguna SiBensin',
        yearlyStore: normalizeYearlyStore(data.yearlyStore),
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Save/Update the central shared database in Cloud Firestore
 */
export async function saveCentralDatabase(
  yearlyStore: YearlyStore,
  userEmail?: string | null
): Promise<string> {
  const timestamp = new Date().toISOString();
  if (!db) {
    console.warn('Firestore database is not initialized, skipping cloud save.');
    return timestamp;
  }
  const path = CENTRAL_DOC_PATH;
  const payload = {
    version: '2.0.0',
    lastSaved: timestamp,
    updatedBy: userEmail || 'Pengguna SiBensin',
    yearlyStore,
  };

  try {
    await setDoc(doc(db, 'bbm_database', 'latest'), payload);
    return timestamp;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Real-time listener for central database changes
 */
export function subscribeToCentralDatabase(
  onUpdate: (payload: CentralDatabasePayload) => void,
  onError?: (err: Error) => void
) {
  if (!db) {
    return () => {};
  }
  const path = CENTRAL_DOC_PATH;
  try {
    return onSnapshot(
      doc(db, 'bbm_database', 'latest'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onUpdate({
            version: data.version || '2.0.0',
            lastSaved: data.lastSaved || new Date().toISOString(),
            updatedBy: data.updatedBy || 'Pengguna SiBensin',
            yearlyStore: normalizeYearlyStore(data.yearlyStore),
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, path);
    if (onError) onError(err);
    return () => {};
  }
}
