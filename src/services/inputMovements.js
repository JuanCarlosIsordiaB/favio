/**
 * Servicios CRUD para movimientos de stock en Supabase
 * Gestiona el registro inalterable de todos los movimientos de insumos
 * Sincronizado con SCHEMA.sql tabla: input_movements
 */

import { supabase } from "../lib/supabase";
import { recalcularStockInsumo } from "./inputs";

/**
 * Registra un movimiento de stock (operación crítica - debe ser atómica)
 * Tipos válidos: 'entry' | 'exit' | 'adjustment' | 'transfer'
 * @param {Object} movimientoData - Datos del movimiento
 * @returns {Promise<Object>} Movimiento creado
 */
export async function registrarMovimiento(movimientoData) {
  try {
    // Validaciones
    if (!movimientoData.input_id) throw new Error("input_id es requerido");
    if (!movimientoData.type) throw new Error("type es requerido");
    if (!movimientoData.quantity) throw new Error("quantity es requerido");
    if (movimientoData.quantity <= 0) throw new Error("quantity debe ser > 0");

    const tiposValidos = ["entry", "exit", "adjustment", "transfer"];
    if (!tiposValidos.includes(movimientoData.type)) {
      throw new Error(`tipo inválido. Válidos: ${tiposValidos.join(", ")}`);
    }

    // Para transferencias, validar destino
    if (
      movimientoData.type === "transfer" &&
      !movimientoData.destination_depot_id
    ) {
      throw new Error("destination_depot_id es requerido para transferencias");
    }

    // Validar disponibilidad para salidas Y transferencias
    if (movimientoData.type === "exit" || movimientoData.type === "transfer") {
      const { data: insumo, error: errInsumo } = await supabase
        .from("inputs")
        .select("current_stock")
        .eq("id", movimientoData.input_id)
        .single();

      if (errInsumo) throw errInsumo;
      if (!insumo || insumo.current_stock < movimientoData.quantity) {
        throw new Error(
          `Stock insuficiente. Disponible: ${insumo?.current_stock || 0}`,
        );
      }
    }

    // Sanitizar datos: convertir strings vacíos a null para campos UUID
    const movimientoLimpio = {
      input_id: movimientoData.input_id,
      type: movimientoData.type,
      quantity: movimientoData.quantity,
      date: movimientoData.date || new Date().toISOString(),
      description: movimientoData.description,
      firm_id: movimientoData.firm_id || null,
      premise_id: movimientoData.premise_id || null,
      created_by: movimientoData.created_by || null,
      document_reference: movimientoData.document_reference?.trim() || null,
      remittance_id: movimientoData.remittance_id || null,
      purchase_order_id: movimientoData.purchase_order_id || null,
      invoice_id: movimientoData.invoice_id || null,
      batch_number: movimientoData.batch_number || null,
      // Campos UUID: convertir string vacío a null
      lot_id: movimientoData.lot_id?.trim() ? movimientoData.lot_id : null,
      destination_depot_id: movimientoData.destination_depot_id?.trim()
        ? movimientoData.destination_depot_id
        : null,
      destination_input_id: movimientoData.destination_input_id?.trim()
        ? movimientoData.destination_input_id
        : null,
      // Campos numéricos opcionales
      unit_cost: movimientoData.unit_cost
        ? parseFloat(movimientoData.unit_cost)
        : null,
      created_at: new Date().toISOString(),
    };

    // Insertar movimiento
    const { data, error } = await supabase
      .from("input_movements")
      .insert([movimientoLimpio])
      .select()
      .single();

    if (error) {
      console.error("Error al registrar movimiento:", error);
      throw error;
    }

    // Recalcular stock del insumo origen
    try {
      await recalcularStockInsumo(movimientoData.input_id);
    } catch (errRecalc) {
      console.error("Error recalculando stock:", errRecalc);
      // No romper la operación si el recálculo falla, solo loguear
    }

    // Si es transferencia, crear movimiento de ingreso en destino
    if (
      movimientoData.type === "transfer" &&
      movimientoData.destination_depot_id
    ) {
      try {
        let destinationInputId = movimientoData.destination_input_id;

        // Si no existe destination_input_id, crear el insumo en el destino
        if (!destinationInputId) {
          // Obtener datos del insumo origen
          const { data: origenInput, error: errOrigen } = await supabase
            .from("inputs")
            .select("*")
            .eq("id", movimientoData.input_id)
            .single();

          if (errOrigen) throw errOrigen;
          if (!origenInput) throw new Error("Insumo origen no encontrado");

          // Crear insumo en destino con los mismos datos
          const { data: newDestInput, error: errCreate } = await supabase
            .from("inputs")
            .insert([
              {
                firm_id: origenInput.firm_id,
                premise_id: origenInput.premise_id,
                name: origenInput.name,
                category: origenInput.category,
                unit: origenInput.unit,
                min_stock_alert: origenInput.min_stock_alert,
                cost_per_unit: origenInput.cost_per_unit,
                current_stock: 0,
                lot_id: movimientoData.destination_depot_id,
                description: origenInput.description,
                brand: origenInput.brand,
                laboratory: origenInput.laboratory,
                drug: origenInput.drug,
                active_ingredient: origenInput.active_ingredient,
                variety: origenInput.variety,
                currency: origenInput.currency,
              },
            ])
            .select()
            .single();

          if (errCreate) throw errCreate;
          destinationInputId = newDestInput.id;
        }

        // Crear movimiento de ingreso en destino
        await supabase.from("input_movements").insert([
          {
            input_id: destinationInputId,
            type: "entry",
            quantity: movimientoData.quantity,
            date: movimientoData.date || new Date().toISOString(),
            description: `Transferencia recibida: ${movimientoData.description || ""}`,
            lot_id: movimientoData.destination_depot_id,
            unit_cost: movimientoData.unit_cost || null,
            firm_id: movimientoData.firm_id || null,
            premise_id: movimientoData.premise_id || null,
            created_by: movimientoData.created_by || null,
            document_reference: movimientoData.document_reference || null,
            created_at: new Date().toISOString(),
          },
        ]);

        // Recalcular stock del insumo destino
        await recalcularStockInsumo(destinationInputId);
      } catch (errTransf) {
        console.error("Error en transferencia destino:", errTransf);
        // No romper la operación, solo loguear
      }
    }

    return data;
  } catch (error) {
    console.error("Error en registrarMovimiento:", error);
    throw error;
  }
}

/**
 * Obtiene todos los movimientos de un insumo
 * @param {string} insumoId - ID del insumo
 * @param {Object} filtros - Filtros opcionales { desde, hasta, tipo }
 * @returns {Promise<Object>} { data: Movimiento[], count: number }
 */
export async function obtenerMovimientosInsumo(insumoId, filtros = {}) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    let query = supabase
      .from("input_movements")
      .select("*", { count: "exact" })
      .eq("input_id", insumoId);

    // Aplicar filtros opcionales
    if (filtros.tipo) {
      query = query.eq("type", filtros.tipo);
    }

    if (filtros.desde) {
      query = query.gte("date", filtros.desde);
    }

    if (filtros.hasta) {
      query = query.lte("date", filtros.hasta);
    }

    const { data, count, error } = await query.order("date", {
      ascending: false,
    });

    if (error) {
      console.error("Error al obtener movimientos:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerMovimientosInsumo:", error);
    throw error;
  }
}

/**
 * Obtiene todos los movimientos de una firma
 * @param {string} firmId - ID de la firma
 * @param {Object} filtros - Filtros opcionales
 * @returns {Promise<Object>} { data: Movimiento[], count: number }
 */
/**
 * Obtiene todos los movimientos de una firma (SIN JOINS)
 * Los nombres de insumos se resuelven en el componente desde el estado local
 * @param {string} firmId - ID de la firma
 * @param {Object} filtros - Filtros opcionales { tipo, desde, hasta, depotId }
 * @returns {Promise<Object>} { data: Movimiento[], count: number }
 */
export async function obtenerMovimientosFirma(firmId, filtros = {}) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // PASO 1: Obtener todos los insumos de la firma
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);

    // Si no hay insumos, retornar vacío
    if (insumoIds.length === 0) {
      return {
        data: [],
        count: 0,
      };
    }

    // PASO 2: Obtener movimientos de esos insumos
    let query = supabase
      .from("input_movements")
      .select("*", { count: "exact" })
      .in("input_id", insumoIds);

    // Aplicar filtros
    if (filtros.tipo) {
      query = query.eq("type", filtros.tipo);
    }

    if (filtros.desde) {
      query = query.gte("date", filtros.desde);
    }

    if (filtros.hasta) {
      query = query.lte("date", filtros.hasta);
    }

    if (filtros.depotId) {
      query = query.eq("destination_depot_id", filtros.depotId);
    }

    const { data, count, error } = await query.order("date", {
      ascending: false,
    });

    if (error) {
      console.error("Error al obtener movimientos firma:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerMovimientosFirma:", error);
    throw error;
  }
}

/**
 * Obtiene movimientos de un lote específico
 * @param {string} loteId - ID del lote
 * @returns {Promise<Object>} { data: Movimiento[], count: number }
 */
export async function obtenerMovimientosLote(loteId) {
  try {
    if (!loteId) throw new Error("loteId es requerido");

    const { data, count, error } = await supabase
      .from("input_movements")
      .select("*", { count: "exact" })
      .eq("lot_id", loteId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error al obtener movimientos lote:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerMovimientosLote:", error);
    throw error;
  }
}

/**
 * Obtiene el movimiento más reciente de un insumo
 * @param {string} insumoId - ID del insumo
 * @returns {Promise<Object>} Movimiento más reciente
 */
export async function obtenerUltimoMovimiento(insumoId) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    const { data, error } = await supabase
      .from("input_movements")
      .select("*")
      .eq("input_id", insumoId)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (es normal)
      console.error("Error al obtener último movimiento:", error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Error en obtenerUltimoMovimiento:", error);
    throw error;
  }
}

/**
 * Obtiene movimientos agrupados por tipo
 * @param {string} firmId - ID de la firma
 * @param {string} desde - Fecha desde
 * @param {string} hasta - Fecha hasta
 * @returns {Promise<Object>} Movimientos agrupados
 */
export async function obtenerMovimientosAgrupados(firmId, desde, hasta) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Obtener insumos de la firma primero
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);
    if (insumoIds.length === 0) {
      return {
        agrupados: { entry: [], exit: [], adjustment: [], transfer: [] },
        totales: { entry: 0, exit: 0, adjustment: 0, transfer: 0 },
        fecha_calculo: new Date().toISOString(),
      };
    }

    let query = supabase
      .from("input_movements")
      .select("*")
      .in("input_id", insumoIds);

    if (desde) query = query.gte("date", desde);
    if (hasta) query = query.lte("date", hasta);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error al obtener movimientos agrupados:", error);
      throw error;
    }

    // Agrupar por tipo
    const agrupados = {
      entry: [],
      exit: [],
      adjustment: [],
      transfer: [],
    };

    (data || []).forEach((mov) => {
      if (agrupados[mov.type]) {
        agrupados[mov.type].push(mov);
      }
    });

    // Calcular totales
    const totales = {
      entry: 0,
      exit: 0,
      adjustment: 0,
      transfer: 0,
    };

    Object.keys(agrupados).forEach((tipo) => {
      totales[tipo] = agrupados[tipo].reduce(
        (sum, mov) => sum + mov.quantity,
        0,
      );
    });

    return {
      agrupados,
      totales,
      fecha_calculo: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en obtenerMovimientosAgrupados:", error);
    throw error;
  }
}

/**
 * Obtiene el consumo de insumos en un período
 * @param {string} firmId - ID de la firma
 * @param {string} desde - Fecha desde
 * @param {string} hasta - Fecha hasta
 * @returns {Promise<Object>} Consumo por insumo
 */
export async function obtenerConsumoInsumos(firmId, desde, hasta) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Obtener insumos de la firma primero
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);
    if (insumoIds.length === 0) {
      return {
        porInsumo: {},
        total_cantidad: 0,
        total_valor: 0,
        fecha_calculo: new Date().toISOString(),
      };
    }

    let query = supabase
      .from("input_movements")
      .select(
        `*,
        inputs(id, name, category, unit, cost_per_unit)`,
      )
      .in("input_id", insumoIds)
      .eq("type", "exit");

    if (desde) query = query.gte("date", desde);
    if (hasta) query = query.lte("date", hasta);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error al obtener consumo:", error);
      throw error;
    }

    // Agrupar por insumo
    const porInsumo = {};

    (data || []).forEach((mov) => {
      const insumoId = mov.input_id;
      if (!porInsumo[insumoId]) {
        porInsumo[insumoId] = {
          insumo: mov.inputs,
          cantidad: 0,
          valorTotal: 0,
          movimientos: [],
        };
      }

      porInsumo[insumoId].cantidad += mov.quantity;
      porInsumo[insumoId].valorTotal +=
        mov.quantity * (mov.inputs?.cost_per_unit || 0);
      porInsumo[insumoId].movimientos.push(mov);
    });

    return {
      porInsumo,
      total_cantidad: Object.values(porInsumo).reduce(
        (sum, item) => sum + item.cantidad,
        0,
      ),
      total_valor: Object.values(porInsumo).reduce(
        (sum, item) => sum + item.valorTotal,
        0,
      ),
      fecha_calculo: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en obtenerConsumoInsumos:", error);
    throw error;
  }
}

/**
 * Obtiene ingresos de insumos en un período
 * @param {string} firmId - ID de la firma
 * @param {string} desde - Fecha desde
 * @param {string} hasta - Fecha hasta
 * @returns {Promise<Object>} Ingresos por insumo
 */
export async function obtenerIngresosInsumos(firmId, desde, hasta) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Obtener insumos de la firma primero
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);
    if (insumoIds.length === 0) {
      return {
        porInsumo: {},
        total_cantidad: 0,
        total_valor: 0,
        fecha_calculo: new Date().toISOString(),
      };
    }

    let query = supabase
      .from("input_movements")
      .select(
        `*,
        inputs(id, name, category, unit, cost_per_unit)`,
      )
      .in("input_id", insumoIds)
      .eq("type", "entry");

    if (desde) query = query.gte("date", desde);
    if (hasta) query = query.lte("date", hasta);

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error al obtener ingresos:", error);
      throw error;
    }

    // Agrupar por insumo
    const porInsumo = {};

    (data || []).forEach((mov) => {
      const insumoId = mov.input_id;
      if (!porInsumo[insumoId]) {
        porInsumo[insumoId] = {
          insumo: mov.inputs,
          cantidad: 0,
          valorTotal: 0,
          movimientos: [],
        };
      }

      porInsumo[insumoId].cantidad += mov.quantity;
      porInsumo[insumoId].valorTotal +=
        mov.quantity * (mov.unit_cost || mov.inputs?.cost_per_unit || 0);
      porInsumo[insumoId].movimientos.push(mov);
    });

    return {
      porInsumo,
      total_cantidad: Object.values(porInsumo).reduce(
        (sum, item) => sum + item.cantidad,
        0,
      ),
      total_valor: Object.values(porInsumo).reduce(
        (sum, item) => sum + item.valorTotal,
        0,
      ),
      fecha_calculo: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en obtenerIngresosInsumos:", error);
    throw error;
  }
}

/**
 * Valida si existe disponibilidad de un insumo
 * @param {string} insumoId - ID del insumo
 * @param {number} cantidadSolicitada - Cantidad que se quiere usar
 * @returns {Promise<Object>} { disponible: boolean, actual: number }
 */
export async function validarDisponibilidad(insumoId, cantidadSolicitada) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");
    if (!cantidadSolicitada || cantidadSolicitada <= 0) {
      throw new Error("cantidadSolicitada debe ser > 0");
    }

    const { data, error } = await supabase
      .from("inputs")
      .select("current_stock")
      .eq("id", insumoId)
      .single();

    if (error) {
      console.error("Error al validar disponibilidad:", error);
      throw error;
    }

    const stockActual = data?.current_stock || 0;
    return {
      disponible: stockActual >= cantidadSolicitada,
      actual: stockActual,
      faltante: Math.max(0, cantidadSolicitada - stockActual),
    };
  } catch (error) {
    console.error("Error en validarDisponibilidad:", error);
    throw error;
  }
}

/**
 * Obtiene kardex completo de un insumo (para reportes)
 * @param {string} insumoId - ID del insumo
 * @returns {Promise<Object>} Kardex con saldos progresivos
 */
export async function obtenerKardexInsumo(insumoId) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    // Obtener insumo
    const { data: insumo, error: errIns } = await supabase
      .from("inputs")
      .select("*")
      .eq("id", insumoId)
      .single();

    if (errIns) throw errIns;

    // Obtener movimientos
    const { data: movimientos, error: errMov } = await supabase
      .from("input_movements")
      .select("*")
      .eq("input_id", insumoId)
      .order("date", { ascending: true });

    if (errMov) throw errMov;

    // Calcular saldos progresivos
    let saldoAcumulado = 0;
    const kardex = (movimientos || []).map((mov) => {
      let cantidad = mov.quantity;
      if (mov.type === "exit" || mov.type === "adjustment") {
        cantidad = -mov.quantity;
      }

      saldoAcumulado += cantidad;

      return {
        ...mov,
        cantidad,
        saldo: saldoAcumulado,
        tipo_display:
          {
            entry: "Ingreso",
            exit: "Egreso",
            adjustment: "Ajuste",
            transfer: "Transferencia",
          }[mov.type] || mov.type,
      };
    });

    return {
      insumo,
      kardex,
      saldo_final: saldoAcumulado,
      total_movimientos: kardex.length,
    };
  } catch (error) {
    console.error("Error en obtenerKardexInsumo:", error);
    throw error;
  }
}

/**
 * Obtiene transferencias entre depósitos
 * @param {string} firmId - ID de la firma
 * @param {string} desde - Fecha desde
 * @param {string} hasta - Fecha hasta
 * @returns {Promise<Object>} { data: Transferencias[], count: number }
 */
export async function obtenerTransferenciasDepositos(firmId, desde, hasta) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Obtener insumos de la firma primero
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);
    if (insumoIds.length === 0) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from("input_movements")
      .select(
        `*,
        inputs(id, name, unit)`,
        { count: "exact" },
      )
      .in("input_id", insumoIds)
      .eq("type", "transfer");

    if (desde) query = query.gte("date", desde);
    if (hasta) query = query.lte("date", hasta);

    const { data, count, error } = await query.order("date", {
      ascending: false,
    });

    if (error) {
      console.error("Error al obtener transferencias:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerTransferenciasDepositos:", error);
    throw error;
  }
}

/**
 * Obtiene movimientos pendientes de reconciliación
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Movimiento[], count: number }
 */
export async function obtenerMovimientosPendientes(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Obtener insumos de la firma primero
    const { data: insumosFirma, error: errInsumos } = await supabase
      .from("inputs")
      .select("id")
      .eq("firm_id", firmId);

    if (errInsumos) throw errInsumos;

    const insumoIds = (insumosFirma || []).map((i) => i.id);
    if (insumoIds.length === 0) {
      return { data: [], count: 0 };
    }

    // Movimientos sin referencia de documento
    const { data, count, error } = await supabase
      .from("input_movements")
      .select("*", { count: "exact" })
      .in("input_id", insumoIds)
      .is("document_reference", null)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error al obtener movimientos pendientes:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerMovimientosPendientes:", error);
    throw error;
  }
}
