# Guía de Reglas de Firestore - Validación Completa

## Resumen

Este documento explica las reglas de seguridad de Firestore para producción, incluyendo todas las validaciones de datos.

---

## Archivos de Reglas Disponibles

### 1. `firestore-final.rules` (Desarrollo/Testing)
- **Uso:** Desarrollo y pruebas
- **Características:** Solo validación de autenticación y ownership (userId)
- **Pros:** Simple, fácil de debuggear
- **Contras:** No valida estructura de datos

### 2. `firestore-production-validated.rules` (Producción)
- **Uso:** Producción
- **Características:** Validación completa de datos + autenticación + ownership
- **Pros:** Máxima seguridad, previene datos corruptos
- **Contras:** Más complejo

---

## Estructura de las Reglas de Producción

### Helpers (Funciones Auxiliares)

```javascript
function isAuthenticated() {
  return request.auth != null;
}
```
- Verifica que el usuario esté autenticado
- Usada en TODAS las operaciones

```javascript
function isOwner(data) {
  return data.userId == request.auth.uid;
}
```
- Verifica que el documento pertenezca al usuario autenticado
- Previene acceso a datos de otros usuarios

---

## Validaciones por Colección

### Categories (Categorías)

```javascript
function isValidCategory(data) {
  return data.name is string &&
         data.name.size() > 0 &&
         data.name.size() <= 100 &&
         data.monthly_limit is number &&
         data.monthly_limit >= 0 &&
         data.monthly_limit < 1000000000 &&
         data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'] &&
         data.type in ['fixed', 'variable'] &&
         data.userId is string;
}
```

**Validaciones:**
- ✅ `name` debe ser string entre 1-100 caracteres
- ✅ `monthly_limit` debe ser número positivo menor a 1 billón
- ✅ `currency` debe ser una de las 6 monedas soportadas
- ✅ `type` debe ser 'fixed' o 'variable'
- ✅ `userId` debe ser string

**Campos opcionales permitidos:**
- `activeMonths` (array de números 0-11) - no se valida estrictamente

---

### Expenses (Gastos)

```javascript
function isValidExpense(data) {
  return data.amount is number &&
         data.amount > 0 &&
         data.amount < 1000000000 &&
         data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'] &&
         data.categoryId is path &&
         data.userId is string &&
         data.date is timestamp;
}
```

**Validaciones:**
- ✅ `amount` debe ser número positivo menor a 1 billón
- ✅ `currency` debe ser una de las 6 monedas soportadas
- ✅ `categoryId` debe ser un path/referencia (DocumentReference)
- ✅ `userId` debe ser string
- ✅ `date` debe ser timestamp

**Campos opcionales permitidos:**
- `note` (string) - no se valida estrictamente
- `installmentId` (path) - no se valida estrictamente

---

### Income (Ingresos)

```javascript
function isValidIncome(data) {
  return data.amount is number &&
         data.amount > 0 &&
         data.amount < 1000000000 &&
         data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'] &&
         data.source is string &&
         data.source.size() > 0 &&
         data.source.size() <= 100 &&
         data.userId is string &&
         data.receivedAt is timestamp;
}
```

**Validaciones:**
- ✅ `amount` debe ser número positivo menor a 1 billón
- ✅ `currency` debe ser una de las 6 monedas soportadas
- ✅ `source` debe ser string entre 1-100 caracteres
- ✅ `userId` debe ser string
- ✅ `receivedAt` debe ser timestamp

---

### Installments (Cuotas/Pagos a Plazos)

```javascript
function isValidInstallment(data) {
  return data.total_amount is number &&
         data.total_amount > 0 &&
         data.total_amount < 1000000000 &&
         data.installments is int &&
         data.installments > 0 &&
         data.installments <= 360 &&
         data.current_installment is int &&
         data.current_installment >= 0 &&
         data.current_installment <= data.installments &&
         data.monthly_amount is number &&
         data.monthly_amount > 0 &&
         data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'] &&
         data.description is string &&
         data.description.size() > 0 &&
         data.description.size() <= 500 &&
         data.userId is string &&
         data.category_id is path &&
         data.start_date is timestamp &&
         data.tax is number &&
         data.tax >= 0 &&
         data.tax <= 100;
}
```

**Validaciones:**
- ✅ `total_amount` debe ser número positivo menor a 1 billón
- ✅ `installments` debe ser entero positivo, máximo 360 (30 años)
- ✅ `current_installment` debe ser entero entre 0 y total de installments
- ✅ `monthly_amount` debe ser número positivo
- ✅ `currency` debe ser una de las 6 monedas soportadas
- ✅ `description` debe ser string entre 1-500 caracteres
- ✅ `userId` debe ser string
- ✅ `category_id` debe ser un path/referencia
- ✅ `start_date` debe ser timestamp
- ✅ `tax` debe ser número entre 0-100 (porcentaje)

---

### Goals (Metas de Ahorro)

```javascript
function isValidGoal(data) {
  return data.title is string &&
         data.title.size() > 0 &&
         data.title.size() <= 100 &&
         data.targetAmount is number &&
         data.targetAmount > 0 &&
         data.targetAmount < 1000000000 &&
         data.currentAmount is number &&
         data.currentAmount >= 0 &&
         data.currentAmount <= data.targetAmount &&
         data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'] &&
         data.userId is string &&
         data.dueDate is timestamp;
}
```

**Validaciones:**
- ✅ `title` debe ser string entre 1-100 caracteres
- ✅ `targetAmount` debe ser número positivo menor a 1 billón
- ✅ `currentAmount` debe ser número positivo y no exceder targetAmount
- ✅ `currency` debe ser una de las 6 monedas soportadas
- ✅ `userId` debe ser string
- ✅ `dueDate` debe ser timestamp

---

### Users (Usuarios)

```javascript
match /users/{userId} {
  allow read, create, update: if isAuthenticated() && request.auth.uid == userId;
  allow delete: if false;
}
```

**Reglas especiales:**
- ✅ Solo puede leer/crear/actualizar su propio documento
- ❌ **NO se permite eliminar usuarios** (solo Firebase Authentication puede hacerlo)
- ℹ️ No hay validación de estructura para flexibilidad

---

## Patrón de Reglas por Colección

Todas las colecciones (excepto users) siguen este patrón:

```javascript
match /collection/{docId} {
  // LEER: Solo si eres el owner
  allow read: if isAuthenticated() && isOwner(resource.data);

  // CREAR: Solo si eres el owner Y los datos son válidos
  allow create: if isAuthenticated() &&
                   isOwner(request.resource.data) &&
                   isValidCollection(request.resource.data);

  // ACTUALIZAR: Solo si eres el owner Y los datos son válidos
  allow update: if isAuthenticated() &&
                   isOwner(resource.data) &&
                   isValidCollection(request.resource.data);

  // ELIMINAR: Solo si eres el owner
  allow delete: if isAuthenticated() && isOwner(resource.data);
}
```

**Componentes:**
- `resource.data`: Los datos actuales en la base de datos
- `request.resource.data`: Los nuevos datos que se están enviando
- `request.auth.uid`: El ID del usuario autenticado

---

## Regla Catch-All (Seguridad Final)

```javascript
match /{document=**} {
  allow read, write: if false;
}
```

**Propósito:**
- Bloquea CUALQUIER acceso a documentos no explícitamente permitidos
- Previene acceso accidental a colecciones nuevas sin reglas
- Última línea de defensa

---

## Monedas Soportadas

Las siguientes monedas están permitidas en TODAS las validaciones:

- `CRC` - Costa Rica Colones
- `USD` - US Dollars
- `EUR` - Euros
- `MXN` - Mexican Pesos
- `COP` - Colombian Pesos
- `ARS` - Argentine Pesos

Para agregar nuevas monedas, debes actualizar TODAS las funciones de validación.

---

## Tipos de Datos en Firestore Rules

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `string` | Texto | `"Category name"` |
| `number` | Número (int o float) | `100.50` |
| `int` | Número entero | `12` |
| `bool` | Booleano | `true`, `false` |
| `timestamp` | Fecha/hora | `Timestamp.now()` |
| `path` | Referencia a documento | `DocumentReference` |
| `list` | Array | `[1, 2, 3]` |
| `map` | Objeto | `{key: "value"}` |

---

## Cómo Implementar en Producción

### Paso 1: Copiar las reglas

```bash
# Copia el contenido de firestore-production-validated.rules
```

### Paso 2: Ir a Firebase Console

1. Abre https://console.firebase.google.com
2. Selecciona tu proyecto: `expenses-app-96f13`
3. Ve a **Firestore Database** → **Reglas**

### Paso 3: Pegar y Publicar

1. Pega el contenido completo de `firestore-production-validated.rules`
2. Click en **Publicar**
3. Confirma que no hay errores de sintaxis

### Paso 4: Probar

Antes de publicar, usa el **Simulador de Reglas** en Firebase Console:

**Ejemplo de prueba - Crear categoría:**
```javascript
// Ubicación: /databases/(default)/documents/categories/test123
// Tipo: create
// Autenticado como: tu-user-id

// Datos:
{
  "name": "Comida",
  "monthly_limit": 500,
  "currency": "USD",
  "type": "variable",
  "userId": "tu-user-id"
}
```

Debe retornar: ✅ **Allow**

**Ejemplo de prueba - Crear categoría con datos inválidos:**
```javascript
{
  "name": "X".repeat(101), // Muy largo
  "monthly_limit": -100,    // Negativo
  "currency": "JPY",        // No soportada
  "type": "invalid",        // Tipo inválido
  "userId": "tu-user-id"
}
```

Debe retornar: ❌ **Deny**

---

## Debugging de Reglas

Si una operación falla con "permission denied":

### 1. Verifica autenticación
```javascript
console.log(auth.currentUser?.uid); // Debe mostrar un ID
```

### 2. Verifica ownership
```javascript
// El userId en los datos debe coincidir con el usuario autenticado
console.log({
  documentUserId: categoryData.userId,
  currentUserId: auth.currentUser.uid,
  match: categoryData.userId === auth.currentUser.uid
});
```

### 3. Verifica validación de datos
```javascript
// Revisa que TODOS los campos cumplan las validaciones
console.log({
  name: data.name.length, // Debe ser 1-100
  monthlyLimit: data.monthly_limit, // Debe ser >= 0
  currency: data.currency, // Debe estar en la lista
  type: data.type // Debe ser 'fixed' o 'variable'
});
```

### 4. Usa el simulador de Firebase

El simulador en Firebase Console te mostrará EXACTAMENTE qué regla está fallando.

---

## Mantenimiento

### Agregar una nueva moneda

Busca y reemplaza en el archivo de reglas:

```javascript
// ANTES:
data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS']

// DESPUÉS (ejemplo agregando JPY):
data.currency in ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'JPY']
```

Esto debe hacerse en:
- `isValidCategory` (línea ~26)
- `isValidExpense` (línea ~35)
- `isValidIncome` (línea ~45)
- `isValidInstallment` (línea ~65)
- `isValidGoal` (línea ~87)

### Agregar una nueva colección

Sigue el patrón existente:

```javascript
// 1. Crear función de validación
function isValidMiColeccion(data) {
  return data.campo1 is string &&
         data.campo2 is number &&
         data.userId is string;
}

// 2. Crear reglas
match /miColeccion/{docId} {
  allow read: if isAuthenticated() && isOwner(resource.data);
  allow create: if isAuthenticated() &&
                   isOwner(request.resource.data) &&
                   isValidMiColeccion(request.resource.data);
  allow update: if isAuthenticated() &&
                   isOwner(resource.data) &&
                   isValidMiColeccion(request.resource.data);
  allow delete: if isAuthenticated() && isOwner(resource.data);
}
```

---

## FAQ

### ¿Por qué no valido `createdAt` y `updatedAt`?

Estos campos se generan con `serverTimestamp()` en el cliente, por lo que Firestore los maneja automáticamente. No necesitan validación.

### ¿Por qué `categoryId` es `path` y no `string`?

Porque usas `DocumentReference` en TypeScript, que se traduce a tipo `path` en Firestore Rules.

### ¿Puedo tener reglas más estrictas?

Sí, puedes agregar validaciones adicionales:

```javascript
// Ejemplo: validar que activeMonths solo contenga números 0-11
function isValidCategory(data) {
  return /* validaciones existentes */ &&
         (!('activeMonths' in data) ||
          (data.activeMonths is list &&
           data.activeMonths.size() <= 12));
}
```

### ¿Qué pasa si agrego un campo nuevo sin validación?

Firestore permitirá el campo si:
1. Las validaciones existentes pasan
2. El campo es opcional (no requerido en la función de validación)

Si quieres BLOQUEAR campos no especificados:

```javascript
function hasOnlyAllowedKeys(data, allowedKeys) {
  return data.keys().hasOnly(allowedKeys);
}

function isValidCategory(data) {
  return hasOnlyAllowedKeys(data, ['uid', 'name', 'currency', 'monthly_limit', 'type', 'userId', 'createdAt', 'updatedAt', 'activeMonths']) &&
         /* otras validaciones */;
}
```

---

## Checklist de Producción

Antes de publicar las reglas validadas:

- [ ] Probado crear cada tipo de documento
- [ ] Probado leer cada tipo de documento
- [ ] Probado actualizar cada tipo de documento
- [ ] Probado eliminar cada tipo de documento
- [ ] Probado acceso con usuario no autenticado (debe fallar)
- [ ] Probado acceso a datos de otro usuario (debe fallar)
- [ ] Probado datos inválidos (debe fallar)
- [ ] Ejecutado pruebas en simulador de Firebase
- [ ] Respaldado reglas anteriores

---

## Contacto y Soporte

Si encuentras un error en las reglas:
1. Usa el simulador de Firebase para identificar la regla específica
2. Verifica los datos que estás enviando
3. Compara con los ejemplos de este documento
4. Revisa los logs de Firebase Console

**Última actualización:** 2025-11-23
