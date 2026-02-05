/**
 * Validaciones para el Módulo 17 - VENTAS
 * Valida datos de ventas, ítems, remitos y stock disponible
 */

import { validarRUT } from './financeValidations';

/**
 * Validar datos generales de venta
 * @param {Object} ventaData - Datos de la venta
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarVenta(ventaData) {
  const errores = {};

  // Cliente - Requerido
  if (!ventaData.client_name || !ventaData.client_name.trim()) {
    errores.client_name = 'Nombre del cliente es requerido';
  } else if (ventaData.client_name.trim().length < 3) {
    errores.client_name = 'El nombre debe tener al menos 3 caracteres';
  }

  // RUT - Opcional pero validar si está presente
  if (ventaData.client_rut && ventaData.client_rut.trim()) {
    if (!validarRUT(ventaData.client_rut)) {
      errores.client_rut = 'RUT inválido. Formato: 12.345.678-9';
    }
  }

  // Dirección - Opcional
  if (ventaData.client_address && ventaData.client_address.trim().length < 5) {
    errores.client_address = 'La dirección debe tener al menos 5 caracteres';
  }

  // Fecha - Requerido
  if (!ventaData.sale_date) {
    errores.sale_date = 'Fecha de venta es requerida';
  } else {
    const fechaVenta = new Date(ventaData.sale_date);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaVenta > hoy) {
      errores.sale_date = 'La fecha de venta no puede ser futura';
    }
  }

  // Moneda - Requerido
  const monedasValidas = ['UYU', 'USD'];
  if (!ventaData.currency) {
    errores.currency = 'Moneda es requerida';
  } else if (!monedasValidas.includes(ventaData.currency)) {
    errores.currency = `Moneda inválida. Usar: ${monedasValidas.join(' o ')}`;
  }

  // IVA - Requerido
  const ivaValido = [0, 10, 22];
  if (ventaData.tax_rate === undefined || ventaData.tax_rate === null) {
    errores.tax_rate = 'Tasa de IVA es requerida';
  } else if (!ivaValido.includes(Number(ventaData.tax_rate))) {
    errores.tax_rate = 'Tasa de IVA inválida. Usar: 0%, 10% o 22%';
  }

  // Condiciones de pago - Opcional pero validar si está presente
  const condicionesValidas = ['Contado', 'Crédito', '30 días', '60 días', '90 días'];
  if (ventaData.payment_terms && !condicionesValidas.includes(ventaData.payment_terms)) {
    errores.payment_terms = `Condición inválida. Opciones: ${condicionesValidas.join(', ')}`;
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar ítem individual de venta
 * @param {Object} item - Ítem de venta
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarItemVenta(item) {
  const errores = {};

  // Producto/Insumo - Requerido
  if (!item.input_id || !item.input_id.trim()) {
    errores.input_id = 'Debe seleccionar un producto/insumo';
  }

  // Cantidad - Requerido y > 0
  if (!item.quantity || Number(item.quantity) <= 0) {
    errores.quantity = 'La cantidad debe ser mayor a 0';
  } else if (Number(item.quantity) > 1000000) {
    errores.quantity = 'Cantidad demasiado grande (máximo 1.000.000)';
  }

  // Unidad - Requerido
  if (!item.unit || !item.unit.trim()) {
    errores.unit = 'La unidad es requerida';
  }

  // Precio unitario - Requerido y >= 0
  if (item.unit_price === undefined || item.unit_price === null) {
    errores.unit_price = 'El precio unitario es requerido';
  } else if (Number(item.unit_price) < 0) {
    errores.unit_price = 'El precio unitario no puede ser negativo';
  }

  // Validar que no sea excesivamente grande
  if (Number(item.unit_price) > 100000000) {
    errores.unit_price = 'Precio unitario demasiado grande';
  }

  // IVA - Opcional pero validar si está presente
  const ivaValido = [0, 10, 22];
  if (item.tax_rate !== undefined && !ivaValido.includes(Number(item.tax_rate))) {
    errores.tax_rate = 'Tasa de IVA del ítem inválida. Usar: 0%, 10% o 22%';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar remito de salida
 * @param {Object} remittanceData - Datos del remito
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarRemitoSalida(remittanceData) {
  const errores = {};

  // Número de remito - Requerido
  if (!remittanceData.remittance_number || !remittanceData.remittance_number.trim()) {
    errores.remittance_number = 'Número de remito es requerido';
  } else if (remittanceData.remittance_number.trim().length < 2) {
    errores.remittance_number = 'El número de remito debe tener al menos 2 caracteres';
  }

  // Fecha - Requerido
  if (!remittanceData.remittance_date) {
    errores.remittance_date = 'Fecha de remito es requerida';
  } else {
    const fechaRemito = new Date(remittanceData.remittance_date);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaRemito > hoy) {
      errores.remittance_date = 'La fecha no puede ser futura';
    }
  }

  // Dirección de entrega - Requerido
  if (!remittanceData.delivery_address || !remittanceData.delivery_address.trim()) {
    errores.delivery_address = 'Dirección de entrega es requerida';
  } else if (remittanceData.delivery_address.trim().length < 5) {
    errores.delivery_address = 'La dirección debe tener al menos 5 caracteres';
  }

  // Empresa de transporte - Opcional pero validar si está presente
  if (remittanceData.transport_company && remittanceData.transport_company.trim().length < 2) {
    errores.transport_company = 'El nombre de la empresa debe tener al menos 2 caracteres';
  }

  // Matrícula del vehículo - Opcional pero validar formato si está presente
  if (remittanceData.vehicle_plate && remittanceData.vehicle_plate.trim().length < 3) {
    errores.vehicle_plate = 'La matrícula debe tener al menos 3 caracteres';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Validar disponibilidad de stock para una venta
 * @param {Array} items - Ítems a vender
 * @param {Array} insumos - Insumos disponibles con stock actual
 * @returns {Object} { valido: boolean, errores: Array }
 */
export function validarDisponibilidadStock(items, insumos) {
  const errores = [];

  items.forEach((item, index) => {
    // Buscar el insumo en el array disponible
    const insumo = insumos.find(i => i.id === item.input_id);

    if (!insumo) {
      errores.push({
        index,
        input_id: item.input_id,
        mensaje: 'Insumo no encontrado en el sistema',
        tipo: 'not_found'
      });
    } else {
      // Validar que hay stock disponible
      const stockDisponible = insumo.current_stock || 0;
      const cantidadSolicitada = Number(item.quantity) || 0;

      if (stockDisponible < cantidadSolicitada) {
        errores.push({
          index,
          input_id: item.input_id,
          input_name: insumo.name,
          actual: stockDisponible,
          requerido: cantidadSolicitada,
          diferencia: cantidadSolicitada - stockDisponible,
          mensaje: `Stock insuficiente. Disponible: ${stockDisponible}, Requerido: ${cantidadSolicitada}`,
          tipo: 'insufficient_stock'
        });
      }

      // Advertencia si el stock es bajo después de la venta
      const stockDespues = stockDisponible - cantidadSolicitada;
      if (stockDespues > 0 && stockDespues < (insumo.min_stock_alert || 10)) {
        errores.push({
          index,
          input_id: item.input_id,
          input_name: insumo.name,
          mensaje: `Advertencia: Stock bajo después de venta (quedará: ${stockDespues})`,
          tipo: 'low_stock_warning',
          severity: 'warning'
        });
      }
    }
  });

  return {
    valido: errores.filter(e => e.tipo !== 'low_stock_warning').length === 0,
    errores
  };
}

/**
 * Validar que al menos hay un ítem en la venta
 * @param {Array} items - Ítems de la venta
 * @returns {Object} { valido: boolean, error: string }
 */
export function validarItemsVenta(items) {
  if (!items || items.length === 0) {
    return {
      valido: false,
      error: 'Debe agregar al menos un producto a la venta'
    };
  }

  return {
    valido: true,
    error: null
  };
}

/**
 * Validar totales calculados de una venta
 * @param {Object} venta - Datos de venta con totales
 * @param {Array} items - Ítems de la venta
 * @returns {Object} { valido: boolean, error: string }
 */
export function validarTotalesVenta(venta, items) {
  // Calcular totales esperados
  const subtotalEsperado = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.unit_price));
  }, 0);

  const ivaEsperado = subtotalEsperado * (Number(venta.tax_rate || 0) / 100);
  const totalEsperado = subtotalEsperado + ivaEsperado;

  // Permitir pequeñas diferencias por redondeo (máximo 0.01)
  const margenError = 0.01;

  if (Math.abs(venta.subtotal - subtotalEsperado) > margenError) {
    return {
      valido: false,
      error: `Subtotal incorrecto. Esperado: ${subtotalEsperado}, Recibido: ${venta.subtotal}`
    };
  }

  if (Math.abs(venta.tax_amount - ivaEsperado) > margenError) {
    return {
      valido: false,
      error: `IVA incorrecto. Esperado: ${ivaEsperado}, Recibido: ${venta.tax_amount}`
    };
  }

  if (Math.abs(venta.total_amount - totalEsperado) > margenError) {
    return {
      valido: false,
      error: `Total incorrecto. Esperado: ${totalEsperado}, Recibido: ${venta.total_amount}`
    };
  }

  return {
    valido: true,
    error: null
  };
}

/**
 * Validación completa de venta (datos + ítems + stock)
 * @param {Object} ventaData - Datos generales de la venta
 * @param {Array} items - Ítems de la venta
 * @param {Array} insumos - Insumos disponibles
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarVentaCompleta(ventaData, items, insumos) {
  const erroresFinales = {};

  // 1. Validar datos generales
  const validacionVenta = validarVenta(ventaData);
  if (!validacionVenta.valido) {
    erroresFinales.venta = validacionVenta.errores;
  }

  // 2. Validar items
  const validacionItems = validarItemsVenta(items);
  if (!validacionItems.valido) {
    erroresFinales.items = validacionItems.error;
  } else {
    erroresFinales.itemsDetail = [];
    items.forEach((item, index) => {
      const validacion = validarItemVenta(item);
      if (!validacion.valido) {
        erroresFinales.itemsDetail.push({
          index,
          errores: validacion.errores
        });
      }
    });

    // 3. Validar stock disponible
    if (insumos && insumos.length > 0) {
      const validacionStock = validarDisponibilidadStock(items, insumos);
      if (!validacionStock.valido) {
        erroresFinales.stock = validacionStock.errores.filter(e => e.tipo !== 'low_stock_warning');
      }
      // Advertencias de stock bajo no invalidan la venta
      const advertencias = validacionStock.errores.filter(e => e.tipo === 'low_stock_warning');
      if (advertencias.length > 0) {
        erroresFinales.advertenciasStock = advertencias;
      }
    }
  }

  return {
    valido: Object.keys(erroresFinales).length === 0 || (
      Object.keys(erroresFinales).length === 1 && erroresFinales.advertenciasStock
    ),
    errores: erroresFinales
  };
}
