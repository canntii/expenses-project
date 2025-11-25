'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import CategoryCard from '@/components/categories/CategoryCard';
import CategoryForm from '@/components/categories/CategoryForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { createRateLimiter, updateRateLimiter, deleteRateLimiter } from '@/lib/utils/rateLimiter';

export default function CategoriesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Estado para el filtro de mes
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Generar lista de meses y años disponibles
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: language === 'es' ? es : undefined })
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
      toast.error(t.categories.loadError);
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

    // Verificar rate limit para creación
    const rateLimitCheck = createRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.categories.rateLimitExceeded.replace('{seconds}', rateLimitCheck.retryAfter.toString()),
        { duration: 5000 }
      );
      return;
    }

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
      toast.success(t.categories.createSuccess);
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(t.categories.createError);
      throw error;
    }
  };

  const handleUpdate = async (data: UpdateCategoryData) => {
    if (!selectedCategory || !user) return;

    // Verificar rate limit para actualización
    const rateLimitCheck = updateRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.categories.rateLimitExceeded.replace('{seconds}', rateLimitCheck.retryAfter.toString()),
        { duration: 5000 }
      );
      return;
    }

    try {
      await updateCategoryDocument(selectedCategory.uid, data);
      await loadCategories();
      setSelectedCategory(null);
      setIsFormOpen(false);
      toast.success(t.categories.updateSuccess);
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(t.categories.updateError);
      throw error;
    }
  };

  const handleDelete = (uid: string) => {
    setCategoryToDelete(uid);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete || !user) return;

    // Verificar rate limit para eliminación
    const rateLimitCheck = deleteRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.categories.rateLimitExceeded.replace('{seconds}', rateLimitCheck.retryAfter.toString()),
        { duration: 5000 }
      );
      setConfirmDialogOpen(false);
      setCategoryToDelete(null);
      return;
    }

    try {
      await deleteCategoryDocument(categoryToDelete);
      await loadCategories();
      toast.success(t.categories.deleteSuccess);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t.categories.deleteError);
    } finally {
      setConfirmDialogOpen(false);
      setCategoryToDelete(null);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {t.categories.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.categories.subtitle}
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedCategory(null);
                setIsFormOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t.categories.newCategory}
            </Button>
          </div>

          {/* Filtro de mes y año */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.common.filterBy}</span>
              </div>
              <div className="flex gap-3 flex-1 max-w-full">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t.filters.selectMonth} />
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
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder={t.filters.selectYear} />
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
                {t.categories.noCategory}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.categories.startCategory}
              </p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t.categories.createFirstCategory}
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

        <ConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title="Eliminar Categoría"
          description="¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </div>
    </ProtectedRoute>
  );
}