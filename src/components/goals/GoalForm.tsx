import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createLocalDate, dateToLocalString } from '@/lib/utils/dates';
import { sanitizeNumber, sanitizeWithMaxLength } from '@/lib/utils/sanitize';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  goal?: Goal | null;
}

export default function GoalForm({ open, onClose, onSubmit, goal }: GoalFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: 0,
    currency: 'CRC',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        targetAmount: goal.targetAmount,
        currency: goal.currency,
        dueDate: dateToLocalString(goal.dueDate),
      });
    } else {
      setFormData({
        title: '',
        targetAmount: 0,
        currency: 'CRC',
        dueDate: '',
      });
    }
  }, [goal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitizar y validar inputs
      const sanitizedTitle = sanitizeWithMaxLength(formData.title, 150);
      const sanitizedAmount = sanitizeNumber(formData.targetAmount);

      if (!sanitizedTitle || sanitizedTitle.length < 3) {
        toast.error(t.goals.titleValidation);
        return;
      }

      if (!sanitizedAmount || sanitizedAmount <= 0) {
        toast.error(t.goals.amountValidation);
        return;
      }

      if (!formData.dueDate) {
        toast.error(t.goals.dueDateValidation);
        return;
      }

      setLoading(true);
      await onSubmit({
        title: sanitizedTitle,
        targetAmount: sanitizedAmount,
        currency: formData.currency,
        dueDate: createLocalDate(formData.dueDate),
      });
      onClose();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || t.goals.saveError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            {goal ? t.goals.formTitleEdit : t.goals.formTitleNew}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t.goals.titleField}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.goals.titlePlaceholder}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">{t.goals.targetAmountField}</Label>
              <Input
                id="targetAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder={t.goals.targetAmountPlaceholder}
                value={formData.targetAmount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t.goals.currencyField}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.goals.currencyPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">{t.currencies.CRC}</SelectItem>
                  <SelectItem value="USD">{t.currencies.USD}</SelectItem>
                  <SelectItem value="EUR">{t.currencies.EUR}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">{t.goals.dueDateField}</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? t.goals.saving : goal ? t.goals.update : t.goals.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
