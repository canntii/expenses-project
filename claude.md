# Proyecto: Personal Finance Dashboard

## Objetivo
Estoy construyendo un dashboard de finanzas personales donde pueda:
- Definir categorías de gasto (fijas y variables)
- Registrar ingresos (recurrentes y puntuales)
- Registrar gastos
- Manejar compras en cuotas (installments)
- Ver un resumen mensual (ingresos, gastos, cuotas, balance) y gráficos por categoría.

## Stack técnico
- Next.js App Router (src/app)
- TypeScript
- Tailwind + shadcn/ui
- Firebase Auth + Firestore

## Estructura de carpetas (importante)

- `src/app/(auth)/`  
  - `login`, `register`: pantallas públicas de autenticación.

- `src/app/(dashboard)/`  
  - `layout.tsx`: layout con sidebar/topbar (requiere usuario logueado).
  - `page.tsx`: dashboard principal (resumen).
  - `categories/page.tsx`: gestión de categorías.
  - `expenses/page.tsx`: gestión de gastos.
  - `incomes/page.tsx`: gestión de ingresos.
  - `installments/page.tsx`: gestión de cuotas.

- `src/components/ui/`: componentes base de shadcn (Button, Card, Dialog, Table, etc).
- `src/components/`: componentes de layout, forms, charts y dashboard.

- `src/lib/firebase/client.ts`: inicialización de Firebase (auth + firestore).
- `src/lib/firebase/auth.ts`: login, logout, register.
- `src/lib/firebase/firestore/`: funciones de acceso a Firestore:
  - `categories.ts`, `expenses.ts`, `incomes.ts`, `installments.ts`, `users.ts`.

- `src/lib/types/`: tipos TS (`Category`, `Expense`, `Income`, `Installment`, `User`).
- `src/lib/hooks/`: hooks React para auth y datos (useAuth, useCategories, etc.).
- `src/lib/utils/`: helpers para formato de moneda, fechas, cálculos.

- `src/services/`: lógica de negocio (resúmenes mensuales, stats por categoría, etc).

## Reglas importantes

- No mover archivos entre carpetas sin que yo lo pida explícitamente.
- Toda la lógica de Firestore debe vivir en `src/lib/firebase/firestore/*.ts`.
- Los componentes de React **no** deben llamar Firestore directo: usar hooks o funciones de `lib`.
- Mantener los componentes pequeños y reutilizables.
- Siempre usar TypeScript con tipos explícitos.
- Al hacer cambios grandes, primero proponer un plan en texto y luego el código.

## Estilo de UI

- Usar componentes de `src/components/ui` (shadcn) para formularios, tablas, diálogos y tarjetas.
- Mantener un estilo limpio, tipo dashboard: máximo 2–3 niveles de anidación de componentes.