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
import Goal, { CreateGoalData, UpdateGoalData } from "@/lib/types/goal";
import { db } from "../client";

export const createGoalDocument = async (data: CreateGoalData, uid: string): Promise<Goal> => {
  try {
    const goalRef = doc(db, 'goals', uid);

    const goalData = {
      uid,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      currency: data.currency,
      dueDate: data.dueDate,
      userId: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(goalRef, goalData);

    return {
      ...goalData,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    } as Goal;
  } catch (error) {
    console.error('Error creating goal document:', error);
    throw error;
  }
};

export const getGoalDocument = async (uid: string): Promise<Goal | null> => {
  try {
    const goalRef = doc(db, 'goals', uid);
    const goalDoc = await getDoc(goalRef);

    if (!goalDoc.exists()) {
      return null;
    }

    return goalDoc.data() as Goal;
  } catch (error) {
    console.error('Error getting goal document:', error);
    throw error;
  }
};

export const updateGoalDocument = async (uid: string, data: UpdateGoalData): Promise<void> => {
  try {
    const goalRef = doc(db, 'goals', uid);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(goalRef, updateData);
  } catch (error) {
    console.error('Error updating goal document:', error);
    throw error;
  }
};

export const deleteGoalDocument = async (uid: string): Promise<void> => {
  try {
    const goalRef = doc(db, 'goals', uid);
    await deleteDoc(goalRef);
  } catch (error) {
    console.error('Error deleting goal document:', error);
    throw error;
  }
};

export const getUserGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const goalsRef = collection(db, 'goals');
    const q = query(goalsRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];

    querySnapshot.forEach((doc) => {
      goals.push(doc.data() as Goal);
    });

    return goals;
  } catch (error) {
    console.error('Error getting user goals:', error);
    throw error;
  }
};

export const addContributionToGoal = async (uid: string, amount: number): Promise<void> => {
  try {
    const goal = await getGoalDocument(uid);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const newAmount = goal.currentAmount + amount;
    await updateGoalDocument(uid, { currentAmount: newAmount });
  } catch (error) {
    console.error('Error adding contribution to goal:', error);
    throw error;
  }
};

export const isGoalComplete = (goal: Goal): boolean => {
  return goal.currentAmount >= goal.targetAmount;
};

export const getRemainingAmount = (goal: Goal): number => {
  return Math.max(0, goal.targetAmount - goal.currentAmount);
};

export const getGoalProgress = (goal: Goal): number => {
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
};

export const getDaysRemaining = (goal: Goal): number => {
  const today = new Date();
  const dueDate = goal.dueDate instanceof Date ? goal.dueDate : (goal.dueDate as any).toDate();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
