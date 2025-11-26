import { useState, useEffect } from 'react';
import { Installment, UpdateInstallmentData } from '@/lib/types/installment';
import { Category } from '@/lib/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface InstallmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  installment?: Installment | null;
  categories: Category[];
}

export default function InstallmentForm({ open, onClose, onSubmit, installment, categories }: InstallmentFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    description: string;
    category_id: string;
    total_amount: number | '';
    installments: number | '';
    current_installment: number | '';
    currency: string;
    start_date: string;
    tax: number | '';
  }>({
    description: '',
    category_id: '',
    total_amount: '',
    installments: 12,
    current_installment: 0,
    currency: 'CRC',
    start_date: '',
    tax: '',
  });

  useEffect(() => {
    if (installment) {
      // Obtener el ID de la categoría desde la referencia
      const categoryId = typeof installment.category_id === 'string'
        ? installment.category_id
        : installment.category_id.id;

      setFormData({
        description: installment.description,
        category_id: categoryId,
        total_amount: installment.total_amount,
        installments: installment.installments,
        current_installment: installment.current_installment,
        currency: installment.currency,
        start_date: dateToLocalString(installment.start_date),
        tax: installment.tax || 0,
      });
    } else {
      setFormData({
        description: '',
        category_id: '',
        total_amount: '',
        installments: 12,
        current_installment: 0,
        currency: 'CRC',
        start_date: dateToLocalString(new Date()),
        tax: '',
      });
    }
  }, [installment, open]);

  const calculateMonthlyAmount = () => {
    const total = typeof formData.total_amount === 'number' ? formData.total_amount : 0;
    const tax = typeof formData.tax === 'number' ? formData.tax : 0;
    const installmentsCount = typeof formData.installments === 'number' ? formData.installments : 0;

    if (installmentsCount > 0 && total > 0) {
      const totalWithTax = total + (total * tax / 100);
      return totalWithTax / installmentsCount;
    }
    return 0;
  };

  const calculateTotalWithTax = () => {
    const total = typeof formData.total_amount === 'number' ? formData.total_amount : 0;
    const tax = typeof formData.tax === 'number' ? formData.tax : 0;
    return total + (total * tax / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitizar y validar inputs
      const sanitizedDescription = sanitizeWithMaxLength(formData.description, 300);
      const sanitizedTotalAmount = sanitizeNumber(formData.total_amount);
      const sanitizedInstallments = sanitizeNumber(formData.installments);
      const sanitizedCurrentInstallment = sanitizeNumber(formData.current_installment);
      const sanitizedTax = sanitizeNumber(formData.tax);

      if (!sanitizedDescription || sanitizedDescription.length < 3) {
        toast.error(t.installments.descriptionValidation);
        return;
      }

      if (!sanitizedTotalAmount || sanitizedTotalAmount <= 0) {
        toast.error(t.installments.totalAmountValidation);
        return;
      }

      if (!sanitizedInstallments || sanitizedInstallments <= 0) {
        toast.error(t.installments.installmentsValidation);
        return;
      }

      if (!formData.category_id) {
        toast.error(t.installments.categoryValidation);
        return;
      }

      if (!formData.start_date) {
        toast.error(t.installments.startDateValidation);
        return;
      }

      setLoading(true);
      const startDateObj = createLocalDate(formData.start_date);
      const monthly_amount = calculateMonthlyAmount();

      await onSubmit({
        description: sanitizedDescription,
        category_id: formData.category_id,
        total_amount: sanitizedTotalAmount,
        installments: Math.floor(sanitizedInstallments),
        current_installment: Math.floor(sanitizedCurrentInstallment),
        monthly_amount: monthly_amount,
        currency: formData.currency,
        start_date: Timestamp.fromDate(startDateObj),
        tax: sanitizedTax,
      });
    } catch (error: any) {
      console.error('Error submitting installment:', error);
      toast.error(error.message || t.installments.saveError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {installment ? t.installments.formTitleEdit : t.installments.formTitleNew}
          </DialogTitle>
          <DialogDescription>
            {installment ? t.installments.formDescriptionEdit : t.installments.formDescriptionNew}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">{t.installments.descriptionField}</Label>
              <Textarea
                id="description"
                placeholder={t.installments.descriptionPlaceholder}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white dark:bg-gray-900 min-h-[60px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t.installments.categoryField}</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue placeholder={t.installments.selectCategoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.uid} value={category.uid}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">{t.installments.taxField}</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                placeholder={t.installments.taxPlaceholder}
                value={formData.tax}
                onChange={(e) =>
                  setFormData({ ...formData, tax: e.target.value === '' ? '' : parseFloat(e.target.value) })
                }
                className="bg-white dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.installments.taxHelp}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">{t.installments.totalAmountField}</Label>
                <Input
                  id="total_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={t.installments.totalAmountPlaceholder}
                  value={formData.total_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, total_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t.installments.currencyField}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-900">
                    <SelectValue placeholder={t.installments.selectCurrencyPlaceholder} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installments">{t.installments.installmentsField}</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  placeholder={t.installments.installmentsPlaceholder}
                  value={formData.installments}
                  onChange={(e) =>
                    setFormData({ ...formData, installments: e.target.value === '' ? '' : parseInt(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_installment">{t.installments.currentInstallmentField}</Label>
                <Input
                  id="current_installment"
                  type="number"
                  min="0"
                  max={typeof formData.installments === 'number' ? formData.installments : undefined}
                  placeholder={t.installments.currentInstallmentPlaceholder}
                  value={formData.current_installment}
                  onChange={(e) =>
                    setFormData({ ...formData, current_installment: e.target.value === '' ? '' : parseInt(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">{t.installments.startDateField}</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            {/* Información calculada */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.installments.calculatedInfo}
              </p>
              <div className="space-y-1">
                {(typeof formData.tax === 'number' && formData.tax > 0) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t.installments.totalWithTax} <span className="font-semibold">
                      {calculateTotalWithTax().toLocaleString()} {formData.currency}
                    </span>
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.installments.monthlyPayment} <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {calculateMonthlyAmount().toLocaleString()} {formData.currency}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.installments.progressInfo} <span className="font-semibold">
                    {t.installments.installmentsProgress
                      .replace('{current}', formData.current_installment.toString())
                      .replace('{total}', formData.installments.toString())}
                  </span>
                </p>
              </div>
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
              {t.installments.cancelButton}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-500/50 dark:shadow-orange-900/50"
            >
              {loading ? t.installments.savingButton : installment ? t.installments.updateButton : t.installments.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
