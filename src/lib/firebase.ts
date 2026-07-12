import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
// @ts-ignore
import firebaseConfigJson from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const app = initializeApp(firebaseConfig);

// Prefer IndexedDB persistence — faster restore of auth session on reload
// (avoids lag feeling between "page ready" and "user signed in").
function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // initializeAuth throws if auth was already initialized (HMR / StrictMode)
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = {} as any;
export const storage = getStorage(app);

/** Cached ID token to avoid repeated async getIdToken on every write within a few minutes. */
let cachedIdToken: { token: string; exp: number } | null = null;

/**
 * Returns a Firebase ID token. Uses memory cache + non-forcing getIdToken(false)
 * so auth feels snappy and API calls don't wait on Google every time.
 */
export async function getCachedIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    cachedIdToken = null;
    return null;
  }
  const now = Date.now();
  if (!forceRefresh && cachedIdToken && cachedIdToken.exp > now + 30_000) {
    return cachedIdToken.token;
  }
  try {
    const token = await user.getIdToken(forceRefresh);
    // ID tokens last ~1h; refresh proactively after 50 min
    cachedIdToken = { token, exp: now + 50 * 60 * 1000 };
    return token;
  } catch {
    cachedIdToken = null;
    return null;
  }
}

export const logOut = async () => {
  cachedIdToken = null;
  await auth.signOut();
};

export const getAppSettings = async () => {
  return null;
};

export const setGlobalVerificationFormUrl = async (url: string) => {
  // Disabled
};
