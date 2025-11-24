/**
 * Script de migración de datos de Firestore
 * Este script actualiza todos los documentos para asegurar que tengan el campo userId correcto
 *
 * EJECUTAR SOLO UNA VEZ
 */

import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/client';

export async function migrateFirestoreData(userId: string) {
  console.log('🔄 Iniciando migración de datos...');

  const collections = ['categories', 'expenses', 'income', 'installments', 'goals'];
  const userRef = doc(db, 'users', userId);

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const collectionName of collections) {
    console.log(`\n📦 Verificando colección: ${collectionName}`);

    try {
      const snapshot = await getDocs(collection(db, collectionName));
      console.log(`   Encontrados ${snapshot.size} documentos`);

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;

        // Verificar si tiene user_id en lugar de userId
        if (data.user_id && !data.userId) {
          console.log(`   ⚠️  ${docId}: Tiene user_id, actualizando a userId...`);
          try {
            await updateDoc(doc(db, collectionName, docId), {
              userId: userRef,
              user_id: null // Eliminar el campo antiguo
            });
            totalUpdated++;
            console.log(`   ✅ ${docId}: Actualizado`);
          } catch (error) {
            console.error(`   ❌ ${docId}: Error al actualizar`, error);
            totalErrors++;
          }
        }

        // Verificar si userId es una referencia válida
        else if (data.userId) {
          const isReference = data.userId?.path !== undefined;
          if (!isReference) {
            console.log(`   ⚠️  ${docId}: userId no es una referencia válida, corrigiendo...`);
            try {
              await updateDoc(doc(db, collectionName, docId), {
                userId: userRef
              });
              totalUpdated++;
              console.log(`   ✅ ${docId}: Actualizado`);
            } catch (error) {
              console.error(`   ❌ ${docId}: Error al actualizar`, error);
              totalErrors++;
            }
          } else {
            console.log(`   ✓  ${docId}: OK`);
          }
        }

        // No tiene ningún campo de usuario
        else {
          console.log(`   ⚠️  ${docId}: No tiene userId ni user_id, agregando userId...`);
          try {
            await updateDoc(doc(db, collectionName, docId), {
              userId: userRef
            });
            totalUpdated++;
            console.log(`   ✅ ${docId}: Actualizado`);
          } catch (error) {
            console.error(`   ❌ ${docId}: Error al actualizar`, error);
            totalErrors++;
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando ${collectionName}:`, error);
      totalErrors++;
    }
  }

  console.log('\n📊 Resumen de migración:');
  console.log(`   ✅ Documentos actualizados: ${totalUpdated}`);
  console.log(`   ❌ Errores: ${totalErrors}`);
  console.log('✨ Migración completada');

  return { updated: totalUpdated, errors: totalErrors };
}

// Función helper para ejecutar desde la consola del navegador
export function runMigration() {
  const userId = prompt('Ingresa tu User ID (lo puedes obtener de Firebase Auth):');
  if (userId) {
    migrateFirestoreData(userId);
  } else {
    console.error('❌ Debes proporcionar un User ID');
  }
}
