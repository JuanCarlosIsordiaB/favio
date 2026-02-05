import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';
import { validarFacturaCompra } from '../lib/validations/financeValidations';

/**
 * Obtener todas las facturas de compra de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error, count }
 */
export async function obtenerFacturas(firmId, filters = {}) {
  try {
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' });

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.provider_rut) {
      query = query.eq('provider_rut', filters.provider_rut);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.cost_center_id) {
      query = query.eq('cost_center_id', filters.cost_center_id);
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte('date', filters.dateFrom)
        .lte('date', filters.dateTo);
    }

    const { data, error, count } = await query.order('date', { ascending: false });

    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error('Error en obtenerFacturas:', error);
    return { data: [], count: 0, error };
  }
}

/**
 * Obtener factura por ID
 * @param {string} id - ID de la factura
 * @returns {Promise<Object>} Factura o null
 */
export async function obtenerFacturaPorId(id) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en obtenerFacturaPorId:', error);
    return { data: null, error };
  }
}

/**
 * Crear nueva factura de compra
 * @param {Object} facturaData - Datos de la factura
 * @returns {Promise<Object>} Factura creada
 */
export async function crearFactura(facturaData) {
  try {
    // Validar datos
    const validacion = validarFacturaCompra(facturaData);
    if (!validacion.valido) {
      throw new Error(Object.values(validacion.errores).join(', '));
    }

    // Usar totales ya calculados en el formulario (con múltiples items)
    const subtotal = facturaData.subtotal || 0;
    const ivaAmount = facturaData.iva_amount || 0;
    const totalAmount = facturaData.total_amount || (subtotal + ivaAmount);
    const balance = totalAmount;

    // Preparar objeto - remover campos que no existen en la tabla
    const factura = {
      firm_id: facturaData.firm_id,
      invoice_series: facturaData.invoice_series,
      invoice_number: facturaData.invoice_number,
      invoice_date: facturaData.invoice_date,
      provider_name: facturaData.provider_name,
      provider_rut: facturaData.provider_rut || null,
      provider_email: facturaData.provider_email || null,
      provider_phone: facturaData.provider_phone || null,
      provider_address: facturaData.provider_address || null,
      category: facturaData.category,
      concept: facturaData.concept || null,
      currency: facturaData.currency,
      amount: totalAmount, // Campo legacy requerido en tabla
      subtotal,
      iva_amount: ivaAmount,
      total_amount: totalAmount,
      balance,
      paid_amount: 0,
      status: 'DRAFT',
      payment_status: 'pending',
      payment_terms: facturaData.payment_terms,
      due_date: facturaData.due_date || null,
      alert_days: facturaData.alert_days || 5,
      notes: facturaData.notes || null,
      cost_center_id: facturaData.cost_center_id || null,
      agricultural_work_id: facturaData.agricultural_work_id || null,
      livestock_work_id: facturaData.livestock_work_id || null,
      event_id: facturaData.event_id || null
      // NO incluir account_id que no existe en tabla expenses
      // NO incluir items - tabla expenses no tiene este campo (usar tabla separada en futuro)
    };

    // Insertar en BD
    const { data, error } = await supabase
      .from('expenses')
      .insert([factura])
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: facturaData.firm_id,
      tipo: 'factura_creada',
      descripcion: `Factura ${data.invoice_series}-${data.invoice_number} creada - Proveedor: ${data.provider_name}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: facturaData.created_by || 'sistema',
      referencia: data.id,
      metadata: {
        amount: totalAmount,
        provider: data.provider_name,
        invoice_full: `${data.invoice_series}-${data.invoice_number}`
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en crearFactura:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar factura existente
 * @param {string} id - ID de la factura
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Factura actualizada
 */
export async function actualizarFactura(id, updates) {
  try {
    // Recalcular totales si es necesario
    if (updates.subtotal !== undefined || updates.tax_rate !== undefined) {
      const { data: factura } = await obtenerFacturaPorId(id);
      const subtotal = updates.subtotal !== undefined ? updates.subtotal : factura.subtotal;
      const tax_rate = updates.tax_rate !== undefined ? updates.tax_rate : factura.tax_rate;

      updates.iva_amount = subtotal * (tax_rate / 100);
      updates.total_amount = subtotal + updates.iva_amount;
    }

    // Permitir items para que se persistan
    const dataToUpdate = {
      ...updates
    };

    const { data, error } = await supabase
      .from('expenses')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en actualizarFactura:', error);
    return { data: null, error };
  }
}

/**
 * Cambiar estado de factura
 * @param {string} id - ID de la factura
 * @param {string} nuevoEstado - Nuevo estado
 * @param {string} userId - ID del usuario que realiza el cambio
 * @param {string} motivo - Motivo (si es cancelación)
 * @returns {Promise<Object>} Factura actualizada
 */
export async function cambiarEstadoFactura(id, nuevoEstado, userId, motivo = null) {
  try {
    const updates = {
      status: nuevoEstado,
      status_changed_at: new Date().toISOString(),
      status_changed_by: userId
    };

    if (nuevoEstado === 'CANCELLED') {
      updates.cancelled_by = userId;
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = motivo;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: 'factura_estado_cambio',
      descripcion: `Factura ${data.invoice_series}-${data.invoice_number} cambió a estado ${nuevoEstado}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: userId,
      referencia: id,
      metadata: {
        estado_anterior: 'DRAFT', // TODO: obtener estado anterior
        estado_nuevo: nuevoEstado,
        motivo: motivo
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en cambiarEstadoFactura:', error);
    return { data: null, error };
  }
}

/**
 * Aprobar factura (REGISTERED → APPROVED)
 * @param {string} id - ID de la factura
 * @param {string} userId - ID del usuario aprobador
 * @returns {Promise<Object>} Factura aprobada
 */
export async function aprobarFactura(id, userId) {
  try {
    // Obtener estado actual de la factura
    const { data: facturaActual } = await obtenerFacturaPorId(id);
    if (!facturaActual) throw new Error('Factura no encontrada');

    // Determinar el siguiente estado según el flujo
    let nuevoEstado;
    switch (facturaActual.status) {
      case 'DRAFT':
        nuevoEstado = 'REGISTERED'; // DRAFT → REGISTERED
        break;
      case 'REGISTERED':
        nuevoEstado = 'APPROVED'; // REGISTERED → APPROVED
        break;
      default:
        throw new Error(`No se puede aprobar una factura en estado ${facturaActual.status}`);
    }

    // Cambiar a nuevo estado
    return cambiarEstadoFactura(id, nuevoEstado, userId);
  } catch (error) {
    console.error('Error en aprobarFactura:', error);
    return { data: null, error };
  }
}

/**
 * Anular factura
 * @param {string} id - ID de la factura
 * @param {string} userId - ID del usuario
 * @param {string} motivo - Motivo de cancelación
 * @returns {Promise<Object>} Factura anulada
 */
export async function anularFactura(id, userId, motivo) {
  return cambiarEstadoFactura(id, 'CANCELLED', userId, motivo);
}

/**
 * Obtener cuentas por pagar
 * Retorna facturas APROBADAS o PAGADAS PARCIALMENTE con saldo pendiente
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerCuentasPorPagar(firmId, filters = {}) {
  try {
    let query = supabase
      .from('expenses')
      .select('*');

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    // Solo facturas aprobadas o pagadas parcialmente
    query = query.in('status', ['APPROVED', 'PAID_PARTIAL']);

    // Solo las que tienen saldo pendiente
    query = query.gt('balance', 0);

    // Filtros opcionales
    if (filters.status === 'overdue') {
      // Vencidas
      query = query.lt('due_date', new Date().toISOString().split('T')[0]);
    } else if (filters.status === 'upcoming') {
      // Próximas a vencer (default: próximos 30 días)
      const hoy = new Date();
      const futuro = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
      query = query
        .gte('due_date', hoy.toISOString().split('T')[0])
        .lte('due_date', futuro.toISOString().split('T')[0]);
    }

    if (filters.provider_rut) {
      query = query.eq('provider_rut', filters.provider_rut);
    }

    if (filters.cost_center_id) {
      query = query.eq('cost_center_id', filters.cost_center_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en obtenerCuentasPorPagar:', error);
    return { data: [], error };
  }
}

/**
 * Verificar facturas vencidas
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Array>} Facturas vencidas
 */
export async function verificarFacturasVencidas(firmId) {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('firm_id', firmId)
      .in('status', ['APPROVED', 'PAID_PARTIAL'])
      .lt('due_date', hoy)
      .gt('balance', 0);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en verificarFacturasVencidas:', error);
    return { data: [], error };
  }
}

/**
 * Calcular totales de una factura
 * @param {Object} items - Items de la factura
 * @returns {Object} { subtotal, ivaAmount, totalAmount }
 */
export function calcularTotalesFactura(items) {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + itemTotal;
  }, 0);

  const ivaAmount = subtotal * 0.22; // 22% por defecto
  const totalAmount = subtotal + ivaAmount;

  return { subtotal, ivaAmount, totalAmount };
}
