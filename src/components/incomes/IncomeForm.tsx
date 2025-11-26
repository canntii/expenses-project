import { useState, useEffect } from 'react';
import { Income, UpdateIncomeData } from '@/lib/types/income';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timestamp } from 'firebase/firestore';
import { createLocalDate, dateToLocalString } from '@/lib/utils/dates';
import { sanitizeNumber, sanitizeWithMaxLength } from '@/lib/utils/sanitize';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateIncomeData & { receivedAt: Timestamp }) => Promise<void>;
  income?: Income | null;
}

export default function IncomeForm({ open, onClose, onSubmit, income }: IncomeFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    source: string;
    amount: number | '';
    currency: string;
    receivedAt: string;
  }>({
    source: '',
    amount: '',
    currency: 'CRC',
    receivedAt: '',
  });

  useEffect(() => {
    if (income) {
      setFormData({
        source: income.source,
        amount: income.amount,
        currency: income.currency,
        receivedAt: dateToLocalString(income.receivedAt),
      });
    } else {
      setFormData({
        source: '',
        amount: '',
        currency: 'CRC',
        receivedAt: dateToLocalString(new Date()),
      });
    }
  }, [income, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitizar y validar inputs
      const sanitizedSource = sanitizeWithMaxLength(formData.source, 200);
      const sanitizedAmount = sanitizeNumber(formData.amount);

      if (!sanitizedSource || sanitizedSource.length < 2) {
        toast.error(t.incomes.sourceValidation);
        return;
      }

      if (!sanitizedAmount || sanitizedAmount <= 0) {
        toast.error(t.incomes.amountValidation);
        return;
      }

      if (!formData.receivedAt) {
        toast.error(t.incomes.dateValidation);
        return;
      }

      setLoading(true);
      const receivedAtDate = createLocalDate(formData.receivedAt);
      await onSubmit({
        source: sanitizedSource,
        amount: sanitizedAmount,
        currency: formData.currency,
        receivedAt: Timestamp.fromDate(receivedAtDate),
      });
    } catch (error: any) {
      console.error('Error submitting income:', error);
      toast.error(error.message || t.incomes.saveError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {income ? t.incomes.formTitleEdit : t.incomes.formTitleNew}
          </DialogTitle>
          <DialogDescription>
            {income ? t.incomes.formDescriptionEdit : t.incomes.formDescriptionNew}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">{t.incomes.sourceField}</Label>
              <Input
                id="source"
                placeholder={t.incomes.sourcePlaceholder}
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t.incomes.amountField}</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={t.incomes.amountPlaceholder}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value === '' ? '' : parseFloat(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t.incomes.currencyField}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-900">
                    <SelectValue placeholder={t.incomes.selectCurrencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">{t.currencies.CRC}</SelectItem>
                    <SelectItem value="USD">{t.currencies.USD}</SelectItem>
                    <SelectItem value="EUR">{t.currencies.EUR}</SelectItem>
                    <SelectItem value="MXN">{t.currencies.MXN}</SelectItem>
                    <SelectItem value="COP">{t.currencies.COP}</SelectItem>
                    <SelectItem value="ARS">{t.currencies.ARS}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receivedAt">{t.incomes.receivedDateField}</Label>
              <Input
                id="receivedAt"
                type="date"
                value={formData.receivedAt}
                onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t.incomes.cancelButton}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/50 dark:shadow-green-900/50"
            >
              {loading ? t.incomes.savingButton : income ? t.incomes.updateButton : t.incomes.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
