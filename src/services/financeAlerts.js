import { supabase } from "../lib/supabase";

/**
 * Crear alerta financiera
 * @param {Object} alertaData - Datos de la alerta
 * @returns {Promise<Object>} Alerta creada
 */
async function crearAlertaFinanciera(alertaData) {
  try {
    const alerta = {
      firm_id: alertaData.firm_id,
      title: alertaData.title,
      description: alertaData.description,
      alert_type: alertaData.alert_type || "alert",
      priority: alertaData.priority || "medium",
      alert_date: alertaData.alert_date,
      status: "pending",
      origen: "automatica",
      regla_aplicada: alertaData.regla_aplicada,
      // FK explícitos para deduplicación
      expense_id: alertaData.expense_id || null,
      income_id: alertaData.income_id || null,
      payment_order_id: alertaData.payment_order_id || null,
      metadata: alertaData.metadata || {},
    };

    const { data, error } = await supabase
      .from("alerts")
      .insert([alerta])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error en crearAlertaFinanciera:", error);
    return { data: null, error };
  }
}

/**
 * Verificar alertas de facturas vencidas o próximas a vencer
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado
 */
export async function verificarAlertasFacturas(firmId) {
  try {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split("T")[0];

    const { data: facturas, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("firm_id", firmId)
      .in("status", ["pendiente", "APPROVED", "PAID_PARTIAL"])
      .gt("balance", 0)
      .not("due_date", "is", null);

    if (error) throw error;

    let alertasCreadas = 0;

    for (const factura of facturas || []) {
      const vencimiento = new Date(factura.due_date);
      const diasRestantes = Math.floor(
        (vencimiento - hoy) / (1000 * 60 * 60 * 24),
      );

      // Factura vencida
      if (diasRestantes < 0) {
        const diasVencida = Math.abs(diasRestantes);

        // Verificar si ya existe alerta similar usando expense_id (FK explícito)
        const { data: alertaExistente } = await supabase
          .from("alerts")
          .select("id")
          .eq("firm_id", firmId)
          .eq("regla_aplicada", "FACTURA_VENCIDA")
          .eq("status", "pending")
          .eq("expense_id", factura.id)
          .limit(1);

        if (!alertaExistente || alertaExistente.length === 0) {
          await crearAlertaFinanciera({
            firm_id: firmId,
            expense_id: factura.id,
            title: "Factura Vencida",
            description: `Factura ${factura.invoice_series}-${factura.invoice_number} de ${factura.provider_name} vencida hace ${diasVencida} días. Saldo pendiente: ${factura.currency} ${factura.balance}`,
            alert_type: "alert",
            priority: "high",
            alert_date: fechaHoyStr,
            regla_aplicada: "FACTURA_VENCIDA",
            metadata: {
              dias_vencida: diasVencida,
              saldo: factura.balance,
              invoice_full: `${factura.invoice_series}-${factura.invoice_number}`,
              provider: factura.provider_name,
            },
          });
          alertasCreadas++;
        }
      }
      // Factura próxima a vencer
      else if (
        diasRestantes > 0 &&
        diasRestantes <= (factura.alert_days || 5)
      ) {
        // Verificar si ya existe alerta similar usando expense_id (FK explícito)
        const { data: alertaExistente } = await supabase
          .from("alerts")
          .select("id")
          .eq("firm_id", firmId)
          .eq("regla_aplicada", "FACTURA_PROXIMO_VENCIMIENTO")
          .eq("status", "pending")
          .eq("expense_id", factura.id)
          .limit(1);

        if (!alertaExistente || alertaExistente.length === 0) {
          await crearAlertaFinanciera({
            firm_id: firmId,
            expense_id: factura.id,
            title: "Factura Próxima a Vencer",
            description: `Factura ${factura.invoice_series}-${factura.invoice_number} vence en ${diasRestantes} días. Saldo pendiente: ${factura.currency} ${factura.balance}`,
            alert_type: "warning",
            priority: "medium",
            alert_date: fechaHoyStr,
            regla_aplicada: "FACTURA_PROXIMO_VENCIMIENTO",
            metadata: {
              dias_restantes: diasRestantes,
              saldo: factura.balance,
              invoice_full: `${factura.invoice_series}-${factura.invoice_number}`,
              provider: factura.provider_name,
            },
          });
          alertasCreadas++;
        }
      }
    }

    return { alertasCreadas, error: null };
  } catch (error) {
    console.error("Error en verificarAlertasFacturas:", error);
    return { alertasCreadas: 0, error };
  }
}

/**
 * Verificar alertas de ingresos pendientes
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado
 */
export async function verificarAlertasIngresos(firmId) {
  try {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split("T")[0];

    const { data: ingresos, error } = await supabase
      .from("income")
      .select("*")
      .eq("firm_id", firmId)
      .in("status", ["CONFIRMED", "COLLECTED_PARTIAL"])
      .not("due_date", "is", null);

    if (error) throw error;

    let alertasCreadas = 0;

    for (const ingreso of ingresos || []) {
      const vencimiento = new Date(ingreso.due_date);
      const diasRestantes = Math.floor(
        (vencimiento - hoy) / (1000 * 60 * 60 * 24),
      );

      // Ingreso vencido (no cobrado)
      if (diasRestantes < 0) {
        const diasVencida = Math.abs(diasRestantes);

        // Verificar si ya existe alerta similar usando income_id (FK explícito)
        const { data: alertaExistente } = await supabase
          .from("alerts")
          .select("id")
          .eq("firm_id", firmId)
          .eq("regla_aplicada", "INGRESO_VENCIDO")
          .eq("status", "pending")
          .eq("income_id", ingreso.id)
          .limit(1);

        if (!alertaExistente || alertaExistente.length === 0) {
          await crearAlertaFinanciera({
            firm_id: firmId,
            income_id: ingreso.id,
            title: "Ingreso Vencido por Cobrar",
            description: `Ingreso de ${ingreso.category} de ${ingreso.client_name} vencido hace ${diasVencida} días. Saldo por cobrar: ${ingreso.currency} ${ingreso.balance}`,
            alert_type: "alert",
            priority: "medium",
            alert_date: fechaHoyStr,
            regla_aplicada: "INGRESO_VENCIDO",
            metadata: {
              dias_vencida: diasVencida,
              saldo: ingreso.balance,
              client: ingreso.client_name,
              category: ingreso.category,
            },
          });
          alertasCreadas++;
        }
      }
    }

    return { alertasCreadas, error: null };
  } catch (error) {
    console.error("Error en verificarAlertasIngresos:", error);
    return { alertasCreadas: 0, error };
  }
}

/**
 * Verificar órdenes de pago pendientes de aprobación
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado
 */
export async function verificarOrdenesPendientes(firmId) {
  try {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split("T")[0];

    const { data: ordenes, error } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("firm_id", firmId)
      .eq("status", "PENDING_APPROVAL");

    if (error) throw error;

    let alertasCreadas = 0;

    for (const orden of ordenes || []) {
      // Verificar si ya existe alerta similar usando payment_order_id (FK explícito)
      const { data: alertaExistente } = await supabase
        .from("alerts")
        .select("id")
        .eq("firm_id", firmId)
        .eq("regla_aplicada", "ORDEN_PAGO_PENDIENTE")
        .eq("status", "pending")
        .eq("payment_order_id", orden.id)
        .limit(1);

      if (!alertaExistente || alertaExistente.length === 0) {
        await crearAlertaFinanciera({
          firm_id: firmId,
          payment_order_id: orden.id,
          title: "Orden de Pago Pendiente de Aprobación",
          description: `Orden de pago #${orden.order_number} por ${orden.currency} ${orden.amount} pendiente de aprobación desde el ${orden.order_date}`,
          alert_type: "warning",
          priority: "medium",
          alert_date: fechaHoyStr,
          regla_aplicada: "ORDEN_PAGO_PENDIENTE",
          metadata: {
            order_number: orden.order_number,
            amount: orden.amount,
            currency: orden.currency,
          },
        });
        alertasCreadas++;
      }
    }

    return { alertasCreadas, error: null };
  } catch (error) {
    console.error("Error en verificarOrdenesPendientes:", error);
    return { alertasCreadas: 0, error };
  }
}

/**
 * Verificar órdenes de pago pendientes de pago
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado
 */
export async function verificarOrdenesPagoPendientes(firmId) {
  try {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split("T")[0];

    const { data: ordenes, error } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("firm_id", firmId)
      .eq("status", "APPROVED");

    if (error) throw error;

    let alertasCreadas = 0;

    for (const orden of ordenes || []) {
      const fechaPlanificada = orden.planned_payment_date || orden.order_date;
      if (!fechaPlanificada) continue;

      const diasAtraso = Math.floor(
        (hoy - new Date(fechaPlanificada)) / (1000 * 60 * 60 * 24),
      );
      if (diasAtraso < 0) continue;

      const { data: alertaExistente } = await supabase
        .from("alerts")
        .select("id")
        .eq("firm_id", firmId)
        .eq("regla_aplicada", "ORDEN_PAGO_PENDIENTE_PAGO")
        .eq("status", "pending")
        .eq("payment_order_id", orden.id)
        .limit(1);

      if (!alertaExistente || alertaExistente.length === 0) {
        await crearAlertaFinanciera({
          firm_id: firmId,
          payment_order_id: orden.id,
          title: "Orden de Pago Pendiente de Pago",
          description: `Orden de pago #${orden.order_number} pendiente de pago desde el ${fechaPlanificada}. Días de atraso: ${diasAtraso}.`,
          alert_type: "warning",
          priority: diasAtraso > 3 ? "high" : "medium",
          alert_date: fechaHoyStr,
          regla_aplicada: "ORDEN_PAGO_PENDIENTE_PAGO",
          metadata: {
            order_number: orden.order_number,
            amount: orden.amount,
            currency: orden.currency,
            planned_payment_date: fechaPlanificada,
            dias_atraso: diasAtraso,
          },
        });
        alertasCreadas++;
      }
    }

    return { alertasCreadas, error: null };
  } catch (error) {
    console.error("Error en verificarOrdenesPagoPendientes:", error);
    return { alertasCreadas: 0, error };
  }
}

/**
 * Marcar alerta como resuelta
 * @param {string} alertaId - ID de la alerta
 * @returns {Promise<Object>} Resultado
 */
export async function resolverAlerta(alertaId) {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .update({ status: "completed" })
      .eq("id", alertaId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error en resolverAlerta:", error);
    return { data: null, error };
  }
}

/**
 * Verificar pagos programados próximos a vencer
 * Se generan automáticamente desde purchase orders con condiciones de pago
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado
 */
export async function verificarPagosProgramadosProximos(firmId) {
  try {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split("T")[0];
    const fechaHoy7DiasStr = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Obtener expenses programadas (auto-generadas) que estén próximas a vencer
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("firm_id", firmId)
      .eq("is_auto_generated", true)
      .in("status", ["pendiente", "APPROVED", "PAID_PARTIAL", "DRAFT"])
      .gt("balance", 0) // Solo si quedan saldos por pagar
      .gte("due_date", fechaHoyStr) // Vencimiento >= hoy
      .lte("due_date", fechaHoy7DiasStr); // Vencimiento <= hoy + 7 días

    if (error) throw error;

    let alertasCreadas = 0;

    for (const expense of expenses || []) {
      const vencimiento = new Date(expense.due_date);
      const diasRestantes = Math.floor(
        (vencimiento - hoy) / (1000 * 60 * 60 * 24),
      );

      // Determinar prioridad según días restantes
      const prioridad = diasRestantes <= 3 ? "high" : "medium";

      // Verificar si ya existe alerta similar usando expense_id (FK explícito)
      const { data: alertaExistente } = await supabase
        .from("alerts")
        .select("id")
        .eq("firm_id", firmId)
        .eq("regla_aplicada", "PAGO_PROGRAMADO_PROXIMO")
        .eq("status", "pending")
        .eq("expense_id", expense.id)
        .limit(1);

      if (!alertaExistente || alertaExistente.length === 0) {
        // Crear alerta para pago programado próximo
        await crearAlertaFinanciera({
          firm_id: firmId,
          expense_id: expense.id,
          title: `Pago programado próximo (${diasRestantes} día${diasRestantes === 1 ? "" : "s"})`,
          description: `Cuota ${expense.installment_number}/${expense.total_installments} - ${expense.provider_name} vence el ${expense.due_date}. Saldo pendiente: ${expense.currency} ${expense.balance}`,
          alert_type: "warning",
          priority: prioridad,
          alert_date: fechaHoyStr,
          regla_aplicada: "PAGO_PROGRAMADO_PROXIMO",
          metadata: {
            purchase_order_id: expense.purchase_order_id,
            dias_restantes: diasRestantes,
            saldo: expense.balance,
            installment_number: expense.installment_number,
            total_installments: expense.total_installments,
            payment_condition_code: expense.payment_condition_code,
            provider: expense.provider_name,
            currency: expense.currency,
          },
        });
        alertasCreadas++;
      }
    }

    return { alertasCreadas, error: null };
  } catch (error) {
    console.error("Error en verificarPagosProgramadosProximos:", error);
    return { alertasCreadas: 0, error };
  }
}

/**
 * Ejecutar todas las verificaciones de alertas
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado consolidado
 */
export async function verificarTodasLasAlertas(firmId) {
  try {
    const resultados = {};

    const { alertasCreadas: facturas } = await verificarAlertasFacturas(firmId);
    resultados.facturas = facturas;

    const { alertasCreadas: ingresos } = await verificarAlertasIngresos(firmId);
    resultados.ingresos = ingresos;

    const { alertasCreadas: ordenes } =
      await verificarOrdenesPendientes(firmId);
    resultados.ordenes = ordenes;

    const { alertasCreadas: ordenesPago } =
      await verificarOrdenesPagoPendientes(firmId);
    resultados.ordenesPago = ordenesPago;

    const { alertasCreadas: pagosProgramados } =
      await verificarPagosProgramadosProximos(firmId);
    resultados.pagosProgramados = pagosProgramados;

    resultados.total =
      (facturas || 0) +
      (ingresos || 0) +
      (ordenes || 0) +
      (ordenesPago || 0) +
      (pagosProgramados || 0);

    return { resultados, error: null };
  } catch (error) {
    console.error("Error en verificarTodasLasAlertas:", error);
    return { resultados: null, error };
  }
}

/**
 * Obtener alertas pendientes de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data, error }
 */
export async function obtenerAlertasPendientes(firmId) {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("firm_id", firmId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("alert_date", { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error en obtenerAlertasPendientes:", error);
    return { data: [], error };
  }
}
