/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * predictiveModels.js - Modelos Predictivos y Alertas
 *
 * Funcionalidad:
 * - Predecir costos futuros basado en histórico
 * - Predecir ganancia de peso
 * - Identificar riesgos en simulaciones
 * - Generar alertas predictivas automáticas
 */

import { supabase } from '../../lib/supabase';

// =============================================
// PREDICCIÓN DE COSTOS
// =============================================

/**
 * Predecir costos futuros basado en histórico
 */
export async function predictFutureCosts(lotId, workType, months = 3) {
  try {
    // Obtener trabajos históricos del lote
    const { data: historicalWorks } = await supabase
      .from('agricultural_works')
      .select('date, inputs_cost, machinery_cost, labor_cost')
      .eq('lot_id', lotId)
      .eq('work_type', workType)
      .order('date', { ascending: false })
      .limit(12); // Últimos 12 trabajos

    if (!historicalWorks || historicalWorks.length === 0) {
      return {
        error: true,
        message: 'Sin datos históricos suficientes'
      };
    }

    // Calcular promedio de costos
    const avgInputsCost = historicalWorks.reduce((sum, w) => sum + (w.inputs_cost || 0), 0) / historicalWorks.length;
    const avgMachineryCost = historicalWorks.reduce((sum, w) => sum + (w.machinery_cost || 0), 0) / historicalWorks.length;
    const avgLaborCost = historicalWorks.reduce((sum, w) => sum + (w.labor_cost || 0), 0) / historicalWorks.length;

    // Calcular tendencia (aumento/disminución)
    const recentAvg = historicalWorks.slice(0, 3).reduce((sum, w) => sum + (w.inputs_cost || 0), 0) / 3;
    const olderAvg = historicalWorks.slice(6, 9).reduce((sum, w) => sum + (w.inputs_cost || 0), 0) / 3;
    const trend = (recentAvg - olderAvg) / olderAvg; // % de cambio

    // Proyectar costos futuros
    const futureInputsCost = avgInputsCost * (1 + trend * (months / 3));
    const futureMachineryCost = avgMachineryCost * (1 + trend * (months / 3));
    const futureLaborCost = avgLaborCost * (1 + trend * (months / 3));

    return {
      predicted_inputs_cost: futureInputsCost,
      predicted_machinery_cost: futureMachineryCost,
      predicted_labor_cost: futureLaborCost,
      predicted_total_cost: futureInputsCost + futureMachineryCost + futureLaborCost,
      trend_percent: trend * 100,
      historical_samples: historicalWorks.length,
      confidence_level: 'MEDIUM' // Baja confianza con pocos datos
    };
  } catch (error) {
    console.error('Error prediciendo costos:', error);
    throw error;
  }
}

/**
 * Predecir ganancia de peso basado en histórico
 */
export async function predictWeightGain(categoryId, pastureQuality = 'NORMAL') {
  try {
    // Obtener eventos ganaderos históricos de la categoría
    const { data: historicalEvents } = await supabase
      .from('livestock_works')
      .select('metadata')
      .eq('animal_category_id', categoryId)
      .order('date', { ascending: false })
      .limit(10);

    if (!historicalEvents || historicalEvents.length === 0) {
      // Retornar valores por defecto según categoría
      return getDefaultWeightGain(categoryId, pastureQuality);
    }

    // Extraer datos de ganancia de peso del metadata
    let totalGain = 0;
    let count = 0;

    historicalEvents.forEach(event => {
      if (event.metadata?.daily_gain_kg) {
        totalGain += event.metadata.daily_gain_kg;
        count++;
      }
    });

    const avgDailyGain = count > 0 ? totalGain / count : getDefaultWeightGain(categoryId, pastureQuality).daily_gain_kg;

    // Ajustar por calidad de pastura
    let adjustedGain = avgDailyGain;
    if (pastureQuality === 'EXCELLENT') {
      adjustedGain *= 1.15;
    } else if (pastureQuality === 'POOR') {
      adjustedGain *= 0.8;
    }

    return {
      predicted_daily_gain_kg: adjustedGain,
      historical_average_kg: avgDailyGain,
      pasture_quality_factor: pastureQuality,
      confidence_level: count >= 5 ? 'HIGH' : 'MEDIUM',
      historical_samples: count
    };
  } catch (error) {
    console.error('Error prediciendo ganancia de peso:', error);
    return getDefaultWeightGain(categoryId, pastureQuality);
  }
}

/**
 * Obtener valores por defecto de ganancia de peso
 */
function getDefaultWeightGain(categoryId, pastureQuality) {
  const defaults = {
    'terneros': 0.7,
    'vaquillonas': 0.6,
    'vacas': 0.3,
    'toros': 0.5
  };

  let baseGain = defaults[categoryId] || 0.5;

  if (pastureQuality === 'EXCELLENT') {
    baseGain *= 1.15;
  } else if (pastureQuality === 'POOR') {
    baseGain *= 0.8;
  }

  return {
    predicted_daily_gain_kg: baseGain,
    historical_average_kg: baseGain,
    pasture_quality_factor: pastureQuality,
    confidence_level: 'LOW',
    message: 'Usando valores por defecto, sin datos históricos'
  };
}

// =============================================
// IDENTIFICACIÓN DE RIESGOS
// =============================================

/**
 * Identificar riesgos en simulación
 */
export function identifyRisks(scenario) {
  const risks = [];
  const { results, input_parameters } = scenario;

  if (!results) return risks;

  // RIESGO 1: Margen negativo
  if (results.margin < 0) {
    risks.push({
      type: 'MARGEN_NEGATIVO',
      severity: results.margin < -50000 ? 'CRITICAL' : 'HIGH',
      message: `Margen negativo: $${Math.abs(results.margin).toFixed(2)}`,
      recommendation: 'Revisar estructura de costos o precio de venta'
    });
  }

  // RIESGO 2: Sobrepastoreo
  if (results.carga_kg_ha > (results.receptividad_max || 400)) {
    const excess = ((results.carga_kg_ha / (results.receptividad_max || 400)) - 1) * 100;
    risks.push({
      type: 'SOBREPASTOREO',
      severity: excess > 20 ? 'CRITICAL' : 'HIGH',
      message: `Carga supera receptividad en ${excess.toFixed(1)}%`,
      recommendation: 'Reducir cantidad de animales o aumentar superficie'
    });
  }

  // RIESGO 3: Costo/kg fuera de rango
  const benchmarkCostPerKg = 10; // Configurable
  if (results.cost_per_kg > benchmarkCostPerKg * 1.2) {
    risks.push({
      type: 'COSTO_KG_FUERA_RANGO',
      severity: results.cost_per_kg > benchmarkCostPerKg * 1.5 ? 'HIGH' : 'MEDIUM',
      message: `Costo/kg de $${results.cost_per_kg.toFixed(2)} superior al benchmark`,
      recommendation: 'Optimizar costos de insumos y maquinaria'
    });
  }

  // RIESGO 4: ROI bajo
  if (results.roi_percent < 10 && results.roi_percent > 0) {
    risks.push({
      type: 'ROI_BAJO',
      severity: 'MEDIUM',
      message: `ROI bajo: ${results.roi_percent.toFixed(1)}%`,
      recommendation: 'Considerar alternativas más rentables'
    });
  }

  // RIESGO 5: Punto de equilibrio no alcanzable
  if (results.break_even_kg && results.production_kg < results.break_even_kg) {
    risks.push({
      type: 'PUNTO_EQUILIBRIO_NO_ALCANZABLE',
      severity: 'HIGH',
      message: `Producción insuficiente para punto de equilibrio`,
      recommendation: 'Aumentar producción o reducir inversión'
    });
  }

  // RIESGO 6: Variabilidad de precio
  if (results.sensitivity_analysis) {
    const scenarios = results.sensitivity_analysis.scenarios || [];
    const negativePriceScenarios = scenarios.filter(s => s.price_variation_percent < -10 && !s.is_profitable);
    if (negativePriceScenarios.length > 0) {
      risks.push({
        type: 'PRECIO_SENSIBLE',
        severity: 'MEDIUM',
        message: 'Margen muy sensible a cambios de precio',
        recommendation: 'Considerar protección de precio o reducir costos'
      });
    }
  }

  // RIESGO 7: Área o producción esperada muy baja
  if (input_parameters.area_hectares < 1) {
    risks.push({
      type: 'ESCALA_PEQUEÑA',
      severity: 'MEDIUM',
      message: 'Operación muy pequeña',
      recommendation: 'Considerar agrupar operaciones o aumentar escala'
    });
  }

  return risks;
}

// =============================================
// GENERACIÓN DE ALERTAS PREDICTIVAS
// =============================================

/**
 * Generar alertas predictivas desde resultados de simulación
 */
export async function generatePredictiveAlerts(scenarioWithResults, firmId) {
  const alerts = [];
  const { results, lot_id, premise_id, id: scenario_id } = scenarioWithResults;

  if (!results) return alerts;

  try {
    // Alerta 1: Margen negativo
    if (results.margin < 0) {
      alerts.push({
        firm_id: firmId,
        premise_id,
        lot_id,
        scenario_id,
        alert_type: 'MARGEN_NEGATIVO',
        severity: results.margin < -50000 ? 'CRITICAL' : 'HIGH',
        title: '⚠️ Margen Negativo Proyectado',
        description: `El escenario proyecta un margen negativo de $${Math.abs(results.margin).toFixed(2)}. Requiere revisión urgente.`,
        recommended_action: 'Revisar costos estimados o precio de venta. Considerar ajustar estrategia.',
        projected_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        metadata: {
          margin: results.margin,
          scenario_name: scenarioWithResults.name
        }
      });
    }

    // Alerta 2: Sobrepastoreo
    if (results.carga_kg_ha > (results.receptividad_max || 400)) {
      const excess = ((results.carga_kg_ha / (results.receptividad_max || 400)) - 1) * 100;
      alerts.push({
        firm_id: firmId,
        premise_id,
        lot_id,
        scenario_id,
        alert_type: 'SOBREPASTOREO',
        severity: excess > 20 ? 'CRITICAL' : 'HIGH',
        title: '🐄 Riesgo de Sobrepastoreo',
        description: `Carga proyectada (${results.carga_kg_ha.toFixed(1)} kg/ha) supera receptividad del lote en ${excess.toFixed(1)}%.`,
        recommended_action: 'Reducir cantidad de animales o aumentar superficie disponible.',
        projected_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        metadata: {
          carga_kg_ha: results.carga_kg_ha,
          receptividad_max: results.receptividad_max,
          excess_percent: excess
        }
      });
    }

    // Alerta 3: Costo/kg fuera de rango
    const costPerKgBenchmark = 10;
    if (results.cost_per_kg > costPerKgBenchmark * 1.2) {
      alerts.push({
        firm_id: firmId,
        premise_id,
        lot_id,
        scenario_id,
        alert_type: 'COSTO_KG_FUERA_RANGO',
        severity: results.cost_per_kg > costPerKgBenchmark * 1.5 ? 'HIGH' : 'MEDIUM',
        title: '💰 Costo/kg Elevado',
        description: `Costo por kg de $${results.cost_per_kg.toFixed(2)} supera el benchmark de $${costPerKgBenchmark}.`,
        recommended_action: 'Optimizar costos de insumos, maquinaria o mano de obra.',
        projected_date: new Date().toISOString().split('T')[0],
        metadata: {
          cost_per_kg: results.cost_per_kg,
          benchmark: costPerKgBenchmark
        }
      });
    }

    // Alerta 4: ROI bajo
    if (results.roi_percent < 10 && results.roi_percent > 0) {
      alerts.push({
        firm_id: firmId,
        premise_id,
        lot_id,
        scenario_id,
        alert_type: 'PRECIO_CRITICO',
        severity: 'MEDIUM',
        title: '⚠️ ROI Muy Bajo',
        description: `ROI proyectado de solo ${results.roi_percent.toFixed(1)}%. Poco margen de ganancia.`,
        recommended_action: 'Evaluar rentabilidad vs alternativas. Considerar cambio de estrategia.',
        projected_date: new Date().toISOString().split('T')[0],
        metadata: {
          roi_percent: results.roi_percent
        }
      });
    }

    // Insertar alertas en base de datos
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('predictive_alerts')
        .insert(alerts);

      if (error) {
        console.error('Error creando alertas predictivas:', error);
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error generando alertas predictivas:', error);
    return alerts;
  }
}

export default {
  predictFutureCosts,
  predictWeightGain,
  identifyRisks,
  generatePredictiveAlerts
};
