import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserData {
  email: string;
  name: string;
  photoURL?: string;
  language?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  photoURL?: string;
  language?: string;
}
