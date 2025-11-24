import { Category } from '@/lib/types/category';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CategoryCardProps {
  category: Category;
  spent?: number;
  onEdit: (category: Category) => void;
  onDelete: (uid: string) => void;
}

export default function CategoryCard({ category, spent = 0, onEdit, onDelete }: CategoryCardProps) {
  const router = useRouter();
  const limit = category.monthly_limit;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const isOverLimit = spent > limit && limit > 0;
  const isNearLimit = percentage >= 80 && !isOverLimit && limit > 0;

  const handleCardClick = () => {
    router.push(`/categories/${category.uid}`);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-semibold">{category.name}</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {category.type}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Límite Mensual:</span>
          <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {category.monthly_limit.toLocaleString()} {category.currency}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Moneda:</span>
          <span className="text-sm font-medium">{category.currency}</span>
        </div>

        {/* Barra de progreso de gastos */}
        {limit > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gastado:</span>
                {isOverLimit && (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                {isNearLimit && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                {!isOverLimit && !isNearLimit && spent > 0 && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  <span className={isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}>
                    {spent.toLocaleString()}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> {category.currency}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(0)}% usado
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(percentage, 100)}
              className="h-2"
              indicatorClassName={
                isOverLimit
                  ? 'bg-red-600'
                  : isNearLimit
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }
            />
            {isOverLimit && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ⚠️ Excedido por {(spent - limit).toLocaleString()} {category.currency}
              </p>
            )}
            {isNearLimit && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Cerca del límite
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          onClick={(e) => handleButtonClick(e, () => onEdit(category))}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-all"
          onClick={(e) => handleButtonClick(e, () => onDelete(category.uid))}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </Button>
      </CardFooter>
    </Card>
  );
}
