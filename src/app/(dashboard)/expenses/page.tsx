'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/lib/types/expense';
import { Category } from '@/lib/types/category';
import {
  createExpenseDocument,
  getUserExpenses,
  updateExpenseDocument,
  deleteExpenseDocument,
  getTotalExpensesByCurrency,
} from '@/lib/firebase/firestore/expenses';
import { getUserCategories } from '@/lib/firebase/firestore/categories';
import { doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, TrendingDown, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { createRateLimiter, updateRateLimiter, deleteRateLimiter } from '@/lib/utils/rateLimiter';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

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

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userExpenses = await getUserExpenses(user.uid);
      setExpenses(userExpenses);
    } catch (error) {
      toast.error('Error al cargar los gastos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    try {
      const userCategories = await getUserCategories(user.uid);
      setCategories(userCategories);
    } catch (error) {
      toast.error('Error al cargar las categorías');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadExpenses();
      loadCategories();
    }
  }, [user, loadExpenses, loadCategories]);

  const handleCreate = async (data: any) => {
    if (!user) return;

    // Verificar rate limit para creación
    const rateLimitCheck = createRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Has excedido el límite de creaciones. Intenta nuevamente en ${rateLimitCheck.retryAfter} segundos.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      const categoryRef = doc(db, 'categories', data.categoryId);
      const expenseUid = `${user.uid}_${Date.now()}`;

      const expenseData = {
        amount: data.amount,
        categoryId: categoryRef as any,
        currency: data.currency,
        date: data.date,
        note: data.note,
        userId: user.uid,
      };

      await createExpenseDocument(expenseData, expenseUid);

      await loadExpenses();
      setIsFormOpen(false);
      toast.success('Gasto creado exitosamente');
    } catch (error: any) {
      toast.error('Error al crear el gasto');
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedExpense || !user) return;

    // Verificar rate limit para actualización
    const rateLimitCheck = updateRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Has excedido el límite de actualizaciones. Intenta nuevamente en ${rateLimitCheck.retryAfter} segundos.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      const categoryRef = doc(db, 'categories', data.categoryId);

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
      toast.error('Error al actualizar el gasto');
      throw error;
    }
  };

  const handleDelete = (uid: string) => {
    setExpenseToDelete(uid);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete || !user) return;

    // Verificar rate limit para eliminación
    const rateLimitCheck = deleteRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Has excedido el límite de eliminaciones. Intenta nuevamente en ${rateLimitCheck.retryAfter} segundos.`,
        { duration: 5000 }
      );
      setConfirmDialogOpen(false);
      setExpenseToDelete(null);
      return;
    }

    try {
      await deleteExpenseDocument(expenseToDelete);
      await loadExpenses();
      toast.success('Gasto eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el gasto');
    } finally {
      setConfirmDialogOpen(false);
      setExpenseToDelete(null);
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

  // Filtrar gastos por mes seleccionado
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
    return expenseDate >= monthStart && expenseDate <= monthEnd;
  });

  // Calcular totales por moneda (basado en gastos filtrados)
  const totalsByCurrency = getTotalExpensesByCurrency(filteredExpenses);

  // Calcular gastos por categoría (basado en gastos filtrados)
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

  // Función para obtener la categoría de un gasto
  const getCategoryForExpense = (expense: Expense): Category | undefined => {
    const categoryId = typeof expense.categoryId === 'string'
      ? expense.categoryId
      : expense.categoryId.id;
    return categories.find(cat => cat.uid === categoryId);
  };

  // Calcular estadísticas de categorías con límites
  const categoryStats = categories.map(category => {
    const spent = expensesByCategory[category.uid] || 0;
    const limit = category.monthly_limit;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const isOverLimit = spent > limit;
    const isNearLimit = percentage >= 80 && !isOverLimit;

    return {
      category,
      spent,
      limit,
      percentage: Math.min(percentage, 100),
      isOverLimit,
      isNearLimit,
    };
  }).filter(stat => stat.spent > 0 || stat.limit > 0); // Solo mostrar categorías con actividad o límite

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-2">
                  Mis Gastos
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Controla y administra tus gastos mensuales
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedExpense(null);
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/50 dark:shadow-red-900/50 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Gasto
              </Button>
            </div>

            {/* Filtro de mes y año */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por:</span>
                </div>
                <div className="flex gap-3 flex-1 max-w-full">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                    <SelectTrigger className="w-full sm:w-[120px]">
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

            {/* Cards de resumen */}
            {filteredExpenses.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total de gastos */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total de Gastos</p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(totalsByCurrency).map(([currency, total]) => (
                          <p key={currency} className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {total.toLocaleString()} {currency}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Registros</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {filteredExpenses.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Categorías Activas</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {Object.keys(expensesByCategory).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Límites de categorías */}
            {categoryStats.length > 0 && (
              <div className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                  Límites por Categoría
                </h2>
                <div className="space-y-4">
                  {categoryStats.map(({ category, spent, limit, percentage, isOverLimit, isNearLimit }) => (
                    <div key={category.uid} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {category.name}
                          </span>
                          {isOverLimit && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          {isNearLimit && (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          )}
                          {!isOverLimit && !isNearLimit && percentage > 0 && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            <span className={isOverLimit ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}>
                              {spent.toLocaleString()}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400"> / {limit.toLocaleString()} {category.currency}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(0)}% usado
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        indicatorClassName={
                          isOverLimit
                            ? 'bg-red-600'
                            : isNearLimit
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }
                      />
                      {isOverLimit && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          ⚠️ Has excedido el límite por {(spent - limit).toLocaleString()} {category.currency}
                        </p>
                      )}
                      {isNearLimit && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Te acercas al límite mensual
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingDown className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  No hay gastos en este mes
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No se encontraron gastos para {months[selectedMonth].label} {selectedYear}
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Gastos de {months[selectedMonth].label.charAt(0).toUpperCase() + months[selectedMonth].label.slice(1)} {selectedYear} ({filteredExpenses.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.uid}
                    expense={expense}
                    category={getCategoryForExpense(expense)}
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
            categories={categories}
          />

          <ConfirmDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            title="Eliminar Gasto"
            description="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
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
