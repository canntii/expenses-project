'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, Info, Trash2 } from 'lucide-react';

type CellValue = string | number;
type GridData = CellValue[][];

// Función para obtener el nombre de columna (A, B, C, ... N)
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index); // 65 = 'A'
};

// Función para obtener valores de un rango de celdas
const getRangeValues = (range: string, grid: GridData): number[] => {
  const rangeMatch = range.match(/([A-N])([1-9]|1[0-4]):([A-N])([1-9]|1[0-4])/);
  if (!rangeMatch) return [];

  const [, startCol, startRow, endCol, endRow] = rangeMatch;
  const startColIndex = startCol.charCodeAt(0) - 65;
  const startRowIndex = parseInt(startRow) - 1;
  const endColIndex = endCol.charCodeAt(0) - 65;
  const endRowIndex = parseInt(endRow) - 1;

  const values: number[] = [];
  for (let r = Math.min(startRowIndex, endRowIndex); r <= Math.max(startRowIndex, endRowIndex); r++) {
    for (let c = Math.min(startColIndex, endColIndex); c <= Math.max(startColIndex, endColIndex); c++) {
      const cellValue = grid[r]?.[c];
      if (cellValue !== undefined && cellValue !== '') {
        const num = parseFloat(cellValue.toString());
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }
  }
  return values;
};

// Función para evaluar fórmulas simples
const evaluateFormula = (formula: string, grid: GridData): number | string => {
  try {
    // Si no empieza con =, no es una fórmula
    if (!formula.startsWith('=')) {
      const num = parseFloat(formula);
      return isNaN(num) ? formula : num;
    }

    // Remover el = inicial
    let expression = formula.substring(1).toUpperCase();

    // Funciones de agregación con rangos
    // SUM/SUMA(A1:A5)
    expression = expression.replace(/(SUM|SUMA)\(([A-N][1-9]|1[0-4]):([A-N][1-9]|1[0-4])\)/g, (match, func, ...args) => {
      const range = `${args[0]}:${args[1]}`;
      const values = getRangeValues(range, grid);
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum.toString();
    });

    // SUBTRACT/RESTA(A1:A5) - Resta el primer valor menos todos los demás
    expression = expression.replace(/(SUBTRACT|RESTA)\(([A-N][1-9]|1[0-4]):([A-N][1-9]|1[0-4])\)/g, (match, func, ...args) => {
      const range = `${args[0]}:${args[1]}`;
      const values = getRangeValues(range, grid);
      if (values.length === 0) return '0';
      if (values.length === 1) return values[0].toString();
      const result = values[0] - values.slice(1).reduce((acc, val) => acc + val, 0);
      return result.toString();
    });

    // AVG/PROMEDIO(A1:A5) o AVERAGE(A1:A5)
    expression = expression.replace(/(AVG|AVERAGE|PROMEDIO)\(([A-N][1-9]|1[0-4]):([A-N][1-9]|1[0-4])\)/g, (match, func, ...args) => {
      const range = `${args[0]}:${args[1]}`;
      const values = getRangeValues(range, grid);
      if (values.length === 0) return '0';
      const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
      return avg.toString();
    });

    // MAX/MAXIMO(A1:A5)
    expression = expression.replace(/(MAX|MAXIMO)\(([A-N][1-9]|1[0-4]):([A-N][1-9]|1[0-4])\)/g, (match, func, ...args) => {
      const range = `${args[0]}:${args[1]}`;
      const values = getRangeValues(range, grid);
      if (values.length === 0) return '0';
      const max = Math.max(...values);
      return max.toString();
    });

    // MIN/MINIMO(A1:A5)
    expression = expression.replace(/(MIN|MINIMO)\(([A-N][1-9]|1[0-4]):([A-N][1-9]|1[0-4])\)/g, (match, func, ...args) => {
      const range = `${args[0]}:${args[1]}`;
      const values = getRangeValues(range, grid);
      if (values.length === 0) return '0';
      const min = Math.min(...values);
      return min.toString();
    });

    // Reemplazar referencias de celdas individuales (A1, B2, etc.) con sus valores
    const cellReferenceRegex = /([A-N])([1-9]|1[0-4])/g;
    expression = expression.replace(cellReferenceRegex, (match, col, row) => {
      const colIndex = col.charCodeAt(0) - 65; // A=0, B=1, etc.
      const rowIndex = parseInt(row) - 1;

      const cellValue = grid[rowIndex]?.[colIndex];

      if (cellValue === undefined || cellValue === '') {
        return '0';
      }

      // Si la celda contiene una fórmula, evaluarla recursivamente
      if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
        const result = evaluateFormula(cellValue, grid);
        return typeof result === 'number' ? result.toString() : '0';
      }

      const num = parseFloat(cellValue.toString());
      return isNaN(num) ? '0' : num.toString();
    });

    // Evaluar la expresión matemática
    // eslint-disable-next-line no-eval
    const result = eval(expression);
    return typeof result === 'number' ? result : expression;
  } catch (error) {
    return '#ERROR';
  }
};

export default function BudgetsPage() {
  const { t } = useLanguage();
  const [grid, setGrid] = useState<GridData>(
    Array(14).fill(null).map(() => Array(14).fill(''))
  );
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [isSelectingCell, setIsSelectingCell] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newGrid = grid.map((r, rIndex) =>
      rIndex === row ? r.map((c, cIndex) => (cIndex === col ? value : c)) : r
    );
    setGrid(newGrid);

    // Si el valor comienza con =, activar modo de selección
    if (value.startsWith('=') && value.length > 0) {
      setIsSelectingCell(true);
    } else {
      setIsSelectingCell(false);
    }
  };

  const handleMouseDown = (row: number, col: number, event: React.MouseEvent) => {
    // Si estamos en modo de selección de celdas para fórmulas
    if (isSelectingCell && editingCell) {
      event.preventDefault();
      event.stopPropagation();

      // Iniciar drag para selección de rango
      setIsDragging(true);
      setDragStart({ row, col });
      setDragEnd({ row, col });
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    // Si estamos arrastrando, actualizar el final del rango
    if (isDragging && dragStart) {
      setDragEnd({ row, col });
    }
  };

  const handleMouseUp = () => {
    // Si terminamos de arrastrar, agregar el rango a la fórmula
    if (isDragging && dragStart && dragEnd && editingCell) {
      const startRef = `${getColumnLabel(dragStart.col)}${dragStart.row + 1}`;
      const endRef = `${getColumnLabel(dragEnd.col)}${dragEnd.row + 1}`;
      const currentValue = grid[editingCell.row][editingCell.col].toString();

      // Si solo seleccionó una celda, agregar solo la referencia
      const newValue = (dragStart.row === dragEnd.row && dragStart.col === dragEnd.col)
        ? currentValue + startRef
        : currentValue + startRef + ':' + endRef;

      handleCellChange(editingCell.row, editingCell.col, newValue);

      // Mantener el foco en la barra de fórmulas
      setTimeout(() => {
        const input = document.querySelector('input[placeholder*="formula"]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.setSelectionRange(newValue.length, newValue.length);
        }
      }, 10);
    }

    // Resetear estado de drag
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isCellInDragRange = (row: number, col: number): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);

    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const getCellDisplayValue = (row: number, col: number): string => {
    const cellValue = grid[row][col];

    // Si la celda está siendo editada, mostrar el valor original (incluyendo la fórmula)
    if (editingCell?.row === row && editingCell?.col === col) {
      return cellValue.toString();
    }

    // Si es una fórmula, mostrar el resultado
    if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
      const result = evaluateFormula(cellValue, grid);
      return typeof result === 'number' ? result.toLocaleString() : result.toString();
    }

    return cellValue.toString();
  };

  const handleClearAll = () => {
    setGrid(Array(14).fill(null).map(() => Array(14).fill('')));
    setIsSelectingCell(false);
  };

  const handleClearCell = () => {
    if (focusedCell) {
      handleCellChange(focusedCell.row, focusedCell.col, '');
      setIsSelectingCell(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto mt-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="pb-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  {t.budgets.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t.budgets.subtitle}
                </p>
              </div>
            </div>

            {/* Formula Bar - Excel Style */}
            {focusedCell && (
              <Card className="mb-4 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {getColumnLabel(focusedCell.col)}{focusedCell.row + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={grid[focusedCell.row][focusedCell.col]}
                        onChange={(e) => handleCellChange(focusedCell.row, focusedCell.col, e.target.value)}
                        className="font-mono text-sm border-gray-300 dark:border-gray-600"
                        placeholder={t.budgets.enterFormula}
                        onFocus={() => setEditingCell(focusedCell)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            // Desactivar modo de selección
                            setIsSelectingCell(false);
                            setEditingCell(null);
                            // Mover a la siguiente fila
                            if (focusedCell.row < 13) {
                              setFocusedCell({ row: focusedCell.row + 1, col: focusedCell.col });
                            }
                          } else if (e.key === 'Escape') {
                            // Cancelar edición
                            setIsSelectingCell(false);
                            setEditingCell(null);
                            setFocusedCell(null);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="mb-6 border-0 shadow-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                      {t.budgets.instructions}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {t.budgets.instructionsText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 mb-4">
              <Button
                onClick={handleClearCell}
                disabled={!focusedCell}
                variant="outline"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.budgets.clearCell}
              </Button>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.budgets.clearAll}
              </Button>
            </div>
          </div>

          {/* Spreadsheet Grid */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <Calculator className="w-5 h-5" />
                {t.budgets.budgetName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 w-12">
                        #
                      </th>
                      {Array.from({ length: 14 }, (_, i) => (
                        <th
                          key={i}
                          className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]"
                        >
                          {getColumnLabel(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-center">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, colIndex) => {
                          const isCurrentlyEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                          const isSelectable = isSelectingCell && !isCurrentlyEditing;
                          const isInDragRange = isCellInDragRange(rowIndex, colIndex);
                          const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;

                          return (
                            <td
                              key={colIndex}
                              className="border border-gray-300 dark:border-gray-600 p-0 relative group"
                              onMouseDown={(e) => {
                                if (isSelectable) {
                                  handleMouseDown(rowIndex, colIndex, e);
                                }
                              }}
                              onMouseEnter={() => {
                                if (isSelectable) {
                                  handleMouseEnter(rowIndex, colIndex);
                                }
                              }}
                              onMouseUp={handleMouseUp}
                            >
                              {isCurrentlyEditing ? (
                                <Input
                                  value={grid[rowIndex][colIndex]}
                                  onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                  className="w-full h-10 border-0 rounded-none px-2 text-sm font-mono focus:ring-0 focus:outline-none bg-white dark:bg-gray-800"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setIsSelectingCell(false);
                                      setEditingCell(null);
                                      if (rowIndex < 13) {
                                        setFocusedCell({ row: rowIndex + 1, col: colIndex });
                                      }
                                    } else if (e.key === 'Escape') {
                                      setIsSelectingCell(false);
                                      setEditingCell(null);
                                      setFocusedCell(null);
                                    } else if (e.key === 'Tab') {
                                      e.preventDefault();
                                      setIsSelectingCell(false);
                                      setEditingCell(null);
                                      if (colIndex < 13) {
                                        setFocusedCell({ row: rowIndex, col: colIndex + 1 });
                                        setEditingCell({ row: rowIndex, col: colIndex + 1 });
                                      }
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!isSelectingCell) {
                                      setEditingCell(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <div
                                  className={`w-full h-10 flex items-center px-2 cursor-cell text-sm transition-colors ${
                                    isFocused
                                      ? 'bg-blue-50 dark:bg-blue-900/30 font-medium'
                                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  }`}
                                  onClick={() => {
                                    if (!isSelectable) {
                                      setFocusedCell({ row: rowIndex, col: colIndex });
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    if (!isSelectable) {
                                      setFocusedCell({ row: rowIndex, col: colIndex });
                                      setEditingCell({ row: rowIndex, col: colIndex });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (isFocused && !isCurrentlyEditing && !isSelectable) {
                                      // Si presionan cualquier tecla alfanumérica o =, empezar a editar
                                      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                                        setEditingCell({ row: rowIndex, col: colIndex });
                                        if (e.key === 'Backspace' || e.key === 'Delete') {
                                          handleCellChange(rowIndex, colIndex, '');
                                        }
                                      }
                                    }
                                  }}
                                  tabIndex={isFocused ? 0 : -1}
                                >
                                  {getCellDisplayValue(rowIndex, colIndex)}
                                </div>
                              )}
                              {/* Borde de selección */}
                              {isFocused && !isSelectable && (
                                <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 dark:border-blue-400" />
                              )}
                              {/* Overlay de selección de rangos */}
                              {isSelectable && (
                                <div
                                  className={`absolute inset-0 pointer-events-none border-2 transition-colors ${
                                    isInDragRange
                                      ? 'border-green-500 bg-green-100/30 dark:bg-green-900/30'
                                      : 'border-blue-500 bg-blue-100/10 dark:bg-blue-900/10 group-hover:border-green-500 group-hover:bg-green-100/20 dark:group-hover:bg-green-900/20'
                                  }`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Formula Examples */}
          <Card className="mt-6 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                {t.budgets.operations}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Operaciones básicas */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t.budgets.basicOperations || 'Operaciones Básicas'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="font-semibold text-green-700 dark:text-green-400 mb-1 text-sm">
                        {t.budgets.sum}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300">
                        =A1+B1+C1
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p className="font-semibold text-red-700 dark:text-red-400 mb-1 text-sm">
                        {t.budgets.subtract}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300">
                        =A1-B1
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <p className="font-semibold text-purple-700 dark:text-purple-400 mb-1 text-sm">
                        {t.budgets.multiply}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300">
                        =A1*B1
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1 text-sm">
                        {t.budgets.divide}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300">
                        =A1/B1
                      </code>
                    </div>
                  </div>
                </div>

                {/* Funciones con rangos */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t.budgets.rangeFunctions || 'Funciones con Rangos'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1 text-sm">
                        {t.budgets.sumFunction || 'Suma'}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300 block">
                        =SUM(A1:A5)
                      </code>
                      <code className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        =SUMA(A1:A5)
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p className="font-semibold text-red-700 dark:text-red-400 mb-1 text-sm">
                        {t.budgets.subtractFunction || 'Resta'}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300 block">
                        =SUBTRACT(A1:A5)
                      </code>
                      <code className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        =RESTA(A1:A5)
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
                      <p className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1 text-sm">
                        {t.budgets.avgFunction || 'Promedio'}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300 block">
                        =AVG(B1:B10)
                      </code>
                      <code className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        =PROMEDIO(B1:B10)
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 text-sm">
                        {t.budgets.maxFunction || 'Máximo'}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300 block">
                        =MAX(C1:C5)
                      </code>
                      <code className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        =MAXIMO(C1:C5)
                      </code>
                    </div>
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                      <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1 text-sm">
                        {t.budgets.minFunction || 'Mínimo'}
                      </p>
                      <code className="text-xs text-gray-700 dark:text-gray-300 block">
                        =MIN(D1:D5)
                      </code>
                      <code className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                        =MINIMO(D1:D5)
                      </code>
                    </div>
                  </div>
                </div>

                {/* Tip sobre selección de rangos */}
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>💡 {t.budgets.tip || 'Tip'}:</strong> {t.budgets.dragTip || 'Escribe = en una celda y arrastra el mouse para seleccionar un rango de celdas'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
