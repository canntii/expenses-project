import { Installment } from '@/lib/types/installment';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { getInstallmentProgress, getRemainingAmount } from '@/lib/firebase/firestore/installments';
import { useLanguage } from '@/contexts/LanguageContext';

interface InstallmentCardProps {
  installment: Installment;
  onEdit: (installment: Installment) => void;
  onDelete: (uid: string) => void;
  onPayInstallment: (installment: Installment) => void;
}

export default function InstallmentCard({ installment, onEdit, onDelete, onPayInstallment }: InstallmentCardProps) {
  const { t, language } = useLanguage();

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateLocale = language === 'en' ? enUS : es;
    const dateFormat = language === 'en' ? "MMMM d, yyyy" : "d 'de' MMMM, yyyy";
    return format(date, dateFormat, { locale: dateLocale });
  };

  const progress = getInstallmentProgress(installment);
  const remainingAmount = getRemainingAmount(installment);
  const isComplete = installment.current_installment >= installment.installments;

  return (
    <Card className={`shadow-lg border-0 backdrop-blur-sm hover:shadow-xl transition-all duration-200 ${
      isComplete
        ? 'bg-green-50/80 dark:bg-green-900/20'
        : 'bg-white/80 dark:bg-gray-800/80'
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-semibold truncate">{installment.description}</span>
          <span className={`text-sm font-normal px-3 py-1 rounded-full ${
            isComplete
              ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
              : 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
          }`}>
            {isComplete ? t.installments.completedStatus : t.installments.inProgressStatus}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Barra de progreso */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t.installments.progressLabel}</span>
            <span className="font-medium">{installment.current_installment} / {installment.installments}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-right text-gray-500 dark:text-gray-400">{progress.toFixed(1)}%</p>
        </div>

        {/* Montos */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t.installments.monthlyPaymentLabel}
          </span>
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {installment.monthly_amount.toLocaleString()} {installment.currency}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t.installments.totalAmountLabel}
          </span>
          <span className="text-sm font-medium">
            {installment.total_amount.toLocaleString()} {installment.currency}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{t.installments.remainingLabel}</span>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            {remainingAmount.toLocaleString()} {installment.currency}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t.installments.startDateLabel}
          </span>
          <span className="text-sm font-medium">{formatDate(installment.start_date)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {!isComplete && (
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            onClick={() => onPayInstallment(installment)}
          >
            {t.installments.payInstallmentButton}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={`${isComplete ? 'flex-1' : 'flex-none'} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all`}
          onClick={() => onEdit(installment)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {t.installments.editButton}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-none hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-all"
          onClick={() => onDelete(installment.uid)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
