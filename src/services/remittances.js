/**
 * Servicios CRUD para Remitos en Supabase
    const receivedAt = remittanceWithItems.received_date || new Date().toISOString().split("T")[0];
    const data = await actualizarRemitoSinTrigger({
      remittanceId,
      status: finalStatus,
      receivedBy,
      receivedDate: receivedAt,
    });

    const originalById = new Map(
      (originalItems || []).map((item) => [item.id, item]),
    );

    for (const item of items || []) {
      const original = originalById.get(item.id);
      const inputId = item.input_id || original?.input_id;
      const prevQty = original?.quantity_received || 0;
      const nextQty = item.quantity_received || 0;
      const delta = nextQty - prevQty;

      if (!inputId || delta <= 0) continue;

      await registrarMovimiento({
        input_id: inputId,
        type: "entry",
        quantity: delta,
        date: receivedAt,
        description: `Ingreso por remito ${remittanceWithItems.remittance_number}`,
        firm_id: remittanceWithItems.firm_id,
        premise_id: remittanceWithItems.premise_id,
        lot_id: remittanceWithItems.depot_id,
        document_reference: remittanceWithItems.remittance_number,
        remittance_id: remittanceId,
        purchase_order_id: remittanceWithItems.purchase_order_id,
        invoice_id: remittanceWithItems.invoice_id,
        batch_number: item.batch_number || original?.batch_number || null,
      });
    }
  }
}

/**
 * Obtener remitos por firma
 * @param {string} firmId - ID de la firma
 * @returns {Object} { data: remittances }
 */
export async function obtenerRemitosPorFirma(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("*")
      .eq("firm_id", firmId)
      .order("remittance_date", { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en obtenerRemitosPorFirma:", error);
    throw error;
  }
}

/**
 * Obtener remito por ID con todos sus ítems
 * @param {string} remittanceId - ID del remito
 * @returns {Object} { data: { remittance, items } }
 */
export async function obtenerRemitoPorId(remittanceId) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    // Obtener remito
    const { data: remittance, error: remittanceError } = await supabase
      .from("remittances")
      .select(
        `
        *,
        premise:premises(id, name),
        depot:lots(id, name),
        purchase_order:purchase_orders(id, order_number),
        invoice:expenses!remittances_invoice_id_fkey(id, invoice_number, invoice_series)
      `,
      )
      .eq("id", remittanceId)
      .single();

    if (remittanceError) throw remittanceError;

    // Obtener ítems
    const { data: items, error: itemsError } = await supabase
      .from("remittance_items")
      .select(
        `
        *,
        input:inputs(id, name, unit),
        purchase_order_item:purchase_order_items(*)
      `,
      )
      .eq("remittance_id", remittanceId);

    if (itemsError) throw itemsError;

    return {
      data: {
        ...remittance,
        items: items || [],
      },
    };
  } catch (error) {
    console.error("Error en obtenerRemitoPorId:", error);
    throw error;
  }
}

/**
 * Buscar remitos con filtros avanzados
 * @param {string} firmId - ID de la firma
 * @param {Object} filtros - Filtros opcionales (status, premiseId, depotId, supplierName, dateFrom, dateTo)
 * @returns {Object} { data: remittances }
 */
export async function buscarRemitos(firmId, filtros = {}) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    let query = supabase.from("remittances").select("*").eq("firm_id", firmId);

    // Filtros opcionales
    if (filtros.status) {
      query = query.eq("status", filtros.status);
    }

    if (filtros.premiseId) {
      query = query.eq("premise_id", filtros.premiseId);
    }

    if (filtros.depotId) {
      query = query.eq("depot_id", filtros.depotId);
    }

    if (filtros.supplierName) {
      query = query.ilike("supplier_name", `%${filtros.supplierName}%`);
    }

    if (filtros.dateFrom) {
      query = query.gte("remittance_date", filtros.dateFrom);
    }

    if (filtros.dateTo) {
      query = query.lte("remittance_date", filtros.dateTo);
    }

    query = query.order("remittance_date", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en buscarRemitos:", error);
    throw error;
  }
}

/**
 * Obtener remitos por estado
 * @param {string} firmId - ID de la firma
 * @param {string} status - Estado (in_transit, received, partially_received, cancelled)
 * @returns {Object} { data: remittances }
 */
export async function obtenerRemitosPorEstado(firmId, status) {
  try {
    if (!firmId) throw new Error("firmId es requerido");
    if (!status) throw new Error("status es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("*")
      .eq("firm_id", firmId)
      .eq("status", status)
      .order("remittance_date", { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en obtenerRemitosPorEstado:", error);
    throw error;
  }
}

// ===========================
// FUNCIONES DE ESCRITURA
// ===========================

/**
 * Crear nuevo remito con ítems
 * @param {Object} remittanceData - Datos del remito
 * @param {Array} items - Array de ítems del remito
 * @returns {Object} Remito creado
 */
export async function crearRemito(remittanceData, items) {
  try {
    // Validaciones
    if (!remittanceData.firm_id) throw new Error("firm_id es requerido");
    if (!remittanceData.remittance_number)
      throw new Error("remittance_number es requerido");
    if (!remittanceData.supplier_name)
      throw new Error("supplier_name es requerido");
    if (!items || items.length === 0)
      throw new Error("Debe haber al menos un ítem");

    console.log(
      "🔍 [crearRemito] Items recibidos:",
      JSON.stringify(items, null, 2),
    );
    console.log("🔍 [crearRemito] Cantidad de items:", items.length);

    // 1. Crear remito
    console.log(
      "📝 [crearRemito] Insertando remittance:",
      remittanceData.remittance_number,
    );

    // Sanitizar datos: convertir strings vacíos a null para campos UUID
    // También eliminar campos que no existen en la tabla remittances
    const sanitizedData = {
      ...remittanceData,
      depot_id: remittanceData.depot_id?.trim()
        ? remittanceData.depot_id
        : null,
      purchase_order_id: remittanceData.purchase_order_id?.trim()
        ? remittanceData.purchase_order_id
        : null,
      invoice_id: remittanceData.invoice_id?.trim()
        ? remittanceData.invoice_id
        : null,
    };

    // Eliminar campos que no existen en la tabla remittances y que pueden causar problemas con triggers
    delete sanitizedData.user_id;
    delete sanitizedData.created_by;
    delete sanitizedData.created_by_user;

    console.log(
      "✅ [crearRemito] Datos sanitizados:",
      JSON.stringify(sanitizedData, null, 2),
    );

    // Intentar crear el remito
    // NOTA: Si hay un trigger que intenta usar user_id en audit, fallará
    // El trigger necesita ser corregido en la base de datos para usar 'usuario' en lugar de 'user_id'
    let newRemittance;
    let remittanceError;

    try {
      const result = await supabase
        .from("remittances")
        .insert([
          {
            ...sanitizedData,
            status: sanitizedData.status || "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      newRemittance = result.data;
      remittanceError = result.error;
    } catch (err) {
      remittanceError = err;
    }

    // Si el error es sobre user_id en audit, es un problema del trigger en la BD
    if (
      remittanceError &&
      remittanceError.message &&
      remittanceError.message.includes("user_id") &&
      remittanceError.message.includes("audit")
    ) {
      const errorMsg = `
        Error en trigger de base de datos: El trigger que se ejecuta al crear un remito está intentando usar 
        la columna 'user_id' en la tabla 'audit', pero esa columna no existe. 
        
        SOLUCIÓN: Corrige el trigger en Supabase para usar 'usuario' en lugar de 'user_id'.
        
        Pasos:
        1. Ve a Supabase Dashboard → Database → Functions/Triggers
        2. Busca el trigger relacionado con remittances (probablemente 'handle_remittance_created')
        3. Cambia 'user_id' por 'usuario' en el INSERT a la tabla audit
        
        Error original: ${remittanceError.message}
      `;
      console.error("❌ [crearRemito] Error en trigger de BD:", errorMsg);
      throw new Error(
        'Error en trigger de base de datos. El trigger necesita usar "usuario" en lugar de "user_id" en la tabla audit. Contacta al administrador de la base de datos.',
      );
    }

    if (remittanceError) throw remittanceError;

    console.log("✅ [crearRemito] Remittance creado con ID:", newRemittance.id);

    // 2. Crear ítems
    const itemsData = items.map((item) => ({
      remittance_id: newRemittance.id,
      item_description: item.item_description,
      quantity_ordered: item.quantity_ordered || 0,
      quantity_received: item.quantity_received || 0,
      category: item.category || null,
      unit: item.unit,
      input_id: item.input_id || null,
      purchase_order_item_id: item.purchase_order_item_id || null,
      condition: item.condition || "good",
      notes: item.notes || null,
      created_at: new Date().toISOString(),
    }));

    console.log(
      "📋 [crearRemito] Items mapeados para insertar:",
      JSON.stringify(itemsData, null, 2),
    );

    const { error: itemsError, data: insertedItems } = await supabase
      .from("remittance_items")
      .insert(itemsData)
      .select();

    if (itemsError) {
      console.error("❌ [crearRemito] Error insertando items:", itemsError);
      throw itemsError;
    }

    console.log(
      "✅ [crearRemito] Items insertados:",
      insertedItems?.length || 0,
      "items",
    );
    console.log(
      "✅ [crearRemito] Datos insertados:",
      JSON.stringify(insertedItems, null, 2),
    );

    // Retornar remito CON items incluidos para que aparezcan en el estado
    return { ...newRemittance, items: insertedItems || [] };
  } catch (error) {
    console.error("❌ Error en crearRemito:", error);
    throw error;
  }
}

/**
 * Actualizar remito
 * @param {string} remittanceId - ID del remito
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Remito actualizado
 */
export async function actualizarRemito(remittanceId, updates) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", remittanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en actualizarRemito:", error);
    throw error;
  }
}

/**
 * Recibir remito (cambiar a estado 'received')
 * IMPORTANTE: Dispara trigger automático que crea input_movements y actualiza stock
 *
 * @param {string} remittanceId - ID del remito
 * @param {string} receivedBy - Usuario que recibe la mercadería
 * @param {string} receivedDate - Fecha de recepción (opcional, usa hoy por defecto)
 * @returns {Object} Remito actualizado
 */
export async function recibirRemito(
  remittanceId,
  receivedBy,
  receivedDate = null,
) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");
    if (!receivedBy) throw new Error("receivedBy es requerido");

    const receivedAt = receivedDate || new Date().toISOString().split("T")[0];
    const updated = await actualizarRemitoSinTrigger({
      remittanceId,
      status: "received",
      receivedBy,
      receivedDate: receivedAt,
    });

    const { data: remittance, error: remittanceError } = await supabase
      .from("remittances")
      .select(
        "id, remittance_number, firm_id, premise_id, depot_id, purchase_order_id, invoice_id",
      )
      .eq("id", remittanceId)
      .single();

    if (remittanceError) throw remittanceError;

    const { data: items, error: itemsError } = await supabase
      .from("remittance_items")
      .select("id, input_id, quantity_received, batch_number")
      .eq("remittance_id", remittanceId);

    if (itemsError) throw itemsError;

    for (const item of items || []) {
      if (
        !item.input_id ||
        !item.quantity_received ||
        item.quantity_received <= 0
      )
        continue;

      await registrarMovimiento({
        input_id: item.input_id,
        type: "entry",
        quantity: item.quantity_received,
        date: receivedAt,
        description: `Ingreso por remito ${remittance.remittance_number}`,
        firm_id: remittance.firm_id,
        premise_id: remittance.premise_id,
        lot_id: remittance.depot_id,
        document_reference: remittance.remittance_number,
        remittance_id: remittance.id,
        purchase_order_id: remittance.purchase_order_id,
        invoice_id: remittance.invoice_id,
        batch_number: item.batch_number || null,
      });
    }

    return updated;
  } catch (error) {
    console.error("Error en recibirRemito:", error);
    throw error;
  }
}

export async function cancelarRemito(remittanceId, reason = null) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .update({
        status: "cancelled",
        notes: reason ? `CANCELADO: ${reason}` : "CANCELADO",
        updated_at: new Date().toISOString(),
      })
      .eq("id", remittanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en cancelarRemito:", error);
    throw error;
  }
}

/**
 * Marcar remito como parcialmente o completamente recibido
 * @param {string} remittanceId - ID del remito
 * @param {string} receivedBy - Usuario
 * @param {Array} items - Ítems con cantidades parciales
 * @returns {Object} Remito actualizado
 */
export async function recibirRemitoParciamente(
  remittanceId,
  receivedBy,
  items,
) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    // 1. PRIMERO: Obtener items ORIGINALES ANTES de cualquier cambio
    console.log("🔍 [recibirRemitoParciamente] Obteniendo items originales");
    const { data: originalItems, error: originalItemsError } = await supabase
      .from("remittance_items")
      .select(
        "id, item_description, quantity_received, unit, input_id, category, batch_number, batch_expiry_date, purchase_order_item_id",
      )
      .eq("remittance_id", remittanceId);

    if (originalItemsError) throw originalItemsError;

    const originalItemsWithoutInput = (originalItems || []).filter(
      (item) => !item.input_id,
    );

    console.log(
      "📋 [recibirRemitoParciamente] Items originales sin insumo:",
      originalItemsWithoutInput?.map((i) => ({
        id: i.id,
        description: i.item_description,
        quantity_received: i.quantity_received,
      })),
    );

    // 2. Actualizar cantidades recibidas en ítems (incluyendo batch y vencimiento)
    for (const item of items) {
      console.log("🔄 [recibirRemitoParciamente] Actualizando item:", {
        itemId: item.id,
        quantity_received: item.quantity_received,
        condition: item.condition,
        batch_number: item.batch_number,
        batch_expiry_date: item.batch_expiry_date,
      });
      await actualizarItemRemito(item.id, {
        quantity_received: item.quantity_received,
        condition: item.condition || "good",
        batch_number: item.batch_number || null,
        batch_expiry_date: item.batch_expiry_date || null,
      });
    }

    // Obtener remito con todos sus ítems para calcular porcentaje
    const { data: remittanceWithItems, error: fetchError } = await supabase
      .from("remittances")
      .select(
        `
        id,
        remittance_number,
        firm_id,
        premise_id,
        depot_id,
        purchase_order_id,
        invoice_id,
        received_date,
        items:remittance_items(
          id,
          quantity_ordered,
          quantity_received
        )
      `,
      )
      .eq("id", remittanceId)
      .single();

    if (fetchError) throw fetchError;

    // Calcular totales
    let totalOrdered = 0;
    let totalReceived = 0;

    if (remittanceWithItems.items && remittanceWithItems.items.length > 0) {
      totalOrdered = remittanceWithItems.items.reduce(
        (sum, item) => sum + (item.quantity_ordered || 0),
        0,
      );
      totalReceived = remittanceWithItems.items.reduce(
        (sum, item) => sum + (item.quantity_received || 0),
        0,
      );
    }

    // Determinar estado: si recibió 100%, marcar como 'received' para que trigger se ejecute
    const isComplete = totalOrdered > 0 && totalReceived >= totalOrdered;
    const finalStatus = isComplete ? "received" : "partially_received";

    const receivedAt =
      remittanceWithItems.received_date ||
      new Date().toISOString().split("T")[0];
    const data = await actualizarRemitoSinTrigger({
      remittanceId,
      status: finalStatus,
      receivedBy,
      receivedDate: receivedAt,
    });

    const originalById = new Map(
      (originalItems || []).map((item) => [item.id, item]),
    );

    for (const item of items || []) {
      const original = originalById.get(item.id);
      const inputId = item.input_id || original?.input_id;
      const prevQty = original?.quantity_received || 0;
      const nextQty = item.quantity_received || 0;
      const delta = nextQty - prevQty;

      if (!inputId || delta <= 0) continue;

      await registrarMovimiento({
        input_id: inputId,
        type: "entry",
        quantity: delta,
        date: receivedAt,
        description: `Ingreso por remito ${remittanceWithItems.remittance_number}`,
        firm_id: remittanceWithItems.firm_id,
        premise_id: remittanceWithItems.premise_id,
        lot_id: remittanceWithItems.depot_id,
        document_reference: remittanceWithItems.remittance_number,
        remittance_id: remittanceId,
        purchase_order_id: remittanceWithItems.purchase_order_id,
        invoice_id: remittanceWithItems.invoice_id,
        batch_number: item.batch_number || original?.batch_number || null,
      });
    }

    // 3. Filtrar SOLO items que fueron originalmente sin insumo Y fueron recibidos con cantidad > 0
    // IMPORTANTE: Usar el array 'items' pasado como parámetro que contiene las cantidades ACTUALIZADAS
    // Mapear items recibidos con cantidad > 0, incluyendo CANTIDAD ACTUALIZADA
    const itemsRecibidosMap = new Map(
      items
        .filter((item) => item.quantity_received > 0)
        .map((item) => [item.id, item]),
    );

    // Filtrar items originales sin insumo que fueron realmente recibidos
    // ACTUALIZADO: Incluir cantidad_received correcta del array 'items'
    const itemsNeedingCreation = (originalItemsWithoutInput || [])
      .filter((item) => itemsRecibidosMap.has(item.id))
      .map((item) => ({
        ...item,
        // ACTUALIZAR quantity_received con el valor CORRECTO del array 'items'
        quantity_received: itemsRecibidosMap.get(item.id).quantity_received,
        batch_number:
          itemsRecibidosMap.get(item.id).batch_number ||
          item.batch_number ||
          null,
        batch_expiry_date:
          itemsRecibidosMap.get(item.id).batch_expiry_date ||
          item.batch_expiry_date ||
          null,
        category:
          itemsRecibidosMap.get(item.id).category || item.category || null,
      }));

    console.log(
      "✅ [recibirRemitoParciamente] Items que necesitan crear insumo:",
      itemsNeedingCreation.map((i) => ({
        id: i.id,
        description: i.item_description,
        quantity: i.quantity_received,
        unit: i.unit,
      })),
    );

    return {
      ...data,
      itemsNeedingInputCreation: itemsNeedingCreation,
    };
  } catch (error) {
    console.error("Error en recibirRemitoParciamente:", error);
    throw error;
  }
}

// ===========================
// FUNCIONES DE ÍTEMS
// ===========================

/**
 * Actualizar ítem del remito (cantidades, condición, etc)
 * @param {string} itemId - ID del ítem
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Ítem actualizado
 */
export async function actualizarItemRemito(itemId, updates) {
  try {
    if (!itemId) throw new Error("itemId es requerido");

    const { data, error } = await supabase
      .from("remittance_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en actualizarItemRemito:", error);
    throw error;
  }
}

/**
 * Vincular un insumo creado a un ítem del remito
 * @param {string} itemId - ID del remittance_item
 * @param {string} inputId - ID del insumo creado
 * @returns {Object} Ítem actualizado
 */
export async function vincularInputAlItem(itemId, inputId) {
  const updated = await actualizarItemRemito(itemId, { input_id: inputId });

  // Verificar si el remito necesita cambiar a 'received' después de vincular
  // Obtener el remito y sus items
  const { data: item } = await supabase
    .from("remittance_items")
    .select("remittance_id")
    .eq("id", itemId)
    .single();

  if (item?.remittance_id) {
    const { data: remittance } = await supabase
      .from("remittances")
      .select(
        `
        id,
        status,
        items:remittance_items(
          id,
          quantity_ordered,
          quantity_received,
          input_id
        )
      `,
      )
      .eq("id", item.remittance_id)
      .single();

    if (remittance && remittance.status === "partially_received") {
      // Verificar si todos los items tienen input_id y están recibidos
      const allItemsHaveInput = remittance.items.every(
        (i) => i.input_id !== null,
      );
      const allItemsReceived = remittance.items.every(
        (i) => i.quantity_received >= (i.quantity_ordered || 0),
      );

      if (allItemsHaveInput && allItemsReceived) {
        await actualizarRemitoSinTrigger({
          remittanceId: item.remittance_id,
          status: "received",
          receivedBy: "sistema",
          receivedDate: new Date().toISOString().split("T")[0],
        });
      }
    }
  }

  return updated;
}

/**
 * Actualizar múltiples ítems (cantidades recibidas)
 * @param {Array} itemsUpdates - Array con { id, quantity_received, condition, notes }
 * @returns {boolean} true si todos se actualizaron
 */
export async function actualizarItemsRecibidos(itemsUpdates) {
  try {
    if (!itemsUpdates || itemsUpdates.length === 0) {
      throw new Error("itemsUpdates es requerido");
    }

    const promises = itemsUpdates.map((item) =>
      supabase
        .from("remittance_items")
        .update({
          quantity_received: item.quantity_received,
          condition: item.condition || "good",
          notes: item.notes || null,
        })
        .eq("id", item.id),
    );

    const results = await Promise.all(promises);

    // Verificar errores
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      throw new Error(`Error actualizando ${errors.length} ítems`);
    }

    return true;
  } catch (error) {
    console.error("Error en actualizarItemsRecibidos:", error);
    throw error;
  }
}

/**
 * Vincular ítem de remito a insumo existente
 * @param {string} remittanceItemId - ID del ítem del remito
 * @param {string} inputId - ID del insumo
 * @returns {Object} Ítem actualizado
 */
export async function vincularItemAInsumo(remittanceItemId, inputId) {
  try {
    if (!remittanceItemId) throw new Error("remittanceItemId es requerido");
    if (!inputId) throw new Error("inputId es requerido");

    const { data, error } = await supabase
      .from("remittance_items")
      .update({ input_id: inputId })
      .eq("id", remittanceItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en vincularItemAInsumo:", error);
    throw error;
  }
}

/**
 * Desvincular ítem de remito de insumo
 * @param {string} remittanceItemId - ID del ítem del remito
 * @returns {Object} Ítem actualizado
 */
export async function desvinculatItemDelInsumo(remittanceItemId) {
  try {
    if (!remittanceItemId) throw new Error("remittanceItemId es requerido");

    const { data, error } = await supabase
      .from("remittance_items")
      .update({ input_id: null })
      .eq("id", remittanceItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en desvinculatItemDelInsumo:", error);
    throw error;
  }
}

// ===========================
// REPORTES Y ESTADÍSTICAS
// ===========================

/**
 * Obtener estadísticas generales de remitos
 * @param {string} firmId - ID de la firma
 * @returns {Object} { total, in_transit, received, partially_received, cancelled }
 */
export async function obtenerEstadisticasRemitos(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("status")
      .eq("firm_id", firmId);

    if (error) throw error;

    const stats = {
      total: data.length,
      in_transit: data.filter((r) =>
        ["in_transit", "pending", "sent"].includes(r.status),
      ).length,
      received: data.filter((r) => r.status === "received").length,
      partially_received: data.filter((r) => r.status === "partially_received")
        .length,
      cancelled: data.filter((r) => r.status === "cancelled").length,
    };

    return stats;
  } catch (error) {
    console.error("Error en obtenerEstadisticasRemitos:", error);
    throw error;
  }
}

/**
 * Obtener remitos por proveedor (para análisis)
 * @param {string} firmId - ID de la firma
 * @returns {Object} { supplierName: remittanceCount, ... }
 */
export async function obtenerRemitosPorProveedor(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("supplier_name, status")
      .eq("firm_id", firmId)
      .eq("status", "received");

    if (error) throw error;

    // Agrupar por proveedor
    const bySupplier = {};
    data.forEach((r) => {
      if (!bySupplier[r.supplier_name]) {
        bySupplier[r.supplier_name] = 0;
      }
      bySupplier[r.supplier_name]++;
    });

    return bySupplier;
  } catch (error) {
    console.error("Error en obtenerRemitosPorProveedor:", error);
    throw error;
  }
}

/**
 * Obtener remitos por depósito (para análisis)
 * @param {string} firmId - ID de la firma
 * @returns {Array} [{ depot_id, depot_name, count }, ...]
 */
export async function obtenerRemitosPorDeposito(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select(
        `
        depot_id,
        depot:lots(id, name),
        status
      `,
      )
      .eq("firm_id", firmId)
      .eq("status", "received");

    if (error) throw error;

    // Agrupar por depósito
    const byDepot = {};
    data.forEach((r) => {
      const depotName = r.depot?.name || "Sin depósito";
      if (!byDepot[depotName]) {
        byDepot[depotName] = 0;
      }
      byDepot[depotName]++;
    });

    return byDepot;
  } catch (error) {
    console.error("Error en obtenerRemitosPorDeposito:", error);
    throw error;
  }
}

/**
 * Obtener remitos en rango de fechas (para reportes)
 * @param {string} firmId - ID de la firma
 * @param {string} dateFrom - Fecha inicial (YYYY-MM-DD)
 * @param {string} dateTo - Fecha final (YYYY-MM-DD)
 * @returns {Array} Remitos en el rango
 */
export async function obtenerRemitosPorRangoFechas(firmId, dateFrom, dateTo) {
  try {
    if (!firmId) throw new Error("firmId es requerido");
    if (!dateFrom) throw new Error("dateFrom es requerido");
    if (!dateTo) throw new Error("dateTo es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("*")
      .eq("firm_id", firmId)
      .gte("remittance_date", dateFrom)
      .lte("remittance_date", dateTo)
      .order("remittance_date", { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en obtenerRemitosPorRangoFechas:", error);
    throw error;
  }
}

/**
 * Obtener ítems sin vincular a insumo (requieren creación de nuevo insumo)
 * @param {string} firmId - ID de la firma
 * @returns {Array} Ítems sin vincular
 */
export async function obtenerItemsSinVincular(firmId) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittance_items")
      .select(
        `
        *,
        remittance:remittances(id, remittance_number, supplier_name)
      `,
      )
      .eq("remittance.firm_id", firmId)
      .is("input_id", null);

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en obtenerItemsSinVincular:", error);
    throw error;
  }
}

// ===========================
// FUNCIONES AUXILIARES
// ===========================

/**
 * Validar si existe duplicado (mismo remito, fecha, proveedor)
 * @param {string} firmId - ID de la firma
 * @param {string} remittanceNumber - Número de remito
 * @param {string} remittanceDate - Fecha del remito
 * @param {string} supplierRut - RUT del proveedor
 * @returns {Object} { isDuplicate: boolean, duplicateId?: string }
 */
export async function validarDuplicado(
  firmId,
  remittanceNumber,
  remittanceDate,
  supplierRut,
) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const { data, error } = await supabase
      .from("remittances")
      .select("id")
      .eq("firm_id", firmId)
      .eq("remittance_number", remittanceNumber)
      .eq("remittance_date", remittanceDate)
      .eq("supplier_rut", supplierRut)
      .neq("status", "cancelled")
      .limit(1);

    if (error) throw error;

    return {
      isDuplicate: data.length > 0,
      duplicateId: data.length > 0 ? data[0].id : null,
    };
  } catch (error) {
    console.error("Error en validarDuplicado:", error);
    throw error;
  }
}

// ===========================
// FUNCIONES DE SEGURIDAD
// ===========================

/**
 * Verifica si un remito es inmutable (no puede modificarse)
 * Los remitos en estado 'received' o 'partially_received' son inmutables
 * Solo se permite cambio a 'cancelled' con motivo obligatorio
 *
 * @param {Object} remito - Objeto remito con campo status
 * @returns {boolean} true si es inmutable
 */
export function esRemitoInmutable(remito) {
  if (!remito || !remito.status) return false;
  return ["received", "partially_received"].includes(remito.status);
}

/**
 * Actualizar remito CON validación de inmutabilidad
 * Si el remito está recibido, solo permite cambio a 'cancelled' con motivo
 *
 * @param {string} remittanceId - ID del remito
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Remito actualizado
 * @throws {Error} Si intenta modificar remito recibido sin justificación
 */
export async function actualizarRemitoSeguro(remittanceId, updates) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    // PASO 1: Obtener remito actual
    const { data: remitoActual, error: fetchError } = await supabase
      .from("remittances")
      .select("*")
      .eq("id", remittanceId)
      .single();

    if (fetchError)
      throw new Error(`Error al obtener remito: ${fetchError.message}`);

    // PASO 2: Validar inmutabilidad
    if (esRemitoInmutable(remitoActual)) {
      // Solo permitir cambio a 'cancelled' con motivo
      if (updates.status === "cancelled" && updates.cancellation_reason) {
        // Permitir cancelación
        console.log("✅ Cancelación permitida para remito:", remitoActual.id);
      } else {
        throw new Error(
          `No se puede modificar un remito con estado "${remitoActual.status}". ` +
            "Los remitos recibidos son inmutables. Solo se permite cancelación con motivo obligatorio.",
        );
      }
    }

    // PASO 3: Ejecutar update con triggers de auditoría automáticos
    const { data, error } = await supabase
      .from("remittances")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", remittanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en actualizarRemitoSeguro:", error);
    throw error;
  }
}

/**
 * Eliminar remito CON validación de inmutabilidad
 * No permite eliminar remitos que ya fueron recibidos
 *
 * @param {string} remittanceId - UUID del remito
 * @returns {Promise<void>}
 * @throws {Error} Si intenta eliminar remito recibido
 */
export async function eliminarRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    // PASO 1: Obtener remito
    const { data: remito, error: fetchError } = await supabase
      .from("remittances")
      .select("*")
      .eq("id", remittanceId)
      .single();

    if (fetchError)
      throw new Error(`Error al obtener remito: ${fetchError.message}`);

    // PASO 2: Validar que no esté recibido
    if (esRemitoInmutable(remito)) {
      throw new Error(
        `No se puede eliminar un remito con estado "${remito.status}". ` +
          "Los remitos recibidos son inmutables. Para cancelar, use la función cancelarRemito().",
      );
    }

    // PASO 3: Eliminar (BEFORE trigger verificará estado nuevamente)
    const { error } = await supabase
      .from("remittances")
      .delete()
      .eq("id", remittanceId);

    if (error) throw error;
    console.log("✅ Remito eliminado:", remittanceId);
  } catch (error) {
    console.error("Error en eliminarRemito:", error);
    throw error;
  }
}

/**
 * Obtener el historial completo de auditoría de un remito
 * Incluye: creación, modificaciones, cambios de estado, y más
 *
 * @param {string} remittanceId - UUID del remito
 * @returns {Promise<Array>} Registros de auditoría ordenados cronológicamente
 */
export async function obtenerAuditoriaRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error("remittanceId es requerido");

    const { data, error } = await supabase
      .from("audit")
      .select("*")
      .eq("remittance_id", remittanceId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Error al obtener auditoría: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error("Error en obtenerAuditoriaRemito:", error);
    throw error;
  }
}

/**
 * Obtener próximos remitos a vencer (recibidos hace x días sin procesar completamente)
 * @param {string} firmId - ID de la firma
 * @param {number} days - Días considerados (default 30)
 * @returns {Array} Remitos
 */
export async function obtenerRemitosPendientesDeResolucion(firmId, days = 30) {
  try {
    if (!firmId) throw new Error("firmId es requerido");

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("remittances")
      .select("*")
      .eq("firm_id", firmId)
      .in("status", ["in_transit", "pending", "sent"])
      .lte("remittance_date", daysAgo)
      .order("remittance_date", { ascending: true });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error("Error en obtenerRemitosPendientesDeResolucion:", error);
    throw error;
  }
}
