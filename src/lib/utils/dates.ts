/**
 * Crea un objeto Date a partir de un string de fecha (YYYY-MM-DD)
 * manteniendo la fecha en la zona horaria local, no en UTC.
 *
 * Esto evita el bug donde una fecha se registra un día antes debido
 * a la conversión de zona horaria.
 *
 * @param dateString - String de fecha en formato YYYY-MM-DD
 * @returns Date object con la fecha en hora local (mediodía)
 */
export function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Crear la fecha a las 12:00 PM hora local para evitar problemas con cambios de día
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Convierte un Date o Timestamp de Firebase a string en formato YYYY-MM-DD
 *
 * @param date - Date object o Timestamp de Firebase
 * @returns String en formato YYYY-MM-DD
 */
export function dateToLocalString(date: Date | { toDate: () => Date }): string {
  const dateObj = 'toDate' in date ? date.toDate() : date;
  return dateObj.toISOString().split('T')[0];
}
