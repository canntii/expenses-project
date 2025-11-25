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
    if (
      error.code === 'auth/user-token-expired' ||
      error.code === 'auth/user-disabled' ||
      error.code === 'auth/invalid-user-token'
    ) {
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
 * Valida el token antes de operaciones críticas
 * Retorna true si el token es válido, false si necesita logout
 */
export async function validateTokenForCriticalOperation(): Promise<boolean> {
  try {
    const isValid = await verifyUserToken();

    if (!isValid) {
      console.error('Token inválido detectado en operación crítica');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token for critical operation:', error);
    return false;
  }
}
