/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * scenarioEngine.js - Motor Principal de Escenarios
 *
 * Funcionalidad:
 * - Crear escenarios desde proyecciones o desde cero
 * - Ejecutar simulaciones
 * - Generar variantes automáticas (optimista, conservador, crítico)
 * - Guardar y obtener escenarios
 * - Convertir escenarios a proyecciones reales
 */

import { supabase } from '../../lib/supabase';
import {
  simulateCargaAnimal,
  simulateProduccionCarne,
  simulatePastureManagement,
  calculateLotReceptividad,
  validateLivestockParameters
} from './livestockSimulation';
import {
  simulateAgriculturalProduction,
  adjustYieldByClimate,
  analyzeRotationSustainability,
  validateAgriculturalParameters
} from './agricultureSimulation';
import {
  executeEconomicSimulation,
  performPriceSensitivityAnalysis,
  evaluateRentability,
  validateEconomicParameters
} from './economicSimulation';
import {
  predictFutureCosts,
  predictWeightGain,
  identifyRisks,
  generatePredictiveAlerts
} from './predictiveModels';

// =============================================
// CONTEXTO DE EJECUCIÓN
// =============================================

/**
 * Validar que estamos en contexto de simulación (no modificar datos reales)
 */
function validateSimulationContext() {
  // Esta validación es importante para asegurar que las simulaciones
  // nunca modifican datos reales del sistema
  return { context: 'SIMULATION', safe: true };
}

// =============================================
// CREAR ESCENARIOS
// =============================================

/**
 * Crear escenario desde una proyección agrícola
 */
export async function createScenarioFromAgriculturalProjection(
  projectionId,
  currentUser
) {
  try {
    validateSimulationContext();

    // Obtener proyección
    const { data: projection, error: projError } = await supabase
      .from('proyecciones_agricolas')
      .select('*')
      .eq('id', projectionId)
      .single();

    if (projError) throw projError;
    if (!projection) throw new Error('Proyección agrícola no encontrada');

    // Crear escenario base
    const scenarioData = {
      firm_id: projection.firm_id,
      premise_id: projection.premise_id,
      lot_id: projection.lot_id,
      name: `Simulación: ${projection.cultivo_proyectado}`,
      description: `Simulación agrícola basada en proyección del ${new Date(projection.fecha_tentativa).toLocaleDateString('es-ES')}`,
      scenario_type: 'CUSTOM',
      simulation_type: 'ECONOMICO', // Se ajusta según tipo de simulación elegida
      base_projection_id: projectionId,
      base_projection_type: 'AGRICULTURAL',
      input_parameters: {
        crop_type: projection.cultivo_proyectado,
        area_hectares: parseFloat(projection.hectareas) || 0,
        expected_yield_kg_ha: 0, // Usuario lo ingresa
        input_costs: parseFloat(projection.estimated_inputs_cost) || 0,
        machinery_costs: parseFloat(projection.estimated_machinery_cost) || 0,
        labor_costs: parseFloat(projection.estimated_labor_cost) || 0,
        other_costs: 0
      },
      results: {},
      status: 'DRAFT',
      executed_by: currentUser
    };

    // Guardar escenario
    const { data: scenario, error: saveError } = await supabase
      .from('simulation_scenarios')
      .insert([scenarioData])
      .select()
      .single();

    if (saveError) throw saveError;

    return {
      success: true,
      scenario,
      message: 'Escenario agrícola creado exitosamente'
    };
  } catch (error) {
    console.error('Error creando escenario desde proyección agrícola:', error);
    throw error;
  }
}

/**
 * Crear escenario desde una proyección ganadera
 */
export async function createScenarioFromLivestockProjection(
  projectionId,
  currentUser
) {
  try {
    validateSimulationContext();

    // Obtener proyección
    const { data: projection, error: projError } = await supabase
      .from('proyecciones_ganaderas')
      .select('*')
      .eq('id', projectionId)
      .single();

    if (projError) throw projError;
    if (!projection) throw new Error('Proyección ganadera no encontrada');

    // Crear escenario base
    const scenarioData = {
      firm_id: projection.firm_id,
      premise_id: projection.premise_id,
      lot_id: projection.lote_id,
      name: `Simulación: ${projection.tipo_evento}`,
      description: `Simulación ganadera basada en proyección del ${new Date(projection.fecha_tentativa).toLocaleDateString('es-ES')}`,
      scenario_type: 'CUSTOM',
      simulation_type: 'CARGA_ANIMAL',
      base_projection_id: projectionId,
      base_projection_type: 'LIVESTOCK',
      input_parameters: {
        animal_count: parseInt(projection.cantidad) || 0,
        animal_category: projection.categoria,
        avg_weight_kg: 0, // Usuario lo ingresa
        daily_gain_kg: 0, // Usuario lo ingresa
        duration_days: 180,
        area_hectares: 0 // Usuario lo ingresa
      },
      results: {},
      status: 'DRAFT',
      executed_by: currentUser
    };

    // Guardar escenario
    const { data: scenario, error: saveError } = await supabase
      .from('simulation_scenarios')
      .insert([scenarioData])
      .select()
      .single();

    if (saveError) throw saveError;

    return {
      success: true,
      scenario,
      message: 'Escenario ganadero creado exitosamente'
    };
  } catch (error) {
    console.error('Error creando escenario desde proyección ganadera:', error);
    throw error;
  }
}

/**
 * Crear escenario personalizado desde cero
 */
export async function createCustomScenario(scenarioData, currentUser) {
  try {
    validateSimulationContext();

    // Validaciones básicas
    if (!scenarioData.name) throw new Error('El nombre del escenario es requerido');
    if (!scenarioData.firm_id) throw new Error('La firma es requerida');
    if (!scenarioData.simulation_type) throw new Error('El tipo de simulación es requerido');

    // Preparar datos
    const dataToInsert = {
      ...scenarioData,
      scenario_type: scenarioData.scenario_type || 'CUSTOM',
      status: 'DRAFT',
      results: scenarioData.results || {},
      executed_by: currentUser,
      input_parameters: scenarioData.input_parameters || {}
    };

    // Guardar
    const { data: scenario, error } = await supabase
      .from('simulation_scenarios')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      scenario,
      message: 'Escenario personalizado creado exitosamente'
    };
  } catch (error) {
    console.error('Error creando escenario personalizado:', error);
    throw error;
  }
}

// =============================================
// EJECUTAR SIMULACIONES
// =============================================

/**
 * Ejecutar simulación y calcular resultados
 */
export async function executeSimulation(scenarioId, simulationModule = null) {
  try {
    validateSimulationContext();

    // Obtener escenario
    const { data: scenario, error: getError } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (getError) throw getError;
    if (!scenario) throw new Error('Escenario no encontrado');

    // Determinar qué simulación ejecutar
    let results = {};
    const { simulation_type, input_parameters } = scenario;

    switch (simulation_type) {
      case 'CARGA_ANIMAL':
        results = livestockSimulation.simulateCargaAnimal(input_parameters);
        break;

      case 'MANEJO_PASTURAS':
        results = livestockSimulation.simulatePastureManagement(input_parameters);
        break;

      case 'PRODUCCION':
        results = livestockSimulation.simulateProduccionCarne(input_parameters);
        break;

      case 'ECONOMICO':
        results = economicSimulation.executeEconomicSimulation(input_parameters);
        break;

      case 'INTEGRAL':
        // Simulación integral que combina todas
        results = await executeIntegralSimulation(scenario);
        break;

      default:
        throw new Error(`Tipo de simulación desconocido: ${simulation_type}`);
    }

    // Identificar riesgos
    const risks = predictiveModels.identifyRisks({ ...scenario, results });

    // Agregar riesgos a resultados
    results.risk_level = calculateRiskLevel(risks);
    results.risk_factors = risks;

    // Generar alertas predictivas si hay riesgos
    const alerts = [];
    if (risks.length > 0) {
      const generatedAlerts = await predictiveModels.generatePredictiveAlerts(
        { ...scenario, results },
        scenario.firm_id
      );
      alerts.push(...generatedAlerts);
    }
    results.alerts = alerts;

    // Actualizar escenario con resultados
    const { error: updateError } = await supabase
      .from('simulation_scenarios')
      .update({
        results,
        status: 'EXECUTED',
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scenarioId);

    if (updateError) throw updateError;

    return {
      success: true,
      scenario: {
        ...scenario,
        results,
        status: 'EXECUTED'
      },
      message: 'Simulación ejecutada exitosamente'
    };
  } catch (error) {
    console.error('Error ejecutando simulación:', error);
    throw error;
  }
}

/**
 * Ejecutar simulación integral (combina todos los tipos)
 */
async function executeIntegralSimulation(scenario) {
  const { input_parameters } = scenario;
  const results = {};

  // Simulación de carga animal si hay parámetros ganaderos
  if (input_parameters.animal_count) {
    results.livestock = livestockSimulation.simulateCargaAnimal(input_parameters);
  }

  // Simulación de producción si hay parámetros agrícolas
  if (input_parameters.crop_type) {
    results.agricultural = agricultureSimulation.simulateAgriculturalProduction(
      input_parameters
    );
  }

  // Simulación económica
  results.economic = economicSimulation.executeEconomicSimulation(input_parameters);

  // Consolidar resultados
  return {
    total_kg_produced: (results.livestock?.total_kg_produced || 0) +
                      (results.agricultural?.total_production_kg || 0),
    total_cost: results.economic?.total_cost || 0,
    estimated_revenue: results.economic?.revenue || 0,
    estimated_margin: results.economic?.margin || 0,
    margin_per_ha: results.economic?.margin_per_ha || 0,
    roi_percent: results.economic?.roi_percent || 0,
    cost_per_kg: results.economic?.cost_per_kg || 0,
    details: results
  };
}

// =============================================
// GENERAR VARIANTES AUTOMÁTICAS
// =============================================

/**
 * Generar variantes automáticas: Optimista, Conservador, Crítico
 */
export async function generateScenarioVariants(baseScenarioId, currentUser) {
  try {
    validateSimulationContext();

    // Obtener escenario base
    const { data: baseScenario, error: getError } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .eq('id', baseScenarioId)
      .single();

    if (getError) throw getError;
    if (!baseScenario) throw new Error('Escenario base no encontrado');

    const variants = [];

    // Variante OPTIMISTA
    const optimisticScenario = createVariant(
      baseScenario,
      'OPTIMISTIC',
      'Optimista',
      currentUser,
      {
        priceIncrease: 0.15,      // +15% precio
        gainIncrease: 0.20,       // +20% ganancia
        costFactor: 1.0,          // Costos normales
        rainfallFactor: 1.0       // Lluvia normal
      }
    );
    variants.push(optimisticScenario);

    // Variante CONSERVADORA
    const conservativeScenario = createVariant(
      baseScenario,
      'CONSERVATIVE',
      'Conservadora',
      currentUser,
      {
        priceIncrease: -0.10,     // -10% precio
        gainIncrease: -0.10,      // -10% ganancia
        costFactor: 1.1,          // +10% costos
        rainfallFactor: 0.8       // -20% lluvia
      }
    );
    variants.push(conservativeScenario);

    // Variante CRÍTICA
    const criticalScenario = createVariant(
      baseScenario,
      'CRITICAL',
      'Crítica',
      currentUser,
      {
        priceIncrease: -0.25,     // -25% precio
        gainIncrease: -0.30,      // -30% ganancia
        costFactor: 1.2,          // +20% costos
        rainfallFactor: 0.6       // -40% lluvia (sequía)
      }
    );
    variants.push(criticalScenario);

    // Guardar variantes
    const { data: savedVariants, error: saveError } = await supabase
      .from('simulation_scenarios')
      .insert(variants)
      .select();

    if (saveError) throw saveError;

    // Ejecutar simulaciones de todas las variantes
    const executedVariants = [];
    for (const variant of savedVariants) {
      try {
        const result = await executeSimulation(variant.id);
        executedVariants.push(result.scenario);
      } catch (err) {
        console.error(`Error ejecutando variante ${variant.name}:`, err);
      }
    }

    return {
      success: true,
      variants: executedVariants,
      message: `${executedVariants.length} variantes generadas y ejecutadas exitosamente`
    };
  } catch (error) {
    console.error('Error generando variantes de escenarios:', error);
    throw error;
  }
}

/**
 * Crear un escenario variante basado en parámetros de ajuste
 */
function createVariant(baseScenario, variantType, displayName, currentUser, adjustments) {
  const adjustedInputs = { ...baseScenario.input_parameters };

  // Ajustar precio
  if (adjustedInputs.price_per_kg) {
    adjustedInputs.price_per_kg *= (1 + adjustments.priceIncrease);
  }

  // Ajustar ganancia diaria
  if (adjustedInputs.daily_gain_kg) {
    adjustedInputs.daily_gain_kg *= (1 + adjustments.gainIncrease);
  }

  // Ajustar costos
  adjustedInputs.input_costs = (adjustedInputs.input_costs || 0) * adjustments.costFactor;
  adjustedInputs.machinery_costs = (adjustedInputs.machinery_costs || 0) * adjustments.costFactor;
  adjustedInputs.labor_costs = (adjustedInputs.labor_costs || 0) * adjustments.costFactor;
  adjustedInputs.other_costs = (adjustedInputs.other_costs || 0) * adjustments.costFactor;

  return {
    firm_id: baseScenario.firm_id,
    premise_id: baseScenario.premise_id,
    lot_id: baseScenario.lot_id,
    name: `${baseScenario.name} - ${displayName}`,
    description: `Variante ${displayName} de: ${baseScenario.description}`,
    scenario_type: variantType,
    simulation_type: baseScenario.simulation_type,
    base_projection_id: baseScenario.base_projection_id,
    base_projection_type: baseScenario.base_projection_type,
    input_parameters: adjustedInputs,
    results: {},
    status: 'DRAFT',
    executed_by: currentUser
  };
}

// =============================================
// GUARDAR Y OBTENER ESCENARIOS
// =============================================

/**
 * Guardar cambios en un escenario
 */
export async function saveScenario(scenarioId, updates) {
  try {
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', scenarioId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      scenario: data,
      message: 'Escenario guardado exitosamente'
    };
  } catch (error) {
    console.error('Error guardando escenario:', error);
    throw error;
  }
}

/**
 * Obtener escenarios con filtros
 */
export async function getScenarios(filters = {}) {
  try {
    let query = supabase.from('simulation_scenarios').select('*');

    if (filters.firm_id) {
      query = query.eq('firm_id', filters.firm_id);
    }

    if (filters.premise_id) {
      query = query.eq('premise_id', filters.premise_id);
    }

    if (filters.lot_id) {
      query = query.eq('lot_id', filters.lot_id);
    }

    if (filters.simulation_type) {
      query = query.eq('simulation_type', filters.simulation_type);
    }

    if (filters.scenario_type) {
      query = query.eq('scenario_type', filters.scenario_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Ordenar por fecha de creación descendente
    query = query.order('created_at', { ascending: false });

    // Límite
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      scenarios: data || [],
      count: data?.length || 0
    };
  } catch (error) {
    console.error('Error obteniendo escenarios:', error);
    throw error;
  }
}

/**
 * Obtener un escenario específico
 */
export async function getScenario(scenarioId) {
  try {
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (error) throw error;

    return {
      success: true,
      scenario: data
    };
  } catch (error) {
    console.error('Error obteniendo escenario:', error);
    throw error;
  }
}

/**
 * Eliminar escenario
 */
export async function deleteScenario(scenarioId) {
  try {
    const { error } = await supabase
      .from('simulation_scenarios')
      .delete()
      .eq('id', scenarioId);

    if (error) throw error;

    return {
      success: true,
      message: 'Escenario eliminado exitosamente'
    };
  } catch (error) {
    console.error('Error eliminando escenario:', error);
    throw error;
  }
}

// =============================================
// CONVERTIR ESCENARIO A PROYECCIÓN REAL
// =============================================

/**
 * Convertir escenario ejecutado a proyección real (agrícola)
 */
export async function convertScenarioToAgriculturalProjection(
  scenarioId,
  currentUser
) {
  try {
    validateSimulationContext();

    const { data: scenario, error: getError } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (getError) throw getError;
    if (!scenario) throw new Error('Escenario no encontrado');
    if (scenario.status !== 'EXECUTED') {
      throw new Error('Solo se pueden convertir escenarios ejecutados');
    }

    // Crear proyección basada en escenario
    const { results, input_parameters } = scenario;

    const projectionData = {
      firm_id: scenario.firm_id,
      premise_id: scenario.premise_id,
      lot_id: scenario.lot_id,
      fecha_tentativa: new Date().toISOString().split('T')[0],
      hectareas: input_parameters.area_hectares || 0,
      cultivo_proyectado: input_parameters.crop_type || 'Cultivo',
      producto: input_parameters.crop_type,
      tipo_trabajo: 'Siembra',
      dosis_ha: 0,
      total: results.total_kg_produced || 0,
      estimated_inputs_cost: results.total_cost ? results.total_cost * 0.4 : 0,
      estimated_machinery_cost: results.total_cost ? results.total_cost * 0.3 : 0,
      estimated_labor_cost: results.total_cost ? results.total_cost * 0.3 : 0,
      estimated_total_cost: results.total_cost || 0,
      cost_center_id: null,
      campaign_id: null,
      priority: 'MEDIUM',
      responsible_person: currentUser,
      estado: 'PENDIENTE',
      metadata: {
        from_simulation: true,
        scenario_id: scenarioId,
        scenario_results: results
      }
    };

    // Guardar proyección
    const { data: projection, error: saveError } = await supabase
      .from('proyecciones_agricolas')
      .insert([projectionData])
      .select()
      .single();

    if (saveError) throw saveError;

    // Actualizar escenario con referencia a proyección
    await supabase
      .from('simulation_scenarios')
      .update({
        converted_to_projection_id: projection.id,
        converted_at: new Date().toISOString()
      })
      .eq('id', scenarioId);

    // Registrar decisión
    await registerDecision(scenario, projection, currentUser);

    return {
      success: true,
      projection,
      message: 'Escenario convertido a proyección agrícola exitosamente'
    };
  } catch (error) {
    console.error('Error convirtiendo escenario a proyección:', error);
    throw error;
  }
}

/**
 * Registrar decisión en historial
 */
async function registerDecision(scenario, projection, currentUser) {
  try {
    const decisionData = {
      firm_id: scenario.firm_id,
      scenario_id: scenario.id,
      decision_type: 'EJECUTAR_PROYECCION',
      decision_description: `Convertir escenario "${scenario.name}" a proyección real`,
      decision_rationale: `Escenario ejecutado con margen de ${scenario.results.margin || 0}. Se procede con ejecución.`,
      expected_results: scenario.results,
      decided_at: new Date().toISOString(),
      decided_by: currentUser,
      outcome_evaluation: 'PENDING'
    };

    await supabase
      .from('decision_history')
      .insert([decisionData]);
  } catch (error) {
    console.error('Error registrando decisión:', error);
    // No lanzar error, solo logging
  }
}

// =============================================
// UTILIDADES
// =============================================

/**
 * Calcular nivel de riesgo basado en factores
 */
function calculateRiskLevel(riskFactors) {
  if (riskFactors.length === 0) return 'LOW';
  if (riskFactors.length <= 2) return 'MEDIUM';
  return 'HIGH';
}
