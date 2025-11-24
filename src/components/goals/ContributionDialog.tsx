import { useState } from 'react';
import Goal from '@/lib/types/goal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { getRemainingAmount, getGoalProgress } from '@/lib/firebase/firestore/goals';

interface ContributionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  goal: Goal | null;
}

export default function ContributionDialog({ open, onClose, onSubmit, goal }: ContributionDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  if (!goal) return null;

  const remaining = getRemainingAmount(goal);
  const currentProgress = getGoalProgress(goal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(amount);
      setAmount(0);
      onClose();
    } catch (error) {
      console.error('Error adding contribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const newProgress = Math.min(100, ((goal.currentAmount + amount) / goal.targetAmount) * 100);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-600" />
            Agregar Abono
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informacion del objetivo */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-2">
            <p className="font-semibold text-gray-800 dark:text-gray-200">{goal.title}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Ahorrado</p>
                <p className="font-bold text-green-600 dark:text-green-400">
                  {goal.currentAmount.toLocaleString()} {goal.currency}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Falta</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">
                  {remaining.toLocaleString()} {goal.currency}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Progreso actual: {currentProgress.toFixed(1)}%
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto del Abono ({goal.currency})</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>

            {/* Preview del nuevo progreso */}
            {amount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Nuevo total ahorrado:{' '}
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {(goal.currentAmount + amount).toLocaleString()} {goal.currency}
                  </span>
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Nuevo progreso:{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {newProgress.toFixed(1)}%
                  </span>
                </p>
                {newProgress >= 100 && (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Completaras tu objetivo con este abono!
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold"
                disabled={loading || amount <= 0}
              >
                {loading ? 'Guardando...' : 'Agregar Abono'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
