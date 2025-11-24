import { useState, useEffect } from 'react';
import { Expense, UpdateExpenseData } from '@/lib/types/expense';
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

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  expense?: Expense | null;
  categories: Category[];
}

export default function ExpenseForm({ open, onClose, onSubmit, expense, categories }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    categoryId: string;
    amount: number | '';
    currency: string;
    date: string;
    note: string;
  }>({
    categoryId: '',
    amount: '',
    currency: 'CRC',
    date: '',
    note: '',
  });

  useEffect(() => {
    if (expense) {
      // Obtener el ID de la categoría desde la referencia
      const categoryId = typeof expense.categoryId === 'string'
        ? expense.categoryId
        : expense.categoryId.id;

      setFormData({
        categoryId: categoryId,
        amount: expense.amount,
        currency: expense.currency,
        date: dateToLocalString(expense.date),
        note: expense.note || '',
      });
    } else {
      // Si solo hay una categoría, pre-seleccionarla
      const defaultCategoryId = categories.length === 1 ? categories[0].uid : '';
      const defaultCurrency = categories.length === 1 ? categories[0].currency : 'CRC';

      setFormData({
        categoryId: defaultCategoryId,
        amount: '',
        currency: defaultCurrency,
        date: dateToLocalString(new Date()),
        note: '',
      });
    }
  }, [expense, open, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.amount || formData.amount <= 0) {
      return;
    }

    if (!formData.categoryId) {
      return;
    }

    if (!formData.date) {
      return;
    }

    setLoading(true);
    try {
      const dateObj = createLocalDate(formData.date);
      await onSubmit({
        categoryId: formData.categoryId,
        amount: formData.amount,
        currency: formData.currency,
        date: Timestamp.fromDate(dateObj),
        note: formData.note,
      });
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            {expense ? 'Editar Gasto' : 'Nuevo Gasto'}
          </DialogTitle>
          <DialogDescription>
            {expense
              ? 'Modifica los detalles de tu gasto'
              : 'Registra un nuevo gasto en tu cuenta'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue placeholder="Selecciona una categoría" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="15000"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value === '' ? '' : parseFloat(e.target.value) })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-900">
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC - Colón Costarricense</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                    <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                    <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha del Gasto</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Nota (Opcional)</Label>
              <Textarea
                id="note"
                placeholder="Ej: Compra en supermercado, pago de servicios..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="bg-white dark:bg-gray-900 min-h-[80px]"
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/50 dark:shadow-red-900/50"
            >
              {loading ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
