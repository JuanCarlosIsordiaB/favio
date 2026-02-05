/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * scenarioComparison.js - Comparación de Escenarios
 *
 * Funcionalidad:
 * - Comparar múltiples escenarios
 * - Calcular puntajes
 * - Generar recomendaciones
 * - Ranking de mejores opciones
 */

import { supabase } from '../../lib/supabase';

// =============================================
// COMPARACIÓN DE ESCENARIOS
// =============================================

/**
 * Comparar múltiples escenarios
 */
export function compareScenarios(scenarios, comparisonCriteria = null) {
  try {
    if (!scenarios || scenarios.length === 0) {
      throw new Error('Se requiere al menos un escenario para comparar');
    }

    // Usar criterios por defecto si no se especifican
    const criteria = comparisonCriteria || getDefaultComparationCriteria();

    // Calcular scores para cada escenario
    const scenariosWithScores = scenarios.map(scenario => {
      const score = calculateScenarioScore(scenario, criteria);
      return {
        ...scenario,
        comparison_score: score,
        weighted_metrics: calculateWeightedMetrics(scenario, criteria)
      };
    });

    // Ordenar por score descendente
    const rankedScenarios = scenariosWithScores.sort(
      (a, b) => b.comparison_score - a.comparison_score
    );

    // Generar análisis detallado
    const comparison = {
      total_scenarios: scenarios.length,
      scenarios: rankedScenarios,
      winner_scenario: rankedScenarios[0],
      winner_score: rankedScenarios[0].comparison_score,
      runner_up_scenario: rankedScenarios.length > 1 ? rankedScenarios[1] : null,
      comparison_criteria: criteria,
      analysis: generateComparisonAnalysis(rankedScenarios, criteria)
    };

    return comparison;
  } catch (error) {
    console.error('Error comparando escenarios:', error);
    throw error;
  }
}

/**
 * Obtener criterios de comparación por defecto
 */
function getDefaultComparationCriteria() {
  return {
    priority_factors: ['margin', 'roi', 'risk'],
    weights: {
      margin: 0.4,        // 40% margen
      roi: 0.3,           // 30% ROI
      risk: 0.3           // 30% riesgo (invertido: menor riesgo = mejor)
    },
    risk_weight: 0.3
  };
}

// =============================================
// CÁLCULO DE PUNTAJES
// =============================================

/**
 * Calcular puntaje de un escenario (0-10)
 */
export function calculateScenarioScore(scenario, criteria) {
  const { results } = scenario;

  if (!results) {
    return 0;
  }

  // Normalizar métricas a escala 0-10
  const marginScore = normalizeMarginScore(results.margin, results.revenue || results.total_kg_produced * results.price_per_kg || 0);
  const roiScore = normalizeROIScore(results.roi_percent || 0);
  const riskScore = normalizeRiskScore(scenario);

  // Aplicar pesos
  const weights = criteria.weights || getDefaultComparationCriteria().weights;
  const totalScore =
    (marginScore * weights.margin) +
    (roiScore * weights.roi) +
    (riskScore * weights.risk);

  return Math.min(10, totalScore); // Cap at 10
}

/**
 * Normalizar margen a escala 0-10
 */
function normalizeMarginScore(margin, revenue) {
  if (revenue <= 0) return 0;

  const marginPercent = (margin / revenue) * 100;

  if (marginPercent > 50) return 10;
  if (marginPercent > 40) return 9;
  if (marginPercent > 30) return 8;
  if (marginPercent > 20) return 7;
  if (marginPercent > 10) return 6;
  if (marginPercent > 0) return 4;
  if (marginPercent > -10) return 2;
  return 0;
}

/**
 * Normalizar ROI a escala 0-10
 */
function normalizeROIScore(roiPercent) {
  if (roiPercent > 100) return 10;
  if (roiPercent > 50) return 9;
  if (roiPercent > 25) return 8;
  if (roiPercent > 10) return 7;
  if (roiPercent > 5) return 5;
  if (roiPercent > 0) return 3;
  if (roiPercent > -5) return 1;
  return 0;
}

/**
 * Normalizar riesgo a escala 0-10
 * Menor riesgo = puntuación más alta
 */
function normalizeRiskScore(scenario) {
  const { results } = scenario;

  let riskLevel = 5; // Neutral por defecto

  // Evaluar riesgos
  if (results.risk_factors && Array.isArray(results.risk_factors)) {
    const riskCount = results.risk_factors.length;

    if (riskCount === 0) riskLevel = 10;
    else if (riskCount === 1) riskLevel = 8;
    else if (riskCount === 2) riskLevel = 6;
    else if (riskCount === 3) riskLevel = 4;
    else if (riskCount >= 4) riskLevel = 2;
  }

  // Ajustar por nivel de riesgo explícito
  if (results.risk_level === 'LOW') riskLevel = Math.min(10, riskLevel + 2);
  else if (results.risk_level === 'HIGH') riskLevel = Math.max(0, riskLevel - 2);
  else if (results.risk_level === 'CRITICAL') riskLevel = Math.max(0, riskLevel - 4);

  return Math.min(10, Math.max(0, riskLevel));
}

/**
 * Calcular métricas ponderadas para cada escenario
 */
function calculateWeightedMetrics(scenario, criteria) {
  const { results } = scenario;

  return {
    margin: results.margin || 0,
    roi_percent: results.roi_percent || 0,
    risk_score: normalizeRiskScore(scenario),
    margin_percent: results.margin_percent || 0,
    cost_per_kg: results.cost_per_kg || 0,
    total_cost: results.total_cost || 0,
    revenue: results.revenue || 0,
    production_kg: results.total_kg_produced || results.production_kg || 0
  };
}

// =============================================
// ANÁLISIS Y RECOMENDACIONES
// =============================================

/**
 * Generar análisis detallado de comparación
 */
function generateComparisonAnalysis(rankedScenarios, criteria) {
  const topScenario = rankedScenarios[0];

  const analysis = {
    winner: {
      name: topScenario.name,
      scenario_type: topScenario.scenario_type,
      score: topScenario.comparison_score,
      strengths: getScenarioStrengths(topScenario),
      weaknesses: getScenarioWeaknesses(topScenario),
      recommendation: generateRecommendation(topScenario)
    },
    comparison_summary: {
      highest_margin: rankedScenarios.reduce((max, s) => s.results?.margin > max.results?.margin ? s : max),
      highest_roi: rankedScenarios.reduce((max, s) => s.results?.roi_percent > max.results?.roi_percent ? s : max),
      lowest_risk: rankedScenarios.reduce((min, s) => normalizeRiskScore(s) > normalizeRiskScore(min) ? s : min),
      lowest_cost: rankedScenarios.reduce((min, s) => (s.results?.total_cost || Infinity) < (min.results?.total_cost || Infinity) ? s : min)
    },
    detailed_ranking: rankedScenarios.map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      scenario_type: s.scenario_type,
      score: s.comparison_score.toFixed(2),
      margin: s.results?.margin?.toFixed(2),
      roi_percent: s.results?.roi_percent?.toFixed(1),
      risk_factors_count: s.results?.risk_factors?.length || 0
    }))
  };

  return analysis;
}

/**
 * Obtener fortalezas del escenario
 */
function getScenarioStrengths(scenario) {
  const { results } = scenario;
  const strengths = [];

  if (results.margin > 0) {
    strengths.push(`Margen positivo de $${results.margin.toFixed(2)}`);
  }

  if (results.roi_percent > 25) {
    strengths.push(`ROI excelente: ${results.roi_percent.toFixed(1)}%`);
  }

  if (results.risk_factors && results.risk_factors.length <= 1) {
    strengths.push('Riesgo bajo');
  }

  if (results.margin_percent > 30) {
    strengths.push(`Margen porcentual alto: ${results.margin_percent.toFixed(1)}%`);
  }

  if (strengths.length === 0) {
    strengths.push('Escenario viable');
  }

  return strengths;
}

/**
 * Obtener debilidades del escenario
 */
function getScenarioWeaknesses(scenario) {
  const { results } = scenario;
  const weaknesses = [];

  if (results.margin < 0) {
    weaknesses.push(`Margen negativo: $${results.margin.toFixed(2)}`);
  } else if (results.margin < 10000) {
    weaknesses.push('Margen muy estrecho');
  }

  if (results.roi_percent < 10 && results.roi_percent > 0) {
    weaknesses.push(`ROI bajo: ${results.roi_percent.toFixed(1)}%`);
  }

  if (results.risk_factors && results.risk_factors.length > 2) {
    weaknesses.push(`Múltiples riesgos identificados: ${results.risk_factors.length}`);
  }

  if (results.cost_per_kg > 12) {
    weaknesses.push(`Costo/kg elevado: $${results.cost_per_kg.toFixed(2)}`);
  }

  return weaknesses;
}

/**
 * Generar recomendación del escenario
 */
export function generateRecommendation(scenario) {
  const { results, name } = scenario;

  if (results.margin < 0) {
    return `❌ NO RECOMENDADO: "${name}" tiene margen negativo. Requiere revisión urgente.`;
  }

  if (results.roi_percent < 5) {
    return `⚠️ BAJO RETORNO: "${name}" tiene ROI muy bajo (${results.roi_percent.toFixed(1)}%). Considerar alternativas.`;
  }

  if (results.risk_factors && results.risk_factors.length > 3) {
    return `⚠️ ALTO RIESGO: "${name}" tiene múltiples factores de riesgo. Proceder con precaución.`;
  }

  if (results.margin > 50000 && results.roi_percent > 25) {
    return `✅ ALTAMENTE RECOMENDADO: "${name}" ofrece margen fuerte ($${results.margin.toFixed(2)}) y ROI excelente (${results.roi_percent.toFixed(1)}%).`;
  }

  if (results.margin > 20000 && results.roi_percent > 10) {
    return `✅ RECOMENDADO: "${name}" es una opción sólida con margen de $${results.margin.toFixed(2)} y ROI de ${results.roi_percent.toFixed(1)}%.`;
  }

  return `➡️ VIABLE: "${name}" es una opción aceptable. Evalúa vs otras alternativas.`;
}

// =============================================
// GUARDAR COMPARACIONES
// =============================================

/**
 * Guardar comparación en base de datos
 */
export async function saveComparison(firmId, comparisonData, userId) {
  try {
    const comparison = {
      firm_id: firmId,
      name: comparisonData.name || 'Comparación de Escenarios',
      description: comparisonData.description,
      scenario_ids: comparisonData.scenario_ids,
      comparison_criteria: comparisonData.comparison_criteria,
      winner_scenario_id: comparisonData.comparison.winner_scenario.id,
      winner_score: comparisonData.comparison.winner_scenario.comparison_score,
      comparison_results: comparisonData.comparison.analysis,
      created_by: userId
    };

    const { data, error } = await supabase
      .from('scenario_comparisons')
      .insert([comparison])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      comparison: data,
      message: 'Comparación guardada exitosamente'
    };
  } catch (error) {
    console.error('Error guardando comparación:', error);
    throw error;
  }
}

// =============================================
// UTILIDADES
// =============================================

/**
 * Extraer métrica de un escenario
 */
export function getMetric(scenario, metricName) {
  const { results } = scenario;

  const metrics = {
    margin: results.margin,
    roi: results.roi_percent,
    cost_per_kg: results.cost_per_kg,
    production: results.total_kg_produced,
    revenue: results.revenue,
    total_cost: results.total_cost
  };

  return metrics[metricName] || null;
}

export default {
  compareScenarios,
  calculateScenarioScore,
  generateRecommendation,
  saveComparison,
  getMetric
};
