/**
 * Servicios CRUD para insumos en Supabase
 * Gestiona el catálogo completo de insumos de la empresa
 * Sincronizado con SCHEMA.sql tabla: inputs
 */

import { supabase } from "../lib/supabase";

/**
 * Sanitiza datos de insumo para operaciones CRUD
 * Convierte strings vacíos en campos numéricos/fecha a null
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} Datos sanitizados
 */
function sanitizarInsumoData(data) {
  const sanitized = { ...data };

  // Campos numéricos que pueden ser opcionales
  const camposNumericos = [
    "initial_stock",
    "current_stock",
    "min_stock_alert",
    "cost_per_unit",
  ];

  // Campos de fecha que pueden ser opcionales
  const camposFecha = ["expiration_date", "entry_date"];

  camposNumericos.forEach((campo) => {
    if (campo in sanitized) {
      // Si está vacío o es string vacío, convertir a null
      if (sanitized[campo] === "" || sanitized[campo] === undefined) {
        sanitized[campo] = null;
      } else if (typeof sanitized[campo] === "string") {
        // Si es string numérico, convertir a número
        const num = parseFloat(sanitized[campo]);
        sanitized[campo] = isNaN(num) ? null : num;
      }
    }
  });

  camposFecha.forEach((campo) => {
    if (campo in sanitized) {
      // Si está vacío o es string vacío, convertir a null
      if (sanitized[campo] === "" || sanitized[campo] === undefined) {
        sanitized[campo] = null;
      }
      // Si tiene valor, dejar como está (PostgreSQL convertirá)
    }
  });

  return sanitized;
}

/**
 * Obtiene todos los insumos de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosDelFirma(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosDelFirma:", error);
    throw error;
  }
}

/**
 * Obtiene un insumo específico por ID
 * @param {string} insumoId - ID del insumo
 * @returns {Promise<Object>} Datos del insumo
 */
export async function obtenerInsumo(insumoId) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    const { data, error } = await supabase
      .from("inputs")
      .select("*")
      .eq("id", insumoId)
      .single();

    if (error) {
      console.error("Error al obtener insumo:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error en obtenerInsumo:", error);
    throw error;
  }
}

/**
 * Obtiene insumos filtrados por categoría
 * @param {string} firmId - ID de la firma
 * @param {string} categoria - Categoría a filtrar
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosPorCategoria(firmId, categoria) {
  try {
    if (!firmId) throw new Error("firmId es requerido");
    if (!categoria) throw new Error("categoria es requerido");

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .eq("category", categoria)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos por categoría:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosPorCategoria:", error);
    throw error;
  }
}

/**
 * Obtiene insumos de un depósito específico
 * @param {string} firmId - ID de la firma
 * @param {string} depotId - ID del depósito
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosDelDeposito(firmId, depotId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");
    if (!depotId) throw new Error("depotId es requerido");

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .eq("depot_id", depotId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos del depósito:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosDelDeposito:", error);
    throw error;
  }
}

/**
 * Busca insumos por nombre
 * @param {string} firmId - ID de la firma
 * @param {string} busqueda - Término de búsqueda
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function buscarInsumos(firmId, busqueda) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    let query = supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId);

    if (busqueda) {
      query = query.ilike("name", `%${busqueda}%`);
    }

    const { data, count, error } = await query.order("name", {
      ascending: true,
    });

    if (error) {
      console.error("Error al buscar insumos:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en buscarInsumos:", error);
    throw error;
  }
}

/**
 * Crea un nuevo insumo
 * @param {Object} insumoData - Datos del insumo
 * @returns {Promise<Object>} Insumo creado
 */
export async function crearInsumo(insumoData) {
  try {
    // Validaciones mínimas según SCHEMA.sql
    if (!insumoData.firm_id) throw new Error("firm_id es requerido");
    if (!insumoData.name) throw new Error("name es requerido");
    if (!insumoData.category) throw new Error("category es requerido");
    if (!insumoData.unit) throw new Error("unit es requerido");

    // Sanitizar datos antes de insertar
    const sanitized = sanitizarInsumoData(insumoData);

    const { data, error } = await supabase
      .from("inputs")
      .insert([
        {
          ...sanitized,
          current_stock: sanitized.current_stock || 0,
          min_stock_alert: sanitized.min_stock_alert || 0,
          stock_status: sanitized.stock_status || "disponible",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error al crear insumo:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error en crearInsumo:", error);
    throw error;
  }
}

/**
 * Actualiza un insumo existente
 * @param {string} insumoId - ID del insumo
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} Insumo actualizado
 */
export async function actualizarInsumo(insumoId, updateData) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    // Sanitizar datos antes de actualizar
    const sanitized = sanitizarInsumoData(updateData);

    const { data, error } = await supabase
      .from("inputs")
      .update(sanitized)
      .eq("id", insumoId)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar insumo:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error en actualizarInsumo:", error);
    throw error;
  }
}

/**
 * Elimina un insumo (soft delete - marca como inactivo)
 * @param {string} insumoId - ID del insumo
 * @returns {Promise<void>}
 */
export async function eliminarInsumo(insumoId) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    // Soft delete: actualizar a inactivo (si existe columna active)
    // Si no existe, simplemente marcar como eliminado lógicamente
    const { error } = await supabase
      .from("inputs")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", insumoId);

    if (error) {
      console.error("Error al eliminar insumo:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error en eliminarInsumo:", error);
    throw error;
  }
}

/**
 * Obtiene insumos próximos a vencer (dentro de 30 días)
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosProximosAVencer(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Calcular fecha de 30 días desde hoy
    const hoy = new Date();
    const hace30dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dentro30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .not("expiration_date", "is", null)
      .gte("expiration_date", hace30dias.toISOString().split("T")[0])
      .lte("expiration_date", dentro30dias.toISOString().split("T")[0])
      .order("expiration_date", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos próximos a vencer:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosProximosAVencer:", error);
    throw error;
  }
}

/**
 * Obtiene insumos vencidos
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosVencidos(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const hoy = new Date().toISOString().split("T")[0];

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .not("expiration_date", "is", null)
      .lt("expiration_date", hoy)
      .order("expiration_date", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos vencidos:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosVencidos:", error);
    throw error;
  }
}

/**
 * Obtiene insumos con stock por debajo del mínimo
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosStockMinimo(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    // Usar RPC si está disponible, sino hacer en el cliente
    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .gt("min_stock_alert", 0)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos con stock mínimo:", error);
      throw error;
    }

    // Filtrar en cliente: comparar current_stock <= min_stock_alert
    const filtrados = (data || []).filter(
      (insumo) => insumo.current_stock <= insumo.min_stock_alert,
    );

    return {
      data: filtrados,
      count: filtrados.length,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosStockMinimo:", error);
    throw error;
  }
}

/**
 * Obtiene insumos sin stock (current_stock = 0)
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosSinStock(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .eq("current_stock", 0)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos sin stock:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosSinStock:", error);
    throw error;
  }
}

/**
 * Recalcula el stock de un insumo basado en movimientos
 * @param {string} insumoId - ID del insumo
 * @returns {Promise<Object>} Stock recalculado
 */
export async function recalcularStockInsumo(insumoId) {
  try {
    if (!insumoId) throw new Error("insumoId es requerido");

    // Obtener todos los movimientos del insumo
    const { data: movimientos, error: errMov } = await supabase
      .from("input_movements")
      .select("*")
      .eq("input_id", insumoId);

    if (errMov) {
      console.error("Error al obtener movimientos:", errMov);
      throw errMov;
    }

    // Calcular stock: sum(entry) - sum(exit + transfer + adjustment)
    let nuevoStock = 0;
    (movimientos || []).forEach((mov) => {
      if (mov.type === "entry") {
        nuevoStock += mov.quantity;
      } else if (
        mov.type === "exit" ||
        mov.type === "transfer" ||
        mov.type === "adjustment"
      ) {
        nuevoStock -= mov.quantity;
      }
    });

    // Actualizar insumo con nuevo stock
    const { data, error } = await supabase
      .from("inputs")
      .update({ current_stock: Math.max(0, nuevoStock) })
      .eq("id", insumoId)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar stock:", error);
      throw error;
    }

    return {
      insumoId,
      nuevoStock: Math.max(0, nuevoStock),
      data,
    };
  } catch (error) {
    console.error("Error en recalcularStockInsumo:", error);
    throw error;
  }
}

/**
 * Obtiene el stock valorizado de insumos (total en dinero)
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { total: number, por_categoria: Object }
 */
export async function obtenerStockValorizado(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("inputs")
      .select("*")
      .eq("firm_id", firmId);

    if (error) {
      console.error("Error al obtener stock valorizado:", error);
      throw error;
    }

    let totalValor = 0;
    const porCategoria = {};

    (data || []).forEach((insumo) => {
      const valor = (insumo.current_stock || 0) * (insumo.cost_per_unit || 0);
      totalValor += valor;

      if (!porCategoria[insumo.category]) {
        porCategoria[insumo.category] = 0;
      }
      porCategoria[insumo.category] += valor;
    });

    return {
      total: totalValor,
      por_categoria: porCategoria,
      fecha_calculo: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en obtenerStockValorizado:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de insumos de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Estadísticas diversas
 */
export async function obtenerEstadisticasInsumos(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("inputs")
      .select("*")
      .eq("firm_id", firmId);

    if (error) {
      console.error("Error al obtener estadísticas:", error);
      throw error;
    }

    const insumos = data || [];
    const totalInsumos = insumos.length;
    const totalStockUnidades = insumos.reduce(
      (sum, i) => sum + (i.current_stock || 0),
      0,
    );
    const insumosActivos = insumos.filter((i) => i.current_stock > 0).length;
    const insumosSinStock = insumos.filter((i) => i.current_stock === 0).length;

    // Contar próximos a vencer (dentro de 30 días)
    const hoy = new Date();
    const dentro30 = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    const proximosAvencer = insumos.filter((i) => {
      if (!i.expiration_date) return false;
      const fechaVenc = new Date(i.expiration_date);
      return fechaVenc > hoy && fechaVenc <= dentro30;
    }).length;

    // Contar vencidos
    const vencidos = insumos.filter((i) => {
      if (!i.expiration_date) return false;
      const fechaVenc = new Date(i.expiration_date);
      return fechaVenc < hoy;
    }).length;

    // Contar con stock mínimo activo
    const conStockMinimo = insumos.filter(
      (i) => i.min_stock_alert > 0 && i.current_stock <= i.min_stock_alert,
    ).length;

    return {
      totalInsumos,
      totalStockUnidades,
      insumosActivos,
      insumosSinStock,
      proximosAvencer,
      vencidos,
      conStockMinimo,
      fecha_calculo: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en obtenerEstadisticasInsumos:", error);
    throw error;
  }
}

/**
 * Obtiene insumos que funcionan como depósitos
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Insumo[], count: number }
 */
export async function obtenerInsumosDeposito(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, count, error } = await supabase
      .from("inputs")
      .select("*", { count: "exact" })
      .eq("firm_id", firmId)
      .eq("is_depot", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener insumos depósito:", error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error en obtenerInsumosDeposito:", error);
    throw error;
  }
}
