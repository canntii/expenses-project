import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserData {
  email: string;
  name: string;
  photoURL?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  photoURL?: string;
}
