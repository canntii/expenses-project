'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '@/lib/types/user';
import { onAuthChange, signOut as firebaseSignOut } from '@/lib/firebase/auth';
import { getUserDocument } from '@/lib/firebase/firestore/users';
import { verifyUserToken } from '@/lib/firebase/tokenValidation';
import {
  registerSession,
  revokeSession,
  detectSuspiciousSessions,
  getCurrentSessionId,
  cleanupOldSessions,
  enforceSessionLimit,
  updateSessionActivity,
} from '@/lib/firebase/firestore/sessions';
import { toast } from 'sonner';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  sessionId: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  sessionId: null,
  signOut: async () => { },
  refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const loadUserData = async (fbUser: FirebaseUser, retryCount = 0) => {
    try {
      const userData = await getUserDocument(fbUser.uid);

      // Si no se encuentra el documento y aún tenemos reintentos disponibles
      if (!userData && retryCount < 3) {
        // Esperar un poco más en cada reintento (300ms, 600ms, 900ms)
        const delay = (retryCount + 1) * 300;
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadUserData(fbUser, retryCount + 1);
      }

      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await loadUserData(firebaseUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Verificar que el token sea válido
        const isTokenValid = await verifyUserToken();

        if (!isTokenValid) {
          console.error('Token inválido');
          await firebaseSignOut();
          setFirebaseUser(null);
          setUser(null);
          setSessionId(null);
          setLoading(false);

          // Redirigir al login con razón
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=invalid-token';
          }
          return;
        }

        // Cargar datos del usuario
        await loadUserData(fbUser);

        // Limitar sesiones
        await enforceSessionLimit(fbUser.uid);


        // Registrar nueva sesión
        try {

          let currentSessionId = getCurrentSessionId();


          if (!currentSessionId) {
            //No hay sesion guardada, asi que se crea una nueva
            const newSessionId = await registerSession(fbUser.uid);
            currentSessionId = newSessionId;
          } else {
            const updated = await updateSessionActivity();

            if (!updated) {
              //Si no se pudo actualizar, se crea una nueva sesion
              const newSessionId = await registerSession(fbUser.uid);
              currentSessionId = newSessionId;
            }
          }

          setSessionId(currentSessionId);

          // Limpiar sesiones antiguas (más de 7 días)
          await cleanupOldSessions(fbUser.uid);

          // Detectar sesiones sospechosas
          const suspiciousCheck = await detectSuspiciousSessions(fbUser.uid);

          if (suspiciousCheck.isSuspicious) {
            toast.warning('Alerta de seguridad', {
              description: suspiciousCheck.reason,
              duration: 10000,
            });
          }
        } catch (error) {
          console.error('[Auth] Error al registrar sesión');
        }
      } else {
        setUser(null);
        setSessionId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Revocar sesión actual antes de cerrar
      const currentSessionId = getCurrentSessionId();
      const userId = firebaseUser?.uid;
      if (currentSessionId && userId) {
        try {
          await revokeSession(userId, currentSessionId);

        } catch (error) {
          console.error('Error de sesion');
        }
      }

      await firebaseSignOut();
      setFirebaseUser(null);
      setUser(null);
      setSessionId(null);
    } catch (error) {
      console.error('Error signing out');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, sessionId, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
