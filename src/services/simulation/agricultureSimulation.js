/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * agricultureSimulation.js - Simulación Agrícola
 *
 * Funcionalidad:
 * - Simulación de producción agrícola
 * - Ajuste de rendimiento por clima
 * - Simulación de manejo de pasturas
 * - Análisis de sostenibilidad
 */

import { supabase } from '../../lib/supabase';

// =============================================
// SIMULACIÓN DE PRODUCCIÓN AGRÍCOLA
// =============================================

/**
 * Simular producción agrícola
 */
export function simulateAgriculturalProduction(inputParameters) {
  try {
    const {
      crop_type = 'Cultivo',
      area_hectares = 1,
      expected_yield_kg_ha = 3000,
      price_per_kg = 0,
      input_costs = 0,
      machinery_costs = 0,
      labor_costs = 0
    } = inputParameters;

    // Producción total esperada
    const totalProduction = area_hectares * expected_yield_kg_ha;

    // Costos totales
    const totalCost = input_costs + machinery_costs + labor_costs;

    // Ingresos
    const revenue = totalProduction * price_per_kg;

    // Margen
    const margin = revenue - totalCost;
    const marginPerHa = margin / area_hectares;

    // Costo por kg
    const costPerKg = totalProduction > 0 ? totalCost / totalProduction : 0;

    return {
      // Cultivo
      crop_type,
      area_hectares,
      expected_yield_kg_ha,

      // Producción
      total_production_kg: totalProduction,
      production_per_ha: expected_yield_kg_ha,

      // Costos
      total_cost: totalCost,
      cost_per_kg: costPerKg,
      cost_per_ha: totalCost / area_hectares,
      input_costs,
      machinery_costs,
      labor_costs,

      // Económico
      price_per_kg,
      revenue,
      revenue_per_ha: revenue / area_hectares,
      margin,
      margin_per_ha: marginPerHa,
      margin_percent: revenue > 0 ? (margin / revenue) * 100 : 0,
      roi_percent: totalCost > 0 ? (margin / totalCost) * 100 : 0
    };
  } catch (error) {
    console.error('Error simulando producción agrícola:', error);
    throw error;
  }
}

// =============================================
// AJUSTE DE RENDIMIENTO POR CLIMA
// =============================================

/**
 * Ajustar rendimiento esperado basado en datos climáticos históricos
 */
export async function adjustYieldByClimate(lotId, cropType, baseYield) {
  try {
    // Obtener datos de lluvia del último año
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: rainfallData } = await supabase
      .from('rainfall_records')
      .select('mm_lluvia')
      .eq('lot_id', lotId)
      .gte('fecha', oneYearAgo.toISOString().split('T')[0]);

    const annualRainfall = rainfallData?.reduce((sum, r) => sum + (r.mm_lluvia || 0), 0) || 800;

    // Obtener análisis de suelo
    const { data: soilAnalysis } = await supabase
      .from('analisis_suelo')
      .select('*')
      .eq('lot_id', lotId)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    // Calcular factor de ajuste de clima
    let climateAdjustmentFactor = 1.0;

    // Ajustar por lluvia
    if (annualRainfall < 400) {
      climateAdjustmentFactor *= 0.7; // Sequía
    } else if (annualRainfall < 600) {
      climateAdjustmentFactor *= 0.85; // Lluvia baja
    } else if (annualRainfall > 1200) {
      climateAdjustmentFactor *= 0.9; // Exceso de lluvia, riesgo de enfermedad
    }

    // Ajustar por calidad de suelo
    if (soilAnalysis) {
      const resultado = soilAnalysis.resultado || '';
      if (resultado.includes('Bajo') || resultado.includes('Deficiente')) {
        climateAdjustmentFactor *= 0.8;
      } else if (resultado.includes('Óptimo')) {
        climateAdjustmentFactor *= 1.1;
      }
    }

    const adjustedYield = baseYield * climateAdjustmentFactor;

    return {
      base_yield_kg_ha: baseYield,
      adjusted_yield_kg_ha: adjustedYield,
      adjustment_factor: climateAdjustmentFactor,
      annual_rainfall_mm: annualRainfall,
      adjustment_details: {
        rainfall_factor: getRainfallFactor(annualRainfall),
        soil_quality_available: !!soilAnalysis
      }
    };
  } catch (error) {
    console.error('Error ajustando rendimiento por clima:', error);
    // Retornar el rendimiento sin ajuste
    return {
      base_yield_kg_ha: baseYield,
      adjusted_yield_kg_ha: baseYield,
      adjustment_factor: 1.0,
      error: true,
      message: 'No se pudo ajustar por clima, usando base'
    };
  }
}

/**
 * Obtener factor de ajuste por lluvia
 */
function getRainfallFactor(annualRainfall) {
  if (annualRainfall < 400) return 0.7;
  if (annualRainfall < 600) return 0.85;
  if (annualRainfall > 1200) return 0.9;
  return 1.0;
}

// =============================================
// ANÁLISIS DE ROTACIÓN DE CULTIVOS
// =============================================

/**
 * Analizar rotación de cultivos
 * Evalúa si la secuencia es sostenible
 */
export function analyzeRotationSustainability(cropSequence) {
  // cropSequence: Array de cultivos en orden [Año1, Año2, Año3, ...]
  const analysis = {
    crops: cropSequence,
    sustainability_score: 0,
    recommendations: [],
    issues: []
  };

  // Validar que no hay repetición inmediata de cultivos
  let repeats = 0;
  for (let i = 0; i < cropSequence.length - 1; i++) {
    if (cropSequence[i] === cropSequence[i + 1]) {
      repeats++;
      analysis.issues.push(`Repetición del cultivo ${cropSequence[i]} en años consecutivos`);
    }
  }

  // Validar diversidad
  const uniqueCrops = new Set(cropSequence).size;
  const diversity = uniqueCrops / cropSequence.length;

  if (diversity < 0.5) {
    analysis.issues.push('Baja diversidad de cultivos (< 50%)');
    analysis.recommendations.push('Considerar introducir más cultivos en rotación');
  }

  // Calcular score
  let score = 100;
  score -= repeats * 15;
  score -= (1 - diversity) * 20;

  analysis.sustainability_score = Math.max(0, score);

  if (score > 70) {
    analysis.recommendations.push('Rotación sostenible');
  } else if (score > 40) {
    analysis.recommendations.push('Rotación aceptable, mejorable');
  } else {
    analysis.recommendations.push('Rotación poco sostenible, requiere revisión');
  }

  return analysis;
}

// =============================================
// IMPACTO DE PLAGAS Y ENFERMEDADES
// =============================================

/**
 * Estimar impacto de plagas y enfermedades en rendimiento
 */
export function estimatePestImpact(
  baseSeedGermination,
  diseasePresencePercent = 0,
  pestPresencePercent = 0
) {
  // Germination es la base
  let effectiveGermination = baseSeedGermination;

  // Reducción por enfermedad
  const diseaseReduction = effectiveGermination * (diseasePresencePercent / 100);
  effectiveGermination -= diseaseReduction;

  // Reducción por plagas
  const pestReduction = effectiveGermination * (pestPresencePercent / 100);
  effectiveGermination -= pestReduction;

  return {
    base_germination_percent: baseSeedGermination,
    effective_germination_percent: Math.max(0, effectiveGermination),
    disease_reduction_percent: diseaseReduction,
    pest_reduction_percent: pestReduction,
    total_loss_percent: (
      diseasePresencePercent + pestPresencePercent
    ),
    risk_level: getRiskLevel(
      diseasePresencePercent + pestPresencePercent
    )
  };
}

/**
 * Obtener nivel de riesgo basado en presencia de plagas
 */
function getRiskLevel(totalPestPresencePercent) {
  if (totalPestPresencePercent < 5) return 'LOW';
  if (totalPestPresencePercent < 15) return 'MEDIUM';
  if (totalPestPresencePercent < 30) return 'HIGH';
  return 'CRITICAL';
}

// =============================================
// ANÁLISIS DE EFICIENCIA
// =============================================

/**
 * Calcular eficiencia de la producción agrícola
 */
export function calculateAgriculturalEfficiency(economicResults, area) {
  const {
    total_cost,
    revenue,
    margin,
    total_production_kg
  } = economicResults;

  return {
    // Eficiencia de costo
    cost_efficiency: revenue > 0 ? (margin / revenue) * 100 : 0,
    cost_per_unit_area: area > 0 ? total_cost / area : 0,

    // Eficiencia de ingresos
    revenue_per_unit_area: area > 0 ? revenue / area : 0,
    margin_per_unit_area: area > 0 ? margin / area : 0,

    // Eficiencia de producción
    production_efficiency: total_production_kg > 0 ? total_production_kg / area : 0,

    // ROI
    roi_percent: total_cost > 0 ? (margin / total_cost) * 100 : 0,

    // Payback period (en meses aproximado)
    payback_months: total_cost > 0 && margin > 0
      ? (total_cost / margin) * 12
      : Infinity
  };
}

// =============================================
// VALIDACIONES
// =============================================

/**
 * Validar parámetros de simulación agrícola
 */
export function validateAgriculturalParameters(inputParameters) {
  const errors = [];

  if (!inputParameters.crop_type) {
    errors.push('Tipo de cultivo es requerido');
  }

  if ((inputParameters.area_hectares || 0) <= 0) {
    errors.push('Área debe ser mayor a 0 hectáreas');
  }

  if ((inputParameters.expected_yield_kg_ha || 0) <= 0) {
    errors.push('Rendimiento esperado debe ser mayor a 0 kg/ha');
  }

  if ((inputParameters.price_per_kg || 0) <= 0) {
    errors.push('Precio por kg debe ser mayor a 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  simulateAgriculturalProduction,
  adjustYieldByClimate,
  analyzeRotationSustainability,
  estimatePestImpact,
  calculateAgriculturalEfficiency,
  validateAgriculturalParameters
};
