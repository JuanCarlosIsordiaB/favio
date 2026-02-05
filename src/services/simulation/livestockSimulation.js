/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * livestockSimulation.js - Simulación Ganadera
 *
 * Funcionalidad:
 * - Simulación de carga animal
 * - Simulación de producción de carne
 * - Cálculo de receptividad y riesgo de sobrepastoreo
 * - Simulación de manejo de pasturas
 */

import { supabase } from '../../lib/supabase';

// =============================================
// SIMULACIÓN DE CARGA ANIMAL
// =============================================

/**
 * Simular carga animal (kg/ha)
 * Calcula carga, receptividad y riesgos de sobrepastoreo
 */
export function simulateCargaAnimal(inputParameters) {
  try {
    const {
      animal_count = 0,
      avg_weight_kg = 0,
      area_hectares = 1,
      daily_gain_kg = 0.5,
      duration_days = 180,
      price_per_kg = 0
    } = inputParameters;

    // Calcular carga animal (kg/ha)
    const totalAnimalWeight = animal_count * avg_weight_kg;
    const cargaKgHa = area_hectares > 0 ? totalAnimalWeight / area_hectares : 0;

    // Receptividad esperada del lote (default 400 kg/ha para pastura normal)
    const receptividadMax = inputParameters.receptividad_max || 400;

    // Calcular riesgo de sobrepastoreo
    const sobrepastoreoPercent = area_hectares > 0
      ? ((cargaKgHa / receptividadMax) - 1) * 100
      : 0;

    // Producción total (ganancia de peso)
    const totalWeightGain = animal_count * daily_gain_kg * duration_days;
    const finalAveragewWeight = avg_weight_kg + (daily_gain_kg * duration_days);
    const totalKgProduced = totalWeightGain;
    const kgPerHa = area_hectares > 0 ? totalKgProduced / area_hectares : 0;

    return {
      // Carga animal
      animal_count,
      avg_weight_kg,
      final_average_weight: finalAveragewWeight,
      total_animal_weight_kg: totalAnimalWeight,
      carga_kg_ha: cargaKgHa,

      // Receptividad y riesgo
      receptividad_max: receptividadMax,
      receptividad_percent: (cargaKgHa / receptividadMax) * 100,
      sobrepastoreo_percent: sobrepastoreoPercent,
      risk_sobrepastoreo: sobrepastoreoPercent > 0,

      // Producción
      duration_days,
      daily_gain_kg,
      total_kg_produced: totalKgProduced,
      kg_per_ha: kgPerHa,
      kg_per_animal: daily_gain_kg * duration_days,

      // Área
      area_hectares,

      // Económico
      price_per_kg,
      estimated_revenue: totalKgProduced * price_per_kg,

      // Indicadores
      sustainability_score: calculateSustainabilityScore(cargaKgHa, receptividadMax)
    };
  } catch (error) {
    console.error('Error simulando carga animal:', error);
    throw error;
  }
}

/**
 * Calcular score de sostenibilidad (0-100)
 * 100 = completamente sostenible
 * 0 = completamente insostenible
 */
function calculateSustainabilityScore(cargaKgHa, receptividadMax) {
  const ratio = cargaKgHa / receptividadMax;

  if (ratio < 0.7) return 100; // Muy bajo, abundancia de pasto
  if (ratio < 0.85) return 90; // Óptimo
  if (ratio < 1.0) return 70; // Bueno
  if (ratio < 1.15) return 50; // Moderado
  if (ratio < 1.3) return 30; // Crítico
  return 10; // Muy crítico
}

// =============================================
// SIMULACIÓN DE PRODUCCIÓN DE CARNE
// =============================================

/**
 * Simular producción de carne
 */
export function simulateProduccionCarne(inputParameters) {
  const {
    animal_count = 0,
    initial_weight_kg = 0,
    daily_gain_kg = 0.5,
    duration_days = 180,
    price_per_kg = 0,
    expected_mortality_percent = 2
  } = inputParameters;

  // Ajustar por mortalidad esperada
  const animalsAlive = animal_count * (1 - expected_mortality_percent / 100);

  // Peso final promedio
  const finalWeight = initial_weight_kg + (daily_gain_kg * duration_days);

  // Ganancia total de peso
  const totalWeightGain = animalsAlive * (finalWeight - initial_weight_kg);

  // Kilos producidos
  const totalKgProduced = totalWeightGain;

  // Ingresos
  const revenue = totalKgProduced * price_per_kg;

  return {
    initial_animal_count: animal_count,
    animals_alive: animalsAlive,
    mortality_percent: expected_mortality_percent,
    initial_weight_kg,
    final_weight_kg: finalWeight,
    daily_gain_kg,
    duration_days,
    total_weight_gain_kg: totalWeightGain,
    total_kg_produced: totalKgProduced,
    kg_per_animal: finalWeight - initial_weight_kg,
    price_per_kg,
    estimated_revenue: revenue,
    revenue_per_animal: revenue / animalsAlive,
    kg_per_day: totalKgProduced / duration_days
  };
}

// =============================================
// SIMULACIÓN DE MANEJO DE PASTURAS
// =============================================

/**
 * Simular manejo de pasturas
 * Incluye rotación, remanente, sostenibilidad
 */
export function simulatePastureManagement(inputParameters) {
  const {
    area_hectares = 1,
    rotation_days = 30,
    rest_days = 90,
    remanent_kg_ha = 1000,
    initial_available_kg_ha = 3000
  } = inputParameters;

  const totalRotationCycle = rotation_days + rest_days;
  const cycles_per_year = 365 / totalRotationCycle;

  // Producción anual de pasto
  const annualPastureProduction = initial_available_kg_ha * cycles_per_year * area_hectares;

  // Consumo vs disponibilidad
  const sustainabilityAnalysis = {
    rotation_days,
    rest_days,
    total_cycle_days: totalRotationCycle,
    cycles_per_year: Math.round(cycles_per_year),
    remanent_kg_ha,
    initial_available_kg_ha,
    annual_pasture_production: annualPastureProduction,
    area_hectares,
    sustainability_score: calculatePastureScore(rotation_days, rest_days),
    recommendation: getPastureRecommendation(rotation_days, rest_days)
  };

  return sustainabilityAnalysis;
}

/**
 * Calcular score de sostenibilidad del pastizal
 */
function calculatePastureScore(rotationDays, restDays) {
  // Ratio ideal: 1:2 o 1:3 (1 de pastoreo, 2-3 de descanso)
  const ratio = restDays / rotationDays;

  if (ratio >= 3) return 100;
  if (ratio >= 2) return 85;
  if (ratio >= 1.5) return 70;
  if (ratio >= 1) return 50;
  return 30;
}

/**
 * Obtener recomendación de manejo de pasturas
 */
function getPastureRecommendation(rotationDays, restDays) {
  const ratio = restDays / rotationDays;

  if (ratio < 1) {
    return 'CRÍTICO: Aumentar días de descanso. El pastizal no se recupera.';
  } else if (ratio < 1.5) {
    return 'ADVERTENCIA: Días de descanso insuficientes. Considerar aumentar.';
  } else if (ratio < 2) {
    return 'ACEPTABLE: Manejo moderado. Monitorear el estado del pastizal.';
  } else if (ratio < 3) {
    return 'BUENO: Manejo equilibrado. Pastizal en buen estado.';
  } else {
    return 'EXCELENTE: Manejo óptimo. Máxima sostenibilidad.';
  }
}

// =============================================
// CÁLCULO DE RECEPTIVIDAD DESDE DATOS DEL LOTE
// =============================================

/**
 * Calcular receptividad máxima basada en datos del lote
 * Integra datos de análisis de suelo y lluvia
 */
export async function calculateLotReceptividad(lotId) {
  try {
    // Obtener análisis de suelo más reciente
    const { data: soilAnalysis } = await supabase
      .from('analisis_suelo')
      .select('*')
      .eq('lot_id', lotId)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    // Obtener datos de lluvia del último año
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: rainfallData } = await supabase
      .from('rainfall_records')
      .select('mm_lluvia')
      .eq('lot_id', lotId)
      .gte('fecha', oneYearAgo.toISOString().split('T')[0]);

    // Calcular lluvia anual promedio
    const annualRainfall = rainfallData?.reduce((sum, r) => sum + (r.mm_lluvia || 0), 0) || 800;

    // Calcular receptividad base (300-500 kg/ha según lluvia)
    let baseReceptivity = 300;
    if (annualRainfall > 1000) baseReceptivity = 450;
    else if (annualRainfall > 800) baseReceptivity = 400;
    else if (annualRainfall > 600) baseReceptivity = 350;

    // Ajustar por calidad de suelo (si hay análisis disponible)
    if (soilAnalysis) {
      // Si hay buen nivel de N y P, aumentar receptividad
      if (soilAnalysis.resultado && soilAnalysis.resultado.includes('Óptimo')) {
        baseReceptivity *= 1.1;
      }
    }

    return {
      receptivity_kg_ha: baseReceptivity,
      annual_rainfall_mm: annualRainfall,
      soil_analysis_available: !!soilAnalysis,
      notes: `Receptividad calculada basada en ${annualRainfall}mm lluvia anual`
    };
  } catch (error) {
    console.error('Error calculando receptividad del lote:', error);
    // Retornar valor por defecto
    return {
      receptivity_kg_ha: 400,
      error: true,
      notes: 'Usando receptividad por defecto (400 kg/ha)'
    };
  }
}

// =============================================
// SIMULACIÓN DE EVENTOS GANADEROS
// =============================================

/**
 * Simular eventos ganaderos (vacunación, tratamiento, entore, etc)
 */
export function simulateLivestockEvent(eventType, inputParameters) {
  const {
    animal_count = 0,
    event_cost_per_animal = 0,
    expected_mortality_from_event_percent = 0,
    expected_benefit_percent = 0
  } = inputParameters;

  const totalEventCost = animal_count * event_cost_per_animal;
  const animalsLost = animal_count * (expected_mortality_from_event_percent / 100);
  const animalsRemaining = animal_count - animalsLost;
  const benefitValue = (animal_count * expected_benefit_percent / 100) * 100; // Approximation

  return {
    event_type: eventType,
    animal_count,
    animals_lost: animalsLost,
    animals_remaining: animalsRemaining,
    loss_percent: expected_mortality_from_event_percent,
    total_event_cost: totalEventCost,
    cost_per_animal: event_cost_per_animal,
    expected_benefit_value: benefitValue,
    net_impact: benefitValue - totalEventCost,
    is_beneficial: benefitValue > totalEventCost
  };
}

// =============================================
// VALIDACIONES
// =============================================

/**
 * Validar parámetros de simulación ganadera
 */
export function validateLivestockParameters(inputParameters) {
  const errors = [];

  if ((inputParameters.animal_count || 0) < 0) {
    errors.push('Cantidad de animales no puede ser negativa');
  }

  if ((inputParameters.avg_weight_kg || 0) <= 0) {
    errors.push('Peso promedio debe ser mayor a 0');
  }

  if ((inputParameters.area_hectares || 0) <= 0) {
    errors.push('Área debe ser mayor a 0');
  }

  if ((inputParameters.daily_gain_kg || 0) < 0) {
    errors.push('Ganancia diaria no puede ser negativa');
  }

  if ((inputParameters.duration_days || 0) <= 0) {
    errors.push('Duración debe ser mayor a 0 días');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  simulateCargaAnimal,
  simulateProduccionCarne,
  simulatePastureManagement,
  calculateLotReceptividad,
  simulateLivestockEvent,
  validateLivestockParameters
};
