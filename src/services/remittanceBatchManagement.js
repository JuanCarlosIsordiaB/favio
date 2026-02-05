/**
 * Servicios para gestionar Vencimientos y Lotes/Batch en Remitos
 * GAP 3: Vencimientos integrados
 * GAP 4: Lotes/Batch tracking
 */

import { supabase } from '../lib/supabase';

// ============================================
// VENCIMIENTOS
// ============================================

/**
 * Actualizar vencimiento de un ítem del remito
 */
export async function actualizarVencimientoItemRemito(remittanceItemId, expiryDate) {
  try {
    if (!remittanceItemId) throw new Error('remittanceItemId es requerido');

    // Validación: no permitir fechas en el pasado sin advertencia
    if (expiryDate && new Date(expiryDate) < new Date()) {
      console.warn('Advertencia: Fecha de vencimiento está en el pasado');
    }

    const { data, error } = await supabase
      .from('remittance_items')
      .update({
        batch_expiry_date: expiryDate
      })
      .eq('id', remittanceItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarVencimientoItemRemito:', error);
    throw error;
  }
}

/**
 * Obtener ítems próximos a vencer (dentro de N días)
 */
export async function obtenerItemsProxAVencer(firmId, diasAnticipacion = 30) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const hoy = new Date();
    const proximosDias = new Date(hoy.getTime() + diasAnticipacion * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('remittance_items')
      .select(`
        id,
        remittance_id,
        item_description,
        batch_expiry_date,
        quantity_received,
        unit,
        remittances(
          remittance_number,
          supplier_name,
          depot_id
        ),
        inputs(
          id,
          name,
          current_stock
        )
      `)
      .eq('remittances.firm_id', firmId)
      .gt('batch_expiry_date', hoy.toISOString().split('T')[0])
      .lt('batch_expiry_date', proximosDias.toISOString().split('T')[0])
      .order('batch_expiry_date', { ascending: true });

    if (error) throw error;

    return {
      data: data || [],
      dias_anticipacion: diasAnticipacion,
      total_items: (data || []).length
    };
  } catch (error) {
    console.error('Error en obtenerItemsProxAVencer:', error);
    throw error;
  }
}

/**
 * Obtener ítems vencidos
 */
export async function obtenerItemsVencidos(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('remittance_items')
      .select(`
        id,
        remittance_id,
        item_description,
        batch_expiry_date,
        quantity_received,
        remittances(
          remittance_number,
          supplier_name
        ),
        inputs(
          id,
          name
        )
      `)
      .eq('remittances.firm_id', firmId)
      .lt('batch_expiry_date', hoy)
      .order('batch_expiry_date', { ascending: true });

    if (error) throw error;

    return {
      data: data || [],
      dias_vencidos: (data || []).map(item => ({
        ...item,
        dias_transcurridos: Math.floor(
          (new Date() - new Date(item.batch_expiry_date)) / (1000 * 60 * 60 * 24)
        )
      })),
      total_items: (data || []).length
    };
  } catch (error) {
    console.error('Error en obtenerItemsVencidos:', error);
    throw error;
  }
}

/**
 * Obtener calendario de vencimientos (por mes)
 */
export async function obtenerCalendarioVencimientos(firmId, anio, mes) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    // Calcular rango del mes
    const inicioDia = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
    const finDia = new Date(anio, mes, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('remittance_items')
      .select('batch_expiry_date, quantity_received, unit')
      .eq('remittances.firm_id', firmId)
      .gte('batch_expiry_date', inicioDia)
      .lte('batch_expiry_date', finDia)
      .not('batch_expiry_date', 'is', null);

    if (error) throw error;

    // Agrupar por día
    const calendario = {};
    (data || []).forEach(item => {
      const dia = item.batch_expiry_date;
      if (!calendario[dia]) {
        calendario[dia] = {
          fecha: dia,
          items: [],
          total_cantidad: 0
        };
      }
      calendario[dia].items.push(item);
      calendario[dia].total_cantidad += item.quantity_received || 0;
    });

    return {
      mes: mes,
      anio: anio,
      calendario: Object.values(calendario).sort((a, b) =>
        new Date(a.fecha) - new Date(b.fecha)
      )
    };
  } catch (error) {
    console.error('Error en obtenerCalendarioVencimientos:', error);
    throw error;
  }
}

// ============================================
// LOTES / BATCH
// ============================================

/**
 * Actualizar número de lote de un ítem del remito
 */
export async function actualizarLoteItemRemito(remittanceItemId, batchNumber) {
  try {
    if (!remittanceItemId) throw new Error('remittanceItemId es requerido');

    const { data, error } = await supabase
      .from('remittance_items')
      .update({
        batch_number: batchNumber
      })
      .eq('id', remittanceItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarLoteItemRemito:', error);
    throw error;
  }
}

/**
 * Obtener todos los lotes de un insumo
 */
export async function obtenerLotesDeInsumo(inputId) {
  try {
    if (!inputId) throw new Error('inputId es requerido');

    const { data, error } = await supabase
      .from('input_movements')
      .select(`
        id,
        batch_number,
        date,
        quantity,
        type,
        description
      `)
      .eq('input_id', inputId)
      .not('batch_number', 'is', null)
      .order('date', { ascending: false });

    if (error) throw error;

    // Agrupar por lote
    const lotes = {};
    (data || []).forEach(mov => {
      const lote = mov.batch_number;
      if (!lotes[lote]) {
        lotes[lote] = {
          batch_number: lote,
          movimientos: [],
          total_entrada: 0,
          total_salida: 0
        };
      }
      lotes[lote].movimientos.push(mov);
      if (mov.type === 'entry' || mov.type === 'adjustment') {
        lotes[lote].total_entrada += mov.quantity || 0;
      } else {
        lotes[lote].total_salida += Math.abs(mov.quantity) || 0;
      }
    });

    return {
      input_id: inputId,
      lotes: Object.values(lotes),
      total_lotes: Object.keys(lotes).length
    };
  } catch (error) {
    console.error('Error en obtenerLotesDeInsumo:', error);
    throw error;
  }
}

/**
 * Obtener trazabilidad completa de un lote (de qué remito vino, a dónde fue)
 */
export async function obtenerTrazabilidadLote(batchNumber, inputId) {
  try {
    if (!batchNumber) throw new Error('batchNumber es requerido');
    if (!inputId) throw new Error('inputId es requerido');

    // Obtener todos los movimientos del lote
    const { data: movimientos, error: movError } = await supabase
      .from('input_movements')
      .select(`
        id,
        date,
        type,
        quantity,
        description,
        premise_id,
        batch_number
      `)
      .eq('batch_number', batchNumber)
      .eq('input_id', inputId)
      .order('date', { ascending: true });

    if (movError) throw movError;

    // Obtener remito de origen
    const { data: remitItems, error: remitError } = await supabase
      .from('remittance_items')
      .select(`
        id,
        batch_number,
        quantity_received,
        remittances(
          id,
          remittance_number,
          remittance_date,
          supplier_name,
          received_by
        )
      `)
      .eq('batch_number', batchNumber)
      .eq('input_id', inputId);

    if (remitError) throw remitError;

    return {
      batch_number: batchNumber,
      input_id: inputId,
      origin_remittance: remitItems && remitItems.length > 0
        ? remitItems[0].remittances
        : null,
      movimientos: movimientos || [],
      total_movimientos: (movimientos || []).length,
      trazabilidad_completa: true
    };
  } catch (error) {
    console.error('Error en obtenerTrazabilidadLote:', error);
    throw error;
  }
}

/**
 * Obtener resumen de lotes por remito
 */
export async function obtenerResumenLotesRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('remittance_items')
      .select(`
        id,
        batch_number,
        batch_expiry_date,
        item_description,
        quantity_received,
        unit,
        inputs(
          id,
          name,
          current_stock
        )
      `)
      .eq('remittance_id', remittanceId);

    if (error) throw error;

    // Agrupar por lote
    const lotes = (data || []).filter(i => i.batch_number).reduce((acc, item) => {
      const lote = item.batch_number;
      if (!acc[lote]) {
        acc[lote] = {
          batch_number: lote,
          expiry_date: item.batch_expiry_date,
          items: [],
          total_cantidad: 0
        };
      }
      acc[lote].items.push({
        item_description: item.item_description,
        quantity: item.quantity_received,
        unit: item.unit,
        input: item.inputs
      });
      acc[lote].total_cantidad += item.quantity_received || 0;
      return acc;
    }, {});

    return {
      remittance_id: remittanceId,
      lotes: Object.values(lotes),
      total_lotes: Object.keys(lotes).length,
      items_sin_lote: (data || []).filter(i => !i.batch_number).length
    };
  } catch (error) {
    console.error('Error en obtenerResumenLotesRemito:', error);
    throw error;
  }
}
