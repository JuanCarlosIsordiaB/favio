import { supabase } from "../lib/supabase";
import { crearRegistro } from "./registros";
import { validarOrdenPago } from "../lib/validations/financeValidations";

/**
 * Obtener todas las órdenes de pago de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>} { data, error, count }
 */
export async function obtenerOrdenesDePago(firmId, filters = {}) {
  try {
    let query = supabase
      .from("payment_orders")
      .select("*, purchase_order:purchase_order_id(order_number)", {
        count: "exact",
      });

    if (firmId) {
      query = query.eq("firm_id", firmId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte("order_date", filters.dateFrom)
        .lte("order_date", filters.dateTo);
    }

    const { data, error, count } = await query.order("order_date", {
      ascending: false,
    });

    if (error) throw error;

    const orders = data || [];
    const expenseIds = Array.from(
      new Set(orders.map((order) => order.expense_id).filter(Boolean)),
    );
    let expenseById = {};

    if (expenseIds.length > 0) {
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("id, invoice_series, invoice_number")
        .in("id", expenseIds);

      if (expensesError) throw expensesError;
      expenseById = Object.fromEntries(
        (expensesData || []).map((expense) => [expense.id, expense]),
      );
    }

    const enrichedOrders = orders.map((order) => ({
      ...order,
      expense: order.expense_id ? expenseById[order.expense_id] || null : null,
    }));

    return { data: enrichedOrders, count: count || 0, error: null };
  } catch (error) {
    console.error("Error en obtenerOrdenesDePago:", error);
    return { data: [], count: 0, error };
  }
}

/**
 * Obtener orden de pago por ID
 * @param {string} id - ID de la orden
 * @returns {Promise<Object>} Orden o null
 */
export async function obtenerOrdenPagoPorId(id) {
  try {
    const { data, error } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error en obtenerOrdenPagoPorId:", error);
    return { data: null, error };
  }
}

/**
 * Generar número de orden único
 * @param {string} firmId - ID de la firma
 * @returns {Promise<string>} Número de orden generado
 */
async function generarNumeroOrden(firmId) {
  try {
    // Obtener el año actual
    const year = new Date().getFullYear();

    // Obtener el último número de orden del año actual
    const { data: lastOrder } = await supabase
      .from("payment_orders")
      .select("order_number")
      .eq("firm_id", firmId)
      .ilike("order_number", `OP-${year}-%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Extraer el número secuencial del último orden
    let secuencial = 1;
    if (lastOrder && lastOrder.order_number) {
      const parts = lastOrder.order_number.split("-");
      if (parts.length === 3) {
        secuencial = parseInt(parts[2]) + 1;
      }
    }

    // Generar número con formato OP-YYYY-NNNNN
    return `OP-${year}-${String(secuencial).padStart(5, "0")}`;
  } catch (error) {
    console.error("Error generando número de orden:", error);
    // Fallback: generar número basado en timestamp
    return `OP-${Date.now()}`;
  }
}

/**
 * Crear orden de pago vinculada a facturas
 * @param {Object} ordenData - Datos de la orden
 * @param {Array} facturasSeleccionadas - Array de facturas con monto a pagar
 * @returns {Promise<Object>} Orden creada
 */
export async function crearOrdenPago(ordenData, facturasSeleccionadas) {
  try {
    // Calcular monto total ANTES de validar
    const totalAmount = facturasSeleccionadas.reduce(
      (sum, f) => sum + (f.amount_paid || f.balance),
      0,
    );

    // Agregar monto calculado a los datos de validación
    const datosConMonto = {
      ...ordenData,
      amount: totalAmount,
    };

    // Validar con el monto incluido
    const validacion = validarOrdenPago(datosConMonto, facturasSeleccionadas);
    if (!validacion.valido) {
      throw new Error(Object.values(validacion.errores).join(", "));
    }

    // Extraer created_by para auditoría (no se inserta en BD)
    const { created_by, ...ordenSinCreatedBy } = ordenData;

    // Generar número de orden
    const orderNumber = await generarNumeroOrden(ordenData.firm_id);

    const purchaseOrderIds = Array.from(
      new Set(
        facturasSeleccionadas.map((f) => f.purchase_order_id).filter(Boolean),
      ),
    );
    const uniquePurchaseOrderId =
      purchaseOrderIds.length === 1 ? purchaseOrderIds[0] : null;
    const uniqueExpenseId =
      facturasSeleccionadas.length === 1 ? facturasSeleccionadas[0].id : null;

    // Preparar objeto para INSERT (sin campos que no existen en BD)
    const orden = {
      ...ordenSinCreatedBy,
      order_number: orderNumber,
      amount: totalAmount,
      purchase_order_id: uniquePurchaseOrderId,
      expense_id: uniqueExpenseId,
      planned_payment_date:
        ordenData.planned_payment_date || ordenData.order_date || null,
      status: "PENDING_APPROVAL",
      created_at: new Date().toISOString(),
      // Nota: facturas_data se guardará en localStorage en el componente
    };

    // Insertar orden de pago
    const { data: ordenCreada, error: errorOrden } = await supabase
      .from("payment_orders")
      .insert([orden])
      .select()
      .single();

    if (errorOrden) throw errorOrden;

    // Las relaciones ya se guardaron en facturas_data de la orden
    // (NO se inserta en payment_order_expenses para evitar issues con constraints)

    // Auditoría
    await crearRegistro({
      firmId: ordenData.firm_id,
      tipo: "orden_pago_creada",
      descripcion: `Orden de pago #${ordenCreada.order_number} creada - ${facturasSeleccionadas.length} factura(s)`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: ordenData.created_by || "sistema",
      referencia: ordenCreada.id,
      metadata: {
        order_number: ordenCreada.order_number,
        amount: totalAmount,
        facturas_count: facturasSeleccionadas.length,
        facturas: facturasSeleccionadas.map((f) => f.id),
      },
    });

    return { data: ordenCreada, error: null };
  } catch (error) {
    console.error("Error en crearOrdenPago:", error);
    return { data: null, error };
  }
}

/**
 * Obtener facturas asociadas a una orden
 * @param {string} ordenId - ID de la orden
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerFacturasDeOrden(ordenId) {
  try {
    const { data, error } = await supabase
      .from("payment_order_expenses")
      .select("*")
      .eq("payment_order_id", ordenId);

    if (error) throw error;

    const relaciones = data || [];
    const expenseIds = Array.from(
      new Set(
        relaciones.map((relacion) => relacion.expense_id).filter(Boolean),
      ),
    );
    let expenseById = {};

    if (expenseIds.length > 0) {
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .in("id", expenseIds);

      if (expensesError) throw expensesError;
      expenseById = Object.fromEntries(
        (expensesData || []).map((expense) => [expense.id, expense]),
      );
    }

    const enrichedRelaciones = relaciones.map((relacion) => ({
      ...relacion,
      expense: relacion.expense_id
        ? expenseById[relacion.expense_id] || null
        : null,
    }));

    return { data: enrichedRelaciones, error: null };
  } catch (error) {
    console.error("Error en obtenerFacturasDeOrden:", error);
    return { data: [], error };
  }
}

/**
 * Aprobar orden de pago
 * @param {string} id - ID de la orden
 * @param {string} userId - ID del usuario aprobador
 * @returns {Promise<Object>} Orden aprobada
 */
export async function aprobarOrdenPago(id, userId) {
  try {
    console.log("Starting approval for order:", id);

    // Usar NULL para sistema, o el userId si es válido
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    const approvedByValue =
      userId === "sistema" || !isValidUUID ? null : userId;

    const updates = {
      status: "APPROVED",
      approved_by: approvedByValue,
      approval_date: new Date().toISOString().split("T")[0],
    };

    // Step 1: Actualizar
    console.log("Executing UPDATE with:", { id, updates });
    const { error: updateError, count } = await supabase
      .from("payment_orders")
      .update(updates)
      .eq("id", id);

    console.log("UPDATE result:", { error: updateError, count, updatedId: id });

    if (updateError) {
      console.error("UPDATE error:", updateError);
      throw updateError;
    }

    // Step 2: Obtener el registro actualizado
    console.log("Fetching updated order with id:", id);
    const { data, error: fetchError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", id)
      .single();

    console.log("FETCH result:", { data, error: fetchError });

    if (fetchError) {
      console.error("FETCH error:", fetchError);
      throw fetchError;
    }

    if (!data) {
      console.error("No data returned from FETCH.");
      throw new Error("No se pudo obtener la orden de pago actualizada.");
    }

    console.log("Order updated successfully:", data);
    console.log("Order status value:", data?.status);
    console.log("Order fields:", Object.keys(data || {}));

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: "orden_pago_aprobada",
      descripcion: `Orden de pago #${data.order_number} aprobada`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: userId,
      referencia: id,
      metadata: { order_number: data.order_number, amount: data.amount },
    });

    return { data, error: null };
  } catch (error) {
    console.error("Error en aprobarOrdenPago:", error);
    return { data: null, error };
  }
}

/**
 * Rechazar orden de pago
 * @param {string} id - ID de la orden
 * @param {string} userId - ID del usuario
 * @param {string} motivo - Motivo del rechazo
 * @returns {Promise<Object>} Orden rechazada
 */
export async function rechazarOrdenPago(id, userId, motivo) {
  try {
    // Usar NULL para sistema, o el userId si es válido
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    const rejectedByValue =
      userId === "sistema" || !isValidUUID ? null : userId;

    const updates = {
      status: "REJECTED",
      rejected_by: rejectedByValue,
      rejected_at: new Date().toISOString(),
      rejection_reason: motivo,
    };

    // Actualizar Y obtener los datos actualizados en una sola consulta
    const { data, error: updateError } = await supabase
      .from("payment_orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    console.log("REJECT UPDATE result:", {
      data,
      error: updateError,
      orderId: id,
    });

    if (updateError) {
      console.error("REJECT UPDATE error:", updateError);
      throw updateError;
    }

    if (!data) {
      throw new Error("No se pudo rechazar la orden de pago.");
    }

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: "orden_pago_rechazada",
      descripcion: `Orden de pago #${data.order_number} rechazada`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: userId,
      referencia: id,
      metadata: { order_number: data.order_number, motivo: motivo },
    });

    return { data, error: null };
  } catch (error) {
    console.error("Error en rechazarOrdenPago:", error);
    return { data: null, error };
  }
}

/**
 * Ejecutar orden de pago (actualiza facturas y cuenta)
 * OPERACIÓN CRÍTICA: Transaccional
 * @param {string} ordenId - ID de la orden
 * @param {string} userId - ID del usuario que ejecuta
 * @returns {Promise<Object>} Resultado de la ejecución
 */
export async function ejecutarOrdenPago(ordenId, userId) {
  try {
    // 1. Validar que la orden existe y está en estado APPROVED
    const { data: orden, error: errorOrden } =
      await obtenerOrdenPagoPorId(ordenId);
    if (errorOrden) throw errorOrden;
    if (!orden) throw new Error("Orden de pago no encontrada");

    if (orden.status !== "APPROVED") {
      throw new Error(
        `La orden debe estar en estado APPROVED. Estado actual: ${orden.status}`,
      );
    }

    // 2. Validar saldo de la cuenta financiera (si hay account_id)
    if (orden.account_id) {
      const { data: cuenta, error: errorCuenta } = await supabase
        .from("financial_accounts")
        .select("current_balance, name, currency")
        .eq("id", orden.account_id)
        .single();

      if (errorCuenta) throw errorCuenta;

      if (!cuenta) {
        throw new Error(`Cuenta financiera no encontrada: ${orden.account_id}`);
      }

      const saldoDisponible = cuenta.current_balance || 0;

      if (saldoDisponible < orden.amount) {
        throw new Error(
          `Saldo insuficiente en cuenta "${cuenta.name}". ` +
            `Saldo disponible: ${cuenta.currency} ${saldoDisponible.toLocaleString("es-UY", { maximumFractionDigits: 2 })}. ` +
            `Monto a pagar: ${cuenta.currency} ${orden.amount.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`,
        );
      }
    }

    // 3. Obtener las facturas relacionadas a esta orden desde localStorage
    // (Se guardan en el componente cuando se crea la orden)
    let relaciones = [];

    try {
      const storedData = localStorage.getItem(`paymentOrder_${ordenId}`);
      if (storedData) {
        relaciones = JSON.parse(storedData);
        console.log(
          `📦 Relaciones obtenidas de localStorage: ${relaciones.length} factura(s)`,
        );
      } else {
        console.warn(
          "⚠️ No hay datos de facturas en localStorage para esta orden",
        );
        relaciones = [];
      }
    } catch (e) {
      console.warn("⚠️ Error leyendo localStorage:", e);
      relaciones = [];
    }

    console.log(`📦 Procesando ${relaciones.length} facturas de la orden...`);

    // 4. Actualizar cada factura con el monto pagado
    for (const relacion of relaciones) {
      console.log(`[DEBUG] Procesando relación:`, JSON.stringify(relacion));

      const { data: factura, error: errorFactura } = await supabase
        .from("expenses")
        .select("id, paid_amount, balance, status")
        .eq("id", relacion.expense_id)
        .single();

      if (errorFactura) {
        console.error(
          `[ERROR] SELECT failed para expense_id ${relacion.expense_id}:`,
          errorFactura,
        );
        throw errorFactura;
      }

      console.log(`[DEBUG] Factura encontrada:`, JSON.stringify(factura));

      const montoPagado =
        (factura.paid_amount || 0) + (relacion.amount_paid || 0);
      const nuevoBalance = (factura.balance || 0) - (relacion.amount_paid || 0);
      const nuevoStatus = nuevoBalance <= 0 ? "completada" : "pendiente";
      const paymentStatus = nuevoBalance <= 0 ? "paid" : "pending";

      console.log(
        `  💰 Factura ${relacion.expense_id}: pagado=${montoPagado}, balance=${nuevoBalance}, status=${nuevoStatus}`,
      );
      console.log(
        `[DEBUG] UPDATE payload:`,
        JSON.stringify({
          paid_amount: montoPagado,
          balance: nuevoBalance,
          status: nuevoStatus,
        }),
      );

      // Actualizar la factura
      const { data: updateResult, error: errorUpdate } = await supabase
        .from("expenses")
        .update({
          paid_amount: montoPagado,
          balance: nuevoBalance,
          status: nuevoStatus,
          payment_status: paymentStatus,
        })
        .eq("id", relacion.expense_id)
        .select();

      if (errorUpdate) {
        console.error(
          `[ERROR] UPDATE failed para expense_id ${relacion.expense_id}:`,
          JSON.stringify(errorUpdate),
        );
        console.error(`[ERROR] Detalles completos:`, errorUpdate);
        throw errorUpdate;
      }

      console.log(`[DEBUG] UPDATE result:`, JSON.stringify(updateResult));
    }

    // 5. Actualizar cuenta financiera (restar monto)
    if (orden.account_id) {
      const { data: cuenta, error: errorCuentaActual } = await supabase
        .from("financial_accounts")
        .select("current_balance")
        .eq("id", orden.account_id)
        .single();

      if (errorCuentaActual) throw errorCuentaActual;

      const nuevoBalance = (cuenta.current_balance || 0) - orden.amount;

      const { error: errorUpdateCuenta } = await supabase
        .from("financial_accounts")
        .update({
          current_balance: nuevoBalance,
        })
        .eq("id", orden.account_id);

      if (errorUpdateCuenta) throw errorUpdateCuenta;
      console.log(
        `  🏦 Cuenta ${orden.account_id}: nuevo balance = ${nuevoBalance}`,
      );
    }

    // 6. Actualizar la orden a estado EXECUTED
    // Usar NULL para sistema, o el userId si es válido
    const isValidUUID2 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    const executedByValue =
      userId === "sistema" || !isValidUUID2 ? null : userId;

    const { data: ordenEjecutada, error: errorUpdateOrden } = await supabase
      .from("payment_orders")
      .update({
        status: "EXECUTED",
        executed_at: new Date().toISOString(),
        executed_by: executedByValue,
        payment_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", ordenId)
      .select()
      .single();

    if (errorUpdateOrden) throw errorUpdateOrden;

    console.log("✅ Orden ejecutada exitosamente:", ordenEjecutada.id);

    await supabase
      .from("alerts")
      .update({ status: "completed" })
      .eq("payment_order_id", ordenId)
      .eq("status", "pending")
      .in("regla_aplicada", [
        "ORDEN_PAGO_PENDIENTE",
        "ORDEN_PAGO_PENDIENTE_PAGO",
      ]);

    // 7. Crear registro de auditoría
    await crearRegistro({
      firmId: orden.firm_id,
      tipo: "orden_pago_ejecutada",
      descripcion: `Orden de pago #${orden.order_number} ejecutada - ${relaciones.length} factura(s) actualizadas`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: userId || "sistema",
      referencia: ordenId,
      metadata: {
        order_number: orden.order_number,
        amount: orden.amount,
        facturas_actualizadas: relaciones.length,
        factura_ids: relaciones.map((r) => r.expense_id),
      },
    });

    return { data: ordenEjecutada, error: null };
  } catch (error) {
    console.error("Error en ejecutarOrdenPago:", error);
    return { data: null, error };
  }
}

/**
 * Anular orden de pago
 * @param {string} id - ID de la orden
 * @param {string} userId - ID del usuario
 * @param {string} motivo - Motivo de cancelación
 * @returns {Promise<Object>} Orden anulada
 */
export async function anularOrdenPago(id, userId, motivo) {
  try {
    // Usar NULL para sistema, o el userId si es válido
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    const cancelledByValue =
      userId === "sistema" || !isValidUUID ? null : userId;

    const updates = {
      status: "CANCELLED",
      cancelled_by: cancelledByValue,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: motivo,
    };

    // Actualizar Y obtener los datos actualizados en una sola consulta
    const { data, error: updateError } = await supabase
      .from("payment_orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    console.log("CANCEL UPDATE result:", {
      data,
      error: updateError,
      orderId: id,
    });

    if (updateError) {
      console.error("CANCEL UPDATE error:", updateError);
      throw updateError;
    }

    if (!data) {
      throw new Error("No se pudo anular la orden de pago.");
    }

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: "orden_pago_anulada",
      descripcion: `Orden de pago #${data.order_number} anulada`,
      moduloOrigen: "modulo_08_finanzas",
      usuario: userId,
      referencia: id,
      metadata: { order_number: data.order_number, motivo: motivo },
    });

    return { data, error: null };
  } catch (error) {
    console.error("Error en anularOrdenPago:", error);
    return { data: null, error };
  }
}
