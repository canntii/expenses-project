import {getDocs, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, where, query } from "firebase/firestore";
import { Income, CreateIncomeData, UpdateIncomeData } from "@/lib/types/income";
import { db } from "../client";

export const createIncomeDocument = async (data : CreateIncomeData, uid: string): Promise<Income> => {
    try{
        const incomeRef = doc(db, 'income', uid);

        const incomeData = {
            uid,
            amount: data.amount,
            currency: data.currency,
            source: data.source,
            receivedAt: data.receivedAt,
            userId: data.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(incomeRef, incomeData);

        return {
            ...incomeData,
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
        } as Income;
    } catch (error){
        console.error('Error creating income document:', error);
        throw error;
    }
};

export const getIncomeDocument = async (uid: string): Promise<Income | null> => {
    try{
        const incomeRef = doc(db, 'income', uid);
        const incomeDoc = await getDoc(incomeRef);

        if(!incomeDoc.exists()){
            return null;
        }

        return incomeDoc.data() as Income;
    } catch (error) {
        console.error('Error getting income document:', error);
        throw error;
    }
}

export const updateIncomeDocument = async (uid: string, data: UpdateIncomeData): Promise<void> => {
    try{
        const incomeRef = doc(db, 'income', uid);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(incomeRef, updateData);
    } catch (error) {
        console.error('Error updating income document:', error);
        throw error;
    }
}

export const deleteIncomeDocument = async (uid: string): Promise<void> => {
    try{
        const incomeRef = doc(db, 'income', uid);
        await deleteDoc(incomeRef);
    }catch (error) {
        console.error('Error deleting income document:', error);
        throw error;
    }
}

export const getUserIncomes = async (userId: string): Promise<Income[]> => {
    try{
        const incomeRef = collection(db, 'income');
        const q = query(incomeRef, where('userId', '==', userId));

        const querySnapshot = await getDocs(q);
        const incomes: Income[] = [];

        querySnapshot.forEach((doc) => {
            incomes.push(doc.data() as Income);
        });

        return incomes;
    }catch (error) {
        console.error('Error getting user incomes:', error);
        throw error;
    }
}

export const getTotalIncomesByCurrency = async (userId: string): Promise<{ [currency: string]: number }> => {
    try {
        const incomes = await getUserIncomes(userId);
        const totals: { [currency: string]: number } = {};
        incomes.forEach((income) => {
            if (!totals[income.currency]) {
                totals[income.currency] = 0;
            }
            totals[income.currency] += income.amount;
        });
        return totals;
    } catch (error) {
        console.error('Error calculating total incomes by currency:', error);
        throw error;
    }
}