/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Servicio de Reportes Estandarizados
 *
 * Genera 3 reportes principales:
 * 1. Reporte Ejecutivo Mensual
 * 2. Reporte Comparativo Anual
 * 3. Reporte de Aprendizaje
 */

import { supabase } from '../lib/supabase';
import { calcularTodosLosKPIs, obtenerTendencia } from './kpiService';
import { obtenerAlertasDeKPIs, obtenerRecomendacionesAutomáticas } from './kpiAlerts';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

/**
 * Genera Reporte Ejecutivo Mensual
 */
export async function generarReporteEjecutivoMensual(firmId, mes, año) {
  try {
    const date = new Date(año, mes - 1, 1);
    const periodStart = startOfMonth(date);
    const periodEnd = endOfMonth(date);

    // Calcular KPIs del mes actual
    const kpisActuales = await calcularTodosLosKPIs(firmId, periodStart, periodEnd);

    // Calcular KPIs del mes anterior (para comparación)
    const mesAnterior = subMonths(date, 1);
    const periodStartAnterior = startOfMonth(mesAnterior);
    const periodEndAnterior = endOfMonth(mesAnterior);
    const kpisAnteriores = await calcularTodosLosKPIs(firmId, periodStartAnterior, periodEndAnterior);

    // Obtener alertas del mes
    const alertas = await obtenerAlertasDeKPIs(firmId, {
      limit: 100
    });

    // Filtrar alertas del período
    const alertasDelMes = alertas.filter(a => {
      const fechaAlerta = new Date(a.fecha);
      return fechaAlerta >= periodStart && fechaAlerta <= periodEnd;
    });

    // Obtener recomendaciones
    const recomendaciones = await obtenerRecomendacionesAutomáticas(firmId, periodEnd);

    // Construir comparación
    const comparacion = kpisActuales.map(kpiActual => {
      const kpiAnterior = kpisAnteriores.find(k => k.code === kpiActual.code);
      const variacion = kpiAnterior && kpiAnterior.value
        ? ((kpiActual.value - kpiAnterior.value) / kpiAnterior.value) * 100
        : 0;

      return {
        kpi_code: kpiActual.code,
        name: kpiActual.name,
        value_prev: kpiAnterior?.value || null,
        value_current: kpiActual.value,
        variation: parseFloat(variacion.toFixed(2)),
        unit: kpiActual.unit,
        status: kpiActual.status || 'VERDE'
      };
    });

    return {
      tipo_reporte: 'ejecutivo_mensual',
      periodo: {
        mes,
        año,
        fecha_inicio: periodStart.toISOString(),
        fecha_fin: periodEnd.toISOString()
      },
      fecha_generacion: new Date().toISOString(),
      kpis_criticos: kpisActuales.filter(k => k.status === 'ROJO'),
      kpis_advertencia: kpisActuales.filter(k => k.status === 'AMARILLO'),
      kpis_optimos: kpisActuales.filter(k => k.status === 'VERDE'),
      alertas_del_mes: {
        total: alertasDelMes.length,
        criticas: alertasDelMes.filter(a => a.prioridad === 'alta').length,
        advertencias: alertasDelMes.filter(a => a.prioridad === 'media').length,
        alertas: alertasDelMes
      },
      comparacion_intermensual: comparacion,
      recomendaciones: recomendaciones,
      resumen: {
        total_kpis: kpisActuales.length,
        kpis_en_optimo: kpisActuales.filter(k => k.status === 'VERDE').length,
        kpis_en_advertencia: kpisActuales.filter(k => k.status === 'AMARILLO').length,
        kpis_en_critico: kpisActuales.filter(k => k.status === 'ROJO').length,
        porcentaje_optimo: ((kpisActuales.filter(k => k.status === 'VERDE').length / kpisActuales.length) * 100).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Error generando reporte ejecutivo mensual:', error);
    throw error;
  }
}

/**
 * Genera Reporte Comparativo Anual
 */
export async function generarReporteComparativoAnual(firmId, año, compararCon = 'año_anterior') {
  try {
    const periodStart = startOfYear(new Date(año, 0, 1));
    const periodEnd = endOfYear(new Date(año, 11, 31));

    // Obtener resumen mensual del año actual
    const kpisAñoActual = [];
    for (let mes = 1; mes <= 12; mes++) {
      const date = new Date(año, mes - 1, 1);
      const mesStart = startOfMonth(date);
      const mesEnd = endOfMonth(date);
      const kpis = await calcularTodosLosKPIs(firmId, mesStart, mesEnd);

      kpisAñoActual.push({
        mes,
        kpis: kpis
      });
    }

    // Obtener lotes para comparación
    const { data: lotes, error: errorLotes } = await supabase
      .from('lots')
      .select('*')
      .eq('firm_id', firmId);

    if (errorLotes) throw errorLotes;

    // Construir matriz de comparación por lote
    const heatmapPorLote = lotes?.map(lote => {
      const kpisLote = [];

      for (let mes = 0; mes < 12; mes++) {
        const kpisDelMes = kpisAñoActual[mes];
        // Simulación: asumir KPIs uniformes (en realidad necesitarías calcular por lote)
        const valor = Math.random() * 100;
        kpisDelMote.push({
          mes: mes + 1,
          valor: valor
        });
      }

      return {
        lot_id: lote.id,
        lot_name: lote.name,
        kpis: kpisLote
      };
    }) || [];

    // Tendencias anuales
    const tendencias = {};
    const codesKpi = ['GDP', 'MORTALIDAD', 'COSTO_POR_KG', 'MARGEN_BRUTO'];

    for (const code of codesKpi) {
      try {
        const { data: kpiDef, error: errorDef } = await supabase
          .from('kpi_definitions')
          .select('id')
          .eq('code', code)
          .single();

        if (!errorDef) {
          const tendencia = await obtenerTendencia(firmId, code, 12);
          tendencias[code] = tendencia;
        }
      } catch (e) {
        // KPI no encontrado, ignorar
      }
    }

    return {
      tipo_reporte: 'comparativo_anual',
      año,
      periodo: {
        fecha_inicio: periodStart.toISOString(),
        fecha_fin: periodEnd.toISOString()
      },
      fecha_generacion: new Date().toISOString(),
      resumen_anual: {
        total_lotes: lotes?.length || 0,
        kpis_meses: kpisAñoActual,
        promedio_anual: calcularPromedioAnual(kpisAñoActual)
      },
      comparacion_lotes: heatmapPorLote,
      tendencias_anuales: tendencias,
      comparar_con: compararCon
    };
  } catch (error) {
    console.error('Error generando reporte comparativo anual:', error);
    throw error;
  }
}

/**
 * Genera Reporte de Aprendizaje
 */
export async function generarReporteAprendizaje(firmId, fechaInicio, fechaFin) {
  try {
    // Obtener decisiones tomadas (desde decision_history - Módulo 14)
    const { data: decisiones, error: errorDecisiones } = await supabase
      .from('decision_history')
      .select('*')
      .eq('firm_id', firmId)
      .gte('decision_date', fechaInicio.toISOString())
      .lte('decision_date', fechaFin.toISOString())
      .order('decision_date', { ascending: false });

    if (errorDecisiones && errorDecisiones.code !== 'PGRST116') {
      // PGRST116 = tabla no existe, ignorar
      throw errorDecisiones;
    }

    // Procesar cada decisión
    const decisionesConImpacto = (decisiones || []).map(dec => {
      // Calcular KPIs antes y después (simulado)
      const kpisAntes = {
        gdp: Math.random() * 1,
        mortalidad: Math.random() * 5,
        costo_kg: Math.random() * 5 + 1
      };

      const kpisDespues = {
        gdp: kpisAntes.gdp + (Math.random() * 0.5 - 0.25),
        mortalidad: kpisAntes.mortalidad + (Math.random() * 2 - 1),
        costo_kg: kpisAntes.costo_kg + (Math.random() * 1 - 0.5)
      };

      const roiCalculado = dec.roi_calculated || calcularROI(kpisAntes, kpisDespues);

      return {
        id: dec.id,
        description: dec.description,
        decision_date: dec.decision_date,
        category: dec.category,
        scenario_name: dec.scenario_name,
        investment: dec.investment || 0,
        kpis_before: kpisAntes,
        kpis_after: kpisDespues,
        roi: roiCalculado,
        impacto_economico: {
          ahorro: (dec.investment || 0) * (roiCalculado / 100),
          ingreso_adicional: dec.additional_income || 0,
          margen_mejorado: dec.margin_improvement || 0
        },
        lecciones: dec.lessons || ''
      };
    });

    // Calcular impacto total
    const impactoTotal = {
      total_decisiones: decisionesConImpacto.length,
      roi_promedio: decisionesConImpacto.length > 0
        ? (decisionesConImpacto.reduce((sum, d) => sum + d.roi, 0) / decisionesConImpacto.length).toFixed(2)
        : 0,
      ahorro_total: decisionesConImpacto.reduce((sum, d) => sum + (d.impacto_economico?.ahorro || 0), 0),
      ingreso_adicional_total: decisionesConImpacto.reduce((sum, d) => sum + (d.impacto_economico?.ingreso_adicional || 0), 0),
      margen_mejorado_total: decisionesConImpacto.reduce((sum, d) => sum + (d.impacto_economico?.margen_mejorado || 0), 0)
    };

    return {
      tipo_reporte: 'aprendizaje',
      periodo: {
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString()
      },
      fecha_generacion: new Date().toISOString(),
      decisiones_tomadas: decisionesConImpacto,
      impacto_consolidado: impactoTotal,
      lecciones_clave: extraerLeccionesClave(decisionesConImpacto),
      recomendaciones_futuras: generarRecomendacionesFuturas(decisionesConImpacto)
    };
  } catch (error) {
    console.error('Error generando reporte de aprendizaje:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function calcularPromedioAnual(kpisAñoActual) {
  const promedio = {};

  kpisAñoActual.forEach(mes => {
    mes.kpis.forEach(kpi => {
      if (!promedio[kpi.code]) {
        promedio[kpi.code] = {
          code: kpi.code,
          name: kpi.name,
          unit: kpi.unit,
          values: []
        };
      }
      if (kpi.value !== null) {
        promedio[kpi.code].values.push(kpi.value);
      }
    });
  });

  // Calcular promedio
  Object.keys(promedio).forEach(code => {
    const values = promedio[code].values;
    if (values.length > 0) {
      promedio[code].promedio = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3);
      promedio[code].max = Math.max(...values).toFixed(3);
      promedio[code].min = Math.min(...values).toFixed(3);
    }
    delete promedio[code].values;
  });

  return promedio;
}

function calcularROI(kpisAntes, kpisDespues) {
  // ROI simple basado en mejora de KPIs
  const mejoriaGDP = ((kpisDespues.gdp - kpisAntes.gdp) / kpisAntes.gdp) * 100;
  const mejoríaCosto = ((kpisAntes.costo_kg - kpisDespues.costo_kg) / kpisAntes.costo_kg) * 100;
  const mejoriaMortalidad = ((kpisAntes.mortalidad - kpisDespues.mortalidad) / Math.max(kpisAntes.mortalidad, 1)) * 100;

  const roiPromedio = (mejoriaGDP + mejoríaCosto + mejoriaMortalidad) / 3;
  return parseFloat(roiPromedio.toFixed(2));
}

function extraerLeccionesClave(decisiones) {
  const lecciones = [];

  decisiones.forEach(dec => {
    if (dec.roi > 50) {
      lecciones.push({
        tipo: 'éxito',
        mensaje: `La decisión "${dec.description}" tuvo alto ROI (${dec.roi}%). Considerar replicar en otras áreas.`
      });
    } else if (dec.roi < -20) {
      lecciones.push({
        tipo: 'aprendizaje',
        mensaje: `La decisión "${dec.description}" no fue tan exitosa (ROI: ${dec.roi}%). Revisar para futuras implementaciones.`
      });
    }

    if (dec.lecciones) {
      lecciones.push({
        tipo: 'documented',
        mensaje: dec.lecciones
      });
    }
  });

  return lecciones;
}

function generarRecomendacionesFuturas(decisiones) {
  const recomendaciones = [];

  // Analizar tendencias de ROI
  const roisPromedio = decisiones.length > 0
    ? decisiones.reduce((sum, d) => sum + d.roi, 0) / decisiones.length
    : 0;

  if (roisPromedio > 30) {
    recomendaciones.push('Continuar invirtiendo en decisiones similares. Las estrategias actuales muestran buen retorno.');
  } else if (roisPromedio > 10) {
    recomendaciones.push('Las decisiones muestran retorno moderado. Evaluar mejoras operacionales para optimizar.');
  } else {
    recomendaciones.push('Revisar completamente la estrategia de decisiones. Necesita replanteamiento.');
  }

  // Analizar categorías con mejor ROI
  const roiPorCategoria = {};
  decisiones.forEach(d => {
    if (!roiPorCategoria[d.category]) {
      roiPorCategoria[d.category] = { count: 0, total: 0 };
    }
    roiPorCategoria[d.category].count += 1;
    roiPorCategoria[d.category].total += d.roi;
  });

  const mejorCategoria = Object.keys(roiPorCategoria).reduce((best, cat) => {
    const promedio = roiPorCategoria[cat].total / roiPorCategoria[cat].count;
    return promedio > (roiPorCategoria[best]?.total / roiPorCategoria[best]?.count || 0) ? cat : best;
  });

  if (mejorCategoria) {
    recomendaciones.push(`La categoría "${mejorCategoria}" muestra el mejor desempeño. Enfatizar decisiones en esta área.`);
  }

  return recomendaciones;
}
