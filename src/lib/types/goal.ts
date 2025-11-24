export default interface Goal {
    uid: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    currency: string;
    dueDate: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoalData {
    title: string;
    targetAmount: number;
    currency: string;
    dueDate: Date;
    userId: string;
}

export interface UpdateGoalData {
    title?: string;
    targetAmount?: number;
    currentAmount?: number;
    currency?: string;
    dueDate?: Date;
}