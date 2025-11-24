import { Timestamp, DocumentReference } from 'firebase/firestore';
import { Category } from './category';

export interface Installment {
  uid: string;
  category_id: DocumentReference<Category>;
  currency: string;
  current_installment: number;
  description: string;
  installments: number;
  monthly_amount: number;
  start_date: Timestamp;
  total_amount: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tax : number;
}

export interface CreateInstallmentData {
  category_id: DocumentReference<Category>;
  currency: string;
  current_installment: number;
  description: string;
  installments: number;
  monthly_amount: number;
  start_date: Timestamp;
  total_amount: number;
  userId: string;
  tax: number;
}

export interface UpdateInstallmentData {
  category_id?: DocumentReference<Category>;
  currency?: string;
  current_installment?: number;
  description?: string;
  installments?: number;
  monthly_amount?: number;
  start_date?: Timestamp;
  total_amount?: number;
  tax?: number;
}
