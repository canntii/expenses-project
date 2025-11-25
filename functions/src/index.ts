/**
 * Firebase Cloud Functions para Expenses Project
 *
 * Funciones implementadas:
 * - cleanupInactiveSessions: Limpieza automática cada hora de sesiones inactivas >30 min
 * - cleanupInactiveSessionsManual: Endpoint HTTP para limpieza manual
 */

export { cleanupInactiveSessions, cleanupInactiveSessionsManual } from './cleanupInactiveSessions';
