/**
 * Servicio para crear facturas automáticamente desde Órdenes de Compra
 * SECTOR 2 - FACTURA
 * 
 * Este servicio implementa la funcionalidad de crear facturas automáticamente
 * desde una OC, pre-cargando todos los datos de productos y cantidades.
 */

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

/**
 * Crea la factura con inserts directos (fallback cuando la función RPC no existe en la BD).
 * Réplica la lógica de create_invoice_from_purchase_order.
 */
async function createInvoiceWithInserts(purchaseOrder, { invoiceDate, invoiceNumber, paymentCondition }) {
  if (!['credito', 'contado'].includes(paymentCondition)) {
    throw new Error(`Condición de pago inválida: ${paymentCondition}. Debe ser "credito" o "contado"`);
  }

  const po = purchaseOrder;
  const concept = `Factura desde OC: ${po.order_number}`;
  const description = `Factura generada automáticamente desde orden de compra ${po.order_number}`;

  const expenseRow = {
    firm_id: po.firm_id,
    premise_id: po.premise_id ?? null,
    purchase_order_id: po.id,
    invoice_date: invoiceDate,
    invoice_number: invoiceNumber ?? null,
    invoice_series: null,
    provider_name: po.supplier_name ?? null,
    provider_rut: po.supplier_rut ?? null,
    provider_phone: po.supplier_phone ?? null,
    provider_email: po.supplier_email ?? null,
    category: 'Insumos',
    concept,
    currency: 'UYU',
    amount: 0,
    status: 'pendiente',
    payment_condition: paymentCondition,
    description,
    notes: null
  };

  const { data: inserted, error: insertExpError } = await supabase
    .from('expenses')
    .insert([expenseRow])
    .select('id')
    .single();

  if (insertExpError) throw insertExpError;
  const expenseId = inserted.id;

  const items = po.purchase_order_items || [];
  if (items.length > 0) {
    const itemsRows = items.map((item) => ({
      expense_id: expenseId,
      purchase_order_item_id: item.id,
      item_description: item.item_description?.trim() || 'Sin descripción',
      category: item.category ?? null,
      quantity: item.quantity ?? 0,
      unit: item.unit ?? 'Unidades',
      unit_price: 0,
      subtotal: 0,
      tax_amount: 0,
      total: 0
    }));
    const { error: itemsError } = await supabase.from('expense_items').insert(itemsRows);
    if (itemsError) throw itemsError;
  }

  return expenseId;
}

/**
 * Crear factura automáticamente desde una Orden de Compra
 * @param {string} purchaseOrderId - ID de la orden de compra
 * @param {Object} additionalData - Datos adicionales de la factura
 * @param {string} userId - ID del usuario que crea la factura
 * @returns {Promise<Object>} { data: expense, items: expense_items[], error }
 */
export async function createInvoiceFromPurchaseOrder(
  purchaseOrderId,
  additionalData = {},
  userId = null
) {
  try {
    // 1. Obtener datos completos de la OC con sus items
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (*)
      `)
      .eq('id', purchaseOrderId)
      .single();

    if (poError) throw poError;
    if (!purchaseOrder) throw new Error('Orden de compra no encontrada');

    // 2. Validar que la OC esté en estado aprobada
    if (purchaseOrder.status !== 'aprobada') {
      throw new Error(
        `Solo se pueden crear facturas desde órdenes en estado "aprobada". ` +
        `Estado actual: ${purchaseOrder.status}`
      );
    }

    const paymentCondition = additionalData.payment_condition || 'credito';
    const invoiceDate = additionalData.invoice_date || new Date().toISOString().split('T')[0];
    const invoiceNumber = additionalData.invoice_number || null;

    // 3. Crear factura: intentar RPC; si no existe la función (PGRST202), crear con inserts
    let expenseId = null;
    const { data: rpcId, error: rpcError } = await supabase.rpc(
      'create_invoice_from_purchase_order',
      {
        p_purchase_order_id: purchaseOrderId,
        p_invoice_date: invoiceDate,
        p_invoice_number: invoiceNumber,
        p_payment_condition: paymentCondition
      }
    );

    if (rpcError) {
      if (rpcError.code === 'PGRST202') {
        // Función no existe en la BD: crear factura con inserts directos
        expenseId = await createInvoiceWithInserts(
          purchaseOrder,
          { invoiceDate, invoiceNumber, paymentCondition }
        );
      } else {
        throw rpcError;
      }
    } else {
      expenseId = rpcId;
    }

    // 4. Obtener la factura creada con sus items
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_items (*)
      `)
      .eq('id', expenseId)
      .single();

    if (expenseError) throw expenseError;

    // 5. Actualizar datos adicionales si se proporcionaron
    if (additionalData.invoice_number || additionalData.invoice_series || additionalData.notes) {
      const updates = {};
      if (additionalData.invoice_number) updates.invoice_number = additionalData.invoice_number;
      if (additionalData.invoice_series) updates.invoice_series = additionalData.invoice_series;
      if (additionalData.notes) updates.notes = additionalData.notes;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update(updates)
          .eq('id', expenseId);

        if (updateError) throw updateError;
      }
    }

    // 6. Registrar auditoría
    await crearRegistro({
      firmId: purchaseOrder.firm_id,
      premiseId: purchaseOrder.premise_id,
      lotId: null,
      tipo: 'factura_creada_desde_oc',
      descripcion: `Factura creada automáticamente desde OC: ${purchaseOrder.order_number}`,
      moduloOrigen: 'expenses',
      usuario: userId || 'sistema',
      referencia: expenseId,
      metadata: {
        purchase_order_id: purchaseOrderId,
        purchase_order_number: purchaseOrder.order_number,
        invoice_id: expenseId,
        items_count: expense.expense_items?.length || 0
      }
    }).catch(err => console.warn('Error en auditoría:', err));

    return {
      data: expense,
      items: expense.expense_items || [],
      error: null
    };
  } catch (error) {
    console.error('Error creando factura desde OC:', error);
    return {
      data: null,
      items: [],
      error
    };
  }
}

/**
 * Actualizar items de factura con datos financieros
 * @param {string} expenseId - ID de la factura
 * @param {Array} itemsData - Array de items con datos financieros actualizados
 * @returns {Promise<Object>} { data, error }
 */
export async function updateInvoiceItems(expenseId, itemsData) {
  try {
    // Actualizar cada item
    const updates = itemsData.map(item => {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      const taxAmount = subtotal * ((item.tax_rate || 0) / 100);
      const total = subtotal + taxAmount;

      return {
        id: item.id,
        unit_price: item.unit_price || 0,
        supplier_item_code: item.supplier_item_code || null,
        tax_rate: item.tax_rate || 0,
        subtotal,
        tax_amount: taxAmount,
        total,
        updated_at: new Date().toISOString()
      };
    });

    // Actualizar items uno por uno (o en batch si Supabase lo permite)
    for (const update of updates) {
      const { error } = await supabase
        .from('expense_items')
        .update({
          unit_price: update.unit_price,
          supplier_item_code: update.supplier_item_code,
          tax_rate: update.tax_rate,
          subtotal: update.subtotal,
          tax_amount: update.tax_amount,
          total: update.total,
          updated_at: update.updated_at
        })
        .eq('id', update.id);

      if (error) throw error;
    }

    // Recalcular totales de la factura
    const totalSubtotal = updates.reduce((sum, item) => sum + item.subtotal, 0);
    const totalTax = updates.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = totalSubtotal + totalTax;

    // Actualizar totales en la factura
    const { error: expenseError } = await supabase
      .from('expenses')
      .update({
        subtotal: totalSubtotal,
        iva_amount: totalTax,
        total_amount: totalAmount,
        amount: totalAmount // Campo legacy
      })
      .eq('id', expenseId);

    if (expenseError) throw expenseError;

    return { data: { updated: true }, error: null };
  } catch (error) {
    console.error('Error actualizando items de factura:', error);
    return { data: null, error };
  }
}

/**
 * Obtener factura con sus items
 * @param {string} expenseId - ID de la factura
 * @returns {Promise<Object>} { data: expense con items, error }
 */
export async function getInvoiceWithItems(expenseId) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_items (*),
        purchase_order:purchase_orders (
          id,
          order_number,
          order_date,
          status
        )
      `)
      .eq('id', expenseId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error obteniendo factura con items:', error);
    return { data: null, error };
  }
}

