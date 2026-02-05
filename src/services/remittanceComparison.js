/**
 * Servicios para comparación de Órdenes de Compra vs Remitos
 * GAP 2: Reporte de diferencias y estado de completitud
 */

import { supabase } from '../lib/supabase';

/**
 * Obtener comparación completa de una Orden de Compra vs Remitos recibidos
 */
export async function obtenerComparativaPOVsRemitos(purchaseOrderId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    // Usar la vista creada en la migración
    const { data, error } = await supabase
      .from('purchase_order_completion_view')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId);

    if (error) throw error;

    return {
      data: data || [],
      summary: calcularResumenComparativa(data || [])
    };
  } catch (error) {
    console.error('Error en obtenerComparativaPOVsRemitos:', error);
    throw error;
  }
}

/**
 * Obtener estado de completitud de una orden
 */
export async function obtenerEstadoCompletitudPO(purchaseOrderId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    const { data, error } = await supabase
      .from('purchase_order_completion_view')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId);

    if (error) throw error;

    const items = data || [];
    const total = items.length;

    const summary = {
      purchase_order_id: purchaseOrderId,
      total_items: total,
      items_completed: items.filter(i => i.completion_status === 'Completo').length,
      items_partial: items.filter(i => i.completion_status === 'Parcial').length,
      items_pending: items.filter(i => i.completion_status === 'Sin Recibir').length,
      items_excess: items.filter(i => i.completion_status === 'En Exceso').length,
      overall_completion_percentage: items.length > 0
        ? (items.reduce((sum, i) => sum + i.completion_percentage, 0) / items.length)
        : 0,
      status: getOverallStatus(items)
    };

    return summary;
  } catch (error) {
    console.error('Error en obtenerEstadoCompletitudPO:', error);
    throw error;
  }
}

/**
 * Obtener ítems faltantes (no recibidos)
 */
export async function obtenerItemesFaltantesPO(purchaseOrderId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    const { data, error } = await supabase
      .from('purchase_order_completion_view')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .or('completion_status.eq.Sin Recibir,completion_status.eq.Parcial');

    if (error) throw error;

    return {
      data: data || [],
      total_items_pending: (data || []).reduce((sum, i) => sum + i.quantity_pending, 0)
    };
  } catch (error) {
    console.error('Error en obtenerItemesFaltantesPO:', error);
    throw error;
  }
}

/**
 * Obtener discrepancias (items en exceso)
 */
export async function obtenerDiscrepanciasPO(purchaseOrderId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    const { data, error } = await supabase
      .from('purchase_order_completion_view')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .eq('completion_status', 'En Exceso');

    if (error) throw error;

    return {
      data: data || [],
      items_with_excess: data?.length || 0,
      total_excess_quantity: (data || []).reduce((sum, i) => {
        const excess = i.quantity_received - i.quantity_ordered;
        return sum + (excess > 0 ? excess : 0);
      }, 0)
    };
  } catch (error) {
    console.error('Error en obtenerDiscrepanciasPO:', error);
    throw error;
  }
}

/**
 * Obtener historial de recepciones para una Orden
 */
export async function obtenerHistorialRecepcionesPO(purchaseOrderId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    const { data, error } = await supabase
      .from('remittances')
      .select(`
        id,
        remittance_number,
        remittance_date,
        received_date,
        received_by,
        status,
        supplier_name,
        remittance_items(
          id,
          purchase_order_item_id,
          item_description,
          quantity_ordered,
          quantity_received,
          unit,
          condition
        )
      `)
      .eq('purchase_order_id', purchaseOrderId)
      .order('remittance_date', { ascending: false });

    if (error) throw error;

    return {
      data: data || [],
      total_remittances: (data || []).length,
      last_receipt_date: data && data.length > 0 ? data[0].received_date : null
    };
  } catch (error) {
    console.error('Error en obtenerHistorialRecepcionesPO:', error);
    throw error;
  }
}

/**
 * Generar reporte de comparativa (para exportación)
 */
export async function generarReporteComparativaPO(purchaseOrderId, firmaId) {
  try {
    if (!purchaseOrderId) throw new Error('purchaseOrderId es requerido');

    // Obtener datos de la orden
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', purchaseOrderId)
      .single();

    if (poError) throw poError;

    // Obtener comparativa
    const { data: items, error: itemsError } = await supabase
      .from('purchase_order_completion_view')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId);

    if (itemsError) throw itemsError;

    return {
      purchase_order: poData,
      items: items || [],
      summary: calcularResumenComparativa(items || []),
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en generarReporteComparativaPO:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Calcular resumen de la comparativa
 */
function calcularResumenComparativa(items) {
  const total = items.length;

  if (total === 0) {
    return {
      total_items: 0,
      all_pending: true,
      all_completed: false,
      all_partial: false,
      overall_status: 'Sin Recibir',
      completion_percentage: 0
    };
  }

  const completed = items.filter(i => i.completion_status === 'Completo').length;
  const partial = items.filter(i => i.completion_status === 'Parcial').length;
  const pending = items.filter(i => i.completion_status === 'Sin Recibir').length;
  const excess = items.filter(i => i.completion_status === 'En Exceso').length;

  const avgCompletion = items.reduce((sum, i) => sum + i.completion_percentage, 0) / total;

  let status = 'En Progreso';
  if (pending === total) status = 'Sin Recibir';
  else if (completed === total && excess === 0) status = 'Completo';
  else if (completed === total && excess > 0) status = 'Completado con Exceso';
  else if (avgCompletion === 100 && excess === 0) status = 'Completo';

  return {
    total_items: total,
    completed: completed,
    partial: partial,
    pending: pending,
    excess: excess,
    overall_status: status,
    completion_percentage: Math.round(avgCompletion)
  };
}

/**
 * Determinar estado general
 */
function getOverallStatus(items) {
  if (!items || items.length === 0) return 'vacío';

  const completed = items.filter(i => i.completion_status === 'Completo').length;
  const total = items.length;

  if (completed === 0) return 'sin_recibir';
  if (completed < total) return 'parcial';
  if (completed === total) return 'completo';

  return 'desconocido';
}
