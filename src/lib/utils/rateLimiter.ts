// Rate limiter para prevenir ataques de fuerza bruta en el login

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// Configuración
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5; // Máximo 5 intentos
const BLOCK_DURATION_MS = 60 * 60 * 1000; // Bloqueado por 1 hora

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();

  /**
   * Verifica si un identificador (email) puede intentar hacer login
   * @param identifier - Email del usuario
   * @returns objeto con allowed (boolean) y retryAfter (segundos si está bloqueado)
   */
  checkLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // Primera vez intentando
    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Verificar si está bloqueado
    if (entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        return { allowed: false, retryAfter };
      }
      // El bloqueo expiró, resetear
      this.attempts.delete(identifier);
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Verificar si la ventana de tiempo expiró
    if (now - entry.firstAttempt > WINDOW_MS) {
      // Ventana expirada, resetear
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Incrementar contador
    entry.count++;

    // Verificar si excedió el límite
    if (entry.count > MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_DURATION_MS;
      const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Registra un login exitoso y limpia el contador
   * @param identifier - Email del usuario
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Obtiene información de los intentos de un identificador
   * @param identifier - Email del usuario
   */
  getAttemptInfo(identifier: string): { attempts: number; remainingAttempts: number } | null {
    const entry = this.attempts.get(identifier);
    if (!entry) {
      return null;
    }

    return {
      attempts: entry.count,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.count)
    };
  }

  /**
   * Limpia entradas expiradas (ejecutar periódicamente)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      // Eliminar si la ventana expiró y no está bloqueado
      if (!entry.blockedUntil && now - entry.firstAttempt > WINDOW_MS) {
        this.attempts.delete(key);
      }
      // Eliminar si el bloqueo expiró
      if (entry.blockedUntil && now > entry.blockedUntil) {
        this.attempts.delete(key);
      }
    }
  }
}

// Instancia singleton del rate limiter para login
export const loginRateLimiter = new RateLimiter();

// Limpiar entradas expiradas cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
