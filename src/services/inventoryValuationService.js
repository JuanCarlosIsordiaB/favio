/**
 * MÓDULO 11: REPORTES
 * inventoryValuationService.js
 *
 * Valorización de inventarios
 * - 4 métodos: promedio ponderado, histórico, mercado, mixto
 * - Inventario ganadero por categoría y rodeo
 * - Inventario agrícola (insumos)
 * - Auditoría obligatoria
 */

import { supabase } from '../lib/supabase';
import { ReportError } from './reportService';

export const VALUATION_METHODS = {
  COSTO_PROMEDIO_PONDERADO: 'weighted_avg',
  COSTO_HISTORICO: 'historical',
  PRECIO_MERCADO: 'market',
  MIXTO: 'mixed'
};

/**
 * Valorizar inventario ganadero
 * Agrupa por categoría y calcula valor según método
 */
export async function valorizarInventarioGanadero(premiseId, fecha, data) {
  try {
    const {
      valorizationMethod,
      pricingSource,
      campaignId,
      valuationType = 'INITIAL',
      userId
    } = data;

    // Obtener animales activos en la fecha
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select(`
        id,
        current_category_id,
        initial_weight,
        livestock_categories(id, name, code)
      `)
      .eq('premise_id', premiseId)
      .eq('status', 'ACTIVE')
      .lte('created_at', fecha);

    if (animalsError) {
      throw new ReportError(
        'Error obteniendo animales',
        'ANIMALS_FETCH_ERROR',
        { error: animalsError.message }
      );
    }

    // Obtener peso actual para cada animal (último pesaje)
    let animalsWithWeight = [];
    for (const animal of animals || []) {
      const { data: pesajes } = await supabase
        .from('herd_events')
        .select('qty_kg')
        .eq('animal_id', animal.id)
        .eq('event_type', 'WEIGHING')
        .lte('event_date', fecha)
        .order('event_date', { ascending: false })
        .limit(1);

      animalsWithWeight.push({
        ...animal,
        peso_actual: pesajes?.[0]?.qty_kg || animal.initial_weight || 0
      });
    }

    // Agrupar por categoría
    const byCategory = {};
    let totalHeads = 0;
    let totalKg = 0;

    for (const animal of animalsWithWeight) {
      const categoryId = animal.current_category_id;
      const categoryName = animal.livestock_categories?.name || 'Sin Categoría';

      if (!byCategory[categoryId]) {
        byCategory[categoryId] = {
          id: categoryId,
          name: categoryName,
          heads: 0,
          total_kg: 0,
          avg_kg: 0,
          unit_price: 0, // Se definirá según método
          total_value: 0
        };
      }

      byCategory[categoryId].heads++;
      byCategory[categoryId].total_kg += animal.peso_actual;
      totalHeads++;
      totalKg += animal.peso_actual;
    }

    // Calcular promedio kg por categoría
    for (const categoryId in byCategory) {
      if (byCategory[categoryId].heads > 0) {
        byCategory[categoryId].avg_kg =
          byCategory[categoryId].total_kg / byCategory[categoryId].heads;
      }
    }

    // Aplicar método de valorización
    await aplicarMetodoValorizacion(byCategory, valorizationMethod, pricingSource);

    // Calcular totales
    let totalValue = 0;
    for (const categoryId in byCategory) {
      byCategory[categoryId].total_value =
        byCategory[categoryId].total_kg * byCategory[categoryId].unit_price;
      totalValue += byCategory[categoryId].total_value;
    }

    // Obtener firm_id desde premise
    const { data: premise } = await supabase
      .from('premises')
      .select('firm_id')
      .eq('id', premiseId)
      .single();

    // Guardar valorización en tabla inventory_valuations
    const { data: valuation, error: valuationError } = await supabase
      .from('inventory_valuations')
      .insert([{
        firm_id: premise.firm_id,
        premise_id: premiseId,
        campaign_id: campaignId,
        valuation_date: fecha,
        valuation_type: valuationType,
        valuation_method: valorizationMethod,
        pricing_source: pricingSource,
        livestock_total_heads: totalHeads,
        livestock_total_kg: totalKg,
        livestock_total_value: totalValue,
        livestock_by_category: byCategory,
        inputs_total_items: 0,
        inputs_total_value: 0,
        created_by: userId,
        notes: `Valorización ${valuationType} - ${VALUATION_METHODS[valorizationMethod] || valorizationMethod}`
      }])
      .select()
      .single();

    if (valuationError) {
      throw new ReportError(
        'Error guardando valorización',
        'VALUATION_SAVE_ERROR',
        { error: valuationError.message }
      );
    }

    // Auditoría se registra automáticamente por trigger

    return valuation;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado en valorización ganadero',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}

/**
 * Valorizar inventario agrícola (insumos)
 */
export async function valorizarInventarioAgricola(premiseId, fecha, data) {
  try {
    const {
      valorizationMethod,
      pricingSource,
      campaignId,
      valuationType = 'INITIAL',
      userId
    } = data;

    // Obtener insumos con stock > 0
    const { data: inputs, error: inputsError } = await supabase
      .from('inputs')
      .select('*')
      .eq('premise_id', premiseId)
      .gt('current_stock', 0);

    if (inputsError) {
      throw new ReportError(
        'Error obteniendo insumos',
        'INPUTS_FETCH_ERROR',
        { error: inputsError.message }
      );
    }

    // Calcular según método
    const byCategory = {};
    let totalItems = 0;
    let totalValue = 0;

    for (const insumo of inputs || []) {
      const categoryId = insumo.category;

      if (!byCategory[categoryId]) {
        byCategory[categoryId] = {
          category: categoryId,
          items: 0,
          total_value: 0
        };
      }

      let unitPrice = insumo.unit_price || 0;

      // Aplicar método de valorización
      if (valorizationMethod === 'weighted_avg') {
        // Costo promedio ponderado
        unitPrice = await calcularCostoPromedioPonderado(insumo.id, fecha);
      } else if (valorizationMethod === 'historical') {
        // Costo histórico (precio actual)
        unitPrice = insumo.unit_price || 0;
      } else if (valorizationMethod === 'market') {
        // Precio de mercado (requiere pricingSource)
        // TODO: Integrar con servicios de mercado
        unitPrice = insumo.unit_price || 0;
      } else if (valorizationMethod === 'mixed') {
        // Método mixto (insumos a costo)
        unitPrice = insumo.unit_price || 0;
      }

      const insumoValue = insumo.current_stock * unitPrice;

      byCategory[categoryId].items++;
      byCategory[categoryId].total_value += insumoValue;
      totalItems++;
      totalValue += insumoValue;
    }

    // Obtener firm_id desde premise
    const { data: premise } = await supabase
      .from('premises')
      .select('firm_id')
      .eq('id', premiseId)
      .single();

    // Guardar valorización
    const { data: valuation, error: valuationError } = await supabase
      .from('inventory_valuations')
      .insert([{
        firm_id: premise.firm_id,
        premise_id: premiseId,
        campaign_id: campaignId,
        valuation_date: fecha,
        valuation_type: valuationType,
        valuation_method: valorizationMethod,
        pricing_source: pricingSource,
        livestock_total_heads: 0,
        livestock_total_kg: 0,
        livestock_total_value: 0,
        inputs_total_items: totalItems,
        inputs_total_value: totalValue,
        inputs_by_category: byCategory,
        created_by: userId,
        notes: `Valorización ${valuationType} - Insumos`
      }])
      .select()
      .single();

    if (valuationError) {
      throw new ReportError(
        'Error guardando valorización',
        'VALUATION_SAVE_ERROR',
        { error: valuationError.message }
      );
    }

    return valuation;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado en valorización agrícola',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}

/**
 * Calcular costo promedio ponderado
 * Basado en movimientos de entrada con costo
 */
async function calcularCostoPromedioPonderado(inputId, fecha) {
  try {
    // Obtener movimientos de entrada hasta fecha
    const { data: movimientos } = await supabase
      .from('input_movements')
      .select('quantity, movement_type, unit_cost')
      .eq('input_id', inputId)
      .lte('movement_date', fecha)
      .in('movement_type', ['entry', 'purchase']);

    if (!movimientos || movimientos.length === 0) {
      return 0;
    }

    let totalCosto = 0;
    let totalUnidades = 0;

    for (const mov of movimientos) {
      if (mov.movement_type === 'entry' || mov.movement_type === 'purchase') {
        totalCosto += (mov.quantity || 0) * (mov.unit_cost || 0);
        totalUnidades += mov.quantity || 0;
      }
    }

    return totalUnidades > 0 ? totalCosto / totalUnidades : 0;
  } catch (error) {
    console.error('Error en costo promedio ponderado:', error);
    return 0;
  }
}

/**
 * Aplicar método de valorización a categorías
 */
async function aplicarMetodoValorizacion(byCategory, method, pricingSource) {
  // TODO: Implementar integración con servicios de precios/mercado
  // Por ahora, usar precios predeterminados o de configuración

  // Placeholder: usar precios fijos por método
  const preciosPorMetodo = {
    weighted_avg: 500, // $/kg
    historical: 480,
    market: 520,
    mixed: 500
  };

  for (const categoryId in byCategory) {
    byCategory[categoryId].unit_price = preciosPorMetodo[method] || 500;
  }
}

/**
 * Obtener última valorización para predio
 */
export async function getLastValuation(premiseId, valuationType = 'FINAL') {
  try {
    const { data: valuation, error } = await supabase
      .from('inventory_valuations')
      .select('*')
      .eq('premise_id', premiseId)
      .eq('valuation_type', valuationType)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      // No hay valuations
      return null;
    }

    if (error) {
      throw error;
    }

    return valuation;
  } catch (error) {
    console.error('Error obteniendo última valorización:', error);
    return null;
  }
}
