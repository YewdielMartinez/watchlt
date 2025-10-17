import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';

// Configuración provista por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyBKKY9NRoo4tXrsY1pWPxMk-Z-fwLM502w",
  authDomain: "watchlt-928e8.firebaseapp.com",
  projectId: "watchlt-928e8",
  storageBucket: "watchlt-928e8.firebasestorage.app",
  messagingSenderId: "57227650475",
  appId: "1:57227650475:web:622bbf37df882ab8135eee",
  measurementId: "G-CGN39LDC4L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Inicializar Analytics si está soportado en el entorno
analyticsIsSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch(() => {});

export default app;