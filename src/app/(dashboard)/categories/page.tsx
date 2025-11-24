'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Category, UpdateCategoryData } from '@/lib/types/category';
import { Expense } from '@/lib/types/expense';
import {
  createCategoryDocument,
  getUserCategories,
  updateCategoryDocument,
  deleteCategoryDocument,
} from '@/lib/firebase/firestore/categories';
import { createCategoryDocumentDebug } from '@/lib/firebase/firestore/categories-debug';
import { getUserExpenses } from '@/lib/firebase/firestore/expenses';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryCard from '@/components/categories/CategoryCard';
import CategoryForm from '@/components/categories/CategoryForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Estado para el filtro de mes
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Generar lista de meses y años disponibles
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: es })
  }));

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userCategories = await getUserCategories(user.uid);
      setCategories(userCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    try {
      const userExpenses = await getUserExpenses(user.uid);
      setExpenses(userExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCategories();
      loadExpenses();
    }
  }, [user, loadCategories, loadExpenses]);

  const handleCreate = async (data: UpdateCategoryData) => {
    if (!user) return;
    try {
      const categoryUid = `${user.uid}_${Date.now()}`;

      // MODO DEBUG: Usa la versión debug para ver logs detallados
      await createCategoryDocumentDebug(
        {
          name: data.name!,
          currency: data.currency!,
          monthly_limit: data.monthly_limit!,
          type: data.type!,
          userId: user.uid,
          activeMonths: data.activeMonths,
        },
        categoryUid
      );
      await loadCategories();
      setIsFormOpen(false);
      toast.success('Categoría creada exitosamente');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error al crear la categoría');
      throw error;
    }
  };

  const handleUpdate = async (data: UpdateCategoryData) => {
    if (!selectedCategory) return;
    try {
      await updateCategoryDocument(selectedCategory.uid, data);
      await loadCategories();
      setSelectedCategory(null);
      setIsFormOpen(false);
      toast.success('Categoría actualizada exitosamente');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error al actualizar la categoría');
      throw error;
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    try {
      await deleteCategoryDocument(uid);
      await loadCategories();
      toast.success('Categoría eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar la categoría');
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCategory(null);
  };

  // Filtrar gastos por mes seleccionado
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
    return expenseDate >= monthStart && expenseDate <= monthEnd;
  });

  // Calcular gastos por categoría (basado en gastos filtrados del mes)
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const categoryId = typeof expense.categoryId === 'string'
      ? expense.categoryId
      : expense.categoryId.id;

    if (!acc[categoryId]) {
      acc[categoryId] = 0;
    }
    acc[categoryId] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto mt-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="pb-2 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Mis Categorías
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organiza tus gastos e ingresos por categorías
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedCategory(null);
                setIsFormOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Categoría
            </Button>
          </div>

          {/* Filtro de mes y año */}
          <div className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar gastos por:</span>
              </div>
              <div className="flex gap-3 flex-1">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                No tienes categorías
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Comienza creando tu primera categoría para organizar tus finanzas
              </p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Crear Primera Categoría
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories
              .filter(category => {
                // Si no tiene activeMonths definido o esta vacio, mostrar siempre
                if (!category.activeMonths || category.activeMonths.length === 0) {
                  return true;
                }
                // Si tiene activeMonths, mostrar solo si el mes actual esta en la lista
                return category.activeMonths.includes(selectedMonth);
              })
              .map((category) => (
                <CategoryCard
                  key={category.uid}
                  category={category}
                  spent={expensesByCategory[category.uid] || 0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
              ))}
          </div>
        )}

        <CategoryForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={selectedCategory ? handleUpdate : handleCreate}
          category={selectedCategory}
        />
      </div>
    </div>
    </ProtectedRoute>
  );
}