import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface IdleTimeoutOptions {
  timeout?: number; // Milisegundos
  warningTime?: number; // Milisegundos antes del logout para mostrar advertencia
  onIdle?: () => void;
  events?: string[];
}

/**
 * Hook para manejar auto-logout por inactividad
 *
 * @param options - Configuración del timeout
 * @param options.timeout - Tiempo de inactividad en ms (default: 30 minutos)
 * @param options.warningTime - Tiempo antes del logout para advertir (default: 2 minutos)
 * @param options.onIdle - Callback cuando se detecta inactividad
 * @param options.events - Eventos a escuchar (default: mouse, keyboard, touch)
 *
 * @example
 * useIdleTimeout({ timeout: 30 * 60 * 1000 }); // 30 minutos
 */
export function useIdleTimeout(options: IdleTimeoutOptions = {}) {
  const { signOut, user } = useAuth();
  const timeoutId = useRef<NodeJS.Timeout | undefined>(undefined);
  const warningTimeoutId = useRef<NodeJS.Timeout | undefined>(undefined);

  const {
    timeout = 30 * 60 * 1000, // 30 minutos por defecto
    warningTime = 2 * 60 * 1000, // 2 minutos antes del logout
    onIdle,
    events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ]
  } = options;

  const resetTimer = () => {
    // Limpiar timeouts existentes
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    if (warningTimeoutId.current) {
      clearTimeout(warningTimeoutId.current);
    }

    // Calcular cuándo mostrar la advertencia
    const warningDelay = timeout - warningTime;

    // Configurar advertencia si hay tiempo suficiente
    if (warningDelay > 0) {
      warningTimeoutId.current = setTimeout(() => {
        const warningSeconds = Math.floor(warningTime / 1000);
        toast.warning(
          `Tu sesión expirará en ${Math.floor(warningSeconds / 60)} minutos por inactividad`,
          {
            duration: 10000,
            id: 'idle-warning', // ID único para evitar duplicados
          }
        );
      }, warningDelay);
    }

    // Configurar timeout de logout
    timeoutId.current = setTimeout(async () => {
      console.log('[Idle Timeout] Usuario inactivo, cerrando sesión...');

      toast.info('Sesión cerrada por inactividad', {
        duration: 5000,
      });

      // Ejecutar callback si existe
      if (onIdle) {
        onIdle();
      }

      // Cerrar sesión
      try {
        await signOut();
        // Redirigir con razón
        window.location.href = '/login?reason=timeout';
      } catch (error) {
        console.error('Error during idle logout:', error);
      }
    }, timeout);
  };

  useEffect(() => {
    // Solo activar si hay usuario logueado
    if (!user) return;

    // Configurar event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
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
  }, [timeout, user]); // Re-crear listeners si cambia el timeout o el usuario

  return { resetTimer };
}
