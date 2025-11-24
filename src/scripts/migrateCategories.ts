import { db } from '../lib/firebase/client';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Script para migrar categorías de userId string a DocumentReference
 * Ejecutar una sola vez desde la consola del navegador
 */
export async function migrateCategories() {
  console.log('Iniciando migración de categorías...');

  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);

    let migrated = 0;
    let skipped = 0;

    for (const categoryDoc of snapshot.docs) {
      const data = categoryDoc.data();

      // Si userId es string, migrar a DocumentReference
      if (typeof data.userId === 'string') {
        const userRef = doc(db, 'users', data.userId);
        await updateDoc(categoryDoc.ref, {
          userId: userRef
        });
        console.log(`✅ Migrada: ${categoryDoc.id}`);
        migrated++;
      } else {
        console.log(`⏭️  Ya migrada: ${categoryDoc.id}`);
        skipped++;
      }
    }

    console.log(`\n📊 Resumen de migración:`);
    console.log(`   - Categorías migradas: ${migrated}`);
    console.log(`   - Categorías omitidas: ${skipped}`);
    console.log(`   - Total: ${snapshot.size}`);
    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Para ejecutar desde la consola del navegador:
// import { migrateCategories } from './scripts/migrateCategories';
// migrateCategories();
