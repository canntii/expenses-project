import DOMPurify from 'dompurify';

/**
 * Sanitiza strings para prevenir XSS
 * Elimina tags HTML y scripts maliciosos
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Configuración estricta: solo texto plano, sin HTML
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No permitir ningún tag HTML
    ALLOWED_ATTR: [], // No permitir atributos
    KEEP_CONTENT: true, // Mantener el contenido de texto
  });

  return clean.trim();
}

/**
 * Sanitiza y valida un email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Email inválido');
  }

  return sanitized.toLowerCase();
}

/**
 * Sanitiza números, asegurando que sean válidos
 */
export function sanitizeNumber(value: number | string | ''): number {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  return num;
}

/**
 * Valida y sanitiza longitud de strings
 */
export function sanitizeWithMaxLength(input: string, maxLength: number): string {
  const sanitized = sanitizeString(input);

  if (sanitized.length > maxLength) {
    throw new Error(`El texto excede el límite de ${maxLength} caracteres`);
  }

  return sanitized;
}

/**
 * Sanitiza un objeto completo recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as any;
    } else if (typeof value === 'number') {
      sanitized[key] = sanitizeNumber(value) as any;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value) as any;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Valida que un string no contenga caracteres potencialmente peligrosos
 */
export function validateSafeString(input: string): boolean {
  // Lista negra de patrones peligrosos
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Limita el tamaño de archivos o datos grandes
 */
export function validateDataSize(data: any, maxSizeKB: number = 100): boolean {
  const dataString = JSON.stringify(data);
  const sizeKB = new Blob([dataString]).size / 1024;

  return sizeKB <= maxSizeKB;
}
