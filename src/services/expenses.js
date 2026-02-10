import { supabase } from "../lib/supabase";
import { crearRegistro } from "./registros";
import { validarFacturaCompra } from "../lib/validations/financeValidations";

/**
 * Obtener todas las facturas de compra de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error, count }
 */
export async function obtenerFacturas(firmId, filters = {}) {
  try {
    let query = supabase.from("expenses").select("*", { count: "exact" });

    if (firmId) {
      query = query.eq("firm_id", firmId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.provider_rut) {
      query = query.eq("provider_rut", filters.provider_rut);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.cost_center_id) {
      query = query.eq("cost_center_id", filters.cost_center_id);
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte("invoice_date", filters.dateFrom)
        .lte("invoice_date", filters.dateTo);
    }

    const { data, error, count } = await query.order("invoice_date", {
      ascending: false,
    });

    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error("Error en obtenerFacturas:", error);
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
      .from("expenses")
      .select(
        `
        *,
        expense_items (*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    // Mapear expense_items a items para compatibilidad con código existente
    if (data.expense_items) {
      data.items = data.expense_items.map((item) => ({
        id: item.id,
        concept: item.item_description,
        item_description: item.item_description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        supplier_item_code: item.supplier_item_code,
        tax_rate: item.tax_rate,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        total: item.total,
        purchase_order_item_id: item.purchase_order_item_id,
      }));
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error en obtenerFacturaPorId:", error);
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
      throw new Error(Object.values(validacion.errores).join(", "));
    }

    // Usar totales ya calculados en el formulario (con múltiples items)
    const subtotal = facturaData.subtotal || 0;
    const ivaAmount = facturaData.iva_amount || 0;
    const totalAmount = facturaData.total_amount || subtotal + ivaAmount;

    // Determinar estado según condiciones de pago (SECTOR 2 - nuevos estados)
    // Estados: pendiente, completada, cancelada
    // Si es "contado", la factura está completada. Si es crédito, está pendiente.
    const isContado =
      facturaData.payment_condition === "contado" ||
      facturaData.payment_terms === "contado";
    const status = isContado ? "completada" : "pendiente";
    const balance = isContado ? 0 : totalAmount; // Si es contado, no hay saldo pendiente
    const paidAmount = isContado ? totalAmount : 0; // Si es contado, está completamente pagada
    const paymentStatus = isContado ? "paid" : "pending";

    // Mapear payment_terms a payment_condition si no existe
    const paymentCondition =
      facturaData.payment_condition || (isContado ? "contado" : "credito");

    // Preparar objeto - remover campos que no existen en la tabla
    const factura = {
      firm_id: facturaData.firm_id,
      premise_id: facturaData.premise_id || null,
      purchase_order_id: facturaData.purchase_order_id || null,
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
      paid_amount: paidAmount,
      status: status, // pendiente, completada, cancelada
      payment_status: paymentStatus,
      payment_condition: paymentCondition, // credito o contado
      payment_terms: facturaData.payment_terms || null, // Mantener para compatibilidad
      due_date: facturaData.due_date || null,
      alert_days: facturaData.alert_days || 5,
      notes: facturaData.notes || null,
      cost_center_id: facturaData.cost_center_id || null,
      agricultural_work_id: facturaData.agricultural_work_id || null,
      livestock_work_id: facturaData.livestock_work_id || null,
      event_id: facturaData.event_id || null,
    };

    // Insertar en BD
    const { data, error } = await supabase
      .from("expenses")
      .insert([factura])
      .select()
      .single();

    if (error) throw error;

    // Guardar items en expense_items si existen
    if (facturaData.items && facturaData.items.length > 0) {
      const itemsData = facturaData.items.map((item) => {
        const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
        const itemTax = itemSubtotal * ((item.tax_rate || 0) / 100);
        const itemTotal = itemSubtotal + itemTax;

        return {
          expense_id: data.id,
          purchase_order_item_id: item.purchase_order_item_id || null,
          item_description: item.concept || item.item_description || "",
          category: item.category || facturaData.category,
          quantity: item.quantity || 0,
          unit: item.unit || "Unidades",
          unit_price: item.unit_price || 0,
          supplier_item_code: item.supplier_item_code || null,
          tax_rate: item.tax_rate || 0,
          subtotal: itemSubtotal,
          tax_amount: itemTax,
          total: itemTotal,
        };
      });

      const { error: itemsError } = await supabase
        .from("expense_items")
        .insert(itemsData);

      if (itemsError) {
        console.error("Error guardando items:", itemsError);
        // No lanzar error, solo loguear - la factura ya se creó
      }
    }

    // Preparar metadata completo con todos los detalles de la factura
    const metadata = {
      invoice_series: facturaData.invoice_series,
      invoice_number: facturaData.invoice_number,
      invoice_full: `${facturaData.invoice_series}-${facturaData.invoice_number}`,
      invoice_date: facturaData.invoice_date,
      provider_name: facturaData.provider_name,
      provider_rut: facturaData.provider_rut || null,
      provider_email: facturaData.provider_email || null,
      provider_phone: facturaData.provider_phone || null,
      provider_address: facturaData.provider_address || null,
      category: facturaData.category,
      concept: facturaData.concept || null,
      currency: facturaData.currency,
      status: status,
      payment_terms: facturaData.payment_terms || null,
      due_date: facturaData.due_date || null,
      notes: facturaData.notes || null,
      items_count: facturaData.items?.length || 0,
      items: facturaData.items
        ? facturaData.items.map((item) => ({
            concept: item.concept,
            description: item.concept, // Alias para compatibilidad
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            subtotal: (item.quantity || 0) * (item.unit_price || 0),
            tax_amount:
              (item.quantity || 0) *
              (item.unit_price || 0) *
              ((item.tax_rate || 22) / 100),
            total:
              (item.quantity || 0) *
              (item.unit_price || 0) *
              (1 + (item.tax_rate || 22) / 100),
          }))
        : [],
      subtotal: subtotal,
      iva_amount: ivaAmount,
      tax_amount: ivaAmount, // Alias
      total_amount: totalAmount,
      amount: totalAmount, // Alias para compatibilidad
    };

    // Auditoría
    await crearRegistro({
      firmId: facturaData.firm_id,
      tipo: "factura_creada",
      descripcion: `Factura ${data.invoice_series}-${data.invoice_number} creada - Proveedor: ${data.provider_name}`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: facturaData.created_by || "sistema",
      referencia: data.id,
      metadata: metadata,
    });

    return { data, error: null };
  } catch (error) {
    console.error("Error en crearFactura:", error);
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
      const subtotal =
        updates.subtotal !== undefined ? updates.subtotal : factura.subtotal;
      const tax_rate =
        updates.tax_rate !== undefined ? updates.tax_rate : factura.tax_rate;

      updates.iva_amount = subtotal * (tax_rate / 100);
      updates.total_amount = subtotal + updates.iva_amount;
    }

    // Permitir items para que se persistan
    const dataToUpdate = {
      ...updates,
    };

    const { data, error } = await supabase
      .from("expenses")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error en actualizarFactura:", error);
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
export async function cambiarEstadoFactura(
  id,
  nuevoEstado,
  userId,
  motivo = null,
) {
  try {
    // Validar que el estado sea uno de los permitidos
    const estadosValidos = ["pendiente", "completada", "cancelada"];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(
        `Estado inválido: ${nuevoEstado}. Estados válidos: ${estadosValidos.join(", ")}`,
      );
    }

    const updates = {
      status: nuevoEstado,
    };

    if (nuevoEstado === "cancelada") {
      updates.notes = motivo
        ? `${updates.notes || ""}\nCancelada: ${motivo}`.trim()
        : updates.notes;
    }

    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: "factura_estado_cambio",
      descripcion: `Factura ${data.invoice_series}-${data.invoice_number} cambió a estado ${nuevoEstado}`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: userId,
      referencia: id,
      metadata: {
        estado_nuevo: nuevoEstado,
        motivo: motivo,
      },
    });

    return { data, error: null };
  } catch (error) {
    console.error("Error en cambiarEstadoFactura:", error);
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
    if (!facturaActual) throw new Error("Factura no encontrada");

    // En la nueva estructura, aprobar significa cambiar de pendiente a completada
    if (facturaActual.status === "pendiente") {
      return cambiarEstadoFactura(id, "completada", userId);
    } else if (facturaActual.status === "completada") {
      throw new Error("La factura ya está completada");
    } else {
      throw new Error(
        `No se puede aprobar una factura en estado ${facturaActual.status}`,
      );
    }
  } catch (error) {
    console.error("Error en aprobarFactura:", error);
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
  return cambiarEstadoFactura(id, "cancelada", userId, motivo);
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
      .from("expenses")
      .select("*, purchase_order:purchase_order_id(order_number)");

    if (firmId) {
      query = query.eq("firm_id", firmId);
    }

    // Solo facturas completadas o pendientes (nuevos estados)
    query = query.in("status", ["completada", "pendiente"]);

    // Solo las que tienen saldo pendiente
    query = query.gt("balance", 0);

    // Filtros opcionales
    if (filters.status === "overdue") {
      // Vencidas
      query = query.lt("due_date", new Date().toISOString().split("T")[0]);
    } else if (filters.status === "upcoming") {
      // Próximas a vencer (default: próximos 30 días)
      const hoy = new Date();
      const futuro = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
      query = query
        .gte("due_date", hoy.toISOString().split("T")[0])
        .lte("due_date", futuro.toISOString().split("T")[0]);
    }

    if (filters.provider_rut) {
      query = query.eq("provider_rut", filters.provider_rut);
    }

    if (filters.cost_center_id) {
      query = query.eq("cost_center_id", filters.cost_center_id);
    }

    const { data, error } = await query.order("due_date", { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error en obtenerCuentasPorPagar:", error);
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
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("firm_id", firmId)
      .in("status", ["completada", "pendiente"])
      .lt("due_date", hoy)
      .gt("balance", 0);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error en verificarFacturasVencidas:", error);
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
