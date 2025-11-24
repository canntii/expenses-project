'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Installment } from '@/lib/types/installment';
import { Category } from '@/lib/types/category';
import {
  createInstallmentDocument,
  getUserInstallments,
  updateInstallmentDocument,
  deleteInstallmentDocument,
  updateCurrentInstallment,
  getRemainingAmount,
} from '@/lib/firebase/firestore/installments';
import { getUserCategories } from '@/lib/firebase/firestore/categories';
import { doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import InstallmentCard from '@/components/installments/InstallmentCard';
import InstallmentForm from '@/components/installments/InstallmentForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function InstallmentsPage() {
  const { user } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  const loadInstallments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userInstallments = await getUserInstallments(user.uid);
      setInstallments(userInstallments);
    } catch (error) {
      console.error('Error loading installments:', error);
      toast.error('Error al cargar las cuotas');
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
      console.error('Error loading categories:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInstallments();
      loadCategories();
    }
  }, [user, loadInstallments, loadCategories]);

  const handleCreate = async (data: any) => {
    if (!user) return;
    try {
      const categoryRef = doc(db, 'categories', data.category_id);
      const installmentUid = `${user.uid}_${Date.now()}`;

      await createInstallmentDocument(
        {
          description: data.description,
          category_id: categoryRef as any,
          total_amount: data.total_amount,
          installments: data.installments,
          current_installment: data.current_installment,
          monthly_amount: data.monthly_amount,
          currency: data.currency,
          start_date: data.start_date,
          userId: user.uid,
          tax: data.tax || 0,
        },
        installmentUid
      );
      await loadInstallments();
      setIsFormOpen(false);
      toast.success('Cuota creada exitosamente');
    } catch (error) {
      console.error('Error creating installment:', error);
      toast.error('Error al crear la cuota');
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedInstallment) return;
    try {
      const categoryRef = doc(db, 'categories', data.category_id);

      await updateInstallmentDocument(selectedInstallment.uid, {
        description: data.description,
        category_id: categoryRef as any,
        total_amount: data.total_amount,
        installments: data.installments,
        current_installment: data.current_installment,
        monthly_amount: data.monthly_amount,
        currency: data.currency,
        start_date: data.start_date,
        tax: data.tax || 0,
      });
      await loadInstallments();
      setSelectedInstallment(null);
      setIsFormOpen(false);
      toast.success('Cuota actualizada exitosamente');
    } catch (error) {
      console.error('Error updating installment:', error);
      toast.error('Error al actualizar la cuota');
      throw error;
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cuota?')) return;
    try {
      await deleteInstallmentDocument(uid);
      await loadInstallments();
      toast.success('Cuota eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting installment:', error);
      toast.error('Error al eliminar la cuota');
    }
  };

  const handlePayInstallment = async (installment: Installment) => {
    if (installment.current_installment >= installment.installments) {
      toast.info('Esta cuota ya está completamente pagada');
      return;
    }

    try {
      const newCurrent = installment.current_installment + 1;
      await updateCurrentInstallment(installment.uid, newCurrent);
      await loadInstallments();

      if (newCurrent >= installment.installments) {
        toast.success('🎉 ¡Felicidades! Has completado todas las cuotas');
      } else {
        toast.success(`Cuota ${newCurrent} pagada exitosamente`);
      }
    } catch (error) {
      console.error('Error paying installment:', error);
      toast.error('Error al pagar la cuota');
    }
  };

  const handleEdit = (installment: Installment) => {
    setSelectedInstallment(installment);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedInstallment(null);
  };

  // Calcular totales
  const totalsByCurrency = installments.reduce((acc, installment) => {
    const currency = installment.currency;
    if (!acc[currency]) {
      acc[currency] = { total: 0, remaining: 0 };
    }
    acc[currency].total += installment.total_amount;
    acc[currency].remaining += getRemainingAmount(installment);
    return acc;
  }, {} as Record<string, { total: number; remaining: number }>);

  const activeInstallments = installments.filter(i => i.current_installment < i.installments);
  const completedInstallments = installments.filter(i => i.current_installment >= i.installments);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="pb-2 text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  Mis Deudas y Cuotas
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Administra tus deudas y compras en cuotas
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedInstallment(null);
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-500/50 dark:shadow-orange-900/50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva Deuda/Cuota
              </Button>
            </div>

            {/* Cards de resumen */}
            {installments.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total por pagar */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total por Pagar</p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(totalsByCurrency).map(([currency, amounts]) => (
                          <p key={currency} className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {amounts.remaining.toLocaleString()} {currency}
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">En curso</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {activeInstallments.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completadas</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {completedInstallments.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {installments.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  No tienes deudas o cuotas registradas
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Comienza registrando tu primera deuda o compra en cuotas para mantener un control
                </p>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-500/50 dark:shadow-orange-900/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Registrar Primera Cuota
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Deudas activas */}
              {activeInstallments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    En Curso ({activeInstallments.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeInstallments.map((installment) => (
                      <InstallmentCard
                        key={installment.uid}
                        installment={installment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onPayInstallment={handlePayInstallment}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Deudas completadas */}
              {completedInstallments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Completadas ({completedInstallments.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedInstallments.map((installment) => (
                      <InstallmentCard
                        key={installment.uid}
                        installment={installment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onPayInstallment={handlePayInstallment}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <InstallmentForm
            open={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={selectedInstallment ? handleUpdate : handleCreate}
            installment={selectedInstallment}
            categories={categories}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
