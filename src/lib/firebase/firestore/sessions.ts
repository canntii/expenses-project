import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../client';
import { se } from 'date-fns/locale';
import { getAuth } from 'firebase/auth';

export interface SessionData {
  userId: string;
  sessionId: string;
  deviceInfo: string;
  userAgent: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
}

/**
 * Genera un ID único para la sesión actual
 */
function generateSessionId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Obtiene información del dispositivo actual
 */
function getDeviceInfo(): string {
  const ua = navigator.userAgent.toLowerCase();

  // Detectar tipo de dispositivo
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';

  // Detectar sistema operativo
  if (/windows/i.test(ua)) return 'Desktop - Windows';
  if (/mac/i.test(ua)) return 'Desktop - Mac';
  if (/linux/i.test(ua)) return 'Desktop - Linux';

  return 'Desktop';
}


/**
 * Registra una nueva sesión
 */
export async function registerSession(userId: string): Promise<string> {
  try {
    const sessionId = generateSessionId();

    await addDoc(collection(db, 'activeSessions'), {
      userId,
      sessionId,
      deviceInfo: getDeviceInfo(),
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });

    // Guardar en localStorage para identificar esta sesión
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionId', sessionId);
    }

    

    return sessionId;
  } catch (error) {
    console.error('Error with Sessions');
    throw error;
  }
}

/**
 * Actualiza la última actividad de la sesión
 */
export async function updateSessionActivity(): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const sessionId = getCurrentSessionId();

    if (!user || !sessionId) {
      console.warn('[Sessions] updateSessionActivity: sin user o sin sessionId', {
        userId: user?.uid,
        sessionId,
      });
      return false;
    }

    const q = query(
      collection(db, 'activeSessions'),
      where('userId', '==', user.uid),
      where('sessionId', '==', sessionId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'activeSessions', sessionDoc.id), {
        lastActive: serverTimestamp(),
      });
      return true;
    } else {
      // opcional: limpiar el sessionId fantasma
      localStorage.removeItem('sessionId');
      return false;
    }
  } catch (error) {
    console.error('Error updating session activity');
    return false;
  }
}

/**
 * Obtiene todas las sesiones activas de un usuario
 */
export async function getUserSessions(userId: string): Promise<(SessionData & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'activeSessions'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as SessionData),
    }));
  } catch (error) {
    console.error('Error getting user sessions');
    return [];
  }
}

/**
 * Revoca una sesión específica
 */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'activeSessions'),
      where('userId', '==', userId),
      where('sessionId', '==', sessionId)
    );

    const snapshot = await getDocs(q);

    for (const sessionDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'activeSessions', sessionDoc.id));
    }

  } catch (error) {
    console.error('Error revoking session:', error);
    throw error;
  }
}


const MAX_SESSIONS_PER_USER = 5;
export async function enforceSessionLimit(userId: string): Promise<void> {
  try {
    const sessions = await getUserSessions(userId);
     
    if (sessions.length < MAX_SESSIONS_PER_USER){
      return;
    } 

    //Ordenar por lastActive mas viejas primero 
    const sorted = [...sessions].sort((a, b) => a.lastActive.toMillis() - b.lastActive.toMillis());

    const toRemoveCount = sessions.length - (MAX_SESSIONS_PER_USER - 1);
    const toRemove = sorted.slice(0, toRemoveCount);

    for (const session of toRemove) {
      await revokeSession(userId,session.sessionId);
    }
  } catch (error) {
    console.error('Hubo un error', error);
  }
}

/**
 * Revoca todas las sesiones de un usuario excepto la actual
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  try {
    const sessions = await getUserSessions(userId);
    const otherSessions = sessions.filter(s => s.sessionId !== currentSessionId);
    
    for (const session of otherSessions) {
      await revokeSession(userId, session.sessionId);
    }

    return otherSessions.length;
  } catch (error) {
    console.error('Error revoking other sessions:', error);
    return 0;
  }
}

/**
 * Detecta si hay sesiones sospechosas
 * Retorna true si se detecta actividad sospechosa
 */
export async function detectSuspiciousSessions(userId: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
  sessionCount: number;
}> {
  try {
    const sessions = await getUserSessions(userId);
    const sessionCount = sessions.length;

    // Alerta si hay más de 3 sesiones activas
    if (sessionCount > 3) {
      return {
        isSuspicious: true,
        reason: `Tienes ${sessionCount} sesiones activas. Se recomienda tener máximo 3.`,
        sessionCount,
      };
    }

    // Alerta si hay sesiones de dispositivos muy diferentes
    const deviceTypes = new Set(sessions.map(s => s.deviceInfo));
    if (deviceTypes.size > 2) {
      return {
        isSuspicious: true,
        reason: `Sesiones activas desde ${deviceTypes.size} tipos de dispositivos diferentes.`,
        sessionCount,
      };
    }

    return {
      isSuspicious: false,
      sessionCount,
    };
  } catch (error) {
    console.error('Error detecting suspicious sessions:', error);
    return {
      isSuspicious: false,
      sessionCount: 0,
    };
  }
}

/**
 * Limpia sesiones antiguas (más de 7 días inactivas)
 */
export async function cleanupOldSessions(userId: string ): Promise<number> {
  try {
    const sessions = await getUserSessions(userId);
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let cleaned = 0;

    for (const session of sessions) {
      const lastActive = session.lastActive.toMillis();

      if (lastActive < sevenDaysAgo) {
        await revokeSession(userId, session.sessionId);
        cleaned++;
      }
    }

    return cleaned;
  } catch (error) {
    console.error('Error with Sessions');
    return 0;
  }
}

/**
 * Obtiene el sessionId actual desde localStorage
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sessionId');
}
