import { Timestamp } from 'firebase/firestore';

export interface Category {
  uid: string;
  name: string;
  currency: string;
  monthly_limit: number;
  type: string;
  userId: string;
  activeMonths?: number[]; // Array de meses (0-11) donde la categoría está activa
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCategoryData {
  name: string;
  currency: string;
  monthly_limit: number;
  type: string;
  userId: string;
  activeMonths?: number[];
}

export interface UpdateCategoryData {
  name?: string;
  currency?: string;
  monthly_limit?: number;
  type?: string;
  activeMonths?: number[];
}