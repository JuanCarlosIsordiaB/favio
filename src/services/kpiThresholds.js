/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Servicio de Gestión de Umbrales
 *
 * Maneja:
 * 1. Obtención de umbrales (específicos por firma o defaults globales)
 * 2. Actualización de umbrales con validación
 * 3. Evaluación de status (VERDE/AMARILLO/ROJO)
 * 4. Reseteo a defaults
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene umbrales para un KPI en una firma
 * Si no existen, retorna defaults globales
 */
export async function obtenerUmbrales(firmId, kpiId) {
  try {
    // Intentar obtener umbrales específicos de la firma
    const { data: umbralFirmaList, error: errorFirma } = await supabase
      .from('kpi_thresholds')
      .select('*')
      .eq('firm_id', firmId)
      .eq('kpi_id', kpiId)
      .limit(1);

    // Si existen umbrales específicos, retornarlos
    if (umbralFirmaList && umbralFirmaList.length > 0 && !errorFirma) {
      return umbralFirmaList[0];
    }

    // Si no, obtener defaults globales (firm_id IS NULL)
    const { data: umbralGlobalList, error: errorGlobal } = await supabase
      .from('kpi_thresholds')
      .select('*')
      .is('firm_id', null)
      .eq('kpi_id', kpiId)
      .limit(1);

    if (errorGlobal || !umbralGlobalList || umbralGlobalList.length === 0) {
      console.warn(`Sin umbrales para KPI ${kpiId} (ni específicos ni globales)`, errorGlobal);
      // Retornar valores por defecto si no hay umbrales configurados
      return {
        optimal_min: 0,
        optimal_max: 100,
        warning_min: -10,
        warning_max: 110,
        critical_min: -50,
        critical_max: 200
      };
    }

    return umbralGlobalList[0];
  } catch (error) {
    console.error('Error obteniendo umbrales:', error);
    throw error;
  }
}

/**
 * Actualiza umbrales de un KPI para una firma
 * Incluye validación de rangos lógicos
 */
export async function actualizarUmbrales(firmId, kpiId, umbrales, userId) {
  try {
    // Validar rangos
    const erroresValidacion = validarRangos(umbrales);
    if (erroresValidacion.length > 0) {
      throw new Error(`Errores en validación: ${erroresValidacion.join(', ')}`);
    }

    // Verificar que sea KPI no obligatorio o que el usuario sea ADMIN
    const { data: kpiDefList, error: errorKpi } = await supabase
      .from('kpi_definitions')
      .select('is_mandatory')
      .eq('id', kpiId)
      .limit(1);

    if (errorKpi) throw errorKpi;
    if (!kpiDefList || kpiDefList.length === 0) {
      throw new Error(`KPI con ID ${kpiId} no encontrado`);
    }

    const kpiDef = kpiDefList[0];

    if (kpiDef.is_mandatory) {
      // Validar que solo ADMIN pueda editar KPIs obligatorios
      const { data: user, error: errorUser } = await supabase.auth.getUser();
      if (errorUser) throw errorUser;

      // En un entorno real, verificar rol del usuario en JWT
      // Por ahora asumimos que se valida en el nivel de API/permisos
    }

    // Insertar o actualizar umbral
    const { data, error } = await supabase
      .from('kpi_thresholds')
      .upsert({
        firm_id: firmId,
        kpi_id: kpiId,
        optimal_min: umbrales.optimal_min,
        optimal_max: umbrales.optimal_max,
        warning_min: umbrales.warning_min,
        warning_max: umbrales.warning_max,
        critical_min: umbrales.critical_min,
        critical_max: umbrales.critical_max,
        changed_by: userId,
        changed_at: new Date().toISOString()
      }, {
        onConflict: 'firm_id,kpi_id'
      })
      .select();

    if (error) throw error;

    return data[0];
  } catch (error) {
    console.error('Error actualizando umbrales:', error);
    throw error;
  }
}

/**
 * Evalúa el status de un valor contra umbrales
 * Retorna: 'VERDE' | 'AMARILLO' | 'ROJO'
 */
export function evaluarStatus(value, umbrales) {
  if (value === null || value === undefined) {
    return 'VERDE'; // Sin valor = sin alerta
  }

  const {
    optimal_min,
    optimal_max,
    warning_min,
    warning_max,
    critical_min,
    critical_max
  } = umbrales;

  // VERDE: dentro del rango óptimo
  if (value >= optimal_min && value <= optimal_max) {
    return 'VERDE';
  }

  // AMARILLO: dentro del rango de advertencia
  if (
    (value >= warning_min && value < optimal_min) ||
    (value > optimal_max && value <= warning_max)
  ) {
    return 'AMARILLO';
  }

  // ROJO: fuera de rango crítico
  if (value < critical_min || value > critical_max) {
    return 'ROJO';
  }

  // Por defecto, si está entre warning y optimal, es amarillo
  return 'AMARILLO';
}

/**
 * Valida que los rangos sean lógicos
 * Retorna array de errores (vacío si válido)
 */
export function validarRangos(umbrales) {
  const errores = [];

  const {
    optimal_min,
    optimal_max,
    warning_min,
    warning_max,
    critical_min,
    critical_max
  } = umbrales;

  // Validar que existan valores
  if (
    optimal_min === undefined || optimal_max === undefined ||
    warning_min === undefined || warning_max === undefined ||
    critical_min === undefined || critical_max === undefined
  ) {
    errores.push('Todos los campos de rango son requeridos');
    return errores;
  }

  // Validar relaciones: critical < warning < optimal
  // O: critical < warning < optimal < warning < critical (para valores más altos)
  // Asumimos que optimal es el "mejor" rango

  if (!(critical_min < warning_min && warning_min < optimal_min)) {
    errores.push('Debe cumplir: critical_min < warning_min < optimal_min');
  }

  if (!(optimal_max < warning_max && warning_max < critical_max)) {
    errores.push('Debe cumplir: optimal_max < warning_max < critical_max');
  }

  if (!(optimal_min <= optimal_max)) {
    errores.push('optimal_min debe ser <= optimal_max');
  }

  if (!(warning_min <= warning_max)) {
    errores.push('warning_min debe ser <= warning_max');
  }

  if (!(critical_min <= critical_max)) {
    errores.push('critical_min debe ser <= critical_max');
  }

  return errores;
}

/**
 * Resetea umbrales a defaults globales
 */
export async function resetToDefaults(firmId, kpiId) {
  try {
    // Eliminar umbrales específicos de la firma
    const { error } = await supabase
      .from('kpi_thresholds')
      .delete()
      .match({
        firm_id: firmId,
        kpi_id: kpiId
      });

    if (error) throw error;

    // Retornar defaults globales
    return await obtenerUmbrales(firmId, kpiId);
  } catch (error) {
    console.error('Error reseteando a defaults:', error);
    throw error;
  }
}

/**
 * Obtiene umbrales para múltiples KPIs de una firma
 */
export async function obtenerUmbralesMultiples(firmId, kpiIds) {
  try {
    const { data, error } = await supabase
      .from('kpi_thresholds')
      .select('*')
      .eq('firm_id', firmId)
      .in('kpi_id', kpiIds);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo umbrales múltiples:', error);
    throw error;
  }
}

/**
 * Obtiene historial de cambios en umbrales
 */
export async function obtenerHistorialUmbrales(firmId, kpiId, limit = 20) {
  try {
    const { data: thresholdList, error: errorThreshold } = await supabase
      .from('kpi_thresholds')
      .select('id')
      .eq('firm_id', firmId)
      .eq('kpi_id', kpiId)
      .limit(1);

    if (errorThreshold || !thresholdList || thresholdList.length === 0) {
      console.warn(`No se encontró umbral específico para firma ${firmId} y KPI ${kpiId}`);
      return [];
    }

    const { data: historial, error: errorHistorial } = await supabase
      .from('kpi_thresholds_history')
      .select('*')
      .eq('threshold_id', thresholdList[0].id)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (errorHistorial) throw errorHistorial;

    return historial || [];
  } catch (error) {
    console.error('Error obteniendo historial de umbrales:', error);
    throw error;
  }
}

/**
 * Formatea umbrales para mostrar en UI
 */
export function formatearUmbrales(umbrales) {
  return {
    optimo: {
      min: umbrales.optimal_min,
      max: umbrales.optimal_max,
      color: 'green',
      label: 'Óptimo 🟢'
    },
    advertencia: {
      min: umbrales.warning_min,
      max: umbrales.warning_max,
      color: 'yellow',
      label: 'Advertencia ⚠️'
    },
    critico: {
      min: umbrales.critical_min,
      max: umbrales.critical_max,
      color: 'red',
      label: 'Crítico ❌'
    }
  };
}

/**
 * Valida que un valor sea válido según umbrales
 * Retorna { valid: boolean, status: string, message: string }
 */
export function validarValorContraUmbrales(value, umbrales) {
  const status = evaluarStatus(value, umbrales);

  let message = '';
  let valid = true;

  switch (status) {
    case 'VERDE':
      message = `Valor ${value} está en rango óptimo`;
      valid = true;
      break;
    case 'AMARILLO':
      message = `Valor ${value} está en rango de advertencia. Requiere atención.`;
      valid = true;
      break;
    case 'ROJO':
      message = `Valor ${value} está FUERA del rango aceptable. Requiere acción inmediata.`;
      valid = false;
      break;
    default:
      message = 'Estado desconocido';
      valid = false;
  }

  return { valid, status, message };
}

/**
 * Obtiene estadísticas de umbrales para una firma
 */
export async function obtenerEstadísticasUmbrales(firmId) {
  try {
    // Contar KPIs por estado
    const { data: kpiHistory, error } = await supabase
      .from('kpi_history')
      .select('status')
      .eq('firm_id', firmId)
      .gte('calculated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 días

    if (error) throw error;

    const estadísticas = {
      total_registros: kpiHistory?.length || 0,
      kpis_verdes: kpiHistory?.filter(k => k.status === 'VERDE').length || 0,
      kpis_amarillos: kpiHistory?.filter(k => k.status === 'AMARILLO').length || 0,
      kpis_rojos: kpiHistory?.filter(k => k.status === 'ROJO').length || 0,
      porcentaje_verde: 0,
      porcentaje_amarillo: 0,
      porcentaje_rojo: 0
    };

    if (estadísticas.total_registros > 0) {
      estadísticas.porcentaje_verde = ((estadísticas.kpis_verdes / estadísticas.total_registros) * 100).toFixed(1);
      estadísticas.porcentaje_amarillo = ((estadísticas.kpis_amarillos / estadísticas.total_registros) * 100).toFixed(1);
      estadísticas.porcentaje_rojo = ((estadísticas.kpis_rojos / estadísticas.total_registros) * 100).toFixed(1);
    }

    return estadísticas;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}
