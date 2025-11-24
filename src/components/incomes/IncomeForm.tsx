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

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateIncomeData & { receivedAt: Timestamp }) => Promise<void>;
  income?: Income | null;
}

export default function IncomeForm({ open, onClose, onSubmit, income }: IncomeFormProps) {
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

    // Validación adicional
    if (!formData.amount || (typeof formData.amount === 'number' && formData.amount <= 0)) {
      return;
    }

    if (!formData.source.trim()) {
      return;
    }

    if (!formData.receivedAt) {
      return;
    }

    setLoading(true);
    try {
      const receivedAtDate = createLocalDate(formData.receivedAt);
      await onSubmit({
        source: formData.source,
        amount: typeof formData.amount === 'number' ? formData.amount : parseFloat(formData.amount as string),
        currency: formData.currency,
        receivedAt: Timestamp.fromDate(receivedAtDate),
      });
    } catch (error) {
      console.error('Error submitting income:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {income ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          </DialogTitle>
          <DialogDescription>
            {income
              ? 'Modifica los detalles de tu ingreso'
              : 'Registra un nuevo ingreso en tu cuenta'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">Fuente de Ingreso</Label>
              <Input
                id="source"
                placeholder="Ej: Salario, Freelance, Venta"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="450000"
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
              <Label htmlFor="receivedAt">Fecha de Recibo</Label>
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/50 dark:shadow-green-900/50"
            >
              {loading ? 'Guardando...' : income ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
