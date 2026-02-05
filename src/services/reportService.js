/**
 * MÓDULO 11: REPORTES
 * reportService.js
 *
 * Orquestador central de reportes
 * - Define tipos de reportes disponibles
 * - Valida datos aprobados (solo APPROVED/CLOSED)
 * - Implementa cacheo de reportes
 * - Coordina generación de reportes
 */

import { supabase } from '../lib/supabase';

// Tipos de reportes soportados
export const REPORT_TYPES = {
  // Reportes operativos
  FINANCE: 'finance',
  INVENTORY: 'inventory',
  LIVESTOCK: 'livestock',
  WORK: 'work',
  ALERTS: 'alerts',
  PRODUCTIVITY: 'productivity',

  // Reportes gerenciales
  CARGA_ANIMAL: 'carga_animal',
  PRODUCCION_CARNE: 'produccion_carne',
  ESTADO_RESULTADOS: 'estado_resultados',
  INDICES_PRODUCTIVOS: 'indices_productivos',
  CASHFLOW: 'cashflow'
};

// Cacheo de reportes (5 minutos TTL)
const CACHE_TTL = 5 * 60 * 1000;
const reportCache = new Map();

/**
 * Obtener reporte del cache si existe y no expiró
 */
export function getCachedReport(key) {
  const cached = reportCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Report Cache] Hit: ${key}`);
    return cached.data;
  }
  return null;
}

/**
 * Guardar reporte en cache
 */
export function setCachedReport(key, data) {
  reportCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Limpiar cache (útil para testing)
 */
export function clearReportCache() {
  reportCache.clear();
}

/**
 * Validación crítica: Solo datos aprobados
 * Filtra datos con status APPROVED o CLOSED
 */
export function validateReportData(data) {
  if (!Array.isArray(data)) return [];

  const validStatuses = ['APPROVED', 'CLOSED'];
  return data.filter(item => validStatuses.includes(item.status));
}

/**
 * Validar que una gestión no esté cerrada
 */
export async function validateGestionNotClosed(campaignId) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('status, is_locked')
    .eq('id', campaignId)
    .single();

  if (error) {
    throw new Error(`Error validando gestión: ${error.message}`);
  }

  if (campaign.status === 'CLOSED' || campaign.is_locked) {
    throw new Error('No se pueden modificar datos de una gestión cerrada');
  }

  return true;
}

/**
 * Validar que una gestión esté cerrada (para ajustes)
 */
export async function validateGestionIsClosed(campaignId) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('status, is_locked')
    .eq('id', campaignId)
    .single();

  if (error) {
    throw new Error(`Error validando gestión: ${error.message}`);
  }

  if (campaign.status !== 'CLOSED' || !campaign.is_locked) {
    throw new Error('Solo se pueden ajustar gestiones cerradas');
  }

  return true;
}

/**
 * Error personalizado para reportes
 */
export class ReportError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validar filtros obligatorios
 */
export function validateReportFilters(filters) {
  const errors = [];

  if (!filters.dateFrom) {
    errors.push('Fecha desde es requerida');
  }

  if (!filters.dateTo) {
    errors.push('Fecha hasta es requerida');
  }

  if (filters.dateFrom && filters.dateTo) {
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);

    if (from > to) {
      errors.push('Fecha desde no puede ser mayor a fecha hasta');
    }
  }

  if (errors.length > 0) {
    throw new ReportError(
      'Validación de filtros fallida',
      'INVALID_FILTERS',
      { errors }
    );
  }

  return true;
}

/**
 * Obtener gestión actual o por período
 */
export async function getCampaign(firmId, filters = {}) {
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('firm_id', firmId);

  // Si se especifica campaign_id, obtener esa gestión
  if (filters.campaignId) {
    query = query.eq('id', filters.campaignId);
  }
  // Si no, buscar por período
  else if (filters.dateFrom && filters.dateTo) {
    query = query
      .lte('start_date', filters.dateTo)
      .gte('end_date', filters.dateFrom);
  }
  // Default: obtener la gestión abierta
  else {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new ReportError(
      'Error obteniendo gestión',
      'CAMPAIGN_FETCH_ERROR',
      { error: error.message }
    );
  }

  if (!data || data.length === 0) {
    throw new ReportError(
      'No se encontró gestión para el período especificado',
      'NO_CAMPAIGN',
      { filters }
    );
  }

  return data[0];
}

/**
 * Función principal para generar reportes
 * Orquesta la generación según tipo
 */
export async function generateReport(type, filters, options = {}) {
  try {
    // Validar tipo de reporte
    if (!Object.values(REPORT_TYPES).includes(type)) {
      throw new ReportError(
        'Tipo de reporte no válido',
        'INVALID_REPORT_TYPE',
        { type }
      );
    }

    // Validar filtros básicos
    validateReportFilters(filters);

    // Generar clave de cache
    const cacheKey = `${type}_${JSON.stringify(filters)}`;

    // Intentar obtener del cache
    if (!options.skipCache) {
      const cached = getCachedReport(cacheKey);
      if (cached) return cached;
    }

    // Generar reporte según tipo
    let reportData;

    switch (type) {
      // Los servicios específicos se implementarán en fases siguientes
      // Por ahora, estructura básica
      default:
        throw new ReportError(
          'Generador de reporte no implementado',
          'NOT_IMPLEMENTED',
          { type }
        );
    }

    // Guardar en cache
    setCachedReport(cacheKey, reportData);

    return reportData;
  } catch (error) {
    console.error('Error generando reporte:', error);

    if (error instanceof ReportError) {
      throw error;
    }

    throw new ReportError(
      'Error inesperado al generar reporte',
      'UNKNOWN_ERROR',
      { original: error.message }
    );
  }
}

/**
 * Obtener lista de gestiones disponibles
 */
export async function getCampaigns(firmId, filters = {}) {
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('firm_id', firmId)
    .order('start_date', { ascending: false });

  // Filtrar por estado si se especifica
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Filtrar por período si se especifica
  if (filters.dateFrom) {
    query = query.gte('start_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('end_date', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new ReportError(
      'Error obteniendo gestiones',
      'CAMPAIGNS_FETCH_ERROR',
      { error: error.message }
    );
  }

  return data || [];
}

/**
 * Exportar reporte a JSON (para descarga)
 */
export function exportReportAsJSON(report, filename) {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `reporte_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
