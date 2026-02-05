/**
 * Servicios para Remitos de Salida (Módulo 17)
 * Gestión de documentación de salida para ventas
 */

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

/**
 * Crear remito de salida para una venta
 * @param {string} saleId - ID de la venta
 * @param {Object} remittanceData - Datos del remito
 * @returns {Object} Remito creado
 */
export async function crearRemitoSalida(saleId, remittanceData) {
  try {
    if (!saleId) throw new Error('saleId es requerido');
    if (!remittanceData.remittance_number) throw new Error('remittance_number es requerido');

    // Obtener venta completa con items
    const { data: venta, error: ventaError } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq('id', saleId)
      .single();

    if (ventaError) throw ventaError;
    if (!venta) throw new Error('Venta no encontrada');

    // Crear remito de salida
    const { data: remito, error: remitoError } = await supabase
      .from('sale_remittances')
      .insert([{
        firm_id: venta.firm_id,
        sale_id: saleId,
        ...remittanceData,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (remitoError) throw remitoError;
    if (!remito) throw new Error('Error creando remito');

    // Crear ítems del remito (uno por cada item de venta)
    const itemsData = venta.items.map(item => ({
      sale_remittance_id: remito.id,
      sale_item_id: item.id,
      input_id: item.input_id,
      item_description: `${item.quantity} ${item.unit}`,
      quantity_ordered: item.quantity,
      quantity_delivered: item.quantity,  // Por defecto se entregan todos
      unit: item.unit,
      condition: 'good',
      created_at: new Date().toISOString()
    }));

    const { error: itemsError } = await supabase
      .from('sale_remittance_items')
      .insert(itemsData);

    if (itemsError) throw itemsError;

    // Registrar en auditoría
    await crearRegistro({
      firmId: venta.firm_id,
      tipo: 'remito_salida_creado',
      descripcion: `Remito de salida ${remittanceData.remittance_number} creado para venta de ${venta.client_name}`,
      moduloOrigen: 'modulo_17_ventas',
      usuario: remittanceData.created_by || 'sistema',
      referencia: remito.id,
      metadata: {
        sale_id: saleId,
        remittance_number: remittanceData.remittance_number,
        items_count: venta.items.length
      }
    }).catch(e => console.error('Error en auditoría:', e));

    return remito;
  } catch (error) {
    console.error('Error en crearRemitoSalida:', error);
    throw error;
  }
}

/**
 * Obtener remitos de salida por firma
 * @param {string} firmId - ID de la firma
 * @returns {Object} { data: remitos }
 */
export async function obtenerRemitosSalida(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, error } = await supabase
      .from('sale_remittances')
      .select(`
        *,
        sale:sales(id, client_name, invoice_number, sale_date, total_amount, currency)
      `)
      .eq('firm_id', firmId)
      .order('remittance_date', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error('Error en obtenerRemitosSalida:', error);
    throw error;
  }
}

/**
 * Obtener remito por ID con ítems
 * @param {string} remittanceId - ID del remito
 * @returns {Object} { data: { remito, items } }
 */
export async function obtenerRemitoPorId(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data: remito, error: remitoError } = await supabase
      .from('sale_remittances')
      .select(`
        *,
        sale:sales(id, client_name, invoice_number, sale_date, total_amount, currency)
      `)
      .eq('id', remittanceId)
      .single();

    if (remitoError) throw remitoError;

    const { data: items, error: itemsError } = await supabase
      .from('sale_remittance_items')
      .select(`
        *,
        input:inputs(id, name, unit)
      `)
      .eq('sale_remittance_id', remittanceId);

    if (itemsError) throw itemsError;

    return {
      data: {
        ...remito,
        items: items || []
      }
    };
  } catch (error) {
    console.error('Error en obtenerRemitoPorId:', error);
    throw error;
  }
}

/**
 * Marcar remito como despachado
 * @param {string} remittanceId - ID del remito
 * @returns {Object} Remito actualizado
 */
export async function marcarRemitoComoDespacho(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('sale_remittances')
      .update({
        status: 'IN_TRANSIT',
        dispatched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', remittanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en marcarRemitoComoDespacho:', error);
    throw error;
  }
}

/**
 * Marcar remito como entregado
 * @param {string} remittanceId - ID del remito
 * @returns {Object} Remito actualizado
 */
export async function marcarRemitoComoEntregado(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('sale_remittances')
      .update({
        status: 'DELIVERED',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', remittanceId)
      .select()
      .single();

    if (error) throw error;

    // Registrar en auditoría
    await crearRegistro({
      tipo: 'remito_entregado',
      descripcion: `Remito de salida entregado: ${data.remittance_number}`,
      moduloOrigen: 'modulo_17_ventas',
      referencia: remittanceId
    }).catch(e => console.error('Error en auditoría:', e));

    // Validar diferencias entre remito y factura
    await validarDiferenciasRemito(remittanceId)
      .catch(e => console.error('Error validando diferencias:', e));

    return data;
  } catch (error) {
    console.error('Error en marcarRemitoComoEntregado:', error);
    throw error;
  }
}

/**
 * Cancelar remito
 * @param {string} remittanceId - ID del remito
 * @param {string} reason - Motivo de cancelación
 * @returns {Object} Remito actualizado
 */
export async function cancelarRemito(remittanceId, reason) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');
    if (!reason || !reason.trim()) throw new Error('Motivo es requerido');

    const { data, error } = await supabase
      .from('sale_remittances')
      .update({
        status: 'CANCELLED',
        notes: `CANCELADO: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', remittanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en cancelarRemito:', error);
    throw error;
  }
}

/**
 * Validar diferencias entre remito y factura
 * Compara cantidades entregadas vs cantidades vendidas
 * @param {string} remittanceId - ID del remito
 * @returns {Object} { hasDifferences, differences: [] }
 */
export async function validarDiferenciasRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    // Obtener remito con items
    const { data: remito, error: remitoError } = await supabase
      .from('sale_remittances')
      .select(`
        *,
        sale:sales(id, client_name, firm_id, premise_id, total_amount, currency)
      `)
      .eq('id', remittanceId)
      .single();

    if (remitoError) throw remitoError;
    if (!remito) throw new Error('Remito no encontrado');

    // Obtener items del remito
    const { data: remitoItems, error: itemsError } = await supabase
      .from('sale_remittance_items')
      .select(`
        *,
        input:inputs(id, name, unit),
        sale_item:sale_items(id, input_id, quantity, unit_price, total_amount)
      `)
      .eq('sale_remittance_id', remittanceId);

    if (itemsError) throw itemsError;

    // Comparar cantidades
    const differences = [];
    let totalQuantityOrdered = 0;
    let totalQuantityDelivered = 0;

    remitoItems.forEach(item => {
      const ordered = item.quantity_ordered || 0;
      const delivered = item.quantity_delivered || 0;

      totalQuantityOrdered += ordered;
      totalQuantityDelivered += delivered;

      // Si hay diferencia en este item
      if (delivered !== ordered) {
        differences.push({
          input_id: item.input_id,
          input_name: item.input?.name || 'Producto desconocido',
          quantity_ordered: ordered,
          quantity_delivered: delivered,
          difference: delivered - ordered,
          unit: item.unit || item.input?.unit
        });
      }
    });

    // Hay diferencias si hay items con cantidades diferentes
    const hasDifferences = differences.length > 0;

    // Si hay diferencias, crear alerta
    if (hasDifferences) {
      await crearAlertaDiferenciaRemito({
        remittanceId,
        saleId: remito.sale_id,
        firmId: remito.sale.firm_id,
        premiseId: remito.sale.premise_id,
        remittanceNumber: remito.remittance_number,
        clientName: remito.sale.client_name,
        totalQuantityOrdered,
        totalQuantityDelivered,
        differences
      }).catch(e => console.error('Error creando alerta:', e));
    }

    return {
      hasDifferences,
      differences,
      totalQuantityOrdered,
      totalQuantityDelivered
    };
  } catch (error) {
    console.error('Error en validarDiferenciasRemito:', error);
    throw error;
  }
}

/**
 * Crear alerta de diferencia entre remito y factura
 * @param {Object} alertData - Datos de la alerta
 * @returns {Object} Alerta creada
 */
export async function crearAlertaDiferenciaRemito(alertData) {
  try {
    const {
      remittanceId,
      saleId,
      firmId,
      premiseId,
      remittanceNumber,
      clientName,
      totalQuantityOrdered,
      totalQuantityDelivered,
      differences
    } = alertData;

    // Crear descripción detallada
    const differenceDetails = differences
      .map(d => `${d.input_name}: Pedido ${d.quantity_ordered}, Entregado ${d.quantity_delivered} (${d.difference > 0 ? '+' : ''}${d.difference})`)
      .join(' | ');

    const descripcion = `DIFERENCIA REMITO-FACTURA: Remito ${remittanceNumber} (Cliente: ${clientName}) - Total: Pedido ${totalQuantityOrdered}, Entregado ${totalQuantityDelivered} | Detalles: ${differenceDetails}`;

    // Crear alerta en tabla alerts
    const { data: alerta, error } = await supabase
      .from('alerts')
      .insert([{
        firm_id: firmId,
        premise_id: premiseId,
        alert_type: 'diferencia_remito_factura',
        severity: Math.abs(totalQuantityDelivered - totalQuantityOrdered) > 5 ? 'high' : 'medium',
        title: `Diferencia en Remito: ${remittanceNumber}`,
        message: descripcion,
        alert_date: new Date().toISOString(),
        priority: 7,
        metadata: {
          remittance_id: remittanceId,
          sale_id: saleId,
          remittance_number: remittanceNumber,
          total_ordered: totalQuantityOrdered,
          total_delivered: totalQuantityDelivered,
          differences: differences,
          source: 'modulo_17_ventas'
        },
        resolved: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Registrar en auditoría
    await crearRegistro({
      firmId,
      tipo: 'alerta_diferencia_remito',
      descripcion: `Alerta creada por diferencia remito-factura en ${remittanceNumber}`,
      moduloOrigen: 'modulo_17_ventas',
      referencia: remittanceId,
      metadata: {
        alert_id: alerta.id,
        remittance_number: remittanceNumber,
        differences_count: differences.length
      }
    }).catch(e => console.error('Error en auditoría:', e));

    return alerta;
  } catch (error) {
    console.error('Error en crearAlertaDiferenciaRemito:', error);
    throw error;
  }
}
