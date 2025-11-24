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

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  goal?: Goal | null;
}

export default function GoalForm({ open, onClose, onSubmit, goal }: GoalFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: 0,
    currency: 'CRC',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      const dueDate = goal.dueDate instanceof Date
        ? goal.dueDate
        : (goal.dueDate as any).toDate();

      setFormData({
        title: goal.title,
        targetAmount: goal.targetAmount,
        currency: goal.currency,
        dueDate: dueDate.toISOString().split('T')[0],
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
    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        dueDate: new Date(formData.dueDate),
      });
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            {goal ? 'Editar Objetivo' : 'Nuevo Objetivo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo del Objetivo</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Fondo de emergencia, Vacaciones, Auto nuevo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Monto Objetivo</Label>
              <Input
                id="targetAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.targetAmount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">CRC (Colones)</SelectItem>
                  <SelectItem value="USD">USD (Dolares)</SelectItem>
                  <SelectItem value="EUR">EUR (Euros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha Limite</Label>
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
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Guardando...' : goal ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
