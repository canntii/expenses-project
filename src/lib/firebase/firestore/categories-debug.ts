import {
    doc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../client';
import { CreateCategoryData } from '@/lib/types/category';

// Versión de debug para ver exactamente qué está pasando
export const createCategoryDocumentDebug = async(data: CreateCategoryData, uid: string) => {
    console.log("=== DEBUG: Inicio de creación de categoría ===");

    // 1. Verificar autenticación
    const currentUser = auth.currentUser;
    console.log("1. Usuario autenticado:", {
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAuthenticated: currentUser !== null
    });

    if (!currentUser) {
        console.error("❌ ERROR: Usuario no autenticado");
        throw new Error("Usuario no autenticado");
    }

    // 2. Verificar que userId coincide
    console.log("2. Verificación de userId:", {
        userIdEnData: data.userId,
        currentUserUid: currentUser.uid,
        coinciden: data.userId === currentUser.uid
    });

    if (data.userId !== currentUser.uid) {
        console.error("❌ ERROR: userId no coincide con usuario autenticado");
        throw new Error("userId no coincide");
    }

    // 3. Mostrar datos que se van a enviar
    const categoryData = {
        uid,
        name: data.name,
        currency: data.currency,
        monthly_limit: data.monthly_limit,
        type: data.type,
        userId: data.userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(data.activeMonths && { activeMonths: data.activeMonths })
    };

    console.log("3. Datos a enviar a Firestore:", {
        ...categoryData,
        createdAt: "serverTimestamp()",
        updatedAt: "serverTimestamp()"
    });

    // 4. Verificar la ruta del documento
    const categoryRef = doc(db, 'categories', uid);
    console.log("4. Ruta del documento:", categoryRef.path);

    // 5. Intentar crear el documento
    try {
        console.log("5. Intentando crear documento...");
        await setDoc(categoryRef, categoryData);
        console.log("✅ Documento creado exitosamente!");
        return categoryData;
    } catch (error: any) {
        console.error("❌ ERROR al crear documento:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        // Mensajes específicos según el error
        if (error.code === 'permission-denied') {
            console.error(`
🔴 PERMISSION DENIED - Posibles causas:
1. Las reglas de Firestore están bloqueando la operación
2. El token de autenticación ha expirado
3. El userId en los datos no coincide con request.auth.uid

Verifica en Firebase Console:
- Firestore → Reglas → ¿Están publicadas las reglas correctas?
- Authentication → Usuarios → ¿El usuario existe y está activo?

Datos enviados:
- userId en data: ${data.userId}
- Usuario autenticado: ${currentUser.uid}
- ¿Coinciden?: ${data.userId === currentUser.uid}
            `);
        }

        throw error;
    }
};
