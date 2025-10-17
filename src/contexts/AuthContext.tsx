import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  User
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      // Si hay un usuario autenticado, no es invitado
      if (user) {
        setIsGuest(false);
      }
    });

    return unsubscribe;
  }, []);

  const register = async (email: string, password: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        createdAt: new Date().toISOString(),
        preferences: {},
        history: []
      });
      setIsGuest(false);
    } catch (error) {
      console.error("Error en registro:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsGuest(false);
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Fijamos el usuario inmediatamente para evitar redirecciones a /login
      setCurrentUser(user);
      // Crear documento de usuario si no existe
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          username: user.displayName || user.email?.split('@')[0] || 'usuario',
          email: user.email,
          createdAt: new Date().toISOString(),
          preferences: {},
          history: []
        });
      }
      setIsGuest(false);
    } catch (error) {
      console.error('Error en login con Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
    } catch (error) {
      console.error("Error en logout:", error);
      throw error;
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    continueAsGuest,
    isGuest
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};