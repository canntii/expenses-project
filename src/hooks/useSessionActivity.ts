import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateSessionActivity, getCurrentSessionId } from '@/lib/firebase/firestore/sessions';

/**
 * Hook que actualiza periódicamente el campo lastActive de la sesión
 * para mantener sincronizado el estado de actividad en Firestore
 *
 * @param updateInterval - Intervalo de actualización en ms (default: 5 minutos)
 */
export function useSessionActivity(updateInterval: number = 5 * 60 * 1000) {
  const { user } = useAuth();

  useEffect(() => {
    // Solo ejecutar si hay usuario autenticado
    if (!user) return;

    const sessionId = getCurrentSessionId();
    if (!sessionId) return;
    // Actualizar inmediatamente
    updateSessionActivity().catch(error => {
      console.error('[Session Activity] Error en actualización');
    });

    // Configurar intervalo de actualización
    const intervalId = setInterval(async () => {
      try {
        await updateSessionActivity();
      } catch (error) {
        console.error('[Session Activity] Error al actualizar');
      }
    }, updateInterval);

    // Cleanup al desmontar
    return () => {
      clearInterval(intervalId);
    };
  }, [user, updateInterval]);
}
