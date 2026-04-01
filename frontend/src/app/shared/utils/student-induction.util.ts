import { toDateOnly, dateOnlyToUtcDate, compareDateOnly } from './date.util';

/**
 * Estados posibles de inducción de un estudiante
 */
export type EstadoInduccion = 'No realizada' | 'Realizada' | 'Próxima a vencer' | 'Vencida';

/**
 * Calcula el estado de inducción de un estudiante basado en las fechas de realización y vencimiento.
 * 
 * Estados posibles:
 * - "No realizada": Cuando el estudiante nunca ha realizado una inducción
 * - "Realizada": Cuando realizó la inducción y aún NO está próxima a vencer
 * - "Próxima a vencer": Cuando faltan 15 días o menos para que venza la inducción
 * - "Vencida": Cuando la fecha de vencimiento ya pasó
 * 
 * @param inductionCompletedAt Fecha de realización de la inducción (formato YYYY-MM-DD o Date)
 * @param inductionExpiresAt Fecha de vencimiento de la inducción (formato YYYY-MM-DD o Date)
 * @returns El estado de inducción calculado
 */
export function getEstadoInduccion(
  inductionCompletedAt?: string | Date | null,
  inductionExpiresAt?: string | Date | null
): EstadoInduccion {
  // Si no tiene fecha de realización, nunca ha realizado la inducción
  if (!inductionCompletedAt) {
    return 'No realizada';
  }

  // Normalizar fechas a formato YYYY-MM-DD
  const completedDateStr = toDateOnly(inductionCompletedAt);
  const expiryDateStr = toDateOnly(inductionExpiresAt);

  // Si no tiene fecha de vencimiento, considerar como realizada indefinidamente
  if (!expiryDateStr) {
    return 'Realizada';
  }

  // Obtener la fecha actual en formato YYYY-MM-DD
  const today = new Date();
  const todayDateOnly = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

  // Comparar con la fecha de vencimiento
  const daysDifference = calculateDaysDifference(todayDateOnly, expiryDateStr);

  if (daysDifference < 0) {
    // Fecha de vencimiento ya pasó
    return 'Vencida';
  } else if (daysDifference <= 15) {
    // Faltan 15 días o menos
    return 'Próxima a vencer';
  } else {
    // Aún queda tiempo
    return 'Realizada';
  }
}

/**
 * Calcula la diferencia en días entre dos fechas en formato YYYY-MM-DD.
 * 
 * @param date1 Primera fecha en formato YYYY-MM-DD
 * @param date2 Segunda fecha en formato YYYY-MM-DD
 * @returns Número de días (positivo si date2 es posterior a date1)
 */
function calculateDaysDifference(date1: string, date2: string): number {
  const d1 = dateOnlyToUtcDate(date1);
  const d2 = dateOnlyToUtcDate(date2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene el CSS class de un badge para el estado de inducción
 * @param estado El estado de inducción
 * @returns Clases CSS de Tailwind para el badge
 */
export function getEstadoInduccionBadgeClass(estado: EstadoInduccion): string {
  switch (estado) {
    case 'Realizada':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    case 'Próxima a vencer':
      return 'border-orange-200 text-orange-600 bg-orange-50';
    case 'Vencida':
      return 'border-rose-200 text-rose-600 bg-rose-50';
    case 'No realizada':
    default:
      return 'border-slate-200 text-slate-600 bg-slate-50';
  }
}

/**
 * Determina si el carnet está entregado
 * @param numeroCarnet Número del carnet
 * @returns true si el estudiante tiene carnet asignado
 */
export function tieneCarnetEntregado(numeroCarnet?: string | null): boolean {
  return !!numeroCarnet && numeroCarnet.trim().length > 0;
}

/**
 * Determina si el carnet ha sido devuelto
 * @param fechaDevolucion Fecha de devolución del carnet
 * @returns true si el carnet fue devuelto
 */
export function carnetDevuelto(fechaDevolucion?: string | Date | null): boolean {
  return !!fechaDevolucion;
}

/**
 * Determina el estado del carnet (Activo / Devuelto / Sin carnet)
 * @param numeroCarnet Número del carnet
 * @param fechaDevolucion Fecha de devolución del carnet
 * @returns El estado del carnet como string
 */
export function getEstadoCarnet(
  numeroCarnet?: string | null,
  fechaDevolucion?: string | Date | null
): 'Activo' | 'Devuelto' | 'Sin carnet' {
  if (!tieneCarnetEntregado(numeroCarnet)) {
    return 'Sin carnet';
  }
  if (carnetDevuelto(fechaDevolucion)) {
    return 'Devuelto';
  }
  return 'Activo';
}

/**
 * Obtiene el CSS class de un badge para el estado del carnet
 * @param estado El estado del carnet
 * @returns Clases CSS de Tailwind para el badge
 */
export function getEstadoCarnetBadgeClass(estado: 'Activo' | 'Devuelto' | 'Sin carnet'): string {
  switch (estado) {
    case 'Activo':
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    case 'Devuelto':
      return 'border-slate-200 text-slate-600 bg-slate-50';
    case 'Sin carnet':
    default:
      return 'border-amber-200 text-amber-600 bg-amber-50';
  }
}
