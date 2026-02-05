import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';
import { validarIngreso } from '../lib/validations/financeValidations';

/**
 * Obtener todos los ingresos de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error, count }
 */
export async function obtenerIngresos(firmId, filters = {}) {
  try {
    let query = supabase
      .from('income')
      .select('*', { count: 'exact' });

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.client_rut) {
      query = query.eq('client_rut', filters.client_rut);
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte('invoice_date', filters.dateFrom)
        .lte('invoice_date', filters.dateTo);
    }

    const { data, error, count } = await query.order('invoice_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error('Error en obtenerIngresos:', error);
    return { data: [], count: 0, error };
  }
}

/**
 * Obtener ingreso por ID
 * @param {string} id - ID del ingreso
 * @returns {Promise<Object>} Ingreso o null
 */
export async function obtenerIngresoPorId(id) {
  try {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en obtenerIngresoPorId:', error);
    return { data: null, error };
  }
}

/**
 * Crear nuevo ingreso
 * @param {Object} ingresoData - Datos del ingreso
 * @returns {Promise<Object>} Ingreso creado
 */
export async function crearIngreso(ingresoData) {
  try {
    // Validar datos
    const validacion = validarIngreso(ingresoData);
    if (!validacion.valido) {
      throw new Error(Object.values(validacion.errores).join(', '));
    }

    // Calcular totales
    const subtotal = ingresoData.subtotal || 0;
    const ivaAmount = subtotal * ((ingresoData.tax_rate || 0) / 100);
    const totalAmount = subtotal + ivaAmount;
    const balance = totalAmount;

    // Preparar objeto - solo con campos válidos de la tabla income
    const ingreso = {
      firm_id: ingresoData.firm_id,
      category: ingresoData.category,
      amount: totalAmount,  // Campo requerido en tabla original
      client_name: ingresoData.client_name,
      client_rut: ingresoData.client_rut,
      client_address: ingresoData.client_address,
      client_email: ingresoData.client_email,
      client_phone: ingresoData.client_phone,
      invoice_date: ingresoData.invoice_date,
      invoice_series: ingresoData.invoice_series,
      invoice_number: ingresoData.invoice_number,
      product: ingresoData.product,
      quantity: ingresoData.quantity,
      unit: ingresoData.unit,
      unit_price: ingresoData.unit_price,
      subtotal,
      iva_amount: ivaAmount,
      total_amount: totalAmount,
      balance,
      collected_amount: 0,
      status: 'DRAFT',
      collection_status: 'pending',
      premise_id: ingresoData.premise_id,
      cost_center_id: ingresoData.cost_center_id,
      campaign_id: ingresoData.campaign_id,
      account_id: ingresoData.account_id,
      agricultural_work_id: ingresoData.agricultural_work_id,
      livestock_work_id: ingresoData.livestock_work_id,
      event_id: ingresoData.event_id,
      created_by: ingresoData.created_by || null,
      metadata: ingresoData.metadata
    };

    // Insertar en BD
    const { data, error } = await supabase
      .from('income')
      .insert([ingreso])
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: ingresoData.firm_id,
      tipo: 'ingreso_creado',
      descripcion: `Ingreso de ${ingresoData.category} creado - Cliente: ${ingresoData.client_name}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: ingresoData.created_by || 'sistema',
      referencia: data.id,
      metadata: {
        amount: totalAmount,
        client: ingresoData.client_name,
        category: ingresoData.category
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en crearIngreso:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar ingreso
 * @param {string} id - ID del ingreso
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function actualizarIngreso(id, updates) {
  try {
    // Recalcular totales si es necesario
    if (updates.subtotal !== undefined || updates.tax_rate !== undefined) {
      const { data: ingreso } = await obtenerIngresoPorId(id);
      const subtotal = updates.subtotal !== undefined ? updates.subtotal : ingreso.subtotal;
      const tax_rate = updates.tax_rate !== undefined ? updates.tax_rate : ingreso.tax_rate;

      updates.iva_amount = subtotal * (tax_rate / 100);
      updates.total_amount = subtotal + updates.iva_amount;
    }

    const { data, error } = await supabase
      .from('income')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en actualizarIngreso:', error);
    return { data: null, error };
  }
}

/**
 * Cambiar estado de ingreso
 * @param {string} id - ID del ingreso
 * @param {string} nuevoEstado - Nuevo estado
 * @param {string} userId - ID del usuario
 * @param {string} motivo - Motivo (si es cancelación)
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function cambiarEstadoIngreso(id, nuevoEstado, userId, motivo = null) {
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
      .from('income')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: 'ingreso_estado_cambio',
      descripcion: `Ingreso cambió a estado ${nuevoEstado}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: userId,
      referencia: id,
      metadata: {
        estado_nuevo: nuevoEstado,
        motivo: motivo
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en cambiarEstadoIngreso:', error);
    return { data: null, error };
  }
}

/**
 * Confirmar ingreso (DRAFT → CONFIRMED)
 * @param {string} id - ID del ingreso
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Ingreso confirmado
 */
export async function confirmarIngreso(id, userId) {
  return cambiarEstadoIngreso(id, 'CONFIRMED', userId);
}

/**
 * Marcar ingreso como cobrado
 * @param {string} id - ID del ingreso
 * @param {string} userId - ID del usuario
 * @param {string} metodoPago - Método de pago
 * @param {string} referencia - Referencia del pago
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function marcarComoCobrado(id, userId, metodoPago, referencia) {
  try {
    const { data: ingreso } = await obtenerIngresoPorId(id);

    const updates = {
      status: 'COLLECTED',
      collection_status: 'collected',
      collected_amount: ingreso.total_amount,
      balance: 0,
      status_changed_at: new Date().toISOString(),
      status_changed_by: userId,
      metadata: {
        ...(ingreso.metadata || {}),
        payment_method: metodoPago,
        payment_reference: referencia
      }
    };

    const { data, error } = await supabase
      .from('income')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: ingreso.firm_id,
      tipo: 'ingreso_cobrado',
      descripcion: `Ingreso marcado como cobrado - Monto: ${ingreso.total_amount}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: userId,
      referencia: id,
      metadata: {
        amount: ingreso.total_amount,
        payment_method: metodoPago,
        reference: referencia
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en marcarComoCobrado:', error);
    return { data: null, error };
  }
}

/**
 * Anular ingreso
 * @param {string} id - ID del ingreso
 * @param {string} userId - ID del usuario
 * @param {string} motivo - Motivo de cancelación
 * @returns {Promise<Object>} Ingreso anulado
 */
export async function anularIngreso(id, userId, motivo) {
  return cambiarEstadoIngreso(id, 'CANCELLED', userId, motivo);
}

/**
 * Obtener cuentas por cobrar
 * Retorna ingresos CONFIRMADOS o COBRADOS PARCIALMENTE con saldo pendiente
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerCuentasPorCobrar(firmId, filters = {}) {
  try {
    let query = supabase
      .from('income')
      .select('*');

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    // Solo ingresos confirmados o cobrados parcialmente
    query = query.in('status', ['CONFIRMED', 'COLLECTED_PARTIAL']);

    // Solo los que tienen saldo pendiente
    query = query.gt('balance', 0);

    // Filtros opcionales
    if (filters.client_rut) {
      query = query.eq('client_rut', filters.client_rut);
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte('invoice_date', filters.dateFrom)
        .lte('invoice_date', filters.dateTo);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en obtenerCuentasPorCobrar:', error);
    return { data: [], error };
  }
}

/**
 * Registrar cobro parcial de un ingreso
 * @param {string} incomeId - ID del ingreso
 * @param {number} collectionAmount - Monto cobrado
 * @param {string} paymentMethod - Método de pago
 * @param {string} referenceNumber - Número de referencia (opcional)
 * @param {string} accountId - ID de cuenta financiera (opcional)
 * @param {string} notes - Notas (opcional)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Ingreso actualizado
 */
export async function registrarCobroParcial(
  incomeId,
  collectionAmount,
  paymentMethod,
  referenceNumber,
  accountId,
  notes,
  userId
) {
  try {
    // Obtener ingreso actual
    const { data: ingreso, error: errorObtener } = await obtenerIngresoPorId(incomeId);
    if (errorObtener) throw errorObtener;
    if (!ingreso) throw new Error('Ingreso no encontrado');

    // Validar monto
    if (collectionAmount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (collectionAmount > ingreso.balance) {
      throw new Error(`El monto no puede exceder el saldo pendiente (${ingreso.balance})`);
    }

    // Calcular nuevo balance
    const nuevoSaldo = ingreso.balance - collectionAmount;
    const nuevoMontoCobrado = (ingreso.collected_amount || 0) + collectionAmount;

    // Determinar nuevo estado
    const nuevoEstado = nuevoSaldo <= 0 ? 'COLLECTED' : 'COLLECTED_PARTIAL';

    // Actualizar ingreso
    const updates = {
      collected_amount: nuevoMontoCobrado,
      balance: nuevoSaldo,
      status: nuevoEstado,
      collection_status: nuevoEstado === 'COLLECTED' ? 'collected' : 'partially_collected',
      status_changed_at: new Date().toISOString(),
      status_changed_by: userId,
      metadata: {
        ...(ingreso.metadata || {}),
        last_payment_method: paymentMethod,
        last_payment_reference: referenceNumber,
        last_payment_date: new Date().toISOString().split('T')[0],
        payment_notes: notes
      }
    };

    const { data: ingresoActualizado, error: errorUpdate } = await supabase
      .from('income')
      .update(updates)
      .eq('id', incomeId)
      .select()
      .single();

    if (errorUpdate) throw errorUpdate;

    // Registrar movimiento si hay cuenta financiera
    if (accountId) {
      await supabase
        .from('income_payment_history')
        .insert([{
          income_id: incomeId,
          payment_date: new Date().toISOString().split('T')[0],
          amount_collected: collectionAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          balance_before: ingreso.balance,
          balance_after: nuevoSaldo,
          account_id: accountId,
          created_by: userId,
          notes: notes || null
        }]);
    }

    // Auditoría
    await crearRegistro({
      firmId: ingreso.firm_id,
      tipo: 'ingreso_cobro_parcial',
      descripcion: `Cobro parcial registrado - Monto: ${collectionAmount}, Nuevo estado: ${nuevoEstado}`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: userId,
      referencia: incomeId,
      metadata: {
        amount_collected: collectionAmount,
        new_balance: nuevoSaldo,
        new_status: nuevoEstado,
        payment_method: paymentMethod,
        reference: referenceNumber
      }
    });

    return { data: ingresoActualizado, error: null };
  } catch (error) {
    console.error('Error en registrarCobroParcial:', error);
    return { data: null, error };
  }
}

/**
 * Calcular totales de un ingreso
 * @param {Object} ingresoData - Datos del ingreso
 * @returns {Object} { subtotal, ivaAmount, totalAmount }
 */
export function calcularTotalesIngreso(ingresoData) {
  const subtotal = (ingresoData.quantity || 0) * (ingresoData.unit_price || 0);
  const tax_rate = ingresoData.tax_rate || 0;
  const ivaAmount = subtotal * (tax_rate / 100);
  const totalAmount = subtotal + ivaAmount;

  return { subtotal, ivaAmount, totalAmount };
}
