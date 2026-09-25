import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore, Auth & Firebase Storage
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Lazy initialize Firebase Cloud Messaging instance
let messagingInstance: Messaging | null = null;
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (e) {
    console.warn('Firebase Messaging is not supported in this environment:', e);
    return null;
  }
}

/**
 * Mengirim email pemulihan / reset kata sandi melalui Firebase Auth
 */
export async function sendFirebaseAuthPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return {
      success: true,
      message: `Tautan pemulihan kata sandi telah berhasil dikirim ke email ${email}. Silakan periksa kotak masuk atau spam Anda.`
    };
  } catch (err: any) {
    console.error('Firebase Auth sendPasswordResetEmail error:', err);
    let errorMessage = 'Gagal mengirim email pemulihan kata sandi.';
    if (err?.code === 'auth/user-not-found') {
      errorMessage = 'Akun dengan alamat email ini belum terdaftar di sistem otentikasi.';
    } else if (err?.code === 'auth/invalid-email') {
      errorMessage = 'Format alamat email tidak valid.';
    } else if (err?.code === 'auth/too-many-requests') {
      errorMessage = 'Terlalu banyak permintaan pemulihan kata sandi. Silakan coba lagi beberapa saat.';
    } else if (err?.code === 'auth/network-request-failed') {
      errorMessage = 'Gagal terhubung ke server Firebase. Periksa koneksi internet Anda.';
    } else if (err?.message) {
      errorMessage = err.message;
    }
    return {
      success: false,
      message: errorMessage
    };
  }
}

// Test connection function (as mandated by skill)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const healthRef = doc(firestore, '_health', 'ping');
    await getDocFromServer(healthRef);
    return true;
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firebase client offline, using cached fallback.');
      return false;
    }
    // If it's a permission or not found error, log and return true if reachable
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore permission check warning:', err);
      return false;
    }
    // Connected (even if document does not exist yet)
    return true;
  }
}

export { firebaseConfig };
