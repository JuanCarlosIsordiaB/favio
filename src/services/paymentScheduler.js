import { supabase } from "../lib/supabase";
import { addDays, parseISO } from "date-fns";
import { crearRegistro } from "./registros";

/**
 * Parsea las condiciones de pago y genera un array de cuotas
 * @param {string} paymentTerms - Código: 'contado', '30_dias', '50_50', etc.
 * @param {number} totalAmount - Monto total de la orden
 * @param {string|Date} baseDate - Fecha base (order_date)
 * @returns {Array} Array de objetos { installmentNumber, percentage, daysOffset, dueDate, amount }
 */
export function parsePaymentTerms(paymentTerms, totalAmount, baseDate) {
  const baseDateObj =
    typeof baseDate === "string" ? parseISO(baseDate) : baseDate;
  const cuotas = [];

  switch (paymentTerms) {
    case "contado":
      // 100% en el acto
      cuotas.push({
        installmentNumber: 1,
        percentage: 100,
        daysOffset: 0,
        dueDate: baseDateObj,
        amount: parseFloat((totalAmount * 1.0).toFixed(2)),
      });
      break;

    case "30_dias":
      // 100% a 30 días
      cuotas.push({
        installmentNumber: 1,
        percentage: 100,
        daysOffset: 30,
        dueDate: addDays(baseDateObj, 30),
        amount: parseFloat((totalAmount * 1.0).toFixed(2)),
      });
      break;

    case "60_dias":
      // 100% a 60 días
      cuotas.push({
        installmentNumber: 1,
        percentage: 100,
        daysOffset: 60,
        dueDate: addDays(baseDateObj, 60),
        amount: parseFloat((totalAmount * 1.0).toFixed(2)),
      });
      break;

    case "90_dias":
      // 100% a 90 días
      cuotas.push({
        installmentNumber: 1,
        percentage: 100,
        daysOffset: 90,
        dueDate: addDays(baseDateObj, 90),
        amount: parseFloat((totalAmount * 1.0).toFixed(2)),
      });
      break;

    case "50_50":
      // 50% a 30 días, 50% a 60 días
      cuotas.push({
        installmentNumber: 1,
        percentage: 50,
        daysOffset: 30,
        dueDate: addDays(baseDateObj, 30),
        amount: parseFloat((totalAmount * 0.5).toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 2,
        percentage: 50,
        daysOffset: 60,
        dueDate: addDays(baseDateObj, 60),
        amount: parseFloat((totalAmount * 0.5).toFixed(2)),
      });
      break;

    case "33_33_34":
      // 33% a 30 días, 33% a 60 días, 34% a 90 días
      const tercio = totalAmount / 3;
      cuotas.push({
        installmentNumber: 1,
        percentage: 33,
        daysOffset: 30,
        dueDate: addDays(baseDateObj, 30),
        amount: parseFloat(tercio.toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 2,
        percentage: 33,
        daysOffset: 60,
        dueDate: addDays(baseDateObj, 60),
        amount: parseFloat(tercio.toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 3,
        percentage: 34,
        daysOffset: 90,
        dueDate: addDays(baseDateObj, 90),
        amount: parseFloat((totalAmount - tercio * 2).toFixed(2)),
      });
      break;

    case "25_25_25_25":
      // 25% a 30, 60, 90 y 120 días
      const cuarto = totalAmount / 4;
      cuotas.push({
        installmentNumber: 1,
        percentage: 25,
        daysOffset: 30,
        dueDate: addDays(baseDateObj, 30),
        amount: parseFloat(cuarto.toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 2,
        percentage: 25,
        daysOffset: 60,
        dueDate: addDays(baseDateObj, 60),
        amount: parseFloat(cuarto.toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 3,
        percentage: 25,
        daysOffset: 90,
        dueDate: addDays(baseDateObj, 90),
        amount: parseFloat(cuarto.toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 4,
        percentage: 25,
        daysOffset: 120,
        dueDate: addDays(baseDateObj, 120),
        amount: parseFloat((totalAmount - cuarto * 3).toFixed(2)),
      });
      break;

    case "40_60":
      // 40% anticipo (inmediato), 60% a 30 días
      cuotas.push({
        installmentNumber: 1,
        percentage: 40,
        daysOffset: 0,
        dueDate: baseDateObj,
        amount: parseFloat((totalAmount * 0.4).toFixed(2)),
      });
      cuotas.push({
        installmentNumber: 2,
        percentage: 60,
        daysOffset: 30,
        dueDate: addDays(baseDateObj, 30),
        amount: parseFloat((totalAmount * 0.6).toFixed(2)),
      });
      break;

    default:
      // Si no se reconoce, tratar como contado
      console.warn(
        `Condición de pago desconocida: ${paymentTerms}. Usando contado.`,
      );
      cuotas.push({
        installmentNumber: 1,
        percentage: 100,
        daysOffset: 0,
        dueDate: baseDateObj,
        amount: parseFloat((totalAmount * 1.0).toFixed(2)),
      });
  }

  return cuotas;
}

/**
 * Genera expenses programadas desde una purchase order
 * @param {Object} purchaseOrder - Datos de la orden de compra
 * @param {UUID} firmId - ID de la firma
 * @param {UUID} userId - ID del usuario creador
 * @returns {Promise<Array>} Array de expenses creadas
 */
export async function generateExpensesFromPurchaseOrder(
  purchaseOrder,
  firmId,
  userId,
) {
  try {
    console.log("🔄 [paymentScheduler] Iniciando generación de expenses", {
      order_number: purchaseOrder.order_number,
      payment_terms: purchaseOrder.payment_terms,
      total_amount: purchaseOrder.total_amount,
      order_date: purchaseOrder.order_date,
    });

    // No generar expenses si payment_terms es 'contado' o vacío
    if (
      !purchaseOrder.payment_terms ||
      purchaseOrder.payment_terms === "contado" ||
      purchaseOrder.payment_terms === ""
    ) {
      console.log("⏭️ No se generarán expenses (contado o sin términos)");
      return [];
    }

    // Parsear condiciones de pago
    console.log(
      "📝 [paymentScheduler] Parseando payment_terms:",
      purchaseOrder.payment_terms,
    );
    const cuotas = parsePaymentTerms(
      purchaseOrder.payment_terms,
      purchaseOrder.total_amount,
      purchaseOrder.order_date,
    );

    console.log(
      `✅ [paymentScheduler] Generando ${cuotas.length} expenses programadas para OC ${purchaseOrder.order_number}`,
      {
        cuotas: cuotas.map((c) => ({
          installment: c.installmentNumber,
          amount: c.amount,
          dueDate: c.dueDate,
        })),
      },
    );

    // Preparar datos de expenses
    const expensesData = cuotas.map((cuota) => ({
      firm_id: firmId,
      purchase_order_id: purchaseOrder.id,

      // Datos de factura
      invoice_date: purchaseOrder.order_date,
      due_date: cuota.dueDate.toISOString().split("T")[0], // Solo la fecha, sin hora

      // Datos del proveedor
      provider_name: purchaseOrder.supplier_name,
      provider_rut: purchaseOrder.supplier_rut,
      provider_phone: purchaseOrder.supplier_phone,
      provider_email: purchaseOrder.supplier_email,

      // Montos y estado
      amount: cuota.amount, // Monto total requerido por BD
      subtotal: parseFloat((cuota.amount / 1.22).toFixed(2)), // Asumir IVA 22%
      tax_rate: 22,
      iva_amount: parseFloat((cuota.amount - cuota.amount / 1.22).toFixed(2)),
      total_amount: cuota.amount,
      balance: cuota.amount, // Inicialmente sin pagar
      paid_amount: 0,

      // Estado - Facturas de crédito pendientes de pago
      status: "pendiente",
      payment_status: "pending",

      // Metadatos de programación
      is_auto_generated: true,
      installment_number: cuota.installmentNumber,
      total_installments: cuotas.length,
      payment_condition_code: purchaseOrder.payment_terms,

      // Descripción
      description: `Pago programado ${cuota.installmentNumber}/${cuotas.length} - OC #${purchaseOrder.order_number}`,
      concept: `Pago programado ${cuota.installmentNumber}/${cuotas.length}`,
      category: "Otros gastos",

      // Otros
      currency: purchaseOrder.currency || "UYU",
      alert_days: 7,
      created_at: new Date().toISOString(), // created_by se maneja a través de RLS/triggers
    }));

    // Insertar expenses en bloque
    console.log("💾 [paymentScheduler] Insertando expenses en Supabase...", {
      cantidad: expensesData.length,
      primerExpense: expensesData[0],
    });

    const { data: createdExpenses, error: insertError } = await supabase
      .from("expenses")
      .insert(expensesData)
      .select();

    if (insertError) {
      console.error("❌ [paymentScheduler] Error en insert:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      throw new Error(
        `Error al insertar expenses: ${insertError.message}${insertError.details ? " - " + insertError.details : ""}`,
      );
    }

    console.log(
      `✅ [paymentScheduler] ${createdExpenses.length} expenses creadas exitosamente`,
    );

    // Registrar auditoría
    try {
      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: null,
        tipo: "pago_programado_generado",
        descripcion: `Cronograma de pagos generado: ${createdExpenses.length} cuotas desde OC #${purchaseOrder.order_number}`,
        moduloOrigen: "purchase_orders",
        usuario: userId,
        metadata: {
          purchase_order_id: purchaseOrder.id,
          purchase_order_number: purchaseOrder.order_number,
          payment_terms: purchaseOrder.payment_terms,
          total_amount: purchaseOrder.total_amount,
          installments_count: createdExpenses.length,
          expense_ids: createdExpenses.map((e) => e.id),
        },
      });
    } catch (auditError) {
      console.warn(
        "Warning: Error en auditoría de generación de pagos",
        auditError,
      );
      // No fallar si hay error en auditoría
    }

    return createdExpenses;
  } catch (error) {
    console.error(
      "❌ [paymentScheduler] Error en generateExpensesFromPurchaseOrder:",
      {
        message: error?.message,
        stack: error?.stack,
        details: error?.details,
        fullError: error,
      },
    );
    throw error;
  }
}

/**
 * Obtiene el cronograma de pagos para una purchase order
 * @param {UUID} purchaseOrderId - ID de la orden de compra
 * @returns {Promise<Array>} Array de expenses asociadas
 */
export async function getPaymentScheduleForPurchaseOrder(purchaseOrderId) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("purchase_order_id", purchaseOrderId)
      .eq("is_auto_generated", true)
      .order("installment_number", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error obteniendo cronograma de pagos:", error);
    return [];
  }
}

/**
 * Valida que una condición de pago sea válida
 * @param {string} paymentTerms - Código de condición de pago
 * @returns {boolean} true si es válida
 */
export function isValidPaymentCondition(paymentTerms) {
  const validConditions = [
    "contado",
    "30_dias",
    "60_dias",
    "90_dias",
    "50_50",
    "33_33_34",
    "25_25_25_25",
    "40_60",
  ];
  return validConditions.includes(paymentTerms);
}
