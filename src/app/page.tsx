'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/lib/types/category';
import { Expense } from '@/lib/types/expense';
import { Income } from '@/lib/types/income';
import { Installment } from '@/lib/types/installment';
import Goal from '@/lib/types/goal';
import { getUserCategories } from '@/lib/firebase/firestore/categories';
import { getUserExpenses } from '@/lib/firebase/firestore/expenses';
import { getUserIncomes } from '@/lib/firebase/firestore/income';
import { getUserInstallments, getRemainingAmount } from '@/lib/firebase/firestore/installments';
import { getUserGoals, getGoalProgress } from '@/lib/firebase/firestore/goals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

// Chart visibility configuration type
interface ChartVisibility {
  chart1: boolean; // Historial 6 Meses
  chart2: boolean; // Gastos por Categoria
  chart3: boolean; // Tendencia de Ahorro
  chart4: boolean; // Progreso de Objetivos
  chart5: boolean; // Gastos Fijos vs Variables
  chart6: boolean; // Top 5 Gastos Individuales
  chart7: boolean; // Evolucion de Deudas
  chart8: boolean; // Distribucion de Ingresos
  chart9: boolean; // Comparacion Mes Actual vs Anterior
  chart10: boolean; // Heatmap de Gastos
}

const DEFAULT_CHART_VISIBILITY: ChartVisibility = {
  chart1: true,
  chart2: true,
  chart3: true,
  chart4: true,
  chart5: true,
  chart6: true,
  chart7: true,
  chart8: true,
  chart9: true,
  chart10: true,
};

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Estado para el filtro de mes
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Estado para configuracion de graficos
  const [showConfig, setShowConfig] = useState(false);
  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>(DEFAULT_CHART_VISIBILITY);

  // Generar lista de meses y años disponibles
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: es })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Load chart visibility from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chartVisibility');
    if (saved) {
      try {
        setChartVisibility(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading chart visibility:', error);
      }
    }
  }, []);

  // Save chart visibility to localStorage
  const updateChartVisibility = (key: keyof ChartVisibility, value: boolean) => {
    const newVisibility = { ...chartVisibility, [key]: value };
    setChartVisibility(newVisibility);
    localStorage.setItem('chartVisibility', JSON.stringify(newVisibility));
  };

  const showAllCharts = () => {
    setChartVisibility(DEFAULT_CHART_VISIBILITY);
    localStorage.setItem('chartVisibility', JSON.stringify(DEFAULT_CHART_VISIBILITY));
  };

  const hideAllCharts = () => {
    const allHidden = Object.keys(DEFAULT_CHART_VISIBILITY).reduce((acc, key) => {
      acc[key as keyof ChartVisibility] = false;
      return acc;
    }, {} as ChartVisibility);
    setChartVisibility(allHidden);
    localStorage.setItem('chartVisibility', JSON.stringify(allHidden));
  };

  const resetChartVisibility = () => {
    setChartVisibility(DEFAULT_CHART_VISIBILITY);
    localStorage.setItem('chartVisibility', JSON.stringify(DEFAULT_CHART_VISIBILITY));
  };

  const localSelected = t.dashboard.languageL === "es" ? es : enUS;
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [categoriesData, expensesData, incomesData, installmentsData, goalsData] = await Promise.all([
        getUserCategories(user.uid),
        getUserExpenses(user.uid),
        getUserIncomes(user.uid),
        getUserInstallments(user.uid),
        getUserGoals(user.uid)
      ]);
      setCategories(categoriesData);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setInstallments(installmentsData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      router.push('/login');
    }
  }, [user, loadData, router]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
          <div className="max-w-7xl mx-auto mt-4">
            <div className="text-center py-20">
              <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Calcular rango del mes seleccionado
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  // Filtrar datos del mes actual
  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
    return expenseDate >= monthStart && expenseDate <= monthEnd;
  });

  const currentMonthIncomes = incomes.filter(income => {
    const incomeDate = income.receivedAt.toDate ? income.receivedAt.toDate() : new Date(income.receivedAt as any);
    return incomeDate >= monthStart && incomeDate <= monthEnd;
  });

  // Totales por moneda
  const totalExpensesByCurrency = currentMonthExpenses.reduce((acc, expense) => {
    acc[expense.currency] = (acc[expense.currency] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalIncomesByCurrency = currentMonthIncomes.reduce((acc, income) => {
    acc[income.currency] = (acc[income.currency] || 0) + income.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalDebtsByCurrency = installments.reduce((acc, installment) => {
    acc[installment.currency] = (acc[installment.currency] || 0) + getRemainingAmount(installment);
    return acc;
  }, {} as Record<string, number>);

  // Balance por moneda
  const currencies = Array.from(new Set([
    ...Object.keys(totalIncomesByCurrency),
    ...Object.keys(totalExpensesByCurrency)
  ]));

  const balanceByCurrency = currencies.reduce((acc, currency) => {
    const income = totalIncomesByCurrency[currency] || 0;
    const expense = totalExpensesByCurrency[currency] || 0;
    acc[currency] = income - expense;
    return acc;
  }, {} as Record<string, number>);

  // Gastos por categoría
  const expensesByCategory = currentMonthExpenses.reduce((acc, expense) => {
    const categoryId = typeof expense.categoryId === 'string'
      ? expense.categoryId
      : expense.categoryId.id;

    const category = categories.find(cat => cat.uid === categoryId);
    if (category) {
      const existing = acc.find(item => item.name === category.name);
      if (existing) {
        existing.value += expense.amount;
      } else {
        acc.push({ name: category.name, value: expense.amount });
      }
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Historial de últimos 6 meses desde el mes seleccionado
  const selectedDate = new Date(selectedYear, selectedMonth);
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(selectedDate, 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthExpenses = expenses.filter(expense => {
      const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
      return expenseDate >= start && expenseDate <= end;
    }).reduce((sum, expense) => sum + expense.amount, 0);

    const monthIncomes = incomes.filter(income => {
      const incomeDate = income.receivedAt.toDate ? income.receivedAt.toDate() : new Date(income.receivedAt as any);
      return incomeDate >= start && incomeDate <= end;
    }).reduce((sum, income) => sum + income.amount, 0);

    return {
      month: format(date, 'MMM', { locale: es }),
      ingresos: monthIncomes,
      gastos: monthExpenses,
      balance: monthIncomes - monthExpenses
    };
  });

  // Top categorías con más gastos (filtradas por mes seleccionado)
  const topCategories = categories.map(category => {
    const spent = currentMonthExpenses
      .filter(expense => {
        const categoryId = typeof expense.categoryId === 'string'
          ? expense.categoryId
          : expense.categoryId.id;
        return categoryId === category.uid;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const percentage = category.monthly_limit > 0 ? (spent / category.monthly_limit) * 100 : 0;
    const isOverLimit = spent > category.monthly_limit && category.monthly_limit > 0;
    const isNearLimit = percentage >= 80 && !isOverLimit && category.monthly_limit > 0;

    return {
      category,
      spent,
      percentage,
      isOverLimit,
      isNearLimit
    };
  })
  .filter(item => item.spent > 0)
  .sort((a, b) => b.percentage - a.percentage)
  .slice(0, 5);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  // Common Tooltip style for all charts
  const tooltipStyle = {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
      background: "white",
      padding: "8px 10px",
    },
    labelStyle: { fontSize: 12, color: "#0f172a" },
  };

  // === DATA CALCULATIONS FOR NEW CHARTS ===

  // Chart 3: Tendencia de Ahorro (AreaChart) - Balance acumulado ultimos 6 meses
  const savingsTrendData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(selectedDate, 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthIncomes = incomes.filter(income => {
      const incomeDate = income.receivedAt.toDate ? income.receivedAt.toDate() : new Date(income.receivedAt as any);
      return incomeDate >= start && incomeDate <= end;
    }).reduce((sum, income) => sum + income.amount, 0);

    const monthExpenses = expenses.filter(expense => {
      const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
      return expenseDate >= start && expenseDate <= end;
    }).reduce((sum, expense) => sum + expense.amount, 0);

    return {
      month: format(date, 'MMM', { locale: es }),
      ahorro: monthIncomes - monthExpenses,
    };
  });

  // Calculate accumulated savings
  let accumulatedSavings = 0;
  const savingsTrendDataAccumulated = savingsTrendData.map(item => {
    accumulatedSavings += item.ahorro;
    return {
      month: item.month,
      ahorro: accumulatedSavings,
    };
  });

  // Chart 4: Progreso de Objetivos (BarChart Horizontal)
  const goalsProgressData = goals.map(goal => ({
    name: goal.title.length > 20 ? goal.title.substring(0, 20) + '...' : goal.title,
    progreso: getGoalProgress(goal),
  })).slice(0, 5);

  // Chart 5: Gastos Fijos vs Variables (BarChart Vertical)
  const fixedVsVariableData = categories.reduce((acc, category) => {
    const categoryExpenses = currentMonthExpenses
      .filter(expense => {
        const categoryId = typeof expense.categoryId === 'string'
          ? expense.categoryId
          : expense.categoryId.id;
        return categoryId === category.uid;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    if (category.type === 'fixed') {
      acc[0].total += categoryExpenses;
    } else {
      acc[1].total += categoryExpenses;
    }
    return acc;
  }, [
    { type: 'Fijos', total: 0 },
    { type: 'Variables', total: 0 }
  ]);

  // Chart 6: Top 5 Gastos Individuales (BarChart Horizontal)
  const top5ExpensesData = [...currentMonthExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(expense => {
      const category = categories.find(cat => {
        const categoryId = typeof expense.categoryId === 'string'
          ? expense.categoryId
          : expense.categoryId.id;
        return cat.uid === categoryId;
      });
      const displayName = expense.note || category?.name || 'Gasto sin nota';
      return {
        name: displayName.length > 25 ? displayName.substring(0, 25) + '...' : displayName,
        monto: expense.amount,
        categoria: category?.name || 'Sin categoria',
      };
    });

  // Chart 7: Evolucion de Deudas (LineChart) - Deuda total mes a mes
  const debtEvolutionData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(selectedDate, 5 - i);
    const monthLabel = format(date, 'MMM', { locale: es });

    // For simplicity, we'll show current total debt for all months
    // In a real scenario, you'd track historical debt data
    const totalDebt = installments.reduce((sum, inst) => sum + getRemainingAmount(inst), 0);

    return {
      month: monthLabel,
      deuda: totalDebt,
    };
  });

  // Chart 8: Distribucion de Ingresos (DonutChart) - Por fuente
  const incomeDistributionData = currentMonthIncomes.reduce((acc, income) => {
    const existing = acc.find(item => item.name === income.source);
    if (existing) {
      existing.value += income.amount;
    } else {
      acc.push({ name: income.source, value: income.amount });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Chart 9: Comparacion Mes Actual vs Anterior (BarChart Vertical Agrupado)
  const previousMonthDate = subMonths(selectedDate, 1);
  const prevMonthStart = startOfMonth(previousMonthDate);
  const prevMonthEnd = endOfMonth(previousMonthDate);

  const previousMonthExpenses = expenses.filter(expense => {
    const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
    return expenseDate >= prevMonthStart && expenseDate <= prevMonthEnd;
  });

  const previousMonthIncomes = incomes.filter(income => {
    const incomeDate = income.receivedAt.toDate ? income.receivedAt.toDate() : new Date(income.receivedAt as any);
    return incomeDate >= prevMonthStart && incomeDate <= prevMonthEnd;
  });

  const currentVsPreviousData = [
    {
      category: 'Ingresos',
      mesAnterior: previousMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0),
      mesActual: currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0),
    },
    {
      category: 'Gastos',
      mesAnterior: previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      mesActual: currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    },
    {
      category: 'Balance',
      mesAnterior: previousMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0) - previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      mesActual: currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0) - currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    },
  ];

  // Chart 10: Heatmap de Gastos por Categoria (Matrix) - Ultimos 6 meses
  const heatmapData = categories.map(category => {
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(selectedDate, 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthExpenses = expenses.filter(expense => {
        const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date as any);
        const categoryId = typeof expense.categoryId === 'string'
          ? expense.categoryId
          : expense.categoryId.id;
        return expenseDate >= start && expenseDate <= end && categoryId === category.uid;
      }).reduce((sum, expense) => sum + expense.amount, 0);

      return {
        month: format(date, 'MMM', { locale: es }),
        amount: monthExpenses,
      };
    });

    return {
      category: category.name,
      data: monthlyData,
    };
  }).filter(item => item.data.some(d => d.amount > 0)); // Only show categories with some spending

  const CHART_NAMES = {
  chart1: t.dashboard.historyLast6Months,
  chart2: t.dashboard.expensesByCategory,
  chart3: t.dashboard.savingsTrend,
  chart4: t.dashboard.goalsProgress,
  chart5: t.dashboard.fixedVsVariableExpenses,
  chart6: t.dashboard.top5IndividualExpenses,
  chart7: t.dashboard.debtEvolution,
  chart8: t.dashboard.incomeDistribution,
  chart9: t.dashboard.currentVsPreviousMonthComparison,
  chart10: t.dashboard.expensesHeatmapByCategory,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="pb-2 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {t.dashboard.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  
                  {t.dashboard.summaryLegend} {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: localSelected })}
                </p>
              </div>
            </div>

            {/* Filtro de mes y año */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.common.filterBy}</span>
                </div>
                <div className="flex gap-3 flex-1 max-w-full">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Chart Configuration Panel */}
            <div className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.dashboard.graphicsSetup}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs"
                >
                  {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {showConfig && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(chartVisibility) as Array<keyof ChartVisibility>).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={chartVisibility[key]}
                          onCheckedChange={(checked) => updateChartVisibility(key, checked as boolean)}
                        />
                        <label
                          htmlFor={key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {CHART_NAMES[key]}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={showAllCharts}
                      className="text-xs"
                    >
                      {t.dashboard.showAll}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={hideAllCharts}
                      className="text-xs"
                    >
                      {t.dashboard.hideAll}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetChartVisibility}
                      className="text-xs"
                    >
                      {t.dashboard.reset}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cards de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Ingresos */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboard.incomebyMonthLeyend}
                </CardTitle>
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                {Object.entries(totalIncomesByCurrency).map(([currency, total]) => (
                  <div key={currency} className="mb-1">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {total.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currency}</p>
                  </div>
                ))}
                {Object.keys(totalIncomesByCurrency).length === 0 && (
                  <div className="text-2xl font-bold text-gray-400">0</div>
                )}
              </CardContent>
            </Card>

            {/* Gastos */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboard.expenseByMonthLeyend}
                </CardTitle>
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                {Object.entries(totalExpensesByCurrency).map(([currency, total]) => (
                  <div key={currency} className="mb-1">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {total.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currency}</p>
                  </div>
                ))}
                {Object.keys(totalExpensesByCurrency).length === 0 && (
                  <div className="text-2xl font-bold text-gray-400">0</div>
                )}
              </CardContent>
            </Card>

            {/* Balance */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboard.BalanceMonthLeyend}
                </CardTitle>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                {currencies.map(currency => {
                  const balance = balanceByCurrency[currency];
                  const isPositive = balance >= 0;
                  return (
                    <div key={currency} className="mb-1 flex items-center gap-2">
                      <div className={`text-2xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {balance.toLocaleString()}
                      </div>
                      {isPositive ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">{currency}</p>
                    </div>
                  );
                })}
                {currencies.length === 0 && (
                  <div className="text-2xl font-bold text-gray-400">0</div>
                )}
              </CardContent>
            </Card>

            {/* Deudas */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboard.installmentsPendingLeyend}
                </CardTitle>
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                {Object.entries(totalDebtsByCurrency).map(([currency, total]) => (
                  <div key={currency} className="mb-1">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {total.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currency}</p>
                  </div>
                ))}
                {Object.keys(totalDebtsByCurrency).length === 0 && (
                  <div className="text-2xl font-bold text-gray-400">0</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid - Responsive based on visibility */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart 1: Historial de Ultimos 6 Meses */}
            {chartVisibility.chart1 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={last6Months}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Ingresos" />
                      <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Gastos" />
                      <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Balance" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 2: Gastos por Categoria */}
            {chartVisibility.chart2 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart2}</CardTitle>
                </CardHeader>
                <CardContent>
                  {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          labelLine={false}
                          label={({ name, percent }) => {
                            const percentage = ((percent || 0) * 100).toFixed(0);
                            return window.innerWidth < 640 ? `${percentage}%` : `${name} (${percentage}%)`;
                          }}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {expensesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px' }}
                          iconSize={10}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No hay gastos registrados este mes
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chart 3: Tendencia de Ahorro */}
            {chartVisibility.chart3 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart3}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={savingsTrendDataAccumulated}>
                      <defs>
                        <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="ahorro" stroke="#22c55e" strokeWidth={2} fill="url(#savingsGradient)" name="Ahorro Acumulado" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 4: Progreso de Objetivos */}
            {chartVisibility.chart4 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart4}</CardTitle>
                </CardHeader>
                <CardContent>
                  {goalsProgressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={goalsProgressData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 10 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={window.innerWidth < 640 ? 100 : 150}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: window.innerWidth < 640 ? 10 : 11 }}
                        />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="progreso" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Progreso %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No hay objetivos registrados
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chart 5: Gastos Fijos vs Variables */}
            {chartVisibility.chart5 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart5}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fixedVsVariableData}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                      <Bar dataKey="total" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 6: Top 5 Gastos Individuales */}
            {chartVisibility.chart6 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart6}</CardTitle>
                </CardHeader>
                <CardContent>
                  {top5ExpensesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={top5ExpensesData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" horizontal={false} />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 10 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={window.innerWidth < 640 ? 100 : 150}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: window.innerWidth < 640 ? 10 : 11 }}
                        />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="monto" fill="#ec4899" radius={[0, 6, 6, 0]} name="Monto" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No hay gastos registrados este mes
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chart 7: Evolucion de Deudas */}
            {chartVisibility.chart7 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart7}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={debtEvolutionData}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="deuda" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Deuda Total" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 8: Distribucion de Ingresos */}
            {chartVisibility.chart8 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart8}</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          labelLine={false}
                          label={({ name, percent }) => {
                            const percentage = ((percent || 0) * 100).toFixed(0);
                            return window.innerWidth < 640 ? `${percentage}%` : `${name} (${percentage}%)`;
                          }}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incomeDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px' }}
                          iconSize={10}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No hay ingresos registrados este mes
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chart 9: Comparacion Mes Actual vs Anterior */}
            {chartVisibility.chart9 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart9}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={currentVsPreviousData}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                      <Bar dataKey="mesAnterior" fill="#94a3b8" radius={[6, 6, 0, 0]} name="Mes Anterior" />
                      <Bar dataKey="mesActual" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Mes Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 10: Heatmap de Gastos por Categoria */}
            {chartVisibility.chart10 && (
              <Card className="rounded-2xl border border-slate-100 shadow-lg bg-white dark:bg-gray-800/80 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">{CHART_NAMES.chart10}</CardTitle>
                </CardHeader>
                <CardContent>
                  {heatmapData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-gray-800">
                          <tr>
                            <th className="text-left p-3 border-b border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold">{t.dashboard.category}</th>
                            {Array.from({ length: 6 }, (_, i) => {
                              const date = subMonths(selectedDate, 5 - i);
                              return (
                                <th key={i} className="text-center p-3 border-b border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold">
                                  {format(date, 'MMM', { locale: es })}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmapData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-3 font-medium border-b border-slate-100 dark:border-gray-700 text-slate-800 dark:text-gray-200">{row.category}</td>
                              {row.data.map((cell, cellIndex) => {
                                const maxAmount = Math.max(...heatmapData.flatMap(r => r.data.map(d => d.amount)));
                                const intensity = maxAmount > 0 ? cell.amount / maxAmount : 0;
                                const bgColor = intensity > 0
                                  ? `rgba(239, 68, 68, ${intensity * 0.5 + 0.1})`
                                  : 'transparent';
                                return (
                                  <td
                                    key={cellIndex}
                                    className="p-3 text-center border-b border-slate-100 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-md"
                                    style={{ backgroundColor: bgColor }}
                                  >
                                    {cell.amount > 0 ? cell.amount.toLocaleString() : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      No hay datos suficientes para mostrar el heatmap
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top categorías con alertas */}
          {topCategories.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle>{t.dashboard.budgetStatusByCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCategories.map(({ category, spent, percentage, isOverLimit, isNearLimit }) => (
                    <div key={category.uid} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {category.name}
                          </span>
                          {isOverLimit && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          {isNearLimit && (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          )}
                          {!isOverLimit && !isNearLimit && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            <span className={isOverLimit ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}>
                              {spent.toLocaleString()}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400"> / {category.monthly_limit.toLocaleString()} {category.currency}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(0)}% {t.dashboard.percentageUsed}
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
