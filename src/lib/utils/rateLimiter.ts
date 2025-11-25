// Rate limiter para prevenir ataques de fuerza bruta en el login
// y rate limiting para operaciones CRUD

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

// Configuración para LOGIN
const LOGIN_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxAttempts: 5, // Máximo 5 intentos
  blockDurationMs: 60 * 60 * 1000, // Bloqueado por 1 hora
};

// Configuraciones para operaciones CRUD
const CRUD_CONFIGS: Record<string, RateLimitConfig> = {
  create: {
    windowMs: 60 * 1000, // 1 minuto
    maxAttempts: 10, // Máximo 10 creaciones por minuto
    blockDurationMs: 5 * 60 * 1000, // Bloquear por 5 minutos
  },
  update: {
    windowMs: 60 * 1000, // 1 minuto
    maxAttempts: 20, // Máximo 20 actualizaciones por minuto
    blockDurationMs: 3 * 60 * 1000, // Bloquear por 3 minutos
  },
  delete: {
    windowMs: 60 * 1000, // 1 minuto
    maxAttempts: 5, // Máximo 5 eliminaciones por minuto
    blockDurationMs: 10 * 60 * 1000, // Bloquear por 10 minutos
  },
};

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Verifica si un identificador puede realizar la operación
   * @param identifier - Identificador único (email para login, userId para CRUD)
   * @returns objeto con allowed (boolean), retryAfter y remaining
   */
  checkLimit(identifier: string): { allowed: boolean; retryAfter?: number; remaining?: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // Primera vez intentando
    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return {
        allowed: true,
        remaining: this.config.maxAttempts - 1
      };
    }

    // Verificar si está bloqueado
    if (entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        return { allowed: false, retryAfter, remaining: 0 };
      }
      // El bloqueo expiró, resetear
      this.attempts.delete(identifier);
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return {
        allowed: true,
        remaining: this.config.maxAttempts - 1
      };
    }

    // Verificar si la ventana de tiempo expiró
    if (now - entry.firstAttempt > this.config.windowMs) {
      // Ventana expirada, resetear
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return {
        allowed: true,
        remaining: this.config.maxAttempts - 1
      };
    }

    // Incrementar contador
    entry.count++;

    // Verificar si excedió el límite
    if (entry.count > this.config.maxAttempts) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
      return { allowed: false, retryAfter, remaining: 0 };
    }

    return {
      allowed: true,
      remaining: this.config.maxAttempts - entry.count
    };
  }

  /**
   * Registra una operación exitosa y limpia el contador
   * @param identifier - Identificador único
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Obtiene información de los intentos de un identificador
   * @param identifier - Identificador único
   */
  getAttemptInfo(identifier: string): { attempts: number; remainingAttempts: number } | null {
    const entry = this.attempts.get(identifier);
    if (!entry) {
      return null;
    }

    return {
      attempts: entry.count,
      remainingAttempts: Math.max(0, this.config.maxAttempts - entry.count)
    };
  }

  /**
   * Limpia entradas expiradas (ejecutar periódicamente)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      // Eliminar si la ventana expiró y no está bloqueado
      if (!entry.blockedUntil && now - entry.firstAttempt > this.config.windowMs) {
        this.attempts.delete(key);
      }
      // Eliminar si el bloqueo expiró
      if (entry.blockedUntil && now > entry.blockedUntil) {
        this.attempts.delete(key);
      }
    }
  }
}

// Instancias singleton de rate limiters
export const loginRateLimiter = new RateLimiter(LOGIN_CONFIG);
export const createRateLimiter = new RateLimiter(CRUD_CONFIGS.create);
export const updateRateLimiter = new RateLimiter(CRUD_CONFIGS.update);
export const deleteRateLimiter = new RateLimiter(CRUD_CONFIGS.delete);

// Limpiar entradas expiradas cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
    createRateLimiter.cleanup();
    updateRateLimiter.cleanup();
    deleteRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
