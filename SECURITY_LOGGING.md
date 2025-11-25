# Sistema de Logging de Seguridad

## Resumen

Este documento explica cómo implementar un sistema completo de logging de seguridad para tu aplicación de finanzas personales. El logging de seguridad te permite:

- Detectar actividad sospechosa
- Investigar incidentes de seguridad
- Cumplir con requisitos de auditoría
- Monitorear el uso de la aplicación

---

## Arquitectura de Logging

### Tipos de Logs

1. **Audit Logs (Logs de Auditoría)**: Quién hizo qué y cuándo
2. **Security Logs (Logs de Seguridad)**: Intentos de acceso, fallos de autenticación
3. **Error Logs (Logs de Errores)**: Errores de aplicación con contexto
4. **Performance Logs (Logs de Rendimiento)**: Operaciones lentas o problemáticas

---

## Implementación Paso a Paso

### Paso 1: Estructura de Datos en Firestore

Crea una colección `auditLogs` y `securityEvents` en Firestore.

#### Tipos TypeScript

Crea [src/lib/types/logging.ts](src/lib/types/logging.ts):

```typescript
import { Timestamp } from 'firebase/firestore';

export type AuditAction =
  // Autenticación
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password.reset'
  // Categorías
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'category.view'
  // Gastos
  | 'expense.create'
  | 'expense.update'
  | 'expense.delete'
  | 'expense.view'
  // Ingresos
  | 'income.create'
  | 'income.update'
  | 'income.delete'
  | 'income.view'
  // Cuotas
  | 'installment.create'
  | 'installment.update'
  | 'installment.delete'
  | 'installment.pay'
  // Objetivos
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'goal.progress';

export type SecurityEventType =
  | 'suspicious.activity'
  | 'rate.limit.exceeded'
  | 'unauthorized.access.attempt'
  | 'invalid.token'
  | 'csrf.detected'
  | 'xss.attempt'
  | 'sql.injection.attempt'
  | 'data.breach.attempt';

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  // Identificadores
  userId: string;
  userEmail?: string;

  // Acción
  action: AuditAction;
  resourceType: string; // 'category', 'expense', etc.
  resourceId?: string;

  // Contexto
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  // Información técnica
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;

  // Timestamp
  timestamp: Timestamp;
}

export interface SecurityEvent {
  // Identificadores
  userId?: string; // Puede ser null si es un usuario no autenticado
  sessionId?: string;

  // Evento
  eventType: SecurityEventType;
  severity: LogLevel;
  description: string;

  // Contexto
  metadata?: Record<string, any>;
  stackTrace?: string;

  // Información técnica
  ipAddress?: string;
  userAgent?: string;
  requestUrl?: string;
  requestMethod?: string;

  // Timestamp
  timestamp: Timestamp;

  // Respuesta
  resolved?: boolean;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
}

export interface ErrorLog {
  // Identificadores
  userId?: string;
  sessionId?: string;

  // Error
  errorType: string;
  errorMessage: string;
  stackTrace?: string;

  // Contexto
  operation?: string;
  metadata?: Record<string, any>;

  // Información técnica
  userAgent?: string;
  url?: string;

  // Timestamp
  timestamp: Timestamp;
}
```

---

### Paso 2: Sistema de Logging

Crea [src/lib/firebase/firestore/logging.ts](src/lib/firebase/firestore/logging.ts):

```typescript
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../client';
import {
  AuditLogEntry,
  SecurityEvent,
  ErrorLog,
  AuditAction,
  SecurityEventType,
  LogLevel,
} from '@/lib/types/logging';

/**
 * Registra un evento de auditoría
 */
export const logAuditEvent = async (
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // No fallar la operación principal si el logging falla
    console.error('[Audit Log Failed]', error);
  }
};

/**
 * Registra un evento de seguridad
 */
export const logSecurityEvent = async (
  event: Omit<SecurityEvent, 'timestamp'>
): Promise<void> => {
  try {
    await addDoc(collection(db, 'securityEvents'), {
      ...event,
      timestamp: serverTimestamp(),
      resolved: false,
    });

    // Si es crítico, también enviar notificación (puedes implementar esto)
    if (event.severity === 'critical') {
      console.error('[CRITICAL SECURITY EVENT]', event);
      // TODO: Enviar email/SMS a administradores
    }
  } catch (error) {
    console.error('[Security Log Failed]', error);
  }
};

/**
 * Registra un error de aplicación
 */
export const logError = async (
  error: unknown,
  context?: {
    userId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> => {
  try {
    const errorLog: Omit<ErrorLog, 'timestamp'> = {
      userId: context?.userId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace:
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.stack
          : undefined,
      operation: context?.operation,
      metadata: context?.metadata,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    await addDoc(collection(db, 'errorLogs'), {
      ...errorLog,
      timestamp: serverTimestamp(),
    });
  } catch (logError) {
    console.error('[Error Log Failed]', logError);
  }
};

/**
 * Obtiene los logs de auditoría de un usuario
 */
export const getUserAuditLogs = async (
  userId: string,
  limitCount: number = 50
): Promise<AuditLogEntry[]> => {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as AuditLogEntry),
      timestamp: doc.data().timestamp as Timestamp,
    }));
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
};

/**
 * Obtiene eventos de seguridad sin resolver
 */
export const getUnresolvedSecurityEvents = async (): Promise<SecurityEvent[]> => {
  try {
    const q = query(
      collection(db, 'securityEvents'),
      where('resolved', '==', false),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as SecurityEvent),
      timestamp: doc.data().timestamp as Timestamp,
    }));
  } catch (error) {
    console.error('Failed to fetch security events:', error);
    return [];
  }
};

/**
 * Detecta actividad sospechosa (múltiples fallos de login)
 */
export const detectSuspiciousActivity = async (
  userId: string
): Promise<boolean> => {
  try {
    // Buscar últimos 10 eventos de login en los últimos 15 minutos
    const fifteenMinutesAgo = Timestamp.fromDate(
      new Date(Date.now() - 15 * 60 * 1000)
    );

    const q = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      where('action', '==', 'auth.login.failure'),
      where('timestamp', '>=', fifteenMinutesAgo),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(q);

    // Si hay 5 o más fallos en 15 minutos, es sospechoso
    if (snapshot.docs.length >= 5) {
      await logSecurityEvent({
        userId,
        eventType: 'suspicious.activity',
        severity: 'warning',
        description: `${snapshot.docs.length} failed login attempts in 15 minutes`,
        metadata: {
          failedAttempts: snapshot.docs.length,
          timeWindow: '15m',
        },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to detect suspicious activity:', error);
    return false;
  }
};
```

---

### Paso 3: Integración en AuthContext

Actualiza [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx):

```typescript
import {
  logAuditEvent,
  logSecurityEvent,
  detectSuspiciousActivity,
} from '@/lib/firebase/firestore/logging';
import { serverTimestamp } from 'firebase/firestore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Login con logging
  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmail(email, password);

      // ✅ Log exitoso
      await logAuditEvent({
        userId: result.uid,
        userEmail: result.email || undefined,
        action: 'auth.login.success',
        resourceType: 'user',
        resourceId: result.uid,
        metadata: {
          method: 'email',
        },
        userAgent: navigator.userAgent,
      });

      return result;
    } catch (error: any) {
      // ❌ Log fallo
      await logAuditEvent({
        userId: email, // Usar email como identificador
        userEmail: email,
        action: 'auth.login.failure',
        resourceType: 'user',
        metadata: {
          method: 'email',
          errorCode: error.code,
          errorMessage: error.message,
        },
        userAgent: navigator.userAgent,
      });

      // Detectar actividad sospechosa
      const isSuspicious = await detectSuspiciousActivity(email);
      if (isSuspicious) {
        throw new Error(
          'Múltiples intentos de login fallidos. Tu cuenta ha sido temporalmente bloqueada.'
        );
      }

      throw error;
    }
  };

  // Logout con logging
  const logout = async () => {
    if (!user) return;

    try {
      await logAuditEvent({
        userId: user.uid,
        userEmail: user.email || undefined,
        action: 'auth.logout',
        resourceType: 'user',
        resourceId: user.uid,
        userAgent: navigator.userAgent,
      });

      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Signup con logging
  const signup = async (email: string, password: string, name: string) => {
    try {
      const result = await signUpWithEmail(email, password, name);

      await logAuditEvent({
        userId: result.uid,
        userEmail: result.email || undefined,
        action: 'auth.signup',
        resourceType: 'user',
        resourceId: result.uid,
        metadata: {
          method: 'email',
          displayName: name,
        },
        userAgent: navigator.userAgent,
      });

      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### Paso 4: Logging en Operaciones CRUD

Ejemplo para [src/lib/firebase/firestore/categories.ts](src/lib/firebase/firestore/categories.ts):

```typescript
import { logAuditEvent, logError } from './logging';

export const createCategoryDocument = async (
  data: CreateCategoryData,
  uid: string
): Promise<Category> => {
  try {
    const categoryRef = doc(db, 'categories', uid);
    const categoryData: Category = {
      uid,
      name: data.name,
      currency: data.currency,
      monthly_limit: data.monthly_limit,
      type: data.type,
      userId: data.userId,
      activeMonths: data.activeMonths || [],
    };

    await setDoc(categoryRef, categoryData);

    // ✅ Log de auditoría
    await logAuditEvent({
      userId: data.userId,
      action: 'category.create',
      resourceType: 'category',
      resourceId: uid,
      metadata: {
        categoryName: data.name,
        type: data.type,
        monthlyLimit: data.monthly_limit,
      },
    });

    return categoryData;
  } catch (error) {
    // ❌ Log de error
    await logError(error, {
      userId: data.userId,
      operation: 'createCategory',
      metadata: { categoryUid: uid },
    });

    throw error;
  }
};

export const updateCategoryDocument = async (
  uid: string,
  data: UpdateCategoryData
): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', uid);

    // Obtener datos anteriores para el log
    const beforeSnapshot = await getDoc(categoryRef);
    const beforeData = beforeSnapshot.data();

    await updateDoc(categoryRef, data);

    // ✅ Log con cambios
    await logAuditEvent({
      userId: data.userId || beforeData?.userId,
      action: 'category.update',
      resourceType: 'category',
      resourceId: uid,
      changes: {
        before: beforeData,
        after: data,
      },
      metadata: {
        fieldsChanged: Object.keys(data),
      },
    });
  } catch (error) {
    await logError(error, {
      operation: 'updateCategory',
      metadata: { categoryUid: uid },
    });

    throw error;
  }
};

export const deleteCategoryDocument = async (uid: string): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', uid);

    // Obtener datos antes de eliminar
    const beforeSnapshot = await getDoc(categoryRef);
    const beforeData = beforeSnapshot.data();

    await deleteDoc(categoryRef);

    // ✅ Log de eliminación
    await logAuditEvent({
      userId: beforeData?.userId,
      action: 'category.delete',
      resourceType: 'category',
      resourceId: uid,
      metadata: {
        deletedCategory: beforeData,
      },
    });
  } catch (error) {
    await logError(error, {
      operation: 'deleteCategory',
      metadata: { categoryUid: uid },
    });

    throw error;
  }
};
```

---

### Paso 5: Firestore Security Rules para Logs

Actualiza [firestore-production-validated.rules](firestore-production-validated.rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Audit Logs - solo lectura para el usuario
    match /auditLogs/{logId} {
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;
      allow write: if false; // Solo el cliente puede escribir, no modificar
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;
    }

    // Security Events - solo admin puede leer
    match /securityEvents/{eventId} {
      allow read: if false; // Solo admin via Admin SDK
      allow write: if false; // Solo backend
      allow create: if isAuthenticated(); // Permitir reportar eventos
    }

    // Error Logs - solo escritura
    match /errorLogs/{errorId} {
      allow read: if false; // Solo admin via Admin SDK
      allow write: if false;
      allow create: if isAuthenticated(); // Permitir reportar errores
    }
  }
}
```

---

### Paso 6: Dashboard de Logs (Opcional)

Crea una página para ver los logs: [src/app/(dashboard)/security/page.tsx](src/app/(dashboard)/security/page.tsx):

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAuditLogs } from '@/lib/firebase/firestore/logging';
import { AuditLogEntry } from '@/lib/types/logging';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SecurityLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserAuditLogs(user.uid, 100).then((logs) => {
        setLogs(logs);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Registro de Actividad</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recurso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(log.timestamp.toDate(), 'PPp', { locale: es })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      log.action.includes('delete')
                        ? 'bg-red-100 text-red-800'
                        : log.action.includes('create')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.resourceType}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.metadata && (
                    <details>
                      <summary className="cursor-pointer">Ver detalles</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Resumen de Implementación

| Componente | Archivo | Tiempo | Prioridad |
|------------|---------|--------|-----------|
| Tipos de logging | `src/lib/types/logging.ts` | 30 min | Alta |
| Sistema de logging | `src/lib/firebase/firestore/logging.ts` | 2 horas | Alta |
| Integración en Auth | `src/contexts/AuthContext.tsx` | 1 hora | Alta |
| Logging en CRUD | Todos los archivos `firestore/*.ts` | 3 horas | Media |
| Firestore Rules | `firestore-production-validated.rules` | 30 min | Alta |
| Dashboard de logs | `src/app/(dashboard)/security/page.tsx` | 2 horas | Baja |

**Total estimado: 7-9 horas**

---

## Mejores Prácticas

### ✅ DO (Hacer)
- Log todas las acciones de autenticación (éxito y fallo)
- Log operaciones de creación, actualización y eliminación
- Incluir contexto suficiente (userId, timestamp, metadata)
- Detectar y alertar sobre actividad sospechosa
- Mantener logs por al menos 90 días

### ❌ DON'T (No hacer)
- NO registrar passwords o tokens en los logs
- NO registrar información de tarjetas de crédito
- NO registrar PII (Personally Identifiable Information) innecesaria
- NO fallar operaciones si el logging falla
- NO permitir que usuarios eliminen sus propios logs

---

## Monitoreo y Alertas

### Eventos que deben generar alertas inmediatas:

1. **Múltiples intentos de login fallidos** (5+ en 15 minutos)
2. **Acceso desde ubicaciones inusuales** (requiere IP geolocation)
3. **Eliminación masiva de datos** (10+ registros en 5 minutos)
4. **Intentos de XSS o SQL injection**
5. **Acceso a recursos de otros usuarios**

### Ejemplo de detector de eliminación masiva:

```typescript
export const detectMassDeletion = async (userId: string): Promise<boolean> => {
  try {
    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));

    const q = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      where('action', 'in', [
        'category.delete',
        'expense.delete',
        'income.delete',
        'installment.delete',
      ]),
      where('timestamp', '>=', fiveMinutesAgo)
    );

    const snapshot = await getDocs(q);

    if (snapshot.docs.length >= 10) {
      await logSecurityEvent({
        userId,
        eventType: 'suspicious.activity',
        severity: 'critical',
        description: `Mass deletion detected: ${snapshot.docs.length} items in 5 minutes`,
        metadata: {
          deletionCount: snapshot.docs.length,
          timeWindow: '5m',
        },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to detect mass deletion:', error);
    return false;
  }
};
```

---

## Próximos Pasos

1. **Implementa los tipos y funciones básicas de logging** (2-3 horas)
2. **Integra logging en AuthContext** (1 hora)
3. **Agrega logging a operaciones CRUD críticas** (3 horas)
4. **Configura Firestore Rules para logs** (30 min)
5. **Opcional: Crea dashboard de visualización** (2 horas)

¿Quieres que implemente alguna parte específica del sistema de logging?
