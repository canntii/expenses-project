import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin (solo una vez en el proyecto)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function que se ejecuta cada hora para limpiar sesiones inactivas
 * Elimina sesiones cuyo lastActive sea mayor a 30 minutos
 *
 * Configuración en Firebase:
 * - Se ejecuta cada hora automáticamente
 * - No requiere autenticación (es una función programada)
 */
export const cleanupInactiveSessions = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/Costa_Rica') // Ajusta según tu zona horaria
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const thirtyMinutesAgo = new Date(now.toMillis() - 30 * 60 * 1000);

    console.log('[Cleanup] Iniciando limpieza de sesiones inactivas...');
    console.log('[Cleanup] Fecha límite:', thirtyMinutesAgo.toISOString());

    try {
      // Buscar sesiones con lastActive mayor a 30 minutos
      const inactiveSessionsSnapshot = await db
        .collection('activeSessions')
        .where('lastActive', '<', admin.firestore.Timestamp.fromDate(thirtyMinutesAgo))
        .get();

      if (inactiveSessionsSnapshot.empty) {
        console.log('[Cleanup] No hay sesiones inactivas para limpiar');
        return null;
      }

      console.log(`[Cleanup] Encontradas ${inactiveSessionsSnapshot.size} sesiones inactivas`);

      // Eliminar sesiones en batch para mejor rendimiento
      const batch = db.batch();
      let deletedCount = 0;

      inactiveSessionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`[Cleanup] Eliminando sesión: ${data.sessionId} - userId: ${data.userId} - lastActive: ${data.lastActive.toDate().toISOString()}`);
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();

      console.log(`[Cleanup] ${deletedCount} sesiones inactivas eliminadas exitosamente`);

      return {
        success: true,
        deletedCount,
        timestamp: now.toDate().toISOString(),
      };
    } catch (error) {
      console.error('[Cleanup] Error al limpiar sesiones:', error);
      throw error;
    }
  });

/**
 * Cloud Function HTTP para limpieza manual de sesiones inactivas
 * Útil para testing o limpieza bajo demanda
 *
 * Uso: POST https://[region]-[project-id].cloudfunctions.net/cleanupInactiveSessionsManual
 */
export const cleanupInactiveSessionsManual = functions.https.onRequest(async (req, res) => {
  // Validar que solo se permita desde el dominio del proyecto (opcional)
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-project-domain.com', // Reemplazar con tu dominio
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const now = admin.firestore.Timestamp.now();
  const thirtyMinutesAgo = new Date(now.toMillis() - 30 * 60 * 1000);

  try {
    const inactiveSessionsSnapshot = await db
      .collection('activeSessions')
      .where('lastActive', '<', admin.firestore.Timestamp.fromDate(thirtyMinutesAgo))
      .get();

    if (inactiveSessionsSnapshot.empty) {
      res.status(200).json({
        success: true,
        message: 'No hay sesiones inactivas para limpiar',
        deletedCount: 0,
      });
      return;
    }

    const batch = db.batch();
    let deletedCount = 0;

    inactiveSessionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: `${deletedCount} sesiones inactivas eliminadas`,
      deletedCount,
      timestamp: now.toDate().toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup Manual] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al limpiar sesiones',
    });
  }
});
