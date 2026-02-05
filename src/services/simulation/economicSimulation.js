/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * economicSimulation.js - Simulación Económica
 *
 * Funcionalidad:
 * - Calcular costos totales
 * - Calcular márgenes y rentabilidad
 * - Análisis de sensibilidad de precios
 * - Punto de equilibrio
 * - Indicadores económicos
 */

// =============================================
// EJECUCIÓN DE SIMULACIÓN ECONÓMICA
// =============================================

/**
 * Ejecutar simulación económica completa
 */
export function executeEconomicSimulation(inputParameters) {
  try {
    // Calcular costos
    const totalCost = calculateTotalCosts(inputParameters);

    // Obtener producción esperada
    const productionKg = inputParameters.total_kg_produced || inputParameters.production_kg || 0;
    const areaHectares = inputParameters.area_hectares || 1;

    // Obtener precio
    const pricePerKg = inputParameters.price_per_kg || 0;

    // Calcular ingresos
    const revenue = calculateRevenue(productionKg, pricePerKg);

    // Calcular márgenes
    const margin = revenue - totalCost;
    const marginPerHa = areaHectares > 0 ? margin / areaHectares : 0;

    // Calcular ROI
    const roiPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    // Calcular costo por kg
    const costPerKg = productionKg > 0 ? totalCost / productionKg : 0;

    // Análisis de sensibilidad
    const sensitivityAnalysis = performPriceSensitivityAnalysis({
      totalCost,
      productionKg,
      basePrice: pricePerKg,
      areaHectares
    });

    // Punto de equilibrio
    const breakEven = calculateBreakEven(totalCost, pricePerKg, productionKg);

    return {
      // Costos
      total_cost: totalCost,
      cost_per_kg: costPerKg,
      cost_per_ha: areaHectares > 0 ? totalCost / areaHectares : 0,

      // Desglose de costos
      inputs_cost: inputParameters.input_costs || 0,
      machinery_cost: inputParameters.machinery_costs || 0,
      labor_cost: inputParameters.labor_costs || 0,
      other_costs: inputParameters.other_costs || 0,

      // Ingresos
      revenue,
      revenue_per_ha: areaHectares > 0 ? revenue / areaHectares : 0,

      // Márgenes
      margin,
      margin_per_ha: marginPerHa,
      margin_percent: totalCost > 0 ? (margin / revenue) * 100 : 0,

      // Rentabilidad
      roi_percent: roiPercent,
      profit_per_kg: costPerKg > 0 ? (pricePerKg - costPerKg) : 0,

      // Punto de equilibrio
      break_even_kg: breakEven.breakEvenKg,
      break_even_revenue: breakEven.breakEvenRevenue,
      safety_margin_percent: breakEven.safetyMarginPercent,

      // Análisis de sensibilidad
      sensitivity_analysis: sensitivityAnalysis,

      // Producción
      production_kg: productionKg,
      kg_per_ha: areaHectares > 0 ? productionKg / areaHectares : 0,
      area_hectares: areaHectares,
      price_per_kg: pricePerKg
    };
  } catch (error) {
    console.error('Error ejecutando simulación económica:', error);
    throw error;
  }
}

// =============================================
// CÁLCULO DE COSTOS
// =============================================

/**
 * Calcular costo total
 */
export function calculateTotalCosts(inputParameters) {
  const inputsCost = parseFloat(inputParameters.input_costs) || 0;
  const machineryCost = parseFloat(inputParameters.machinery_costs) || 0;
  const laborCost = parseFloat(inputParameters.labor_costs) || 0;
  const otherCosts = parseFloat(inputParameters.other_costs) || 0;

  return inputsCost + machineryCost + laborCost + otherCosts;
}

/**
 * Calcular costo por hectárea
 */
export function calculateCostPerHectare(totalCost, areaHectares) {
  if (areaHectares <= 0) return 0;
  return totalCost / areaHectares;
}

/**
 * Calcular costo por kg
 */
export function calculateCostPerKg(totalCost, productionKg) {
  if (productionKg <= 0) return 0;
  return totalCost / productionKg;
}

// =============================================
// CÁLCULO DE INGRESOS Y MÁRGENES
// =============================================

/**
 * Calcular ingresos
 */
export function calculateRevenue(productionKg, pricePerKg) {
  return productionKg * pricePerKg;
}

/**
 * Calcular margen (Ingreso - Costo)
 */
export function calculateMargin(revenue, totalCost) {
  return revenue - totalCost;
}

/**
 * Calcular margen por hectárea
 */
export function calculateMarginPerHectare(margin, areaHectares) {
  if (areaHectares <= 0) return 0;
  return margin / areaHectares;
}

/**
 * Calcular ROI (Return on Investment)
 */
export function calculateROI(margin, totalCost) {
  if (totalCost <= 0) return 0;
  return (margin / totalCost) * 100;
}

/**
 * Calcular margen porcentual
 */
export function calculateMarginPercent(margin, revenue) {
  if (revenue <= 0) return 0;
  return (margin / revenue) * 100;
}

// =============================================
// ANÁLISIS DE SENSIBILIDAD
// =============================================

/**
 * Análisis de sensibilidad de precios
 * Simula cómo cambia el margen con variaciones de precio
 */
export function performPriceSensitivityAnalysis(params) {
  const {
    totalCost,
    productionKg,
    basePrice,
    areaHectares
  } = params;

  // Variaciones de precio a analizar: -20%, -15%, -10%, -5%, base, +5%, +10%, +15%, +20%
  const priceVariations = [-0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20];

  const results = priceVariations.map(variation => {
    const adjustedPrice = basePrice * (1 + variation);
    const revenue = calculateRevenue(productionKg, adjustedPrice);
    const margin = calculateMargin(revenue, totalCost);
    const roi = calculateROI(margin, totalCost);

    return {
      price_variation_percent: variation * 100,
      price_per_kg: adjustedPrice,
      revenue,
      margin,
      margin_per_ha: areaHectares > 0 ? margin / areaHectares : 0,
      roi_percent: roi,
      is_profitable: margin > 0
    };
  });

  // Encontrar margen máximo y mínimo
  const maxMargin = Math.max(...results.map(r => r.margin));
  const minMargin = Math.min(...results.map(r => r.margin));
  const marginRange = maxMargin - minMargin;

  return {
    scenarios: results,
    max_margin: maxMargin,
    min_margin: minMargin,
    margin_range: marginRange,
    base_price: basePrice,
    price_elasticity: calculatePriceElasticity(results)
  };
}

/**
 * Calcular elasticidad de precio (sensibilidad a cambios de precio)
 */
function calculatePriceElasticity(sensitivityResults) {
  if (sensitivityResults.length < 2) return 0;

  // Comparar -10% vs +10%
  const minusPrice = sensitivityResults.find(r => Math.abs(r.price_variation_percent - (-10)) < 0.1);
  const plusPrice = sensitivityResults.find(r => Math.abs(r.price_variation_percent - 10) < 0.1);

  if (!minusPrice || !plusPrice) return 0;

  const priceChange = (plusPrice.price_per_kg - minusPrice.price_per_kg) / minusPrice.price_per_kg;
  const marginChange = (plusPrice.margin - minusPrice.margin) / minusPrice.margin;

  if (priceChange === 0) return 0;
  return marginChange / priceChange;
}

// =============================================
// PUNTO DE EQUILIBRIO
// =============================================

/**
 * Calcular punto de equilibrio
 * Cuántos kg se necesitan vender para cubrir costos
 */
export function calculateBreakEven(totalCost, pricePerKg, productionKg = 0) {
  if (pricePerKg <= 0) {
    return {
      breakEvenKg: Infinity,
      breakEvenRevenue: Infinity,
      safetyMarginPercent: -100
    };
  }

  // Punto de equilibrio en kg
  const breakEvenKg = totalCost / pricePerKg;

  // Margen de seguridad (% de producción por encima del punto de equilibrio)
  let safetyMarginPercent = 0;
  if (productionKg > breakEvenKg) {
    safetyMarginPercent = ((productionKg - breakEvenKg) / productionKg) * 100;
  }

  return {
    breakEvenKg,
    breakEvenRevenue: breakEvenKg * pricePerKg,
    safetyMarginPercent
  };
}

/**
 * Calcular costo variable unitario
 */
export function calculateVariableCostPerUnit(inputCosts, productionKg) {
  if (productionKg <= 0) return 0;
  return inputCosts / productionKg;
}

/**
 * Calcular costo fijo unitario
 */
export function calculateFixedCostPerUnit(fixedCosts, productionKg) {
  if (productionKg <= 0) return 0;
  return fixedCosts / productionKg;
}

// =============================================
// ANÁLISIS DE RENTABILIDAD
// =============================================

/**
 * Evaluar rentabilidad del escenario
 */
export function evaluateRentability(economicResults) {
  const {
    margin,
    roi_percent,
    margin_percent,
    cost_per_kg,
    price_per_kg,
    break_even_kg,
    production_kg
  } = economicResults;

  const analysis = {
    is_profitable: margin > 0,
    profitability_level: 'UNKNOWN',
    risks: [],
    recommendations: []
  };

  // Evaluar nivel de rentabilidad
  if (roi_percent > 50) {
    analysis.profitability_level = 'EXCELLENT';
  } else if (roi_percent > 25) {
    analysis.profitability_level = 'GOOD';
  } else if (roi_percent > 10) {
    analysis.profitability_level = 'FAIR';
  } else if (roi_percent > 0) {
    analysis.profitability_level = 'POOR';
  } else {
    analysis.profitability_level = 'NEGATIVE';
  }

  // Identificar riesgos
  if (margin < 0) {
    analysis.risks.push('Margen negativo');
    analysis.recommendations.push('Reducir costos o aumentar precio de venta');
  }

  if (roi_percent < 10) {
    analysis.risks.push('ROI bajo (< 10%)');
    analysis.recommendations.push('Considerar optimización de costos');
  }

  if (break_even_kg > production_kg) {
    analysis.risks.push('Producción insuficiente para cubrir costos');
    analysis.recommendations.push('Aumentar producción o reducir inversión');
  }

  if (cost_per_kg > price_per_kg) {
    analysis.risks.push('Costo por kg mayor que precio de venta');
    analysis.recommendations.push('No viable en estas condiciones');
  }

  if (margin_percent < 20) {
    analysis.risks.push('Margen estrecho (< 20%)');
    analysis.recommendations.push('Poco espacio para errores o variaciones');
  }

  return analysis;
}

// =============================================
// COMPARACIÓN DE ESCENARIOS ECONÓMICOS
// =============================================

/**
 * Comparar economía de dos escenarios
 */
export function compareEconomics(scenario1, scenario2) {
  return {
    cost_difference: scenario2.total_cost - scenario1.total_cost,
    cost_difference_percent: ((scenario2.total_cost - scenario1.total_cost) / scenario1.total_cost) * 100,
    margin_difference: scenario2.margin - scenario1.margin,
    margin_difference_percent: ((scenario2.margin - scenario1.margin) / scenario1.margin) * 100,
    roi_difference: scenario2.roi_percent - scenario1.roi_percent,
    better_scenario: scenario2.margin > scenario1.margin ? 'scenario2' : 'scenario1'
  };
}

// =============================================
// VALIDACIONES
// =============================================

/**
 * Validar parámetros económicos
 */
export function validateEconomicParameters(inputParameters) {
  const errors = [];

  if ((inputParameters.input_costs || 0) < 0) {
    errors.push('Costo de insumos no puede ser negativo');
  }

  if ((inputParameters.machinery_costs || 0) < 0) {
    errors.push('Costo de maquinaria no puede ser negativo');
  }

  if ((inputParameters.labor_costs || 0) < 0) {
    errors.push('Costo de mano de obra no puede ser negativo');
  }

  if ((inputParameters.price_per_kg || 0) <= 0) {
    errors.push('Precio por kg debe ser mayor a 0');
  }

  if ((inputParameters.production_kg || 0) <= 0) {
    errors.push('Producción esperada debe ser mayor a 0');
  }

  if ((inputParameters.area_hectares || 0) <= 0) {
    errors.push('Área en hectáreas debe ser mayor a 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  executeEconomicSimulation,
  calculateTotalCosts,
  calculateCostPerHectare,
  calculateCostPerKg,
  calculateRevenue,
  calculateMargin,
  calculateMarginPerHectare,
  calculateROI,
  calculateMarginPercent,
  performPriceSensitivityAnalysis,
  calculateBreakEven,
  evaluateRentability,
  compareEconomics,
  validateEconomicParameters
};
