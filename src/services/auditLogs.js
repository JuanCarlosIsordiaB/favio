/**
 * auditLogs.js
 *
 * Servicio para gestión de registros de auditoría
 * Proporciona: lectura, filtrado, búsqueda de logs con paginación
 */

import { supabase } from '../lib/supabase';

/**
 * Obtener logs de auditoría con filtros y paginación
 *
 * @param {Object} filters - Objeto con filtros
 *   - firmId: UUID (requerido)
 *   - startDate: string ISO (opcional)
 *   - endDate: string ISO (opcional)
 *   - tipo: string (opcional)
 *   - modulo: string (opcional)
 *   - usuario: string (opcional)
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 * @returns {Object} { logs: [], total: number }
 */
export async function getAuditLogs({
  firmId,
  startDate,
  endDate,
  tipo,
  modulo,
  usuario,
  limit = 50,
  offset = 0
}) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  let query = supabase
    .from('audit')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filtro por fecha inicial
  if (startDate) {
    query = query.gte('fecha', startDate);
  }

  // Filtro por fecha final
  if (endDate) {
    query = query.lte('fecha', endDate);
  }

  // Filtro por tipo de evento
  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  // Filtro por módulo
  if (modulo) {
    query = query.eq('modulo_origen', modulo);
  }

  // Filtro por usuario (búsqueda parcial)
  if (usuario) {
    query = query.ilike('usuario', `%${usuario}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Error en getAuditLogs:', error);
    throw new Error(`Error al cargar logs de auditoría: ${error.message}`);
  }

  console.log(`✅ getAuditLogs: Retornó ${data?.length || 0} logs (total: ${count})`);

  return {
    logs: data || [],
    total: count || 0
  };
}

/**
 * Obtener tipos de eventos únicos en los logs
 *
 * @param {string} firmId - ID de la firma
 * @returns {string[]} Array de tipos únicos
 */
export async function getEventTypes(firmId) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  const { data, error } = await supabase
    .from('audit')
    .select('tipo')
    .eq('firm_id', firmId)
    .order('tipo');

  if (error) {
    console.error('❌ Error en getEventTypes:', error);
    throw new Error(`Error al cargar tipos de eventos: ${error.message}`);
  }

  // Extraer valores únicos
  const uniqueTypes = [...new Set((data || []).map(d => d.tipo).filter(Boolean))];

  console.log(`✅ getEventTypes: ${uniqueTypes.length} tipos encontrados`);

  return uniqueTypes;
}

/**
 * Obtener módulos únicos en los logs
 *
 * @param {string} firmId - ID de la firma
 * @returns {string[]} Array de módulos únicos
 */
export async function getModules(firmId) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  const { data, error } = await supabase
    .from('audit')
    .select('modulo_origen')
    .eq('firm_id', firmId)
    .order('modulo_origen');

  if (error) {
    console.error('❌ Error en getModules:', error);
    throw new Error(`Error al cargar módulos: ${error.message}`);
  }

  // Extraer valores únicos
  const uniqueModules = [...new Set((data || []).map(d => d.modulo_origen).filter(Boolean))];

  console.log(`✅ getModules: ${uniqueModules.length} módulos encontrados`);

  return uniqueModules;
}

/**
 * Obtener usuarios únicos que han realizado acciones
 *
 * @param {string} firmId - ID de la firma
 * @returns {string[]} Array de usuarios únicos
 */
export async function getUniqueUsers(firmId) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  const { data, error } = await supabase
    .from('audit')
    .select('usuario')
    .eq('firm_id', firmId)
    .order('usuario');

  if (error) {
    console.error('❌ Error en getUniqueUsers:', error);
    throw new Error(`Error al cargar usuarios: ${error.message}`);
  }

  // Extraer valores únicos
  const uniqueUsers = [...new Set((data || []).map(d => d.usuario).filter(Boolean))];

  console.log(`✅ getUniqueUsers: ${uniqueUsers.length} usuarios encontrados`);

  return uniqueUsers;
}

/**
 * Exportar logs a CSV (generación de CSV en memoria)
 *
 * @param {Object} logs - Array de logs
 * @returns {string} CSV string
 */
export function exportLogsToCSV(logs) {
  if (!logs || logs.length === 0) {
    return 'No hay datos para exportar';
  }

  // Headers
  const headers = ['Fecha', 'Tipo', 'Módulo', 'Usuario', 'Descripción'];

  // Convertir logs a filas CSV
  const rows = logs.map(log => [
    new Date(log.fecha).toLocaleString('es-ES'),
    log.tipo || '',
    log.modulo_origen || '',
    log.usuario || '',
    log.descripcion || ''
  ]);

  // Construir CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csv;
}

/**
 * Crear un registro de auditoría manual
 *
 * @param {Object} logData - Datos del log
 *   - firma_id: UUID
 *   - tipo: string
 *   - modulo_origen: string
 *   - usuario: string
 *   - descripcion: string
 *   - referencia: string (opcional)
 *   - metadata: object (opcional)
 * @returns {Object} Log creado
 */
export async function createAuditLog({
  firma_id,
  tipo,
  modulo_origen,
  usuario,
  descripcion,
  referencia,
  metadata
}) {
  const { data, error } = await supabase
    .from('audit')
    .insert([{
      firma_id,
      tipo,
      modulo_origen,
      usuario,
      descripcion,
      referencia,
      metadata,
      fecha: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error en createAuditLog:', error);
    throw new Error(`Error al crear registro de auditoría: ${error.message}`);
  }

  return data;
}

/**
 * Obtener estadísticas de auditoría para un período
 *
 * @param {string} firmId - ID de la firma
 * @param {string} startDate - Fecha inicio (ISO)
 * @param {string} endDate - Fecha fin (ISO)
 * @returns {Object} Estadísticas
 */
export async function getAuditStatistics(firmId, startDate, endDate) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  let query = supabase
    .from('audit')
    .select('tipo, modulo_origen, usuario')
    .eq('firm_id', firmId);

  if (startDate) {
    query = query.gte('fecha', startDate);
  }

  if (endDate) {
    query = query.lte('fecha', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error en getAuditStatistics:', error);
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }

  // Calcular estadísticas
  const stats = {
    totalEvents: data?.length || 0,
    eventsByType: {},
    eventsByModule: {},
    eventsByUser: {},
    topUsers: []
  };

  // Procesar datos
  (data || []).forEach(log => {
    // Por tipo
    stats.eventsByType[log.tipo] = (stats.eventsByType[log.tipo] || 0) + 1;

    // Por módulo
    stats.eventsByModule[log.modulo_origen] = (stats.eventsByModule[log.modulo_origen] || 0) + 1;

    // Por usuario
    stats.eventsByUser[log.usuario] = (stats.eventsByUser[log.usuario] || 0) + 1;
  });

  // Top 5 usuarios más activos
  stats.topUsers = Object.entries(stats.eventsByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user, count]) => ({ user, count }));

  console.log(`✅ getAuditStatistics: ${stats.totalEvents} eventos procesados`);

  return stats;
}
