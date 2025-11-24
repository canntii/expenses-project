import { Timestamp, DocumentReference } from 'firebase/firestore';
import { Category } from './category';
import { Installment } from './installment';

export interface Expense {
    uid: string;
    amount: number;
    categoryId: DocumentReference<Category>;
    currency: string;
    date: Timestamp;
    installmentId?: DocumentReference<Installment>;
    note?: string;
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface CreateExpenseData {
    amount: number;
    categoryId: DocumentReference<Category>;
    currency: string;
    date: Timestamp;
    installmentId?: DocumentReference<Installment>;
    note?: string;
    userId: string;
}

export interface UpdateExpenseData {
    amount?: number;
    categoryId?: DocumentReference<Category>;
    currency?: string;
    date?: Timestamp;
    installmentId?: DocumentReference<Installment> | null;
    note?: string;
}