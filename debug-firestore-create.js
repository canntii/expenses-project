// Script de debug para identificar qué campo está causando el problema
// Ejecutar con: node debug-firestore-create.js

const data = {
  uid: "test-uid-123",
  name: "Test Category",
  currency: "USD",
  monthly_limit: 500,
  type: "variable",
  userId: "vLUhrX3FVrS7BqBxekViAtWLn9p2",
  createdAt: { seconds: 1234567890, nanoseconds: 0 }, // Simula serverTimestamp()
  updatedAt: { seconds: 1234567890, nanoseconds: 0 }  // Simula serverTimestamp()
};

console.log("=== DATOS QUE ESTÁS ENVIANDO ===\n");
console.log(JSON.stringify(data, null, 2));

console.log("\n=== VALIDACIONES ===\n");

// Simular las validaciones de Firestore Rules
const checks = {
  "name is string": typeof data.name === 'string',
  "name.size() > 0": data.name.length > 0,
  "name.size() <= 100": data.name.length <= 100,
  "monthly_limit is number": typeof data.monthly_limit === 'number',
  "monthly_limit >= 0": data.monthly_limit >= 0,
  "monthly_limit < 1000000000": data.monthly_limit < 1000000000,
  "currency in [...]": ['CRC', 'USD', 'EUR', 'MXN', 'COP', 'ARS'].includes(data.currency),
  "type in [...]": ['fixed', 'variable'].includes(data.type),
  "userId is string": typeof data.userId === 'string',
  "uid is string (optional)": !('uid' in data) || typeof data.uid === 'string',
  "activeMonths is list (optional)": !('activeMonths' in data) || Array.isArray(data.activeMonths)
};

let allPassed = true;
Object.entries(checks).forEach(([check, passed]) => {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check}`);
  if (!passed) allPassed = false;
});

console.log("\n=== CAMPOS EXTRAS ===\n");
const expectedFields = ['uid', 'name', 'currency', 'monthly_limit', 'type', 'userId', 'createdAt', 'updatedAt', 'activeMonths'];
const actualFields = Object.keys(data);
const extraFields = actualFields.filter(f => !expectedFields.includes(f));

if (extraFields.length > 0) {
  console.log("❌ Campos no esperados:", extraFields);
} else {
  console.log("✅ No hay campos extras");
}

console.log("\n=== RESULTADO FINAL ===\n");
if (allPassed && extraFields.length === 0) {
  console.log("✅ TODAS LAS VALIDACIONES PASAN - El problema debe ser otro");
} else {
  console.log("❌ HAY PROBLEMAS CON LOS DATOS");
}

console.log("\n=== POSIBLES CAUSAS ===\n");
console.log("1. Los campos createdAt/updatedAt con serverTimestamp() pueden causar problemas");
console.log("2. Verifica que el userId coincida con request.auth.uid");
console.log("3. Revisa la consola de Firebase para ver el error exacto");
