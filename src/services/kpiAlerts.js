/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Servicio de Generación de Alertas desde KPIs
 *
 * Integración con sistema de alertas existente (alertas.js)
 * Genera alertas automáticas cuando KPIs cruzan umbrales
 */

import { supabase } from '../lib/supabase';
import { crearAlertaAutomatica } from './alertas';

/**
 * Verifica si debe crear alerta y la crea
 * Llamado por trigger en PostgreSQL
 */
export async function verificarYCrearAlerta(kpiHistoryId) {
  try {
    // Obtener datos del KPI
    const { data: kpiHistory, error: errorKpi } = await supabase
      .from('kpi_history')
      .select(`
        *,
        kpi_definitions(code, name, unit)
      `)
      .eq('id', kpiHistoryId)
      .single();

    if (errorKpi) throw errorKpi;

    // Solo crear alerta si es AMARILLO o ROJO
    if (!['AMARILLO', 'ROJO'].includes(kpiHistory.status)) {
      return null;
    }

    // Verificar si ya existe alerta similar pendiente
    const { data: alertaExistente, error: errorExistente } = await supabase
      .from('alerts')
      .select('id')
      .eq('firm_id', kpiHistory.firm_id)
      .eq('lot_id', kpiHistory.lot_id)
      .eq('regla_aplicada', `KPI_${kpiHistory.kpi_definitions.code}_${kpiHistory.status}`)
      .eq('estado', 'pendiente')
      .limit(1);

    if (errorExistente) throw errorExistente;

    if (alertaExistente && alertaExistente.length > 0) {
      // Alerta duplicada, no crear
      return alertaExistente[0];
    }

    // Construir mensaje de alerta
    const icono = kpiHistory.status === 'ROJO' ? '❌' : '⚠️';
    const titulo = `${icono} KPI ${kpiHistory.status}: ${kpiHistory.kpi_definitions.name}`;

    let descripcion = `El KPI ${kpiHistory.kpi_definitions.name} está en ${kpiHistory.status}. `;
    descripcion += `Valor actual: ${kpiHistory.value} ${kpiHistory.kpi_definitions.unit}`;

    const prioridad = kpiHistory.status === 'ROJO' ? 'alta' : 'media';

    // Crear alerta usando función existente
    const alerta = await crearAlertaAutomatica({
      firmaId: kpiHistory.firm_id,
      predioId: kpiHistory.premise_id,
      loteId: kpiHistory.lot_id,
      tipo: 'alerta',
      titulo,
      descripcion,
      prioridad,
      reglaAplicada: `KPI_${kpiHistory.kpi_definitions.code}_${kpiHistory.status}`,
      metadata: {
        kpi_id: kpiHistory.kpi_id,
        kpi_code: kpiHistory.kpi_definitions.code,
        valor_actual: kpiHistory.value,
        unit: kpiHistory.kpi_definitions.unit,
        status: kpiHistory.status,
        period: {
          start: kpiHistory.period_start,
          end: kpiHistory.period_end
        }
      }
    });

    if (alerta.created) {
      // Vincular con KPI en tabla kpi_alerts
      await supabase
        .from('kpi_alerts')
        .insert({
          alert_id: alerta.alerta.id,
          kpi_history_id: kpiHistoryId,
          threshold_type: kpiHistory.status === 'ROJO' ? 'CRITICAL' : 'WARNING',
          current_value: kpiHistory.value,
          days_in_status: 1
        });
    }

    return alerta;
  } catch (error) {
    console.error('Error verificando/creando alerta:', error);
    throw error;
  }
}

/**
 * Obtiene alertas de KPIs con filtros
 */
export async function obtenerAlertasDeKPIs(firmId, filtros = {}) {
  try {
    let query = supabase
      .from('alerts')
      .select(`
        *,
        kpi_alerts(*)
      `)
      .eq('firm_id', firmId)
      .eq('origen', 'automatica')
      .like('regla_aplicada', 'KPI_%');

    // Aplicar filtros
    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros.prioridad) {
      query = query.eq('prioridad', filtros.prioridad);
    }

    if (filtros.loteId) {
      query = query.eq('lot_id', filtros.loteId);
    }

    // Ordenar por fecha descendente
    query = query.order('fecha', { ascending: false });

    if (filtros.limit) {
      query = query.limit(filtros.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo alertas de KPIs:', error);
    throw error;
  }
}

/**
 * Resuelve (marca como completada) una alerta de KPI
 */
export async function resolverAlertaKPI(alertId, userId, notas = '') {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        estado: 'completed',
        resuelta_por: userId,
        fecha_resolucion: new Date().toISOString(),
        notas: notas
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error resolviendo alerta:', error);
    throw error;
  }
}

/**
 * Detecta alertas combinadas (múltiples KPIs en estado crítico simultáneamente)
 */
export async function detectarAlertasCombinadas(firmId) {
  try {
    const alertasCombinadas = await supabase.rpc('detect_combined_kpi_alerts', {
      p_firm_id: firmId
    });

    if (alertasCombinadas.error) throw alertasCombinadas.error;

    return alertasCombinadas.data || [];
  } catch (error) {
    console.error('Error detectando alertas combinadas:', error);
    throw error;
  }
}

/**
 * Obtiene alertas críticas (status ROJO)
 */
export async function obtenerAlertasCríticas(firmId) {
  return obtenerAlertasDeKPIs(firmId, {
    prioridad: 'alta',
    estado: 'pendiente'
  });
}

/**
 * Obtiene alertas de advertencia (status AMARILLO)
 */
export async function obtenerAlertasAdvertencia(firmId) {
  return obtenerAlertasDeKPIs(firmId, {
    prioridad: 'media',
    estado: 'pendiente'
  });
}

/**
 * Obtiene KPIs que se mantienen en amarillo más de N períodos
 */
export async function obtenerKPIsEnAmarilloConsecutivo(firmId, diasThreshold = 3) {
  try {
    const { data, error } = await supabase
      .from('kpi_consecutive_warnings')
      .select(`
        *,
        kpi_definitions(code, name)
      `)
      .eq('firm_id', firmId)
      .gte('consecutive_warning_days', diasThreshold);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo KPIs en amarillo consecutivo:', error);
    throw error;
  }
}

/**
 * Cuenta alertas por tipo y estado
 */
export async function contarAlertasDeKPIs(firmId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('prioridad, estado')
      .eq('firm_id', firmId)
      .eq('origen', 'automatica')
      .like('regla_aplicada', 'KPI_%');

    if (error) throw error;

    const conteos = {
      total: data?.length || 0,
      criticas_pendientes: data?.filter(a => a.prioridad === 'alta' && a.estado === 'pendiente').length || 0,
      advertencias_pendientes: data?.filter(a => a.prioridad === 'media' && a.estado === 'pendiente').length || 0,
      resueltas: data?.filter(a => a.estado === 'completed').length || 0,
      canceladas: data?.filter(a => a.estado === 'cancelled').length || 0
    };

    return conteos;
  } catch (error) {
    console.error('Error contando alertas:', error);
    throw error;
  }
}

/**
 * Obtiene recomendaciones automáticas basadas en KPIs en estado crítico
 */
export async function obtenerRecomendacionesAutomáticas(firmId, periodEnd = new Date()) {
  try {
    const { data: recomendaciones, error } = await supabase.rpc(
      'get_kpi_recommendations',
      {
        p_firm_id: firmId,
        p_period_end: periodEnd.toISOString().split('T')[0]
      }
    );

    if (error) throw error;

    return recomendaciones || [];
  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    throw error;
  }
}

/**
 * Exporta alertas a formato JSON para reportes
 */
export async function exportarAlertasKPIs(firmId, filtros = {}) {
  try {
    const alertas = await obtenerAlertasDeKPIs(firmId, filtros);

    const alertasFormatadas = alertas.map(a => ({
      id: a.id,
      kpi: a.regla_aplicada.replace('KPI_', '').split('_').slice(0, -1).join('_'),
      status: a.regla_aplicada.split('_').pop(),
      titulo: a.titulo,
      descripcion: a.descripcion,
      prioridad: a.prioridad,
      fecha: a.fecha,
      estado: a.estado,
      lote_id: a.lot_id,
      metadata: a.metadata
    }));

    return {
      firm_id: firmId,
      fecha_exportacion: new Date().toISOString(),
      total_alertas: alertasFormatadas.length,
      alertas: alertasFormatadas
    };
  } catch (error) {
    console.error('Error exportando alertas:', error);
    throw error;
  }
}

/**
 * Limpia alertas antiguas de KPIs (resueltas hace más de N días)
 */
export async function limpiarAlertasAntiguasDeKPIs(diasRetener = 30) {
  try {
    const fechaLímite = new Date();
    fechaLímite.setDate(fechaLímite.getDate() - diasRetener);

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('origen', 'automatica')
      .like('regla_aplicada', 'KPI_%')
      .eq('estado', 'completed')
      .lt('fecha_resolucion', fechaLímite.toISOString());

    if (error) throw error;

    return { success: true, message: `Alertas antiguas limpiadas` };
  } catch (error) {
    console.error('Error limpiando alertas antiguas:', error);
    throw error;
  }
}
