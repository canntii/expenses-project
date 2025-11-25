# Firebase Cloud Functions - Expenses Project

Este directorio contiene las Cloud Functions para la limpieza automática de sesiones inactivas.

## Funciones Implementadas

### 1. `cleanupInactiveSessions` (Scheduled)
- **Tipo:** Función programada (cron)
- **Frecuencia:** Cada 1 hora
- **Descripción:** Limpia automáticamente sesiones con `lastActive > 30 minutos`
- **Zona horaria:** America/Costa_Rica (configurable)

### 2. `cleanupInactiveSessionsManual` (HTTP)
- **Tipo:** Función HTTP
- **Método:** POST
- **Descripción:** Permite ejecutar la limpieza manualmente
- **Uso:** Para testing o limpieza bajo demanda

## Instalación

```bash
cd functions
npm install
```

## Desarrollo Local

### Compilar TypeScript
```bash
npm run build
```

### Compilar con watch mode
```bash
npm run build:watch
```

### Ejecutar en emulador local
```bash
npm run serve
```

## Deployment

### Deploy todas las functions
```bash
npm run deploy
```

### Deploy una función específica
```bash
firebase deploy --only functions:cleanupInactiveSessions
firebase deploy --only functions:cleanupInactiveSessionsManual
```

## Ver Logs

```bash
npm run logs
```

## Testing Manual

### Desde el navegador o Postman
```
POST https://[region]-[project-id].cloudfunctions.net/cleanupInactiveSessionsManual
```

### Response esperado
```json
{
  "success": true,
  "message": "5 sesiones inactivas eliminadas",
  "deletedCount": 5,
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

## Configuración Requerida

1. **Firebase CLI instalado:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Autenticación:**
   ```bash
   firebase login
   ```

3. **Inicializar proyecto (si no está inicializado):**
   ```bash
   firebase init functions
   ```

4. **Configurar proyecto:**
   ```bash
   firebase use --add
   ```

## Permisos Requeridos

La función requiere permisos de lectura/escritura en Firestore:
- `firestore.documents.read`
- `firestore.documents.delete`

Estos permisos se configuran automáticamente al desplegar Cloud Functions.

## Monitoreo

Para ver el estado de las funciones programadas:
1. Ve a Firebase Console
2. Functions → Logs
3. Filtra por `cleanupInactiveSessions`

## Notas Importantes

- La función programada se ejecuta **cada hora** automáticamente
- Las sesiones se consideran inactivas después de **30 minutos** sin actualizar `lastActive`
- El frontend actualiza `lastActive` cada **5 minutos** mientras el usuario está activo
- Las eliminaciones se realizan en batch para mejor rendimiento
- Los logs incluyen información detallada de cada sesión eliminada

## Costos

Cloud Functions en Firebase tiene un tier gratuito:
- 2 millones de invocaciones/mes
- 400,000 GB-segundos de tiempo de cómputo
- 200,000 GB-segundos de red saliente

Esta función está optimizada para mantenerse dentro del tier gratuito en la mayoría de casos de uso.
