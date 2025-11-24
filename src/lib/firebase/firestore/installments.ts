import {
  getDocs,
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  query
} from "firebase/firestore";
import { Installment, CreateInstallmentData, UpdateInstallmentData } from "@/lib/types/installment";
import { db } from "../client";

export const createInstallmentDocument = async (data: CreateInstallmentData, uid: string): Promise<Installment> => {
  try {
    const installmentRef = doc(db, 'installments', uid);

    const installmentData = {
      uid,
      category_id: data.category_id,
      currency: data.currency,
      current_installment: data.current_installment,
      description: data.description,
      installments: data.installments,
      monthly_amount: data.monthly_amount,
      start_date: data.start_date,
      total_amount: data.total_amount,
      userId: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tax: data.tax,
    };

    await setDoc(installmentRef, installmentData);

    return {
      ...installmentData,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    } as Installment;
  } catch (error) {
    console.error('Error creating installment document:', error);
    throw error;
  }
};

export const getInstallmentDocument = async (uid: string): Promise<Installment | null> => {
  try {
    const installmentRef = doc(db, 'installments', uid);
    const installmentDoc = await getDoc(installmentRef);

    if (!installmentDoc.exists()) {
      return null;
    }

    return installmentDoc.data() as Installment;
  } catch (error) {
    console.error('Error getting installment document:', error);
    throw error;
  }
};

export const updateInstallmentDocument = async (uid: string, data: UpdateInstallmentData): Promise<void> => {
  try {
    const installmentRef = doc(db, 'installments', uid);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(installmentRef, updateData);
  } catch (error) {
    console.error('Error updating installment document:', error);
    throw error;
  }
};

export const deleteInstallmentDocument = async (uid: string): Promise<void> => {
  try {
    const installmentRef = doc(db, 'installments', uid);
    await deleteDoc(installmentRef);
  } catch (error) {
    console.error('Error deleting installment document:', error);
    throw error;
  }
};

export const getUserInstallments = async (userId: string): Promise<Installment[]> => {
  try {
    const installmentsRef = collection(db, 'installments');
    const q = query(installmentsRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const installments: Installment[] = [];

    querySnapshot.forEach((doc) => {
      installments.push(doc.data() as Installment);
    });

    return installments;
  } catch (error) {
    console.error('Error getting user installments:', error);
    throw error;
  }
};

export const getCategoryInstallments = async (categoryId: string): Promise<Installment[]> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const installmentsRef = collection(db, 'installments');
    const q = query(installmentsRef, where('category_id', '==', categoryRef));

    const querySnapshot = await getDocs(q);
    const installments: Installment[] = [];

    querySnapshot.forEach((doc) => {
      installments.push(doc.data() as Installment);
    });

    return installments;
  } catch (error) {
    console.error('Error getting category installments:', error);
    throw error;
  }
};

// Función adicional para actualizar la cuota actual
export const updateCurrentInstallment = async (uid: string, currentInstallment: number): Promise<void> => {
  try {
    await updateInstallmentDocument(uid, { current_installment: currentInstallment });
  } catch (error) {
    console.error('Error updating current installment:', error);
    throw error;
  }
};

// Función para verificar si las cuotas están completas
export const isInstallmentComplete = (installment: Installment): boolean => {
  return installment.current_installment >= installment.installments;
};

// Función para calcular el monto restante
export const getRemainingAmount = (installment: Installment): number => {
  const remainingInstallments = installment.installments - installment.current_installment;
  return remainingInstallments * installment.monthly_amount;
};

// Función para obtener el progreso en porcentaje
export const getInstallmentProgress = (installment: Installment): number => {
  return (installment.current_installment / installment.installments) * 100;
};
