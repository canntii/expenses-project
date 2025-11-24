import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ===== Content Security Policy =====
  // Define qué recursos pueden ser cargados y desde dónde
  const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline'
    https://www.gstatic.com
    https://www.google.com
    https://accounts.google.com
    https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https: http:;
  font-src 'self' data: https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  frame-src
    'self'
    https://accounts.google.com
    https://www.google.com
    https://apis.google.com
    https://expenses-455bc.firebaseapp.com
    https://*.firebaseapp.com;
  connect-src 'self'
    https://*.firebaseio.com
    https://*.googleapis.com
    https://identitytoolkit.googleapis.com
    https://securetoken.googleapis.com
    https://firestore.googleapis.com
    wss://*.firebaseio.com;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // ===== X-Frame-Options =====
  // Previene que tu sitio sea embebido en un iframe (clickjacking)
  response.headers.set('X-Frame-Options', 'DENY');

  // ===== X-Content-Type-Options =====
  // Previene MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // ===== X-XSS-Protection =====
  // Activa la protección XSS del navegador (legacy pero no hace daño)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // ===== Referrer-Policy =====
  // Controla cuánta información del referrer se envía
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ===== Permissions-Policy =====
  // Controla qué features del navegador pueden ser usadas
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // ===== Strict-Transport-Security =====
  // Solo en producción: Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

// Aplicar middleware a todas las rutas
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
