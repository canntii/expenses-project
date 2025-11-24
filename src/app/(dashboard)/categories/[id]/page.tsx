'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/lib/types/category';
import { Expense } from '@/lib/types/expense';
import { getCategoryDocument } from '@/lib/firebase/firestore/categories';
import { getCategoryExpenses, deleteExpenseDocument, createExpenseDocument, updateExpenseDocument } from '@/lib/firebase/firestore/expenses';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ArrowLeft, TrendingDown, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const loadCategoryData = useCallback(async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      const categoryData = await getCategoryDocument(categoryId);
      setCategory(categoryData);
    } catch (error) {
      console.error('Error loading category:', error);
      toast.error('Error al cargar la categoría');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const loadExpenses = useCallback(async () => {
    if (!categoryId || !user) return;
    try {
      const categoryExpenses = await getCategoryExpenses(categoryId, user.uid);
      setExpenses(categoryExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Error al cargar los gastos');
    }
  }, [categoryId, user]);

  useEffect(() => {
    if (user && categoryId) {
      loadCategoryData();
      loadExpenses();
    }
  }, [user, categoryId, loadCategoryData, loadExpenses]);

  const handleCreate = async (data: any) => {
    if (!user || !category) return;
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      const expenseUid = `${user.uid}_${Date.now()}`;

      await createExpenseDocument(
        {
          amount: data.amount,
          categoryId: categoryRef as any,
          currency: data.currency,
          date: data.date,
          note: data.note,
          userId: user.uid,
        },
        expenseUid
      );
      await loadExpenses();
      setIsFormOpen(false);
      toast.success('Gasto creado exitosamente');
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Error al crear el gasto');
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedExpense) return;
    try {
      const categoryRef = doc(db, 'categories', categoryId);

      await updateExpenseDocument(selectedExpense.uid, {
        amount: data.amount,
        categoryId: categoryRef as any,
        currency: data.currency,
        date: data.date,
        note: data.note,
      });
      await loadExpenses();
      setSelectedExpense(null);
      setIsFormOpen(false);
      toast.success('Gasto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Error al actualizar el gasto');
      throw error;
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
    try {
      await deleteExpenseDocument(uid);
      await loadExpenses();
      toast.success('Gasto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error al eliminar el gasto');
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedExpense(null);
  };

  if (loading || !category) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
          <div className="max-w-7xl mx-auto mt-4">
            <div className="text-center py-20">
              <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Calcular estadísticas
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const limit = category.monthly_limit;
  const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;
  const isOverLimit = totalSpent > limit && limit > 0;
  const isNearLimit = percentage >= 80 && !isOverLimit && limit > 0;
  const remaining = limit - totalSpent;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          {/* Header con botón de regreso */}
          <div className="mb-8">
            <Button
              onClick={() => router.push('/categories')}
              variant="ghost"
              className="mb-4 hover:bg-blue-100 dark:hover:bg-blue-900/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Categorías
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="pb-2 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {category.name}
                  </h1>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {category.type}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Gastos de esta categoría
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedExpense(null);
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/50 dark:shadow-red-900/50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Gasto
              </Button>
            </div>

            {/* Tarjeta de resumen */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total gastado */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Gastado</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {totalSpent.toLocaleString()} {category.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Límite y estadísticas */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Límite Mensual:</span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {limit.toLocaleString()} {category.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Restante:</span>
                    <span className={`text-lg font-semibold ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {remaining.toLocaleString()} {category.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            {limit > 0 && (
              <div className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Progreso del Presupuesto
                      </span>
                      {isOverLimit && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      {isNearLimit && (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      {!isOverLimit && !isNearLimit && totalSpent > 0 && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {percentage.toFixed(1)}% usado
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className="h-3"
                    indicatorClassName={
                      isOverLimit
                        ? 'bg-red-600'
                        : isNearLimit
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                    }
                  />
                  {isOverLimit && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ Has excedido el límite por {Math.abs(remaining).toLocaleString()} {category.currency}
                    </p>
                  )}
                  {isNearLimit && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ Te acercas al límite mensual
                    </p>
                  )}
                  {!isOverLimit && !isNearLimit && totalSpent > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Dentro del presupuesto
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de gastos */}
          {expenses.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingDown className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  No hay gastos en esta categoría
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Aún no has registrado gastos para "{category.name}"
                </p>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/50 dark:shadow-red-900/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Registrar Primer Gasto
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Gastos Registrados ({expenses.length})
                </h2>

              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.uid}
                    expense={expense}
                    category={category}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          <ExpenseForm
            open={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={selectedExpense ? handleUpdate : handleCreate}
            expense={selectedExpense}
            categories={[category]}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
