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
    await getDocFromServer(doc(firestore, '_health', 'ping'));
    return true;
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firebase client offline, using cached fallback.');
      return false;
    }
    // Connected (even if document does not exist yet)
    return true;
  }
}

export { firebaseConfig };
