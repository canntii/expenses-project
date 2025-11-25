# Seguridad de Tokens - Firebase Authentication

## Estado Actual: ⚠️ NECESITA MEJORAS

---

## 📊 Análisis del Sistema Actual

### ✅ Lo que ya tienes (Firebase por defecto)

Firebase Authentication **ya maneja automáticamente**:

1. **Tokens JWT** - Firmados criptográficamente
2. **Expiración automática** - Los tokens expiran después de 1 hora
3. **Refresh Tokens** - Se renuevan automáticamente en segundo plano
4. **Revocación básica** - Al hacer signOut(), los tokens se invalidan

### ⚠️ Lo que te falta

1. **Validación de token en cada operación crítica**
2. **Detección de sesiones concurrentes sospechosas**
3. **Revocación de sesiones remotas**
4. **Validación de estado del token en Firestore**
5. **Timeout por inactividad del usuario**
6. **Forzar re-autenticación para operaciones sensibles**

---

## 🔴 Problemas Críticos Identificados

### Problema 1: Sin validación de token en operaciones sensibles

**Escenario de ataque:**
1. Usuario inicia sesión y obtiene token
2. Admin revoca acceso del usuario en Firebase Console
3. El usuario **aún puede usar la app** hasta que el token expire (1 hora)

**Solución:** Validar token antes de operaciones críticas

---

### Problema 2: Sin timeout de inactividad

**Escenario de riesgo:**
1. Usuario deja sesión abierta en computadora compartida
2. Otra persona puede acceder a los datos
3. No hay cierre automático de sesión

**Solución:** Implementar auto-logout por inactividad

---

### Problema 3: Sin detección de sesiones múltiples

**Escenario de ataque:**
1. Credenciales comprometidas
2. Atacante inicia sesión desde otro dispositivo
3. Usuario legítimo no recibe ninguna alerta
4. Ambas sesiones permanecen activas

**Solución:** Detectar y alertar sobre sesiones concurrentes

---

## 🛠️ Soluciones Implementables

### Solución 1: Validación de Token y Forzar Re-autenticación

#### Archivo: [src/lib/firebase/tokenValidation.ts](src/lib/firebase/tokenValidation.ts)

```typescript
import { auth } from './client';
import { User } from 'firebase/auth';

/**
 * Verifica si el token del usuario es válido
 * Firebase automáticamente refresca tokens expirados
 */
export async function verifyUserToken(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    // Forzar refresh del token para obtener claims actualizados
    const token = await user.getIdToken(true);

    // Decodificar token (sin verificar firma, solo para leer claims)
    const decodedToken = await user.getIdTokenResult();

    // Verificar que el token no esté revocado
    // Firebase automáticamente lanza error si fue revocado
    return !!token && !!decodedToken;
  } catch (error: any) {
    console.error('Token verification failed:', error);

    // Si el token fue revocado o es inválido, cerrar sesión
    if (error.code === 'auth/user-token-expired' ||
        error.code === 'auth/user-disabled') {
      await auth.signOut();
    }

    return false;
  }
}

/**
 * Obtiene información del token actual
 */
export async function getTokenInfo() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult();

    return {
      issuedAt: new Date(tokenResult.issuedAtTime),
      expiresAt: new Date(tokenResult.expirationTime),
      authTime: new Date(tokenResult.authTime),
      signInProvider: tokenResult.signInProvider,
      claims: tokenResult.claims,
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
}

/**
 * Verifica si el usuario necesita re-autenticarse
 * Útil para operaciones sensibles (cambiar email, eliminar cuenta, etc.)
 */
export async function requiresRecentAuth(maxAgeMinutes: number = 5): Promise<boolean> {
  const tokenInfo = await getTokenInfo();
  if (!tokenInfo) return true;

  const authTime = tokenInfo.authTime.getTime();
  const now = Date.now();
  const ageMinutes = (now - authTime) / (1000 * 60);

  return ageMinutes > maxAgeMinutes;
}

/**
 * Fuerza al usuario a re-autenticarse
 */
export async function reauthenticateUser(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) return false;

  try {
    const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (error) {
    console.error('Re-authentication failed:', error);
    return false;
  }
}
```

---

### Solución 2: Auto-Logout por Inactividad

#### Archivo: [src/hooks/useIdleTimeout.ts](src/hooks/useIdleTimeout.ts)

```typescript
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface IdleTimeoutOptions {
  timeout: number; // Milisegundos
  onIdle?: () => void;
  events?: string[];
}

export function useIdleTimeout(options: IdleTimeoutOptions) {
  const { signOut } = useAuth();
  const timeoutId = useRef<NodeJS.Timeout>();
  const warningTimeoutId = useRef<NodeJS.Timeout>();

  const {
    timeout = 30 * 60 * 1000, // 30 minutos por defecto
    onIdle,
    events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  } = options;

  const resetTimer = () => {
    // Limpiar timeouts existentes
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    if (warningTimeoutId.current) {
      clearTimeout(warningTimeoutId.current);
    }

    // Advertencia 2 minutos antes del logout
    const warningTime = timeout - (2 * 60 * 1000);
    if (warningTime > 0) {
      warningTimeoutId.current = setTimeout(() => {
        toast.warning('Tu sesión expirará en 2 minutos por inactividad', {
          duration: 10000,
        });
      }, warningTime);
    }

    // Configurar nuevo timeout
    timeoutId.current = setTimeout(async () => {
      toast.info('Sesión cerrada por inactividad');

      if (onIdle) {
        onIdle();
      }

      // Cerrar sesión
      await signOut();

      // Redirigir con razón
      window.location.href = '/login?reason=timeout';
    }, timeout);
  };

  useEffect(() => {
    // Configurar event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      if (warningTimeoutId.current) {
        clearTimeout(warningTimeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout]);

  return { resetTimer };
}
```

#### Integración en Layout Principal

```typescript
// src/app/(dashboard)/layout.tsx
'use client';

import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Auto-logout después de 30 minutos de inactividad
  useIdleTimeout({
    timeout: 30 * 60 * 1000, // 30 minutos
  });

  return <div>{children}</div>;
}
```

---

### Solución 3: Detección de Sesiones Múltiples

#### Firestore Collection: `activeSessions`

```typescript
// src/lib/firebase/firestore/sessions.ts
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../client';

interface SessionData {
  userId: string;
  sessionId: string;
  deviceInfo: string;
  ipAddress?: string;
  userAgent: string;
  createdAt: any;
  lastActive: any;
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
  const ua = navigator.userAgent;

  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
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
    localStorage.setItem('sessionId', sessionId);

    return sessionId;
  } catch (error) {
    console.error('Error registering session:', error);
    throw error;
  }
}

/**
 * Actualiza la última actividad de la sesión
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'activeSessions'),
      where('sessionId', '==', sessionId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'activeSessions', sessionDoc.id), {
        lastActive: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

/**
 * Obtiene todas las sesiones activas de un usuario
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  try {
    const q = query(
      collection(db, 'activeSessions'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SessionData & { id: string }));
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

/**
 * Revoca una sesión específica
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'activeSessions'),
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

/**
 * Revoca todas las sesiones de un usuario excepto la actual
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  try {
    const sessions = await getUserSessions(userId);
    const otherSessions = sessions.filter(s => s.sessionId !== currentSessionId);

    for (const session of otherSessions) {
      await revokeSession(session.sessionId);
    }

    return otherSessions.length;
  } catch (error) {
    console.error('Error revoking other sessions:', error);
    return 0;
  }
}

/**
 * Detecta si hay sesiones sospechosas
 */
export async function detectSuspiciousSessions(userId: string): Promise<boolean> {
  try {
    const sessions = await getUserSessions(userId);

    // Alerta si hay más de 3 sesiones activas
    if (sessions.length > 3) {
      return true;
    }

    // Alerta si hay sesiones de dispositivos muy diferentes
    const deviceTypes = new Set(sessions.map(s => s.deviceInfo));
    if (deviceTypes.size > 2) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error detecting suspicious sessions:', error);
    return false;
  }
}
```

#### Firestore Security Rules para Sesiones

```javascript
// firestore-production-validated.rules
match /activeSessions/{sessionId} {
  // Solo permitir leer propias sesiones
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;

  // Solo permitir crear si el userId coincide
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

  // Solo permitir actualizar lastActive
  allow update: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid &&
                   request.resource.data.keys().hasOnly(['lastActive']);

  // Solo permitir eliminar propias sesiones
  allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

---

### Solución 4: Integración en AuthContext

```typescript
// src/contexts/AuthContext.tsx (actualizado)
import { registerSession, revokeSession, detectSuspiciousSessions } from '@/lib/firebase/firestore/sessions';
import { verifyUserToken } from '@/lib/firebase/tokenValidation';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Verificar token
        const isValid = await verifyUserToken();
        if (!isValid) {
          await signOut();
          return;
        }

        // Registrar sesión
        const newSessionId = await registerSession(fbUser.uid);
        setSessionId(newSessionId);

        // Detectar sesiones sospechosas
        const isSuspicious = await detectSuspiciousSessions(fbUser.uid);
        if (isSuspicious) {
          toast.warning('Se detectaron múltiples sesiones activas. Revisa tu actividad.', {
            duration: 10000,
          });
        }

        await loadUserData(fbUser);
      } else {
        // Limpiar sesión al logout
        if (sessionId) {
          await revokeSession(sessionId);
        }
        setUser(null);
        setSessionId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      if (sessionId) {
        await revokeSession(sessionId);
      }
      await firebaseSignOut();
      setFirebaseUser(null);
      setUser(null);
      setSessionId(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 📋 Checklist de Implementación

### Prioridad Alta (Implementar YA)
- [ ] **Auto-logout por inactividad** (30 minutos)
- [ ] **Validación de token en operaciones críticas**
- [ ] **Forzar re-autenticación para cambios de email/password**

### Prioridad Media (Implementar antes de producción)
- [ ] **Sistema de sesiones múltiples**
- [ ] **Detección de sesiones sospechosas**
- [ ] **Dashboard de sesiones activas**

### Prioridad Baja (Nice to have)
- [ ] **Notificación de nuevo inicio de sesión**
- [ ] **Geolocalización de sesiones**
- [ ] **Revocación masiva de sesiones desde admin**

---

## 🎯 Configuraciones Recomendadas

### Tiempos de Expiración

```typescript
// Configuración recomendada
const SECURITY_CONFIG = {
  // Auto-logout por inactividad
  idleTimeout: 30 * 60 * 1000, // 30 minutos

  // Advertencia antes del logout
  idleWarning: 2 * 60 * 1000, // 2 minutos antes

  // Re-autenticación requerida para operaciones sensibles
  reauthMaxAge: 5 * 60 * 1000, // 5 minutos

  // Máximo de sesiones concurrentes permitidas
  maxConcurrentSessions: 3,

  // Tiempo para limpiar sesiones inactivas
  sessionCleanupInterval: 24 * 60 * 60 * 1000, // 24 horas
};
```

---

## 🔒 Firebase Token Lifecycle (Automático)

Firebase ya maneja automáticamente:

1. **Emisión**: Token emitido al login (válido por 1 hora)
2. **Refresh**: Token se refresca automáticamente antes de expirar
3. **Revocación**: Al hacer signOut(), el token se invalida
4. **Validación**: Firebase valida firma y expiración en cada request

**Lo que Firebase NO hace automáticamente:**
- Timeout por inactividad
- Detección de sesiones múltiples
- Forzar re-autenticación para operaciones sensibles

---

## 📊 Comparación: Antes vs Después

| Característica | Antes | Después |
|----------------|-------|---------|
| Token expiration | ✅ 1 hora (auto) | ✅ 1 hora (auto) |
| Token refresh | ✅ Automático | ✅ Automático |
| Idle timeout | ❌ No | ✅ 30 minutos |
| Sesiones múltiples | ❌ No detecta | ✅ Detecta y alerta |
| Revocación remota | ❌ No | ✅ Sí |
| Re-auth sensible | ❌ No | ✅ Sí |
| Dashboard sesiones | ❌ No | ✅ Sí |

---

## ⏱️ Tiempo de Implementación

- **Auto-logout (Prioridad Alta)**: 1-2 horas
- **Validación de tokens**: 1 hora
- **Sistema de sesiones**: 3-4 horas
- **Dashboard de sesiones**: 2 horas

**Total:** 7-9 horas para implementación completa

---

## 🚨 Acción Inmediata Recomendada

1. **Implementar auto-logout** (CRÍTICO - 1 hora)
2. **Validar token en deletes** (ALTO - 30 min)
3. **Sistema de sesiones** (MEDIO - 3 horas)

¿Quieres que implemente alguna de estas soluciones ahora?
