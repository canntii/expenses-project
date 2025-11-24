import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../client';
import { User } from 'firebase/auth';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: any;
  updatedAt: any;
}

export const createUserDocument = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);

    // Verificar si el usuario ya existe
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const userData: UserData = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || '',
        photoURL: user.photoURL || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, userData);
      return userData;
    }

    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }

    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

export const updateUserDocument = async (uid: string, data: Partial<UserData>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};
