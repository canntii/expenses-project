import { useState, useEffect } from 'react';
import { Category, UpdateCategoryData } from '@/lib/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { sanitizeNumber, sanitizeWithMaxLength } from '@/lib/utils/sanitize';
import { toast } from 'sonner';

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateCategoryData) => Promise<void>;
  category?: Category | null;
}

export default function CategoryForm({ open, onClose, onSubmit, category }: CategoryFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    currency: string;
    monthly_limit: number | '';
    type: string;
    activeMonths: number[];
  }>({
    name: '',
    currency: 'CRC',
    monthly_limit: '',
    type: 'fixed',
    activeMonths: [],
  });

  const monthNames = [
    t.months.january, t.months.february, t.months.march, t.months.april,
    t.months.may, t.months.june, t.months.july, t.months.august,
    t.months.september, t.months.october, t.months.november, t.months.december
  ];

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        currency: category.currency,
        monthly_limit: category.monthly_limit,
        type: category.type,
        activeMonths: category.activeMonths || [],
      });
    } else {
      setFormData({
        name: '',
        currency: 'CRC',
        monthly_limit: '',
        type: 'fixed',
        activeMonths: [],
      });
    }
  }, [category, open]);

  const handleMonthToggle = (monthIndex: number) => {
    setFormData(prev => {
      const activeMonths = prev.activeMonths.includes(monthIndex)
        ? prev.activeMonths.filter(m => m !== monthIndex)
        : [...prev.activeMonths, monthIndex].sort((a, b) => a - b);
      return { ...prev, activeMonths };
    });
  };

  const toggleAllMonths = () => {
    setFormData(prev => ({
      ...prev,
      activeMonths: prev.activeMonths.length === 12 ? [] : Array.from({ length: 12 }, (_, i) => i)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitizar y validar inputs
      const sanitizedName = sanitizeWithMaxLength(formData.name, 100);
      const sanitizedLimit = sanitizeNumber(formData.monthly_limit);

      if (!sanitizedName || sanitizedName.length < 2) {
        toast.error(t.validation.nameMinLength);
        return;
      }

      if (sanitizedLimit < 0) {
        toast.error(t.validation.amountGreaterThanZero);
        return;
      }

      setLoading(true);
      await onSubmit({
        name: sanitizedName,
        currency: formData.currency,
        monthly_limit: sanitizedLimit,
        type: formData.type,
        activeMonths: formData.activeMonths,
      });
    } catch (error: any) {
      console.error('Error submitting category:', error);
      toast.error(error.message || t.categories.createError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {category ? t.categories.editCategory : t.categories.newCategory}
          </DialogTitle>
          <DialogDescription>
            {category
              ? t.categories.subtitle
              : t.categories.subtitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.categories.categoryName}</Label>
              <Input
                id="name"
                placeholder={t.categories.formPlaceHolder}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t.categories.type}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t.categories.fixed}</SelectItem>
                  <SelectItem value="variable">{t.categories.variable}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">{t.categories.currency}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-900">
                    <SelectValue />
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

              <div className="space-y-2">
                <Label htmlFor="monthly_limit">{t.categories.monthlyLimit}</Label>
                <Input
                  id="monthly_limit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50000"
                  value={formData.monthly_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_limit: e.target.value === '' ? '' : parseFloat(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.categories.activeMonth}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllMonths}
                  className="text-xs h-7"
                >
                  {formData.activeMonths.length === 12 ? t.categories.deSelectAll : t.categories.selectAll}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.activeMonths.length === 0
                  ? t.categories.visibility
                  : `${t.categories.conditionalVisibility} ${formData.activeMonths.map(m => monthNames[m]).join(', ')}`
                }
              </p>
              <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {monthNames.map((month, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`month-${index}`}
                      checked={formData.activeMonths.includes(index)}
                      onCheckedChange={() => handleMonthToggle(index)}
                    />
                    <label
                      htmlFor={`month-${index}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {month}
                    </label>
                  </div>
                ))}
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
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
            >
              {loading ? t.common.saving : category ? t.common.update : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
