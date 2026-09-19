import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore
export const firestore = getFirestore(app);

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
