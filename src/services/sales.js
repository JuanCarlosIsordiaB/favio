/**
 * Servicios CRUD para Ventas en Supabase
 * Módulo 17: Gestión de ventas de productos/insumos
 *
 * Integración con:
 * - Módulo 05 (inputMovements): Descarga automática de stock
 * - Módulo 08 (income): Generación automática de ingreso financiero
 * - Sistema de alertas: Alertas de stock insuficiente
 */

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';
import { validarDisponibilidad } from './inputMovements';
import { crearAlertaAutomatica } from './alertas';
import { validarVenta, validarItemVenta, validarDisponibilidadStock } from '../lib/validations/salesValidations';

// ===========================
// FUNCIONES DE LECTURA
// ===========================

/**
 * Obtener todas las ventas de una firma con filtros
 * @param {string} firmId - ID de la firma
 * @param {Object} filtros - Filtros opcionales
 * @returns {Object} { data: ventas }
 */
export async function obtenerVentasPorFirma(firmId, filtros = {}) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    let query = supabase
      .from('sales')
      .select(`
        *,
        premise:premises(id, name),
        income:income(id, invoice_number, status, balance),
        cost_center:cost_centers(id, name),
        campaign:campaigns(id, name)
      `)
      .eq('firm_id', firmId);

    // Aplicar filtros
    if (filtros.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros.client_rut) {
      query = query.eq('client_rut', filtros.client_rut);
    }

    if (filtros.dateFrom) {
      query = query.gte('sale_date', filtros.dateFrom);
    }

    if (filtros.dateTo) {
      query = query.lte('sale_date', filtros.dateTo);
    }

    const { data, error } = await query.order('sale_date', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error('Error en obtenerVentasPorFirma:', error);
    throw error;
  }
}

/**
 * Obtener venta por ID con todos sus ítems y remitos
 * @param {string} saleId - ID de la venta
 * @returns {Object} { data: { venta, items, remittances } }
 */
export async function obtenerVentaPorId(saleId) {
  try {
    if (!saleId) throw new Error('saleId es requerido');

    // Obtener venta principal
    const { data: venta, error: saleError } = await supabase
      .from('sales')
      .select(`
        *,
        premise:premises(id, name),
        income:income(id, invoice_number, status, balance, collection_status),
        cost_center:cost_centers(id, name),
        campaign:campaigns(id, name)
      `)
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;
    if (!venta) throw new Error('Venta no encontrada');

    // Obtener ítems
    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .select(`
        *,
        input:inputs(id, name, unit, current_stock),
        depot:depots(id, name),
        lot:lots(id, name),
        campaign:campaigns(id, name),
        input_movement:input_movements(id, date, quantity)
      `)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    // Obtener remitos de salida
    const { data: remittances, error: remittancesError } = await supabase
      .from('sale_remittances')
      .select('*')
      .eq('sale_id', saleId)
      .order('remittance_date', { ascending: false });

    if (remittancesError) throw remittancesError;

    return {
      data: {
        ...venta,
        items: items || [],
        remittances: remittances || []
      }
    };
  } catch (error) {
    console.error('Error en obtenerVentaPorId:', error);
    throw error;
  }
}

/**
 * Buscar ventas con filtros avanzados
 * @param {string} firmId - ID de la firma
 * @param {Object} filtros - Filtros opcionales
 * @returns {Object} { data: ventas }
 */
export async function buscarVentas(firmId, filtros = {}) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    let query = supabase
      .from('sales')
      .select('*')
      .eq('firm_id', firmId);

    if (filtros.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros.clientName) {
      query = query.ilike('client_name', `%${filtros.clientName}%`);
    }

    if (filtros.minAmount) {
      query = query.gte('total_amount', filtros.minAmount);
    }

    if (filtros.maxAmount) {
      query = query.lte('total_amount', filtros.maxAmount);
    }

    const { data, error } = await query.order('sale_date', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error('Error en buscarVentas:', error);
    throw error;
  }
}

// ===========================
// FUNCIONES DE ESCRITURA
// ===========================

/**
 * Crear nueva venta con ítems (estado DRAFT)
 * IMPORTANTE: Valida stock ANTES de crear
 *
 * @param {Object} ventaData - Datos de la venta
 * @param {Array} items - Array de ítems
 * @returns {Object} Venta creada
 */
export async function crearVenta(ventaData, items) {
  try {
    // Validaciones
    if (!ventaData.firm_id) throw new Error('firm_id es requerido');
    if (!ventaData.client_name) throw new Error('client_name es requerido');
    if (!items || items.length === 0) throw new Error('Debe haber al menos un ítem');

    // Validar datos generales
    const validacion = validarVenta(ventaData);
    if (!validacion.valido) {
      throw new Error(Object.entries(validacion.errores)
        .map(([key, msg]) => `${key}: ${msg}`)
        .join('; '));
    }

    // Obtener insumos disponibles para validar stock
    const { data: insumos, error: insumosError } = await supabase
      .from('inputs')
      .select('id, name, unit, current_stock, cost_per_unit, min_stock_alert')
      .eq('firm_id', ventaData.firm_id);

    if (insumosError) throw insumosError;

    // 1. VALIDAR STOCK DISPONIBLE ANTES DE CREAR
    const validacionStock = validarDisponibilidadStock(items, insumos || []);
    if (!validacionStock.valido) {
      // Crear alertas automáticas para cada producto con stock insuficiente
      for (const error of validacionStock.errores) {
        if (error.tipo === 'insufficient_stock') {
          await crearAlertaAutomatica({
            firmaId: ventaData.firm_id,
            predioId: ventaData.premise_id,
            titulo: 'Stock insuficiente para venta',
            descripcion: `${error.input_name}: se requiere ${error.requerido} pero solo hay ${error.actual} disponible`,
            tipo: 'alerta',
            prioridad: 'alta',
            reglaAplicada: 'stock_insuficiente_venta',
            metadata: {
              sales_module: true,
              input_id: error.input_id,
              required: error.requerido,
              available: error.actual
            }
          }).catch(e => console.error('Error creando alerta:', e));
        }
      }

      throw new Error(
        'Stock insuficiente:\n' +
        validacionStock.errores
          .filter(e => e.tipo === 'insufficient_stock')
          .map(e => `${e.input_name}: Disponible: ${e.actual}, Requerido: ${e.requerido}`)
          .join('\n')
      );
    }

    // 2. CALCULAR TOTALES
    const subtotal = items.reduce((sum, item) =>
      sum + (Number(item.quantity) * Number(item.unit_price)), 0
    );
    const tax_rate = ventaData.tax_rate || 22;
    const tax_amount = subtotal * (tax_rate / 100);
    const total_amount = subtotal + tax_amount;

    // 3. CREAR VENTA (estado DRAFT)
    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert([{
        ...ventaData,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saleError) throw saleError;
    if (!newSale) throw new Error('Error creando venta');

    // 4. CREAR ÍTEMS
    const itemsData = items.map(item => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      const itemTaxAmount = itemSubtotal * ((Number(item.tax_rate) || tax_rate) / 100);
      const itemTotal = itemSubtotal + itemTaxAmount;

      // Calcular rentabilidad si hay costo unitario
      let profit_margin = null;
      let profit_amount = null;
      const unitCost = Number(item.unit_cost) || 0;
      if (unitCost > 0) {
        const unitPrice = Number(item.unit_price);
        profit_margin = ((unitPrice - unitCost) / unitPrice) * 100;
        profit_amount = (unitPrice - unitCost) * Number(item.quantity);
      }

      return {
        sale_id: newSale.id,
        input_id: item.input_id,
        depot_id: item.depot_id || null,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
        unit_cost: unitCost,
        subtotal: itemSubtotal,
        tax_rate: Number(item.tax_rate) || tax_rate,
        tax_amount: itemTaxAmount,
        total_amount: itemTotal,
        profit_margin,
        profit_amount,
        lot_id: item.lot_id || null,
        campaign_id: item.campaign_id || null,
        notes: item.notes || null,
        created_at: new Date().toISOString()
      };
    });

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsData);

    if (itemsError) throw itemsError;

    // 5. AUDITORÍA
    await crearRegistro({
      firmId: ventaData.firm_id,
      tipo: 'venta_creada',
      descripcion: `Venta en borrador creada - Cliente: ${ventaData.client_name} - Total: ${total_amount} ${ventaData.currency}`,
      moduloOrigen: 'modulo_17_ventas',
      usuario: ventaData.created_by || 'sistema',
      referencia: newSale.id,
      metadata: {
        total_amount,
        items_count: items.length,
        status: 'DRAFT',
        client_name: ventaData.client_name
      }
    }).catch(e => console.error('Error en auditoría:', e));

    return newSale;
  } catch (error) {
    console.error('Error en crearVenta:', error);
    throw error;
  }
}

/**
 * Confirmar venta (DRAFT → CONFIRMED)
 * IMPORTANTE: Dispara trigger que:
 * 1. Crea movimientos de salida de stock
 * 2. Crea ingreso financiero
 * 3. Registra auditoría
 *
 * @param {string} saleId - ID de la venta
 * @param {string} userId - ID del usuario
 * @returns {Object} Venta confirmada
 */
export async function confirmarVenta(saleId, userId) {
  try {
    if (!saleId) throw new Error('saleId es requerido');
    if (!userId) throw new Error('userId es requerido');

    // Obtener venta actual
    const { data: venta } = await obtenerVentaPorId(saleId);
    if (!venta) throw new Error('Venta no encontrada');

    if (venta.status !== 'DRAFT') {
      throw new Error(`Venta debe estar en estado DRAFT. Estado actual: ${venta.status}`);
    }

    if (!venta.items || venta.items.length === 0) {
      throw new Error('La venta no tiene ítems. No se puede confirmar.');
    }

    // Validar stock nuevamente antes de confirmar
    const { data: insumos } = await supabase
      .from('inputs')
      .select('id, name, unit, current_stock, cost_per_unit, min_stock_alert')
      .eq('firm_id', venta.firm_id);

    const validacionStock = validarDisponibilidadStock(venta.items, insumos || []);
    if (!validacionStock.valido) {
      throw new Error(
        'Stock insuficiente:\n' +
        validacionStock.errores
          .filter(e => e.tipo === 'insufficient_stock')
          .map(e => `${e.input_name}: Disponible: ${e.actual}, Requerido: ${e.requerido}`)
          .join('\n')
      );
    }

    // Actualizar estado a CONFIRMED
    // El trigger handle_sale_confirmed() se ejecuta automáticamente
    const { data, error } = await supabase
      .from('sales')
      .update({
        status: 'CONFIRMED',
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Error confirmando venta');

    return data;
  } catch (error) {
    console.error('Error en confirmarVenta:', error);
    throw error;
  }
}

/**
 * Cancelar venta
 * IMPORTANTE: Dispara trigger que:
 * 1. Revierte movimientos de stock
 * 2. Cancela ingreso financiero
 * 3. Registra auditoría
 *
 * @param {string} saleId - ID de la venta
 * @param {string} userId - ID del usuario
 * @param {string} reason - Motivo de cancelación
 * @returns {Object} Venta cancelada
 */
export async function cancelarVenta(saleId, userId, reason) {
  try {
    if (!saleId) throw new Error('saleId es requerido');
    if (!userId) throw new Error('userId es requerido');
    if (!reason || !reason.trim()) throw new Error('Motivo de cancelación es requerido');

    const { data, error } = await supabase
      .from('sales')
      .update({
        status: 'CANCELLED',
        cancelled_by: userId,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Error cancelando venta');

    return data;
  } catch (error) {
    console.error('Error en cancelarVenta:', error);
    throw error;
  }
}

/**
 * Actualizar venta (solo en estado DRAFT)
 * @param {string} saleId - ID de la venta
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Venta actualizada
 */
export async function actualizarVenta(saleId, updates) {
  try {
    if (!saleId) throw new Error('saleId es requerido');

    // Verificar que esté en DRAFT
    const { data: venta } = await obtenerVentaPorId(saleId);
    if (!venta) throw new Error('Venta no encontrada');
    if (venta.status !== 'DRAFT') {
      throw new Error('Solo se pueden editar ventas en estado DRAFT');
    }

    const { data, error } = await supabase
      .from('sales')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarVenta:', error);
    throw error;
  }
}

// ===========================
// FUNCIONES DE RENTABILIDAD
// ===========================

/**
 * Calcular rentabilidad de una venta
 * @param {string} saleId - ID de la venta
 * @returns {Object} Análisis de rentabilidad
 */
export async function calcularRentabilidadVenta(saleId) {
  try {
    if (!saleId) throw new Error('saleId es requerido');

    const { data: venta } = await obtenerVentaPorId(saleId);
    if (!venta) throw new Error('Venta no encontrada');

    const items = venta.items || [];

    // Calcular totales
    const totalVenta = venta.total_amount;
    const totalCosto = items.reduce((sum, item) =>
      sum + ((Number(item.unit_cost) || 0) * Number(item.quantity)), 0
    );
    const totalGanancia = totalVenta - totalCosto;
    const margenGlobal = totalCosto > 0 ? (totalGanancia / totalVenta) * 100 : 0;

    // Análisis por producto
    const porProducto = items.map(item => ({
      input_id: item.input_id,
      input_name: item.input?.name || 'Sin nombre',
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      unit_cost: Number(item.unit_cost) || 0,
      total_venta: item.total_amount,
      total_costo: (Number(item.unit_cost) || 0) * Number(item.quantity),
      ganancia: item.profit_amount || 0,
      margen_porcentaje: item.profit_margin || 0
    }));

    // Producto más rentable
    const masRentable = porProducto.length > 0 ? porProducto.reduce((max, item) =>
      item.ganancia > (max.ganancia || 0) ? item : max, porProducto[0]) : null;

    // Producto menos rentable
    const menosRentable = porProducto.length > 0 ? porProducto.reduce((min, item) =>
      item.ganancia < (min.ganancia || 0) ? item : min, porProducto[0]) : null;

    return {
      resumen: {
        total_venta: totalVenta,
        total_costo: totalCosto,
        total_ganancia: totalGanancia,
        margen_global_porcentaje: margenGlobal,
        items_count: items.length,
        currency: venta.currency
      },
      por_producto: porProducto,
      analisis: {
        producto_mas_rentable: masRentable,
        producto_menos_rentable: menosRentable
      }
    };
  } catch (error) {
    console.error('Error en calcularRentabilidadVenta:', error);
    throw error;
  }
}

/**
 * Obtener rentabilidad por lote/campaña
 * @param {string} firmId - ID de la firma
 * @param {string} lotId - ID del lote (opcional)
 * @param {string} campaignId - ID de la campaña (opcional)
 * @returns {Object} Rentabilidad agregada
 */
export async function obtenerRentabilidadPorLote(firmId, lotId, campaignId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    let query = supabase
      .from('sale_items')
      .select(`
        *,
        sale:sales!inner(firm_id, status, sale_date, currency),
        input:inputs(id, name)
      `)
      .eq('sale.firm_id', firmId)
      .eq('sale.status', 'CONFIRMED');

    if (lotId) {
      query = query.eq('lot_id', lotId);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agregar datos
    const totalVenta = data.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const totalCosto = data.reduce((sum, item) =>
      sum + ((Number(item.unit_cost) || 0) * Number(item.quantity)), 0
    );
    const totalGanancia = totalVenta - totalCosto;
    const margen = totalCosto > 0 ? (totalGanancia / totalVenta) * 100 : 0;

    return {
      total_venta: totalVenta,
      total_costo: totalCosto,
      total_ganancia: totalGanancia,
      margen_porcentaje: margen,
      items_count: data.length,
      items: data
    };
  } catch (error) {
    console.error('Error en obtenerRentabilidadPorLote:', error);
    throw error;
  }
}

// ===========================
// ESTADÍSTICAS
// ===========================

/**
 * Obtener estadísticas generales de ventas
 * @param {string} firmId - ID de la firma
 * @param {string} desde - Fecha desde
 * @param {string} hasta - Fecha hasta
 * @returns {Object} Estadísticas
 */
export async function obtenerEstadisticasVentas(firmId, desde, hasta) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    let query = supabase
      .from('sales')
      .select('*')
      .eq('firm_id', firmId);

    if (desde) query = query.gte('sale_date', desde);
    if (hasta) query = query.lte('sale_date', hasta);

    const { data, error } = await query;
    if (error) throw error;

    return {
      total: data.length,
      por_estado: {
        draft: data.filter(v => v.status === 'DRAFT').length,
        confirmed: data.filter(v => v.status === 'CONFIRMED').length,
        invoiced: data.filter(v => v.status === 'INVOICED').length,
        collected: data.filter(v => v.status === 'COLLECTED').length,
        cancelled: data.filter(v => v.status === 'CANCELLED').length
      },
      total_vendido: data
        .filter(v => v.status !== 'CANCELLED')
        .reduce((sum, v) => sum + (v.total_amount || 0), 0)
    };
  } catch (error) {
    console.error('Error en obtenerEstadisticasVentas:', error);
    throw error;
  }
}
