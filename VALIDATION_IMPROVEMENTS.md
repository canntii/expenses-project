# Mejoras de Validación de Datos

## Resumen

Este documento explica cómo mejorar la validación de datos en tu aplicación de finanzas personales. Actualmente tienes validación básica, pero hay varias capas adicionales que puedes implementar para mayor seguridad y mejor experiencia de usuario.

---

## Estado Actual de Validación

### ✅ Ya Implementado

1. **Validación de Cliente (Frontend)**
   - Sanitización con DOMPurify en todos los formularios
   - Validación de longitud máxima de strings
   - Validación de números (NaN, Infinity, valores negativos)
   - Mensajes de error descriptivos con toast notifications

2. **Validación de Backend (Firestore Rules)**
   - Verificación de ownership (userId)
   - Longitud máxima de campos de texto
   - Tipos de datos correctos
   - Prevención de campos vacíos requeridos

### ⚠️ Oportunidades de Mejora

Aunque ya tienes buena validación, hay áreas que puedes mejorar:

1. **Validación de Negocio más Estricta**
2. **Validación en Tiempo Real**
3. **Validación de Relaciones entre Datos**
4. **Prevención de Datos Duplicados**

---

## Mejoras Recomendadas

### 1. Validación de Reglas de Negocio

#### Problema
Actualmente no validas reglas de negocio complejas como:
- ¿Los gastos exceden el presupuesto mensual de la categoría?
- ¿Las cuotas tienen fechas de inicio válidas?
- ¿Los objetivos tienen fechas alcanzables?

#### Solución

Crea un módulo de validación de negocio en `src/lib/validation/businessRules.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';
import { Category } from '@/lib/types/category';
import { Expense } from '@/lib/types/expense';
import { Installment } from '@/lib/types/installment';
import { Goal } from '@/lib/types/goal';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Valida si un gasto está dentro del límite mensual de su categoría
 */
export async function validateExpenseAgainstBudget(
  expense: { amount: number; categoryId: string; date: Timestamp },
  category: Category,
  existingExpensesThisMonth: Expense[]
): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  // Calcular total gastado en el mes
  const totalSpent = existingExpensesThisMonth.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const newTotal = totalSpent + expense.amount;

  // Verificar límite mensual
  if (category.monthly_limit && newTotal > category.monthly_limit) {
    const overage = newTotal - category.monthly_limit;
    result.warnings!.push(
      `Este gasto excederá el presupuesto mensual de "${category.name}" por ${overage.toFixed(2)} ${category.currency}`
    );
    // No es un error bloqueante, solo advertencia
  }

  // Verificar que la categoría esté activa para el mes del gasto
  if (category.activeMonths && category.activeMonths.length > 0) {
    const expenseMonth = expense.date.toDate().getMonth();
    if (!category.activeMonths.includes(expenseMonth)) {
      result.valid = false;
      result.errors.push(
        `La categoría "${category.name}" no está activa para el mes seleccionado`
      );
    }
  }

  return result;
}

/**
 * Valida las fechas de un plan de cuotas
 */
export function validateInstallmentDates(
  installment: Pick<Installment, 'start_date' | 'installments' | 'current_installment'>
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [] };

  const startDate = installment.start_date.toDate();
  const today = new Date();

  // No permitir fechas de inicio muy antiguas (más de 5 años)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  if (startDate < fiveYearsAgo) {
    result.valid = false;
    result.errors.push('La fecha de inicio no puede ser mayor a 5 años en el pasado');
  }

  // No permitir fechas de inicio muy futuras (más de 2 años)
  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

  if (startDate > twoYearsFromNow) {
    result.valid = false;
    result.errors.push('La fecha de inicio no puede ser mayor a 2 años en el futuro');
  }

  // Validar que current_installment sea razonable
  if (installment.current_installment < 0) {
    result.valid = false;
    result.errors.push('La cuota actual no puede ser negativa');
  }

  if (installment.current_installment > installment.installments) {
    result.valid = false;
    result.errors.push('La cuota actual no puede ser mayor al número total de cuotas');
  }

  return result;
}

/**
 * Valida que un objetivo sea alcanzable
 */
export function validateGoalFeasibility(
  goal: Pick<Goal, 'targetAmount' | 'currentAmount' | 'deadline' | 'currency'>
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  // El objetivo debe ser mayor al monto actual
  if (goal.targetAmount <= goal.currentAmount) {
    result.valid = false;
    result.errors.push('El monto objetivo debe ser mayor al monto actual');
  }

  // Validar deadline
  if (goal.deadline) {
    const deadlineDate = goal.deadline.toDate();
    const today = new Date();

    if (deadlineDate < today) {
      result.valid = false;
      result.errors.push('La fecha límite no puede estar en el pasado');
    }

    // Advertencia si la fecha límite está muy cerca y falta mucho dinero
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remaining = goal.targetAmount - goal.currentAmount;

    if (daysRemaining < 30 && remaining > goal.targetAmount * 0.5) {
      result.warnings!.push(
        `Quedan ${daysRemaining} días y aún falta ${remaining.toFixed(2)} ${goal.currency}. ¿Considera extender la fecha límite?`
      );
    }
  }

  return result;
}

/**
 * Valida que no haya duplicados al crear categorías
 */
export function validateCategoryUniqueness(
  newCategoryName: string,
  existingCategories: Category[],
  userId: string
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [] };

  // Verificar nombre duplicado (case-insensitive)
  const duplicate = existingCategories.find(
    (cat) =>
      cat.userId === userId &&
      cat.name.toLowerCase().trim() === newCategoryName.toLowerCase().trim()
  );

  if (duplicate) {
    result.valid = false;
    result.errors.push(
      `Ya existe una categoría con el nombre "${newCategoryName}"`
    );
  }

  return result;
}

/**
 * Valida montos razonables (prevenir errores de entrada)
 */
export function validateReasonableAmount(
  amount: number,
  type: 'expense' | 'income' | 'installment' | 'goal'
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  // Límites según tipo
  const limits = {
    expense: { min: 0.01, max: 1000000, warningMax: 10000 },
    income: { min: 0.01, max: 10000000, warningMax: 100000 },
    installment: { min: 1, max: 5000000, warningMax: 50000 },
    goal: { min: 1, max: 100000000, warningMax: 1000000 },
  };

  const limit = limits[type];

  if (amount < limit.min) {
    result.valid = false;
    result.errors.push(`El monto mínimo es ${limit.min}`);
  }

  if (amount > limit.max) {
    result.valid = false;
    result.errors.push(`El monto máximo es ${limit.max.toLocaleString()}`);
  }

  // Advertencia para montos inusualmente altos
  if (amount > limit.warningMax) {
    result.warnings!.push(
      `El monto ingresado (${amount.toLocaleString()}) es inusualmente alto. ¿Está seguro?`
    );
  }

  return result;
}
```

#### Integración en Formularios

Ejemplo para [ExpenseForm.tsx](src/components/expenses/ExpenseForm.tsx):

```typescript
import {
  validateExpenseAgainstBudget,
  validateReasonableAmount,
} from '@/lib/validation/businessRules';
import { getUserCategories } from '@/lib/firebase/firestore/categories';
import { getUserExpenses } from '@/lib/firebase/firestore/expenses';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const sanitizedAmount = sanitizeNumber(formData.amount);
    const sanitizedNote = formData.note
      ? sanitizeWithMaxLength(formData.note, 500)
      : '';

    // Validación de sanitización (ya existe)
    if (!sanitizedAmount || sanitizedAmount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    // NUEVA: Validación de monto razonable
    const amountValidation = validateReasonableAmount(sanitizedAmount, 'expense');
    if (!amountValidation.valid) {
      toast.error(amountValidation.errors[0]);
      return;
    }

    // NUEVA: Mostrar advertencias si las hay
    if (amountValidation.warnings && amountValidation.warnings.length > 0) {
      const confirmed = window.confirm(
        `${amountValidation.warnings[0]}\n\n¿Desea continuar?`
      );
      if (!confirmed) return;
    }

    // NUEVA: Validar contra presupuesto si hay categoría seleccionada
    if (formData.categoryId && user) {
      const categories = await getUserCategories(user.uid);
      const category = categories.find((c) => c.uid === formData.categoryId);

      if (category) {
        const expenses = await getUserExpenses(user.uid);
        const expenseDate = new Date(formData.date);
        const monthExpenses = expenses.filter((e) => {
          const ed = e.date.toDate();
          return (
            ed.getMonth() === expenseDate.getMonth() &&
            ed.getFullYear() === expenseDate.getFullYear() &&
            e.categoryId === formData.categoryId
          );
        });

        const budgetValidation = await validateExpenseAgainstBudget(
          {
            amount: sanitizedAmount,
            categoryId: formData.categoryId,
            date: Timestamp.fromDate(expenseDate),
          },
          category,
          monthExpenses
        );

        if (!budgetValidation.valid) {
          toast.error(budgetValidation.errors[0]);
          return;
        }

        if (budgetValidation.warnings && budgetValidation.warnings.length > 0) {
          toast.warning(budgetValidation.warnings[0]);
          // Continuar de todos modos, es solo una advertencia
        }
      }
    }

    // Continuar con el submit normal...
    await onSubmit({
      categoryId: formData.categoryId,
      amount: sanitizedAmount,
      currency: formData.currency,
      date: Timestamp.fromDate(dateObj),
      note: sanitizedNote,
    });
  } catch (error: any) {
    toast.error(error.message || 'Error al guardar el gasto');
  }
};
```

---

### 2. Validación en Tiempo Real

#### Problema
Los usuarios solo ven errores después de enviar el formulario.

#### Solución

Implementa validación mientras el usuario escribe:

```typescript
// En ExpenseForm.tsx
import { useState, useEffect } from 'react';

const ExpenseForm = () => {
  const [formData, setFormData] = useState({...});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Validación en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsValidating(true);
      const errors: Record<string, string> = {};

      // Validar monto
      if (formData.amount) {
        const amountValidation = validateReasonableAmount(
          sanitizeNumber(formData.amount),
          'expense'
        );
        if (!amountValidation.valid) {
          errors.amount = amountValidation.errors[0];
        }
      }

      // Validar nota
      if (formData.note && formData.note.length > 500) {
        errors.note = 'La nota no puede exceder 500 caracteres';
      }

      setValidationErrors(errors);
      setIsValidating(false);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [formData.amount, formData.note]);

  return (
    <div>
      <Input
        name="amount"
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        className={validationErrors.amount ? 'border-red-500' : ''}
      />
      {validationErrors.amount && (
        <p className="text-sm text-red-500 mt-1">{validationErrors.amount}</p>
      )}

      <Textarea
        name="note"
        value={formData.note}
        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
        maxLength={500}
        className={validationErrors.note ? 'border-red-500' : ''}
      />
      <div className="flex justify-between text-sm mt-1">
        <span className={validationErrors.note ? 'text-red-500' : 'text-gray-500'}>
          {formData.note?.length || 0}/500 caracteres
        </span>
        {validationErrors.note && (
          <span className="text-red-500">{validationErrors.note}</span>
        )}
      </div>
    </div>
  );
};
```

---

### 3. Validación Backend Mejorada en Firestore Rules

#### Problema Actual
Tus Firestore Rules validan ownership y tipos básicos, pero no validan reglas de negocio.

#### Solución

Actualiza [firestore-production-validated.rules](firestore-production-validated.rules):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Funciones helper mejoradas
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isValidString(str, minLen, maxLen) {
      return str is string &&
             str.size() >= minLen &&
             str.size() <= maxLen &&
             str.trim().size() > 0; // No strings vacíos o solo espacios
    }

    function isValidNumber(num, min, max) {
      return num is number &&
             num >= min &&
             num <= max &&
             num == num; // Prevenir NaN
    }

    function isValidDate(timestamp) {
      return timestamp is timestamp &&
             timestamp > timestamp.date(2020, 1, 1) && // No fechas muy antiguas
             timestamp < timestamp.date(2030, 12, 31); // No fechas muy futuras
    }

    // Categories con validación mejorada
    match /categories/{categoryId} {
      allow read: if isOwner(resource.data.userId);

      allow create: if isOwner(request.resource.data.userId) &&
                       isValidString(request.resource.data.name, 1, 100) &&
                       isValidNumber(request.resource.data.monthly_limit, 0, 1000000) &&
                       request.resource.data.type in ['income', 'expense'] &&
                       request.resource.data.currency in ['USD', 'EUR', 'MXN', 'CLP', 'ARS'];

      allow update: if isOwner(resource.data.userId) &&
                       request.resource.data.userId == resource.data.userId && // No cambiar owner
                       isValidString(request.resource.data.name, 1, 100) &&
                       isValidNumber(request.resource.data.monthly_limit, 0, 1000000);

      allow delete: if isOwner(resource.data.userId);
    }

    // Expenses con validación de montos razonables
    match /expenses/{expenseId} {
      allow read: if isOwner(resource.data.userId);

      allow create: if isOwner(request.resource.data.userId) &&
                       isValidNumber(request.resource.data.amount, 0.01, 1000000) &&
                       isValidDate(request.resource.data.date) &&
                       request.resource.data.currency in ['USD', 'EUR', 'MXN', 'CLP', 'ARS'] &&
                       (!('note' in request.resource.data) ||
                        isValidString(request.resource.data.note, 0, 500));

      allow update: if isOwner(resource.data.userId) &&
                       request.resource.data.userId == resource.data.userId &&
                       isValidNumber(request.resource.data.amount, 0.01, 1000000) &&
                       isValidDate(request.resource.data.date);

      allow delete: if isOwner(resource.data.userId);
    }

    // Installments con validación de cuotas
    match /installments/{installmentId} {
      allow read: if isOwner(resource.data.userId);

      allow create: if isOwner(request.resource.data.userId) &&
                       isValidNumber(request.resource.data.total_amount, 1, 5000000) &&
                       isValidNumber(request.resource.data.installments, 2, 360) && // Max 30 años
                       isValidNumber(request.resource.data.current_installment, 0, 360) &&
                       request.resource.data.current_installment <= request.resource.data.installments &&
                       isValidDate(request.resource.data.start_date) &&
                       isValidString(request.resource.data.description, 1, 300);

      allow update: if isOwner(resource.data.userId) &&
                       request.resource.data.current_installment >= resource.data.current_installment; // Solo puede incrementar

      allow delete: if isOwner(resource.data.userId);
    }

    // Goals con validación de fechas
    match /goals/{goalId} {
      allow read: if isOwner(resource.data.userId);

      allow create: if isOwner(request.resource.data.userId) &&
                       isValidNumber(request.resource.data.targetAmount, 1, 100000000) &&
                       isValidNumber(request.resource.data.currentAmount, 0, 100000000) &&
                       request.resource.data.currentAmount < request.resource.data.targetAmount &&
                       isValidString(request.resource.data.title, 3, 150) &&
                       (!('deadline' in request.resource.data) ||
                        (isValidDate(request.resource.data.deadline) &&
                         request.resource.data.deadline > request.time)); // Deadline en el futuro

      allow update: if isOwner(resource.data.userId) &&
                       request.resource.data.currentAmount >= resource.data.currentAmount; // Solo puede incrementar

      allow delete: if isOwner(resource.data.userId);
    }
  }
}
```

---

## Resumen de Mejoras

| Mejora | Prioridad | Tiempo | Impacto |
|--------|-----------|---------|---------|
| Validación de reglas de negocio | Alta | 4-6 horas | Previene errores lógicos |
| Validación en tiempo real | Media | 2-3 horas | Mejor UX |
| Firestore Rules mejoradas | Alta | 2 horas | Seguridad backend |
| Prevención de duplicados | Media | 1-2 horas | Consistencia de datos |
| Validación de montos razonables | Alta | 1 hora | Previene errores de entrada |

**Total estimado: 10-14 horas**

---

## Próximos Pasos Recomendados

1. **Primero**: Implementa validación de montos razonables (fácil y alto impacto)
2. **Segundo**: Mejora las Firestore Rules (seguridad crítica)
3. **Tercero**: Agrega validación de reglas de negocio
4. **Cuarto**: Implementa validación en tiempo real (mejor UX)

¿Quieres que implemente alguna de estas mejoras específicamente?
