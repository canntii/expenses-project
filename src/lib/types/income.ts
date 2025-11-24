import { Timestamp } from 'firebase/firestore';

export interface Income {
  uid: string;
  amount: number;
  currency: string;
  source: string;
  receivedAt: Timestamp;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateIncomeData {
  amount: number;
  currency: string;
  source: string;
  receivedAt: Timestamp;
  userId: string;
}

export interface UpdateIncomeData {
  amount?: number;
  currency?: string;
  source?: string;
  receivedAt?: Timestamp;
}