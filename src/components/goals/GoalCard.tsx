import Goal from '@/lib/types/goal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Target, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';
import { getGoalProgress, getRemainingAmount, getDaysRemaining, isGoalComplete } from '@/lib/firebase/firestore/goals';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (uid: string) => void;
  onAddContribution: (goal: Goal) => void;
}

export default function GoalCard({ goal, onEdit, onDelete, onAddContribution }: GoalCardProps) {
  const { t, language } = useLanguage();
  const progress = getGoalProgress(goal);
  const remaining = getRemainingAmount(goal);
  const daysLeft = getDaysRemaining(goal);
  const completed = isGoalComplete(goal);
  const isOverdue = daysLeft < 0;
  const isNearDeadline = daysLeft <= 30 && daysLeft >= 0;

  const dueDate = goal.dueDate instanceof Date ? goal.dueDate : (goal.dueDate as any).toDate();
  const dateLocale = language === 'en' ? enUS : es;
  const dateFormat = language === 'en' ? "MMMM d, yyyy" : "d 'de' MMMM, yyyy";

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold mb-2">
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="truncate">{goal.title}</span>
            </CardTitle>
            {completed && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.goals.goalCompleted}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(goal)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(goal.uid)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.goals.progress}
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={progress}
            className="h-3"
            indicatorClassName={
              completed
                ? 'bg-green-600'
                : progress >= 75
                ? 'bg-amber-600'
                : 'bg-blue-600'
            }
          />
        </div>

        {/* Montos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.goals.saved}</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {goal.currentAmount.toLocaleString()} {goal.currency}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.goals.target}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {goal.targetAmount.toLocaleString()} {goal.currency}
            </p>
          </div>
        </div>

        {/* Restante */}
        {!completed && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.goals.remainingToSave}
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {remaining.toLocaleString()} {goal.currency}
              </span>
            </div>
          </div>
        )}

        {/* Fecha limite */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            {t.goals.deadline}
          </span>
          <span className={`font-semibold ${
            isOverdue
              ? 'text-red-600 dark:text-red-400'
              : isNearDeadline
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-800 dark:text-gray-200'
          }`}>
            {format(dueDate, dateFormat, { locale: dateLocale })}
          </span>
        </div>

        {/* Dias restantes */}
        {!completed && (
          <div className={`p-2 rounded-lg text-center ${
            isOverdue
              ? 'bg-red-50 dark:bg-red-900/20'
              : isNearDeadline
              ? 'bg-yellow-50 dark:bg-yellow-900/20'
              : 'bg-blue-50 dark:bg-blue-900/20'
          }`}>
            <span className={`text-sm font-medium ${
              isOverdue
                ? 'text-red-600 dark:text-red-400'
                : isNearDeadline
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {isOverdue
                ? t.goals.expiredDays.replace('{days}', Math.abs(daysLeft).toString())
                : daysLeft === 0
                ? t.goals.expiresToday
                : daysLeft === 1
                ? t.goals.expiresTomorrow
                : t.goals.daysRemaining.replace('{days}', daysLeft.toString())
              }
            </span>
          </div>
        )}

        {/* Boton de abono */}
        {!completed && (
          <Button
            onClick={() => onAddContribution(goal)}
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold shadow-lg"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {t.goals.addContribution}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
