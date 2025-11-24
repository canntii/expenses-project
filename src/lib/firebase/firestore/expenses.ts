import {
  getDocs,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  query
} from "firebase/firestore";
import { Expense, CreateExpenseData, UpdateExpenseData } from "@/lib/types/expense";
import { db } from "../client";

export const createExpenseDocument = async (data: CreateExpenseData, uid: string): Promise<Expense> => {
  try {
    const expenseRef = doc(db, 'expenses', uid);

    const expenseData = {
      uid,
      amount: data.amount,
      categoryId: data.categoryId,
      currency: data.currency,
      date: data.date,
      installmentId: data.installmentId || null,
      note: data.note || '',
      userId: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(expenseRef, expenseData);

    return {
      ...expenseData,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    } as Expense;
  } catch (error) {
    console.error('Error creating expense document:', error);
    throw error;
  }
};

export const getExpenseDocument = async (uid: string): Promise<Expense | null> => {
  try {
    const expenseRef = doc(db, 'expenses', uid);
    const expenseDoc = await getDoc(expenseRef);

    if (!expenseDoc.exists()) {
      return null;
    }

    return expenseDoc.data() as Expense;
  } catch (error) {
    console.error('Error getting expense document:', error);
    throw error;
  }
};

export const updateExpenseDocument = async (uid: string, data: UpdateExpenseData): Promise<void> => {
  try {
    const expenseRef = doc(db, 'expenses', uid);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(expenseRef, updateData);
  } catch (error) {
    console.error('Error updating expense document:', error);
    throw error;
  }
};

export const deleteExpenseDocument = async (uid: string): Promise<void> => {
  try {
    const expenseRef = doc(db, 'expenses', uid);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting expense document:', error);
    throw error;
  }
};

export const getUserExpenses = async (userId: string): Promise<Expense[]> => {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];

    querySnapshot.forEach((doc) => {
      expenses.push(doc.data() as Expense);
    });

    return expenses;
  } catch (error) {
    console.error('Error getting user expenses:', error);
    throw error;
  }
};

export const getCategoryExpenses = async (categoryId: string, userId: string): Promise<Expense[]> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const expensesRef = collection(db, 'expenses');

    // Query por userId (permitido por las reglas) y filtrar por categoryId en el cliente
    const q = query(expensesRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];

    querySnapshot.forEach((docSnapshot) => {
      const expenseData = docSnapshot.data() as Expense;
      // Filtrar en el cliente por categoryId comparando paths
      if (expenseData.categoryId.path === categoryRef.path) {
        expenses.push(expenseData);
      }
    });

    return expenses;
  } catch (error) {
    console.error('Error getting category expenses:', error);
    throw error;
  }
};

export const getInstallmentExpenses = async (installmentId: string, userId: string): Promise<Expense[]> => {
  try {
    const installmentRef = doc(db, 'installments', installmentId);
    const expensesRef = collection(db, 'expenses');

    // Query por userId (permitido por las reglas) y filtrar por installmentId en el cliente
    const q = query(expensesRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];

    querySnapshot.forEach((docSnapshot) => {
      const expenseData = docSnapshot.data() as Expense;
      // Filtrar en el cliente por installmentId comparando paths
      if (expenseData.installmentId?.path === installmentRef.path) {
        expenses.push(expenseData);
      }
    });

    return expenses;
  } catch (error) {
    console.error('Error getting installment expenses:', error);
    throw error;
  }
};

// Funci�n para calcular el total de gastos por moneda
export const getTotalExpensesByCurrency = (expenses: Expense[]): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    const currency = expense.currency;
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += expense.amount;
    return acc;
  }, {} as Record<string, number>);
};

// Funci�n para obtener gastos de un per�odo espec�fico
export const getExpensesByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Expense[]> => {
  try {
    const expenses = await getUserExpenses(userId);

    // Filtrar por rango de fechas en el cliente
    return expenses.filter((expense) => {
      const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  } catch (error) {
    console.error('Error getting expenses by date range:', error);
    throw error;
  }
};

// Funci�n para obtener el gasto m�s reciente de un usuario
export const getRecentExpenses = async (userId: string, limit: number = 10): Promise<Expense[]> => {
  try {
    const expenses = await getUserExpenses(userId);

    // Ordenar por fecha descendente y limitar
    return expenses
      .sort((a, b) => {
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date as any);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date as any);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent expenses:', error);
    throw error;
  }
};
