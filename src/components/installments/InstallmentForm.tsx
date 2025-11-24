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

interface InstallmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  installment?: Installment | null;
  categories: Category[];
}

export default function InstallmentForm({ open, onClose, onSubmit, installment, categories }: InstallmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category_id: '',
    total_amount: 0,
    installments: 12,
    current_installment: 0,
    currency: 'CRC',
    start_date: '',
    tax: 0,
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
        total_amount: 0,
        installments: 12,
        current_installment: 0,
        currency: 'CRC',
        start_date: dateToLocalString(new Date()),
        tax: 0,
      });
    }
  }, [installment, open]);

  const calculateMonthlyAmount = () => {
    if (formData.installments > 0) {
      const totalWithTax = formData.total_amount + (formData.total_amount * formData.tax / 100);
      return totalWithTax / formData.installments;
    }
    return 0;
  };

  const calculateTotalWithTax = () => {
    return formData.total_amount + (formData.total_amount * formData.tax / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.description.trim()) {
      return;
    }

    if (formData.total_amount <= 0) {
      return;
    }

    if (formData.installments <= 0) {
      return;
    }

    if (!formData.category_id) {
      return;
    }

    if (!formData.start_date) {
      return;
    }

    setLoading(true);
    try {
      const startDateObj = createLocalDate(formData.start_date);
      const monthly_amount = calculateMonthlyAmount();

      await onSubmit({
        description: formData.description,
        category_id: formData.category_id,
        total_amount: formData.total_amount,
        installments: formData.installments,
        current_installment: formData.current_installment,
        monthly_amount: monthly_amount,
        currency: formData.currency,
        start_date: Timestamp.fromDate(startDateObj),
        tax: formData.tax,
      });
    } catch (error) {
      console.error('Error submitting installment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {installment ? 'Editar Deuda/Cuota' : 'Nueva Deuda/Cuota'}
          </DialogTitle>
          <DialogDescription>
            {installment
              ? 'Modifica los detalles de tu deuda o cuota'
              : 'Registra una nueva deuda o compra en cuotas'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Ej: Tarjeta de crédito, Préstamo personal, Laptop en cuotas"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white dark:bg-gray-900 min-h-[60px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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

            <div className="space-y-2">
              <Label htmlFor="tax">Impuesto (%)</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.tax}
                onChange={(e) =>
                  setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })
                }
                className="bg-white dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Porcentaje de impuesto aplicado al monto total
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Monto Total</Label>
                <Input
                  id="total_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Cuotas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  placeholder="12"
                  value={formData.installments}
                  onChange={(e) =>
                    setFormData({ ...formData, installments: parseInt(e.target.value) || 1 })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_installment">Cuota Actual</Label>
                <Input
                  id="current_installment"
                  type="number"
                  min="0"
                  max={formData.installments}
                  placeholder="0"
                  value={formData.current_installment}
                  onChange={(e) =>
                    setFormData({ ...formData, current_installment: parseInt(e.target.value) || 0 })
                  }
                  className="bg-white dark:bg-gray-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
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
                💡 Información calculada:
              </p>
              <div className="space-y-1">
                {formData.tax > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total con impuesto: <span className="font-semibold">
                      {calculateTotalWithTax().toLocaleString()} {formData.currency}
                    </span>
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cuota mensual: <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {calculateMonthlyAmount().toLocaleString()} {formData.currency}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Progreso: <span className="font-semibold">
                    {formData.current_installment} / {formData.installments} cuotas
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-500/50 dark:shadow-orange-900/50"
            >
              {loading ? 'Guardando...' : installment ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
