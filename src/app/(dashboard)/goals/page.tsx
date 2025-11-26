'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Goal from '@/lib/types/goal';
import {
  createGoalDocument,
  getUserGoals,
  updateGoalDocument,
  deleteGoalDocument,
  addContributionToGoal,
  isGoalComplete,
} from '@/lib/firebase/firestore/goals';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';
import ContributionDialog from '@/components/goals/ContributionDialog';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Plus, Target, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createRateLimiter, updateRateLimiter, deleteRateLimiter } from '@/lib/utils/rateLimiter';

export default function GoalsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [goalForContribution, setGoalForContribution] = useState<Goal | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userGoals = await getUserGoals(user.uid);
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error(t.goals.loadError);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user, loadGoals]);

  const handleCreate = async (data: any) => {
    if (!user) return;

    // Verificar rate limit para creación
    const rateLimitCheck = createRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.goals.rateLimitCreate.replace('{seconds}', rateLimitCheck.retryAfter?.toString() || '0'),
        { duration: 5000 }
      );
      return;
    }

    try {
      const goalUid = `${user.uid}_${Date.now()}`;

      await createGoalDocument(
        {
          title: data.title,
          targetAmount: data.targetAmount,
          currency: data.currency,
          dueDate: data.dueDate,
          userId: user.uid,
        },
        goalUid
      );
      await loadGoals();
      setIsFormOpen(false);
      toast.success(t.goals.createSuccess);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error(t.goals.createError);
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedGoal || !user) return;

    // Verificar rate limit para actualización
    const rateLimitCheck = updateRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.goals.rateLimitUpdate.replace('{seconds}', rateLimitCheck.retryAfter?.toString() || '0'),
        { duration: 5000 }
      );
      return;
    }

    try {
      await updateGoalDocument(selectedGoal.uid, {
        title: data.title,
        targetAmount: data.targetAmount,
        currency: data.currency,
        dueDate: data.dueDate,
      });
      await loadGoals();
      setSelectedGoal(null);
      setIsFormOpen(false);
      toast.success(t.goals.updateSuccess);
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error(t.goals.updateError);
      throw error;
    }
  };

  const handleDelete = (uid: string) => {
    setGoalToDelete(uid);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!goalToDelete || !user) return;

    // Verificar rate limit para eliminación
    const rateLimitCheck = deleteRateLimiter.checkLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      toast.error(
        t.goals.rateLimitDelete.replace('{seconds}', rateLimitCheck.retryAfter?.toString() || '0'),
        { duration: 5000 }
      );
      setConfirmDialogOpen(false);
      setGoalToDelete(null);
      return;
    }

    try {
      await deleteGoalDocument(goalToDelete);
      await loadGoals();
      toast.success(t.goals.deleteSuccess);
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error(t.goals.deleteError);
    } finally {
      setConfirmDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedGoal(null);
  };

  const handleAddContribution = (goal: Goal) => {
    setGoalForContribution(goal);
    setIsContributionOpen(true);
  };

  const handleContributionSubmit = async (amount: number) => {
    if (!goalForContribution) return;
    try {
      await addContributionToGoal(goalForContribution.uid, amount);
      await loadGoals();
      toast.success(t.goals.contributionSuccess);
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast.error(t.goals.contributionError);
      throw error;
    }
  };

  // Separar objetivos en activos y completados
  const activeGoals = goals.filter(goal => !isGoalComplete(goal));
  const completedGoals = goals.filter(goal => isGoalComplete(goal));

  // Calcular totales por moneda
  const totalsByCurrency = goals.reduce((acc, goal) => {
    if (!acc[goal.currency]) {
      acc[goal.currency] = { saved: 0, target: 0 };
    }
    acc[goal.currency].saved += goal.currentAmount;
    acc[goal.currency].target += goal.targetAmount;
    return acc;
  }, {} as Record<string, { saved: number; target: number }>);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2">
                  {t.goals.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t.goals.subtitle}
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedGoal(null);
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold shadow-lg shadow-amber-500/50 dark:shadow-amber-900/50 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t.goals.newGoal}
              </Button>
            </div>

            {/* Cards de resumen */}
            {goals.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Ahorrado */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.goals.totalSaved}</p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(totalsByCurrency).map(([currency, totals]) => (
                          <p key={currency} className="text-xl font-bold text-green-600 dark:text-green-400">
                            {totals.saved.toLocaleString()} {currency}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objetivos Activos */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.goals.activeGoals}</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {activeGoals.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Objetivos Completados */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t.goals.completedGoals}</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {completedGoals.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  {t.goals.noGoals}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t.goals.startGoals}
                </p>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold shadow-lg shadow-amber-500/50 dark:shadow-amber-900/50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t.goals.createFirstGoal}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Objetivos Activos */}
              {activeGoals.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-amber-600" />
                    {t.goals.activeGoalsCount.replace('{count}', activeGoals.length.toString())}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeGoals.map((goal) => (
                      <GoalCard
                        key={goal.uid}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddContribution={handleAddContribution}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Objetivos Completados */}
              {completedGoals.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    {t.goals.completedGoalsCount.replace('{count}', completedGoals.length.toString())}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGoals.map((goal) => (
                      <GoalCard
                        key={goal.uid}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddContribution={handleAddContribution}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <GoalForm
            open={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={selectedGoal ? handleUpdate : handleCreate}
            goal={selectedGoal}
          />

          <ContributionDialog
            open={isContributionOpen}
            onClose={() => setIsContributionOpen(false)}
            onSubmit={handleContributionSubmit}
            goal={goalForContribution}
          />

          <ConfirmDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            title={t.goals.deleteConfirmTitle}
            description={t.goals.deleteConfirmDescription}
            onConfirm={confirmDelete}
            confirmText={t.common.delete}
            cancelText={t.common.cancel}
            variant="destructive"
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
