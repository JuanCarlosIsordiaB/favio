import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

/**
 * Obtener todas las cuentas financieras de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerCuentas(firmId, filters = {}) {
  try {
    let query = supabase
      .from('financial_accounts')
      .select('*');

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    // Por defecto, mostrar solo cuentas activas
    if (filters.active !== false) {
      query = query.eq('is_active', true);
    }

    if (filters.account_type) {
      query = query.eq('account_type', filters.account_type);
    }

    if (filters.currency) {
      query = query.eq('currency', filters.currency);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en obtenerCuentas:', error);
    return { data: [], error };
  }
}

/**
 * Obtener cuenta por ID
 * @param {string} id - ID de la cuenta
 * @returns {Promise<Object>} Cuenta o null
 */
export async function obtenerCuentaPorId(id) {
  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en obtenerCuentaPorId:', error);
    return { data: null, error };
  }
}

/**
 * Crear nueva cuenta financiera
 * @param {Object} cuentaData - Datos de la cuenta
 * @returns {Promise<Object>} Cuenta creada
 */
export async function crearCuenta(cuentaData) {
  try {
    // Validar campos requeridos
    if (!cuentaData.name || !cuentaData.name.trim()) {
      throw new Error('El nombre de la cuenta es requerido');
    }

    if (!cuentaData.account_type) {
      throw new Error('El tipo de cuenta es requerido');
    }

    if (!cuentaData.currency) {
      throw new Error('La moneda es requerida');
    }

    // Validar que no haya duplicados
    const { data: existente } = await supabase
      .from('financial_accounts')
      .select('id')
      .eq('firm_id', cuentaData.firm_id)
      .eq('name', cuentaData.name)
      .single();

    if (existente) {
      throw new Error(`Ya existe una cuenta llamada "${cuentaData.name}"`);
    }

    // Crear cuenta
    // Si no se proporciona current_balance (en creación), usar initial_balance
    // En edición, current_balance viene del usuario y se usa tal cual
    const currentBalance = cuentaData.current_balance !== undefined && cuentaData.current_balance !== null
      ? cuentaData.current_balance
      : (cuentaData.initial_balance || 0);

    // Asegurar que los balances sean números válidos con hasta 2 decimales
    const initialBalance = parseFloat((cuentaData.initial_balance || 0).toFixed(2));
    const finalCurrentBalance = parseFloat(currentBalance.toFixed(2));

    const cuenta = {
      ...cuentaData,
      current_balance: finalCurrentBalance,
      initial_balance: initialBalance,
      is_active: true,
      created_at: new Date().toISOString()
    };

    // DEBUG: Log de datos antes de insertar
    console.log('📝 Datos enviados a Supabase:', {
      name: cuenta.name,
      account_type: cuenta.account_type,
      currency: cuenta.currency,
      initial_balance: cuenta.initial_balance,
      current_balance: cuenta.current_balance,
      tipo_initial: typeof cuenta.initial_balance,
      tipo_current: typeof cuenta.current_balance
    });

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([cuenta])
      .select()
      .single();

    if (error) throw error;

    // DEBUG: Log de datos después de insertar
    console.log('✅ Datos retornados de Supabase:', {
      name: data.name,
      account_type: data.account_type,
      currency: data.currency,
      initial_balance: data.initial_balance,
      current_balance: data.current_balance,
      tipo_initial: typeof data.initial_balance,
      tipo_current: typeof data.current_balance
    });

    // Auditoría
    await crearRegistro({
      firmId: cuentaData.firm_id,
      tipo: 'cuenta_financiera_creada',
      descripcion: `Cuenta financiera "${data.name}" (${data.account_type}) creada`,
      moduloOrigen: 'modulo_08_finanzas',
      usuario: cuentaData.created_by || 'sistema',
      referencia: data.id,
      metadata: {
        account_name: data.name,
        account_type: data.account_type,
        currency: data.currency,
        initial_balance: data.initial_balance
      }
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en crearCuenta:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar cuenta
 * @param {string} id - ID de la cuenta
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Cuenta actualizada
 */
export async function actualizarCuenta(id, updates) {
  try {
    // Redondear balances a 2 decimales si se proporcionan
    if (updates.current_balance !== undefined && updates.current_balance !== null) {
      updates.current_balance = parseFloat(updates.current_balance.toFixed(2));
    }
    if (updates.initial_balance !== undefined && updates.initial_balance !== null) {
      updates.initial_balance = parseFloat(updates.initial_balance.toFixed(2));
    }

    // DEBUG: Log de actualización
    console.log('📝 Actualizando cuenta:', {
      id,
      campos: Object.keys(updates),
      current_balance: updates.current_balance,
      initial_balance: updates.initial_balance
    });

    const { data, error } = await supabase
      .from('financial_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // DEBUG: Log después de actualizar
    console.log('✅ Cuenta actualizada:', {
      name: data.name,
      current_balance: data.current_balance,
      initial_balance: data.initial_balance
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error en actualizarCuenta:', error);
    return { data: null, error };
  }
}

/**
 * Actualizar balance de una cuenta
 * @param {string} cuentaId - ID de la cuenta
 * @param {number} monto - Monto a restar (negativo) o sumar (positivo)
 * @returns {Promise<Object>} Cuenta actualizada
 */
export async function actualizarBalanceCuenta(cuentaId, monto) {
  try {
    // Obtener balance actual
    const { data: cuenta, error: errorObtener } = await obtenerCuentaPorId(cuentaId);
    if (errorObtener) throw errorObtener;

    const nuevoBalance = (cuenta.current_balance || 0) + monto;

    const { data, error } = await supabase
      .from('financial_accounts')
      .update({
        current_balance: nuevoBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', cuentaId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en actualizarBalanceCuenta:', error);
    return { data: null, error };
  }
}

/**
 * Eliminar cuenta (soft delete - marcar como inactiva)
 * @param {string} id - ID de la cuenta
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado
 */
export async function eliminarCuenta(id, userId) {
  try {
    const { data: cuenta } = await obtenerCuentaPorId(id);

    // Verificar si la cuenta tiene movimientos
    const { data: movimientos } = await supabase
      .from('expense_payment_history')
      .select('id')
      .eq('account_id', id)
      .limit(1);

    if (movimientos && movimientos.length > 0) {
      // Solo marcar como inactiva
      const { data, error } = await supabase
        .from('financial_accounts')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Auditoría
      await crearRegistro({
        firmId: cuenta.firm_id,
        tipo: 'cuenta_financiera_desactivada',
        descripcion: `Cuenta "${cuenta.name}" desactivada (contiene movimientos)`,
        moduloOrigen: 'modulo_08_finanzas',
        usuario: userId,
        referencia: id
      });

      return { data, error: null };
    } else {
      // Eliminar completamente si no tiene movimientos
      const { error } = await supabase
        .from('financial_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Auditoría
      await crearRegistro({
        firmId: cuenta.firm_id,
        tipo: 'cuenta_financiera_eliminada',
        descripcion: `Cuenta "${cuenta.name}" eliminada`,
        moduloOrigen: 'modulo_08_finanzas',
        usuario: userId,
        referencia: id
      });

      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Error en eliminarCuenta:', error);
    return { data: null, error };
  }
}

/**
 * Obtener movimientos de una cuenta
 * @param {string} cuentaId - ID de la cuenta
 * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerMovimientosCuenta(cuentaId, fechaInicio, fechaFin) {
  try {
    let query = supabase
      .from('expense_payment_history')
      .select('*');

    query = query.eq('account_id', cuentaId);

    if (fechaInicio && fechaFin) {
      query = query
        .gte('payment_date', fechaInicio)
        .lte('payment_date', fechaFin);
    }

    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en obtenerMovimientosCuenta:', error);
    return { data: [], error };
  }
}

/**
 * Obtener resumen de cuentas (balances totales)
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resumen de balances
 */
export async function obtenerResumenCuentas(firmId) {
  try {
    const { data: cuentas, error } = await obtenerCuentas(firmId);
    if (error) throw error;

    const resumen = {
      total_uyu: 0,
      total_usd: 0,
      cuentas_count: cuentas.length,
      por_tipo: {}
    };

    for (const cuenta of cuentas) {
      if (cuenta.currency === 'UYU') {
        resumen.total_uyu += cuenta.current_balance || 0;
      } else if (cuenta.currency === 'USD') {
        resumen.total_usd += cuenta.current_balance || 0;
      }

      if (!resumen.por_tipo[cuenta.account_type]) {
        resumen.por_tipo[cuenta.account_type] = {
          count: 0,
          balance_uyu: 0,
          balance_usd: 0
        };
      }

      resumen.por_tipo[cuenta.account_type].count += 1;
      if (cuenta.currency === 'UYU') {
        resumen.por_tipo[cuenta.account_type].balance_uyu += cuenta.current_balance || 0;
      } else {
        resumen.por_tipo[cuenta.account_type].balance_usd += cuenta.current_balance || 0;
      }
    }

    return { data: resumen, error: null };
  } catch (error) {
    console.error('Error en obtenerResumenCuentas:', error);
    return { data: null, error };
  }
}
