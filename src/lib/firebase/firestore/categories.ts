import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../client';
import { Category, CreateCategoryData, UpdateCategoryData } from '@/lib/types/category';

export const createCategoryDocument = async(data: CreateCategoryData, uid: string): Promise<Category> => {
    try{
        const categoryRef = doc(db, 'categories', uid);

        // Check if category already exists
        const categoryDoc = await getDoc(categoryRef);
        if(categoryDoc.exists()){
            throw new Error('Category already exists');
        }

        const categoryData = {
            uid,
            name: data.name,
            currency: data.currency,
            monthly_limit: data.monthly_limit,
            type: data.type,
            userId: data.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(categoryRef, categoryData);

        // Return the category with current timestamp
        return {
            ...categoryData,
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
        } as Category;
    } catch (error){
        console.error('Error creating category document:', error);
        throw error;
    }
};

export const getCategoryDocument = async(uid: string): Promise<Category | null> => {
    try{
        const categoryRef = doc(db, 'categories', uid);
        const categoryDoc = await getDoc(categoryRef);

        if(!categoryDoc.exists()){
            return null;
        }

        return categoryDoc.data() as Category;
    } catch (error){
        console.error('Error getting category document:', error);
        throw error;
    }
};

export const updateCategoryDocument = async(uid: string, data: UpdateCategoryData): Promise<void> => {
    try{
        const categoryRef = doc(db, 'categories', uid);

        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(categoryRef, updateData);
    } catch (error){
        console.error('Error updating category document:', error);
        throw error;
    }
};

export const deleteCategoryDocument = async(uid: string): Promise<void> => {
    try{
        const categoryRef = doc(db, 'categories', uid);
        await deleteDoc(categoryRef);
    } catch (error){
        console.error('Error deleting category document:', error);
        throw error;
    }
};

export const getUserCategories = async(userId: string): Promise<Category[]> => {
    try{
        const categoriesRef = collection(db, 'categories');
        const q = query(categoriesRef, where('userId', '==', userId));

        const querySnapshot = await getDocs(q);
        const categories: Category[] = [];

        querySnapshot.forEach((doc) => {
            categories.push(doc.data() as Category);
        });

        return categories;
    } catch (error){
        console.error('Error getting user categories:', error);
        throw error;
    }
};