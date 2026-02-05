/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Servicio de Automatización de Cálculos
 *
 * Orquesta los cálculos diarios, semanales y mensuales
 * Llamado por cron jobs de Supabase o Node.js
 *
 * Integración:
 * - Desde pg_cron: HTTP webhook a Supabase Edge Function
 * - Desde Node.js: node-cron que llama estas funciones directamente
 */

import { supabase } from '../lib/supabase';
import {
  calcularKPI,
  calcularTodosLosKPIs,
  guardarEnHistorial
} from './kpiService';
import { contarAlertasDeKPIs } from './kpiAlerts';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Ejecuta cálculo DIARIO de todos los KPIs para todas las firmas
 * Llamado a las 00:00 UTC todos los días
 * Calcula solo KPIs con frequency = 'DAILY'
 */
export async function ejecutarCalculoDiario(firmId = null) {
  const startTime = new Date();
  let totalKpisCalculados = 0;
  let erroresCount = 0;

  try {
    console.log('🔵 Iniciando cálculo DIARIO de KPIs...', { firmId, timestamp: startTime });

    // Obtener lista de firmas a procesar
    const firmas = await obtenerFirmasParaProcesar(firmId);
    if (!firmas || firmas.length === 0) {
      console.warn('⚠️ No hay firmas para procesar');
      return { success: false, message: 'No firmas found' };
    }

    // Período para el cálculo diario
    const periodo = {
      inicio: startOfDay(new Date()),
      fin: endOfDay(new Date())
    };

    // Procesar cada firma
    for (const firma of firmas) {
      try {
        console.log(`  Procesando firma: ${firma.name} (${firma.id})`);

        // Obtener KPIs con frequency DAILY
        const { data: kpisDaily, error: errorKpis } = await supabase
          .from('kpi_definitions')
          .select('id, code, name, unit')
          .eq('calculation_frequency', 'DAILY')
          .eq('is_active', true)
          .limit(1000);

        if (errorKpis) throw errorKpis;

        // Calcular cada KPI DAILY
        for (const kpiDef of (kpisDaily || [])) {
          try {
            const valor = await calcularKPI(
              firma.id,
              kpiDef.code,
              periodo.inicio,
              periodo.fin
            );

            if (valor && valor.value !== null && valor.value !== undefined) {
              // Guardar en historial (automáticamente dispara alerta si necesario)
              await guardarEnHistorial(
                firma.id,
                kpiDef.id,
                {
                  inicio: periodo.inicio.toISOString().split('T')[0],
                  fin: periodo.fin.toISOString().split('T')[0]
                },
                valor.value,
                valor.metadata
              );

              totalKpisCalculados++;
              console.log(`    ✅ KPI ${kpiDef.code}: ${valor.value} ${kpiDef.unit}`);
            }
          } catch (errorKpi) {
            erroresCount++;
            console.error(`    ❌ Error calculando ${kpiDef.code}:`, errorKpi.message);
          }
        }
      } catch (errorFirma) {
        erroresCount++;
        console.error(`  ❌ Error procesando firma ${firma.id}:`, errorFirma.message);
      }
    }

    // Registrar en system_logs
    await registrarEnSystemLogs('kpi_daily_calculation', {
      totalKpisCalculados,
      erroresCount,
      firmasProcessadas: firmas.length,
      durationMs: new Date() - startTime,
      timestamp: new Date().toISOString()
    });

    const mensaje = `Cálculo diario completado: ${totalKpisCalculados} KPIs, ${erroresCount} errores`;
    console.log(`✅ ${mensaje}`);

    return {
      success: true,
      message: mensaje,
      stats: { totalKpisCalculados, erroresCount, firmasProcessadas: firmas.length }
    };
  } catch (error) {
    console.error('❌ Error en ejecutarCalculoDiario:', error);
    await registrarEnSystemLogs('kpi_daily_calculation_error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Ejecuta cálculo SEMANAL de KPIs
 * Llamado a las 01:00 UTC los lunes
 * Calcula KPIs con frequency = 'WEEKLY'
 */
export async function ejecutarCalculoSemanal(firmId = null) {
  const startTime = new Date();
  let totalKpisCalculados = 0;
  let erroresCount = 0;

  try {
    console.log('🟢 Iniciando cálculo SEMANAL de KPIs...', { firmId, timestamp: startTime });

    const firmas = await obtenerFirmasParaProcesar(firmId);
    if (!firmas || firmas.length === 0) {
      console.warn('⚠️ No hay firmas para procesar');
      return { success: false, message: 'No firmas found' };
    }

    // Período: última semana (lunes a domingo)
    const hoy = new Date();
    const periodo = {
      inicio: startOfWeek(hoy, { weekStartsOn: 1 }), // lunes
      fin: endOfWeek(hoy, { weekStartsOn: 1 })      // domingo
    };

    for (const firma of firmas) {
      try {
        console.log(`  Procesando firma: ${firma.name} (${firma.id})`);

        // Obtener KPIs con frequency WEEKLY
        const { data: kpisWeekly, error: errorKpis } = await supabase
          .from('kpi_definitions')
          .select('id, code, name, unit')
          .eq('calculation_frequency', 'WEEKLY')
          .eq('is_active', true)
          .limit(1000);

        if (errorKpis) throw errorKpis;

        // Calcular cada KPI WEEKLY
        for (const kpiDef of (kpisWeekly || [])) {
          try {
            const valor = await calcularKPI(
              firma.id,
              kpiDef.code,
              periodo.inicio,
              periodo.fin
            );

            if (valor && valor.value !== null && valor.value !== undefined) {
              await guardarEnHistorial(
                firma.id,
                kpiDef.id,
                {
                  inicio: periodo.inicio.toISOString().split('T')[0],
                  fin: periodo.fin.toISOString().split('T')[0]
                },
                valor.value,
                valor.metadata
              );

              totalKpisCalculados++;
              console.log(`    ✅ KPI ${kpiDef.code}: ${valor.value} ${kpiDef.unit}`);
            }
          } catch (errorKpi) {
            erroresCount++;
            console.error(`    ❌ Error calculando ${kpiDef.code}:`, errorKpi.message);
          }
        }
      } catch (errorFirma) {
        erroresCount++;
        console.error(`  ❌ Error procesando firma ${firma.id}:`, errorFirma.message);
      }
    }

    await registrarEnSystemLogs('kpi_weekly_calculation', {
      totalKpisCalculados,
      erroresCount,
      firmasProcessadas: firmas.length,
      durationMs: new Date() - startTime,
      semanaDelAño: getWeekNumber(hoy),
      timestamp: new Date().toISOString()
    });

    const mensaje = `Cálculo semanal completado: ${totalKpisCalculados} KPIs, ${erroresCount} errores`;
    console.log(`✅ ${mensaje}`);

    return {
      success: true,
      message: mensaje,
      stats: { totalKpisCalculados, erroresCount, firmasProcessadas: firmas.length }
    };
  } catch (error) {
    console.error('❌ Error en ejecutarCalculoSemanal:', error);
    await registrarEnSystemLogs('kpi_weekly_calculation_error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Ejecuta cálculo MENSUAL de KPIs
 * Llamado a las 02:00 UTC el 1º de cada mes
 * Calcula KPIs con frequency = 'MONTHLY'
 */
export async function ejecutarCalculoMensual(firmId = null) {
  const startTime = new Date();
  let totalKpisCalculados = 0;
  let erroresCount = 0;

  try {
    console.log('🟡 Iniciando cálculo MENSUAL de KPIs...', { firmId, timestamp: startTime });

    const firmas = await obtenerFirmasParaProcesar(firmId);
    if (!firmas || firmas.length === 0) {
      console.warn('⚠️ No hay firmas para procesar');
      return { success: false, message: 'No firmas found' };
    }

    // Período: mes anterior (para que al 1º de cada mes se calcule el mes que pasó)
    const ultimoDia = new Date();
    ultimoDia.setDate(0); // va al último día del mes anterior
    const periodo = {
      inicio: startOfMonth(ultimoDia),
      fin: endOfMonth(ultimoDia)
    };

    for (const firma of firmas) {
      try {
        console.log(`  Procesando firma: ${firma.name} (${firma.id})`);

        // Obtener KPIs con frequency MONTHLY
        const { data: kpisMonthly, error: errorKpis } = await supabase
          .from('kpi_definitions')
          .select('id, code, name, unit')
          .eq('calculation_frequency', 'MONTHLY')
          .eq('is_active', true)
          .limit(1000);

        if (errorKpis) throw errorKpis;

        // Calcular cada KPI MONTHLY
        for (const kpiDef of (kpisMonthly || [])) {
          try {
            const valor = await calcularKPI(
              firma.id,
              kpiDef.code,
              periodo.inicio,
              periodo.fin
            );

            if (valor && valor.value !== null && valor.value !== undefined) {
              await guardarEnHistorial(
                firma.id,
                kpiDef.id,
                {
                  inicio: periodo.inicio.toISOString().split('T')[0],
                  fin: periodo.fin.toISOString().split('T')[0]
                },
                valor.value,
                valor.metadata
              );

              totalKpisCalculados++;
              console.log(`    ✅ KPI ${kpiDef.code}: ${valor.value} ${kpiDef.unit}`);
            }
          } catch (errorKpi) {
            erroresCount++;
            console.error(`    ❌ Error calculando ${kpiDef.code}:`, errorKpi.message);
          }
        }

        // Actualizar historial de alertas consecutivas (KPIs en amarillo más de 1 período)
        await actualizarAlertasConsecutivas(firma.id);

        // Generar recomendaciones automáticas si hay KPIs críticos
        await verificarYGenerarRecomendaciones(firma.id, periodo.fin);
      } catch (errorFirma) {
        erroresCount++;
        console.error(`  ❌ Error procesando firma ${firma.id}:`, errorFirma.message);
      }
    }

    await registrarEnSystemLogs('kpi_monthly_calculation', {
      totalKpisCalculados,
      erroresCount,
      firmasProcessadas: firmas.length,
      mesCalculado: `${periodo.inicio.getFullYear()}-${String(periodo.inicio.getMonth() + 1).padStart(2, '0')}`,
      durationMs: new Date() - startTime,
      timestamp: new Date().toISOString()
    });

    const mensaje = `Cálculo mensual completado: ${totalKpisCalculados} KPIs, ${erroresCount} errores`;
    console.log(`✅ ${mensaje}`);

    return {
      success: true,
      message: mensaje,
      stats: { totalKpisCalculados, erroresCount, firmasProcessadas: firmas.length }
    };
  } catch (error) {
    console.error('❌ Error en ejecutarCalculoMensual:', error);
    await registrarEnSystemLogs('kpi_monthly_calculation_error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Limpia historial antiguo de KPIs
 * Llamado a las 03:00 UTC el 1º de cada mes
 * Retiene últimos N días (default 730 = 2 años)
 */
export async function limpiarHistorialAntiguo(diasRetener = 730) {
  const startTime = new Date();
  let registrosEliminados = 0;

  try {
    console.log(`🧹 Limpiando KPI history anterior a ${diasRetener} días...`, { timestamp: startTime });

    const fechaLímite = new Date();
    fechaLímite.setDate(fechaLímite.getDate() - diasRetener);

    // Eliminar registros antiguos
    const { data, error } = await supabase
      .from('kpi_history')
      .delete()
      .lt('calculated_at', fechaLímite.toISOString())
      .select();

    if (error) throw error;

    registrosEliminados = data ? data.length : 0;

    // Limpiar también alertas antiguas asociadas
    const { error: errorAlerts } = await supabase
      .from('kpi_alerts')
      .delete()
      .lt('created_at', fechaLímite.toISOString());

    if (errorAlerts) {
      console.warn('⚠️ No se limpiaron alertas antiguas:', errorAlerts.message);
    }

    await registrarEnSystemLogs('kpi_history_cleanup', {
      registrosEliminados,
      diasRetener,
      fechaLímite: fechaLímite.toISOString(),
      durationMs: new Date() - startTime,
      timestamp: new Date().toISOString()
    });

    const mensaje = `Limpieza completada: ${registrosEliminados} registros eliminados`;
    console.log(`✅ ${mensaje}`);

    return {
      success: true,
      message: mensaje,
      registrosEliminados
    };
  } catch (error) {
    console.error('❌ Error en limpiarHistorialAntiguo:', error);
    await registrarEnSystemLogs('kpi_cleanup_error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene lista de firmas para procesar
 */
async function obtenerFirmasParaProcesar(firmId = null) {
  try {
    let query = supabase.from('firms').select('id, name, rut');

    if (firmId) {
      query = query.eq('id', firmId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo firmas:', error);
    throw error;
  }
}

/**
 * Registra eventos en system_logs
 */
async function registrarEnSystemLogs(event, metadata = {}) {
  try {
    const { error } = await supabase
      .from('system_logs')
      .insert({
        event,
        message: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('⚠️ Error registrando en system_logs:', error.message);
    }
  } catch (error) {
    console.error('Error en registrarEnSystemLogs:', error);
    // No thrower, es secundario
  }
}

/**
 * Actualiza contador de días consecutivos en amarillo
 */
async function actualizarAlertasConsecutivas(firmId) {
  try {
    // Obtener KPIs en AMARILLO actual
    const { data: kpisAmarillo, error: errorAmarillo } = await supabase
      .from('kpi_history')
      .select('kpi_id, id')
      .eq('firm_id', firmId)
      .eq('status', 'AMARILLO')
      .gte('calculated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // últimas 24h

    if (errorAmarillo) throw errorAmarillo;

    // Para cada KPI en amarillo, incrementar días consecutivos o reset
    for (const kpiRecord of (kpisAmarillo || [])) {
      const { data: historialConsecutivo, error: errorHistorial } = await supabase
        .from('kpi_consecutive_warnings')
        .select('consecutive_warning_days')
        .eq('firm_id', firmId)
        .eq('kpi_id', kpiRecord.kpi_id)
        .single();

      if (!errorHistorial && historialConsecutivo) {
        // Actualizar contador
        await supabase
          .from('kpi_consecutive_warnings')
          .update({
            consecutive_warning_days: (historialConsecutivo.consecutive_warning_days || 0) + 1,
            last_warning_at: new Date().toISOString()
          })
          .eq('firm_id', firmId)
          .eq('kpi_id', kpiRecord.kpi_id);
      } else {
        // Crear nuevo registro
        await supabase
          .from('kpi_consecutive_warnings')
          .insert({
            firm_id: firmId,
            kpi_id: kpiRecord.kpi_id,
            consecutive_warning_days: 1,
            last_warning_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    console.warn('⚠️ Error actualizando alertas consecutivas:', error.message);
  }
}

/**
 * Verifica KPIs críticos y genera recomendaciones automáticas
 */
async function verificarYGenerarRecomendaciones(firmId, periodEnd) {
  try {
    // Llamar RPC para generar recomendaciones automáticas
    const { data: recomendaciones, error } = await supabase.rpc(
      'get_kpi_recommendations',
      {
        p_firm_id: firmId,
        p_period_end: periodEnd.toISOString().split('T')[0]
      }
    );

    if (error) {
      console.warn('⚠️ RPC get_kpi_recommendations no disponible');
      return;
    }

    if (recomendaciones && recomendaciones.length > 0) {
      console.log(`  📋 ${recomendaciones.length} recomendaciones generadas`);
    }
  } catch (error) {
    console.warn('⚠️ Error generando recomendaciones:', error.message);
  }
}

/**
 * Obtiene número de semana del año
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Función para testing: Ejecuta todos los cálculos para una firma específica
 * Útil durante desarrollo
 */
export async function ejecutarCalculosCompletosFirma(firmId) {
  const resultado = {};

  try {
    console.log(`🔄 Ejecutando cálculos completos para firma ${firmId}...`);

    resultado.diario = await ejecutarCalculoDiario(firmId);
    resultado.semanal = await ejecutarCalculoSemanal(firmId);
    resultado.mensual = await ejecutarCalculoMensual(firmId);

    return {
      success: true,
      resultado,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en ejecutarCalculosCompletasFirma:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
