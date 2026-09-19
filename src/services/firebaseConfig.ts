import rawConfig from '../../firebase-applet-config.json';

// Support both embedded firebase-applet-config.json and Vercel / Vite environment variables
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || 'gen-lang-client-0402274970',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig.appId || '1:46900601033:web:e80367df3c15d27856ad18',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey || 'AIzaSyB935FQACmtDngoMEw4qTsGCdlZ8QiVqO8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || 'gen-lang-client-0402274970.firebaseapp.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || 'gen-lang-client-0402274970.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '46900601033',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || rawConfig.measurementId || '',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || rawConfig.oAuthClientId || '46900601033-t50267uivq38l571ug1jrqntn3p9rdd7.apps.googleusercontent.com',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || rawConfig.recaptchaSiteKey || ''
};

export default firebaseConfig;
