import { useState, useEffect } from 'react';
import { Category, UpdateCategoryData } from '@/lib/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateCategoryData) => Promise<void>;
  category?: Category | null;
}

export default function CategoryForm({ open, onClose, onSubmit, category }: CategoryFormProps) {
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
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
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

    // Validación adicional
    const limitValue = typeof formData.monthly_limit === 'number' ? formData.monthly_limit : (formData.monthly_limit === '' ? 0 : parseFloat(formData.monthly_limit));

    if (limitValue < 0) {
      return;
    }

    if (!formData.name.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name,
        currency: formData.currency,
        monthly_limit: limitValue,
        type: formData.type,
        activeMonths: formData.activeMonths,
      });
    } catch (error) {
      console.error('Error submitting category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Modifica los detalles de tu categoría'
              : 'Crea una nueva categoría para organizar tus gastos'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Categoría</Label>
              <Input
                id="name"
                placeholder="Ej: Comida, Transporte, Entretenimiento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white dark:bg-gray-900"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Gasto</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fijo</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="monthly_limit">Límite Mensual</Label>
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
                <Label>Meses Activos</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllMonths}
                  className="text-xs h-7"
                >
                  {formData.activeMonths.length === 12 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.activeMonths.length === 0
                  ? 'Categoria visible todo el ano (no se ha seleccionado ningun mes especifico)'
                  : `Categoria visible solo en: ${formData.activeMonths.map(m => monthNames[m]).join(', ')}`
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/50 dark:shadow-blue-900/50"
            >
              {loading ? 'Guardando...' : category ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
