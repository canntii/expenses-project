import { Income } from '@/lib/types/income';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: (uid: string) => void;
}

export default function IncomeCard({ income, onEdit, onDelete }: IncomeCardProps) {
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
          <span className="text-xl font-semibold">{income.source}</span>
          <span className="text-sm font-normal text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
            {t.incomes.incomeLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t.incomes.amountLabel}
          </span>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {income.amount.toLocaleString()} {income.currency}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t.incomes.receivedDateLabel}
          </span>
          <span className="text-sm font-medium">{formatDate(income.receivedAt)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{t.incomes.currencyLabel}</span>
          <span className="text-sm font-medium">{income.currency}</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          onClick={() => onEdit(income)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {t.incomes.editButton}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-all"
          onClick={() => onDelete(income.uid)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t.incomes.deleteButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
