/**
 * Servicios para gestionar Valuación de Stock en Remitos
 * GAP 5: Stock valorizado por remitos
 */

import { supabase } from '../lib/supabase';

/**
 * Actualizar costo unitario de una valuación
 */
export async function actualizarCostoUnitarioValuacion(valuationId, unitCost) {
  try {
    if (!valuationId) throw new Error('valuationId es requerido');
    if (unitCost == null) throw new Error('unitCost es requerido');

    const { data, error } = await supabase
      .from('remittance_valuations')
      .update({
        unit_cost: parseFloat(unitCost),
        updated_at: new Date().toISOString()
      })
      .eq('id', valuationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarCostoUnitarioValuacion:', error);
    throw error;
  }
}

/**
 * Obtener valuaciones de un remito
 */
export async function obtenerValuacionesRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('remittance_valuations')
      .select(`
        id,
        input_id,
        quantity_received,
        unit_cost,
        total_value,
        currency,
        created_at,
        inputs(
          id,
          name,
          category,
          unit
        )
      `)
      .eq('remittance_id', remittanceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const valuations = (data || []);
    const totales = {
      total_quantity: valuations.reduce((sum, v) => sum + (v.quantity_received || 0), 0),
      total_value: valuations.reduce((sum, v) => sum + (v.total_value || 0), 0),
      items_with_cost: valuations.filter(v => v.unit_cost > 0).length,
      items_without_cost: valuations.filter(v => v.unit_cost === 0).length
    };

    return {
      remittance_id: remittanceId,
      valuations: valuations,
      summary: totales
    };
  } catch (error) {
    console.error('Error en obtenerValuacionesRemito:', error);
    throw error;
  }
}

/**
 * Obtener valuación total de ingresos por período
 */
export async function obtenerValuacionIngresosPorPeriodo(firmId, fechaInicio, fechaFin) {
  try {
    if (!firmId) throw new Error('firmId es requerido');
    if (!fechaInicio || !fechaFin) throw new Error('Fechas son requeridas');

    const { data, error } = await supabase
      .from('remittance_valuations')
      .select(`
        id,
        remittance_id,
        input_id,
        quantity_received,
        unit_cost,
        total_value,
        currency,
        created_at,
        remittances(
          remittance_number,
          remittance_date,
          supplier_name
        ),
        inputs(
          name,
          category
        )
      `)
      .eq('firm_id', firmId)
      .gte('created_at', fechaInicio + 'T00:00:00')
      .lte('created_at', fechaFin + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calcular estadísticas
    const valuations = (data || []);
    const stats = {
      total_items: valuations.length,
      total_quantity: valuations.reduce((sum, v) => sum + (v.quantity_received || 0), 0),
      total_value: valuations.reduce((sum, v) => sum + (v.total_value || 0), 0),
      promedio_costo_unitario: valuations.length > 0
        ? valuations.reduce((sum, v) => sum + (v.unit_cost || 0), 0) / valuations.length
        : 0,
      remittances_totales: new Set(valuations.map(v => v.remittance_id)).size,
      por_categoria: {}
    };

    // Agrupar por categoría
    valuations.forEach(v => {
      const cat = v.inputs?.category || 'Sin Categoría';
      if (!stats.por_categoria[cat]) {
        stats.por_categoria[cat] = {
          items: 0,
          cantidad_total: 0,
          valor_total: 0
        };
      }
      stats.por_categoria[cat].items++;
      stats.por_categoria[cat].cantidad_total += v.quantity_received || 0;
      stats.por_categoria[cat].valor_total += v.total_value || 0;
    });

    return {
      periodo: { desde: fechaInicio, hasta: fechaFin },
      valuations: valuations,
      estadisticas: stats
    };
  } catch (error) {
    console.error('Error en obtenerValuacionIngresosPorPeriodo:', error);
    throw error;
  }
}

/**
 * Obtener valuación por proveedor
 */
export async function obtenerValuacionPorProveedor(firmId, fechaInicio = null, fechaFin = null) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    let query = supabase
      .from('remittance_valuations')
      .select(`
        id,
        quantity_received,
        unit_cost,
        total_value,
        remittances(
          supplier_name,
          remittance_date
        )
      `)
      .eq('firm_id', firmId);

    if (fechaInicio && fechaFin) {
      query = query
        .gte('created_at', fechaInicio + 'T00:00:00')
        .lte('created_at', fechaFin + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agrupar por proveedor
    const porProveedor = {};
    (data || []).forEach(valuation => {
      const proveedor = valuation.remittances?.supplier_name || 'Sin Especificar';
      if (!porProveedor[proveedor]) {
        porProveedor[proveedor] = {
          supplier_name: proveedor,
          items: [],
          total_cantidad: 0,
          total_valor: 0,
          cantidad_remitos: 0
        };
      }
      porProveedor[proveedor].items.push(valuation);
      porProveedor[proveedor].total_cantidad += valuation.quantity_received || 0;
      porProveedor[proveedor].total_valor += valuation.total_value || 0;
    });

    // Contar remitos únicos por proveedor
    Object.values(porProveedor).forEach(p => {
      const remitos = new Set(p.items.map(i => i.remittances?.id));
      p.cantidad_remitos = remitos.size;
      delete p.items; // Limpiar para no enviar mucha data
    });

    return {
      por_proveedor: Object.values(porProveedor)
        .sort((a, b) => b.total_valor - a.total_valor),
      total_proveedores: Object.keys(porProveedor).length,
      valor_total: Object.values(porProveedor).reduce((sum, p) => sum + p.total_valor, 0)
    };
  } catch (error) {
    console.error('Error en obtenerValuacionPorProveedor:', error);
    throw error;
  }
}

/**
 * Obtener comparativa de valor vs cantidad por insumo
 */
export async function obtenerValuacionPorInsumo(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, error } = await supabase
      .from('remittance_valuations')
      .select(`
        id,
        input_id,
        quantity_received,
        unit_cost,
        total_value,
        inputs(
          id,
          name,
          category,
          unit,
          current_stock
        )
      `)
      .eq('firm_id', firmId);

    if (error) throw error;

    // Agrupar por insumo
    const porInsumo = {};
    (data || []).forEach(valuation => {
      const inputId = valuation.input_id;
      if (!porInsumo[inputId]) {
        porInsumo[inputId] = {
          input: valuation.inputs,
          total_cantidad_recibida: 0,
          total_valor_recibido: 0,
          costo_promedio_unitario: 0,
          cantidad_movimientos: 0
        };
      }
      porInsumo[inputId].total_cantidad_recibida += valuation.quantity_received || 0;
      porInsumo[inputId].total_valor_recibido += valuation.total_value || 0;
      porInsumo[inputId].cantidad_movimientos++;
    });

    // Calcular promedio
    Object.values(porInsumo).forEach(p => {
      if (p.total_cantidad_recibida > 0) {
        p.costo_promedio_unitario = p.total_valor_recibido / p.total_cantidad_recibida;
      }
    });

    return {
      por_insumo: Object.values(porInsumo)
        .sort((a, b) => b.total_valor_recibido - a.total_valor_recibido),
      total_insumos: Object.keys(porInsumo).length,
      valor_total_recibido: Object.values(porInsumo).reduce((sum, p) => sum + p.total_valor_recibido, 0)
    };
  } catch (error) {
    console.error('Error en obtenerValuacionPorInsumo:', error);
    throw error;
  }
}

/**
 * Generar reporte de valuaciones (para exportación)
 */
export async function generarReporteValuaciones(firmId, fechaInicio, fechaFin) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    // Obtener valuaciones del período
    const periodResult = await obtenerValuacionIngresosPorPeriodo(firmId, fechaInicio, fechaFin);

    // Obtener por proveedor
    const porProveedorResult = await obtenerValuacionPorProveedor(firmId, fechaInicio, fechaFin);

    // Obtener por insumo
    const porInsumoResult = await obtenerValuacionPorInsumo(firmId);

    return {
      periodo: { desde: fechaInicio, hasta: fechaFin },
      resumen_general: periodResult.estadisticas,
      valuaciones: periodResult.valuations,
      por_proveedor: porProveedorResult.por_proveedor,
      por_insumo: porInsumoResult.por_insumo,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en generarReporteValuaciones:', error);
    throw error;
  }
}

/**
 * Calcular valor total de stock en depósito (basado en valuaciones)
 */
export async function calcularValorStockDeposito(depotId, firmId) {
  try {
    if (!depotId || !firmId) throw new Error('depotId y firmId son requeridos');

    const { data, error } = await supabase
      .from('remittance_valuations')
      .select(`
        unit_cost,
        inputs(
          current_stock,
          depot_id
        )
      `)
      .eq('firm_id', firmId)
      .eq('inputs.depot_id', depotId);

    if (error) throw error;

    let totalValor = 0;
    (data || []).forEach(val => {
      if (val.inputs && val.inputs.current_stock) {
        totalValor += (val.unit_cost || 0) * val.inputs.current_stock;
      }
    });

    return {
      depot_id: depotId,
      valor_total_stock: totalValor,
      cantidad_items: (data || []).length
    };
  } catch (error) {
    console.error('Error en calcularValorStockDeposito:', error);
    throw error;
  }
}
