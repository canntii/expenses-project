'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Income, UpdateIncomeData } from '@/lib/types/income';
import {
  createIncomeDocument,
  getUserIncomes,
  updateIncomeDocument,
  deleteIncomeDocument,
} from '@/lib/firebase/firestore/income';
import { doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import IncomeCard from '@/components/incomes/IncomeCard';
import IncomeForm from '@/components/incomes/IncomeForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { createRateLimiter, updateRateLimiter, deleteRateLimiter } from '@/lib/utils/rateLimiter';

export default function IncomesPage() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

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

  const loadIncomes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userIncomes = await getUserIncomes(user.uid);
      setIncomes(userIncomes);
    } catch (error) {
      console.error('Error loading incomes:', error);
      toast.error('Error al cargar los ingresos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadIncomes();
    }
  }, [user, loadIncomes]);

  const handleCreate = async (data: UpdateIncomeData & { receivedAt: Timestamp }) => {
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
      const incomeUid = `${user.uid}_${Date.now()}`;

      await createIncomeDocument(
        {
          source: data.source!,
          amount: data.amount!,
          currency: data.currency!,
          receivedAt: data.receivedAt,
          userId: user.uid,
        },
        incomeUid
      );
      await loadIncomes();
      setIsFormOpen(false);
      toast.success('Ingreso creado exitosamente');
    } catch (error) {
      console.error('Error creating income:', error);
      toast.error('Error al crear el ingreso');
      throw error;
    }
  };

  const handleUpdate = async (data: UpdateIncomeData & { receivedAt: Timestamp }) => {
    if (!selectedIncome || !user) return;

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
      await updateIncomeDocument(selectedIncome.uid, data);
      await loadIncomes();
      setSelectedIncome(null);
      setIsFormOpen(false);
      toast.success('Ingreso actualizado exitosamente');
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Error al actualizar el ingreso');
      throw error;
    }
  };

  const handleDelete = (uid: string) => {
    setIncomeToDelete(uid);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete || !user) return;

    // Verificar rate limit para eliminación
    const rateLimitCheck = deleteRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Has excedido el límite de eliminaciones. Intenta nuevamente en ${rateLimitCheck.retryAfter} segundos.`,
        { duration: 5000 }
      );
      setConfirmDialogOpen(false);
      setIncomeToDelete(null);
      return;
    }

    try {
      await deleteIncomeDocument(incomeToDelete);
      await loadIncomes();
      toast.success('Ingreso eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Error al eliminar el ingreso');
    } finally {
      setConfirmDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  const handleEdit = (income: Income) => {
    setSelectedIncome(income);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedIncome(null);
  };

  // Filtrar ingresos por mes seleccionado
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const filteredIncomes = incomes.filter(income => {
    const incomeDate = income.receivedAt.toDate ? income.receivedAt.toDate() : new Date(income.receivedAt as any);
    return incomeDate >= monthStart && incomeDate <= monthEnd;
  });

  // Calcular totales por moneda (basado en ingresos filtrados)
  const totalsByCurrency = filteredIncomes.reduce((acc, income) => {
    const currency = income.currency;
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += income.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  Mis Ingresos
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Registra y administra tus fuentes de ingreso
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedIncome(null);
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/50 dark:shadow-green-900/50 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Ingreso
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

            {/* Card de resumen */}
            {filteredIncomes.length > 0 && (
              <div className="mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total de Ingresos</p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(totalsByCurrency).map(([currency, total]) => (
                          <p key={currency} className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {total.toLocaleString()} {currency}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Registros</p>
                    <p className="text-2xl font-semibold">{filteredIncomes.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {filteredIncomes.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  No hay ingresos en este mes
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No se encontraron ingresos para {months[selectedMonth].label} {selectedYear}
                </p>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/50 dark:shadow-green-900/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Registrar Primer Ingreso
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Ingresos de {months[selectedMonth].label.charAt(0).toUpperCase() + months[selectedMonth].label.slice(1)} {selectedYear} ({filteredIncomes.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIncomes.map((income) => (
                <IncomeCard
                  key={income.uid}
                  income={income}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              </div>
            </div>
          )}

          <IncomeForm
            open={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={selectedIncome ? handleUpdate : handleCreate}
            income={selectedIncome}
          />

          <ConfirmDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            title="Eliminar Ingreso"
            description="¿Estás seguro de que deseas eliminar este ingreso? Esta acción no se puede deshacer."
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
