import { Expense } from '@/lib/types/expense';
import { Category } from '@/lib/types/category';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  onEdit: (expense: Expense) => void;
  onDelete: (uid: string) => void;
}

export default function ExpenseCard({ expense, category, onEdit, onDelete }: ExpenseCardProps) {
  const { t, language } = useLanguage();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateLocale = language === 'en' ? enUS : es;
    const dateFormat = language === 'en' ? "MMMM d, yyyy" : "d 'de' MMMM, yyyy";
    return format(date, dateFormat, { locale: dateLocale });
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-semibold truncate">{category?.name || t.expenses.noCategory}</span>
          <span className="text-sm font-normal text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
            {t.expenses.expenseLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t.expenses.amountLabel}
          </span>
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            {expense.amount.toLocaleString()} {expense.currency}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t.expenses.dateLabel}
          </span>
          <span className="text-sm font-medium">{formatDate(expense.date)}</span>
        </div>
        {expense.note && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4" />
              {t.expenses.noteLabel}
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">{expense.note}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          onClick={() => onEdit(expense)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {t.expenses.editButton}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-all"
          onClick={() => onDelete(expense.uid)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t.expenses.deleteButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
