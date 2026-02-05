/**
 * Validaciones para Módulo 09 - Remitos
 * Validaciones de negocio para remitos e ítems
 */

/**
 * Validar datos de remito
 * @param {Object} data - Datos del remito
 * @returns {Object} { valido: boolean, errores: {} }
 */
export function validarRemito(data) {
  const errores = {};

  // Campos obligatorios del remito
  if (!data.remittance_number || !data.remittance_number.trim()) {
    errores.remittance_number = 'El número de remito es requerido';
  }

  if (!data.remittance_date) {
    errores.remittance_date = 'La fecha del remito es requerida';
  }

  if (!data.supplier_name || !data.supplier_name.trim()) {
    errores.supplier_name = 'El proveedor es requerido';
  }

  if (!data.premise_id) {
    errores.premise_id = 'El predio de entrega es requerido';
  }

  if (!data.depot_id) {
    errores.depot_id = 'El depósito de destino es requerido';
  }

  // Validaciones adicionales
  if (data.remittance_number && data.remittance_number.length > 50) {
    errores.remittance_number = 'El número de remito no puede exceder 50 caracteres';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar ítem del remito
 * @param {Object} item - Datos del ítem
 * @returns {Object} { valido: boolean, errores: {} }
 */
export function validarItemRemito(item) {
  const errores = {};

  // Campos obligatorios
  if (!item.item_description || !item.item_description.trim()) {
    errores.item_description = 'La descripción del ítem es requerida';
  }

  if (!item.unit || !item.unit.trim()) {
    errores.unit = 'La unidad de medida es requerida';
  }

  // Validaciones numéricas - Convertir a número si es string
  let quantityOrdered = item.quantity_ordered;
  if (typeof quantityOrdered === 'string') {
    quantityOrdered = quantityOrdered.trim() === '' ? null : parseFloat(quantityOrdered);
  }

  if (quantityOrdered === null || quantityOrdered === undefined) {
    errores.quantity_ordered = 'La cantidad ordenada es requerida';
  } else if (quantityOrdered < 0) {
    errores.quantity_ordered = 'La cantidad ordenada debe ser mayor o igual a 0';
  } else if (!Number.isFinite(quantityOrdered)) {
    errores.quantity_ordered = 'La cantidad ordenada debe ser un número válido';
  }

  let quantityReceived = item.quantity_received;
  if (typeof quantityReceived === 'string') {
    quantityReceived = quantityReceived.trim() === '' ? null : parseFloat(quantityReceived);
  }

  if (quantityReceived !== null && quantityReceived !== undefined) {
    if (quantityReceived < 0) {
      errores.quantity_received = 'La cantidad recibida no puede ser negativa';
    }
    if (!Number.isFinite(quantityReceived)) {
      errores.quantity_received = 'La cantidad recibida debe ser un número válido';
    }
  }

  // Validación de descripción muy larga
  if (item.item_description && item.item_description.length > 200) {
    errores.item_description = 'La descripción no puede exceder 200 caracteres';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar recepción de ítems
 * @param {Array} items - Array de ítems con cantidades recibidas
 * @returns {Object} { valido: boolean, errores: { itemId: message } }
 */
export function validarRecepcion(items) {
  const errores = {};

  if (!items || items.length === 0) {
    return {
      valido: false,
      errores: { general: 'Debe haber al menos un ítem' }
    };
  }

  for (const item of items) {
    // Validar que quantity_received esté definido
    if (item.quantity_received === null || item.quantity_received === undefined) {
      errores[item.id] = 'Debe ingresar cantidad recibida';
      continue;
    }

    // Validar que no sea negativo
    if (item.quantity_received < 0) {
      errores[item.id] = 'La cantidad no puede ser negativa';
      continue;
    }

    // Validar que sea número válido
    if (!Number.isFinite(item.quantity_received)) {
      errores[item.id] = 'Cantidad inválida';
      continue;
    }

    // Advertencia: si recibe más del 10% de lo ordenado
    if (item.quantity_received > item.quantity_ordered * 1.1) {
      errores[item.id] = 'Cantidad recibida excede significativamente la ordenada (>110%)';
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar diferencia entre esperado y recibido
 * @param {number} quantityOrdered - Cantidad ordenada
 * @param {number} quantityReceived - Cantidad recibida
 * @returns {Object} { valid: boolean, message: string, severity: 'error'|'warning'|'info' }
 */
export function validarDiferenciaRecepcion(quantityOrdered, quantityReceived) {
  if (quantityReceived === 0) {
    return {
      valid: false,
      message: 'No se puede recibir 0 unidades',
      severity: 'error'
    };
  }

  const percentage = (quantityReceived / quantityOrdered) * 100;

  if (percentage < 50) {
    return {
      valid: true,
      message: `⚠️ Solo recibió el ${Math.round(percentage)}% de lo ordenado`,
      severity: 'warning'
    };
  }

  if (percentage > 110) {
    return {
      valid: false,
      message: `❌ Recibió ${Math.round(percentage)}% de lo ordenado (máx 110%)`,
      severity: 'error'
    };
  }

  if (percentage < 100) {
    return {
      valid: true,
      message: `ℹ️ Recibió el ${Math.round(percentage)}% de lo ordenado (parcialmente)`,
      severity: 'info'
    };
  }

  return {
    valid: true,
    message: `✓ Recibió el 100% de lo ordenado`,
    severity: 'info'
  };
}

/**
 * Validar duplicado de remito
 * @param {Array} remittances - Lista de remitos existentes
 * @param {Object} newRemittance - Nuevo remito a validar
 * @returns {Object} { isDuplicate: boolean, message: string }
 */
export function validarDuplicadoManual(remittances, newRemittance) {
  const duplicado = remittances.find(r =>
    r.remittance_number === newRemittance.remittance_number &&
    r.remittance_date === newRemittance.remittance_date &&
    r.supplier_rut === newRemittance.supplier_rut &&
    r.status !== 'cancelled'
  );

  return {
    isDuplicate: !!duplicado,
    message: duplicado
      ? `Ya existe un remito con el mismo número (${newRemittance.remittance_number}), fecha y proveedor`
      : null,
    duplicateId: duplicado?.id || null
  };
}

/**
 * Validar estado de remito para operación
 * @param {string} currentStatus - Estado actual del remito
 * @param {string} operation - Operación a realizar (update, receive, cancel)
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarTransicionEstado(currentStatus, operation) {
  const transiciones = {
    'in_transit': ['received', 'partially_received', 'cancelled'],
    'partially_received': ['received', 'cancelled'],
    'received': ['cancelled'],
    'cancelled': []
  };

  const permitidas = transiciones[currentStatus] || [];

  if (!permitidas.includes(operation)) {
    return {
      valid: false,
      message: `No se puede ${operation} un remito en estado ${currentStatus}`
    };
  }

  return {
    valid: true,
    message: null
  };
}

/**
 * Validar que todos los ítems tengan insumo vinculado antes de recibir
 * @param {Array} items - Items del remito
 * @returns {Object} { valid: boolean, unlinkedCount: number }
 */
export function validarItemsVinculados(items) {
  const unlinked = items.filter(item => !item.input_id);

  return {
    valid: unlinked.length === 0,
    unlinkedCount: unlinked.length,
    unlinkedItems: unlinked,
    message: unlinked.length > 0
      ? `${unlinked.length} ítem(s) sin vincular a insumo. Deben crear o seleccionar un insumo.`
      : null
  };
}

/**
 * Validar RUT de proveedor
 * @param {string} rut - RUT a validar
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarRUT(rut) {
  if (!rut) {
    return { valid: true, message: null }; // RUT es opcional
  }

  // Patrón simple para RUT: XX.XXX.XXX-K o XXXXXXXX-K
  const rutPattern = /^[\d.]*\d-?[0-9kK]$/;

  if (!rutPattern.test(rut)) {
    return {
      valid: false,
      message: 'RUT inválido. Use formato XX.XXX.XXX-K'
    };
  }

  return { valid: true, message: null };
}

/**
 * Validar teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarTelefono(phone) {
  if (!phone) {
    return { valid: true, message: null }; // Teléfono es opcional
  }

  const phonePattern = /^[\d\s\-\+\(\)]{7,20}$/;

  if (!phonePattern.test(phone)) {
    return {
      valid: false,
      message: 'Teléfono inválido'
    };
  }

  return { valid: true, message: null };
}

/**
 * Validar email
 * @param {string} email - Email a validar
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarEmail(email) {
  if (!email) {
    return { valid: true, message: null }; // Email es opcional
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return {
      valid: false,
      message: 'Email inválido'
    };
  }

  return { valid: true, message: null };
}

/**
 * Validar fecha
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarFecha(dateString) {
  if (!dateString) {
    return { valid: false, message: 'La fecha es requerida' };
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Fecha inválida' };
  }

  // Validar que no sea una fecha futura
  if (date > new Date()) {
    return { valid: false, message: 'La fecha no puede ser en el futuro' };
  }

  return { valid: true, message: null };
}

/**
 * Validar cantidad (debe ser número positivo)
 * @param {number} quantity - Cantidad a validar
 * @param {string} fieldName - Nombre del campo (para mensaje)
 * @returns {Object} { valid: boolean, message: string }
 */
export function validarCantidad(quantity, fieldName = 'Cantidad') {
  if (quantity === null || quantity === undefined) {
    return {
      valid: false,
      message: `${fieldName} es requerida`
    };
  }

  if (!Number.isFinite(quantity)) {
    return {
      valid: false,
      message: `${fieldName} debe ser un número válido`
    };
  }

  if (quantity < 0) {
    return {
      valid: false,
      message: `${fieldName} no puede ser negativa`
    };
  }

  if (quantity === 0) {
    return {
      valid: false,
      message: `${fieldName} debe ser mayor a 0`
    };
  }

  return { valid: true, message: null };
}

/**
 * Validación completa de formulario de remito
 * @param {Object} formData - Datos completos del formulario
 * @param {Array} items - Ítems del remito
 * @returns {Object} { valido: boolean, errores: {}, warnings: [] }
 */
export function validarFormularioCompleto(formData, items) {
  const errores = {};
  const warnings = [];

  // Validar datos del remito
  const validacionRemito = validarRemito(formData);
  Object.assign(errores, validacionRemito.errores);

  // Validar ítems
  if (!items || items.length === 0) {
    errores.items = 'Debe agregar al menos un ítem';
  } else {
    const itemsInvalidos = [];
    items.forEach((item, index) => {
      const validacionItem = validarItemRemito(item);
      if (!validacionItem.valido) {
        itemsInvalidos.push(`Ítem ${index + 1}: ${Object.values(validacionItem.errores).join(', ')}`);
      }
    });

    if (itemsInvalidos.length > 0) {
      errores.items = itemsInvalidos;
    }
  }

  // Validar RUT si está presente
  if (formData.supplier_rut) {
    const validacionRUT = validarRUT(formData.supplier_rut);
    if (!validacionRUT.valid) {
      errores.supplier_rut = validacionRUT.message;
    }
  }

  // Validar teléfono si está presente
  if (formData.transport_company_phone) {
    const validacionTel = validarTelefono(formData.transport_company_phone);
    if (!validacionTel.valid) {
      warnings.push('Teléfono del transporte inválido');
    }
  }

  // Validar email si está presente
  if (formData.supplier_email) {
    const validacionEmail = validarEmail(formData.supplier_email);
    if (!validacionEmail.valid) {
      warnings.push('Email del proveedor inválido');
    }
  }

  // Validar fecha
  const validacionFecha = validarFecha(formData.remittance_date);
  if (!validacionFecha.valid) {
    errores.remittance_date = validacionFecha.message;
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    warnings
  };
}
