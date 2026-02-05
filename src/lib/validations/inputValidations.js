/**
 * Validaciones de negocio para insumos y movimientos
 * Usado en formularios y servicios
 */

import { obtenerNombresCategorias } from '../../services/inputCategories';

/**
 * Valida datos de un nuevo insumo
 * @param {Object} insumoData - Datos del insumo a validar
 * @returns {Object} { valido: boolean, errores: {} }
 */
export function validarInsumo(insumoData) {
  const errores = {};

  // Nombre
  if (!insumoData.name || !insumoData.name.trim()) {
    errores.name = 'El nombre del insumo es requerido';
  } else if (insumoData.name.length < 3) {
    errores.name = 'El nombre debe tener al menos 3 caracteres';
  } else if (insumoData.name.length > 200) {
    errores.name = 'El nombre no puede exceder 200 caracteres';
  }

  // Categoría
  if (!insumoData.category || !insumoData.category.trim()) {
    errores.category = 'La categoría es requerida';
  }

  // Unidad
  if (!insumoData.unit || !insumoData.unit.trim()) {
    errores.unit = 'La unidad de medida es requerida';
  }

  // Unidades válidas
  const unidadesValidas = ['kg', 'L', 'cc', 'dosis', 'ton'];
  if (insumoData.unit && !unidadesValidas.includes(insumoData.unit)) {
    errores.unit = `Unidad inválida. Válidas: ${unidadesValidas.join(', ')}`;
  }

  // Stock mínimo
  if (insumoData.min_stock_alert !== undefined && insumoData.min_stock_alert !== '') {
    const minStock = parseFloat(insumoData.min_stock_alert);
    if (isNaN(minStock)) {
      errores.min_stock_alert = 'Debe ser un número válido';
    } else if (minStock < 0) {
      errores.min_stock_alert = 'No puede ser negativo';
    }
  }

  // Costo unitario
  if (insumoData.cost_per_unit !== undefined && insumoData.cost_per_unit !== '') {
    const costo = parseFloat(insumoData.cost_per_unit);
    if (isNaN(costo)) {
      errores.cost_per_unit = 'Debe ser un número válido';
    } else if (costo < 0) {
      errores.cost_per_unit = 'No puede ser negativo';
    }
  }

  // Fecha de vencimiento
  if (insumoData.expiration_date && insumoData.expiration_date.trim()) {
    const fechaVenc = new Date(insumoData.expiration_date);
    const hoy = new Date();
    if (fechaVenc < hoy) {
      errores.expiration_date = 'La fecha de vencimiento no puede ser en el pasado';
    }
  }

  // Fecha de ingreso
  if (insumoData.entry_date && insumoData.entry_date.trim()) {
    const fechaIngreso = new Date(insumoData.entry_date);
    const hoy = new Date();
    if (fechaIngreso > hoy) {
      errores.entry_date = 'La fecha de ingreso no puede ser futura';
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Valida datos de un movimiento de stock
 * @param {Object} movimientoData - Datos del movimiento
 * @param {number} stockDisponible - Stock actual del insumo
 * @returns {Object} { valido: boolean, errores: {} }
 */
export function validarMovimiento(movimientoData, stockDisponible = 0) {
  const errores = {};

  // Input ID
  if (!movimientoData.input_id) {
    errores.input_id = 'Debes seleccionar un insumo';
  }

  // Tipo
  if (!movimientoData.type) {
    errores.type = 'Debes seleccionar un tipo de movimiento';
  }

  const tiposValidos = ['entry', 'exit', 'adjustment', 'transfer'];
  if (movimientoData.type && !tiposValidos.includes(movimientoData.type)) {
    errores.type = `Tipo inválido. Válidos: ${tiposValidos.join(', ')}`;
  }

  // Cantidad
  if (movimientoData.quantity === undefined || movimientoData.quantity === '') {
    errores.quantity = 'La cantidad es requerida';
  } else {
    const cantidad = parseFloat(movimientoData.quantity);
    if (isNaN(cantidad)) {
      errores.quantity = 'Debe ser un número válido';
    } else if (cantidad <= 0) {
      errores.quantity = 'La cantidad debe ser mayor a cero';
    }
  }

  // Validar disponibilidad para egreso
  if (movimientoData.type === 'exit') {
    const cantidad = parseFloat(movimientoData.quantity);
    if (!isNaN(cantidad) && cantidad > stockDisponible) {
      errores.quantity = `Stock insuficiente. Disponible: ${stockDisponible}`;
    }
  }

  // TRAZABILIDAD: lot_id requerido para TODOS los tipos (regla módulo línea 98)
  if (!movimientoData.lot_id) {
    if (movimientoData.type === 'entry') {
      errores.lot_id = 'Debes seleccionar el depósito de ingreso para trazabilidad';
    } else if (movimientoData.type === 'exit') {
      errores.lot_id = 'Debes seleccionar el lote de consumo para trazabilidad';
    } else if (movimientoData.type === 'adjustment') {
      errores.lot_id = 'Debes seleccionar el depósito donde se ajusta para trazabilidad';
    } else if (movimientoData.type === 'transfer') {
      errores.lot_id = 'Debes seleccionar el depósito origen para trazabilidad';
    }
  }

  // Destino para transferencia
  if (movimientoData.type === 'transfer' && !movimientoData.destination_depot_id) {
    errores.destination_depot_id = 'Debes seleccionar un depósito destino';
  }

  // Descripción/Referencia
  if (!movimientoData.description || !movimientoData.description.trim()) {
    errores.description = 'La referencia/descripción es obligatoria (ej: Factura #123)';
  }

  // Fecha
  if (movimientoData.date && movimientoData.date.trim()) {
    const fecha = new Date(movimientoData.date);
    const hoy = new Date();
    // Permitir mismo día pero no futuro
    if (fecha.toDateString() > hoy.toDateString()) {
      errores.date = 'No se pueden registrar movimientos futuros';
    }
  }

  // Costo unitario (si está presente)
  if (movimientoData.unit_cost !== undefined && movimientoData.unit_cost !== '') {
    const costo = parseFloat(movimientoData.unit_cost);
    if (isNaN(costo)) {
      errores.unit_cost = 'Debe ser un número válido';
    } else if (costo < 0) {
      errores.unit_cost = 'No puede ser negativo';
    }
  }

  // Validación para ADJUSTMENT
  if (movimientoData.type === 'adjustment') {
    if (!movimientoData.description || movimientoData.description.trim().length < 10) {
      errores.description = 'Descripción detallada requerida para ajustes (mínimo 10 caracteres, explicar razón)';
    }
  }

  // Validación para TRANSFER
  if (movimientoData.type === 'transfer') {
    if (!movimientoData.destination_depot_id || movimientoData.destination_depot_id.trim() === '') {
      errores.destination_depot_id = 'Depósito destino es requerido para transferencias';
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
}

/**
 * Valida que una categoría sea válida
 * @param {string} categoria - Categoría a validar
 * @returns {boolean} Es válida
 */
export function validarCategoria(categoria) {
  const categoriasValidas = [
    'Fertilizantes',
    'Fitosanitarios',
    'Semillas',
    'Medicamentos veterinarios',
    'Combustibles',
    'Repuestos',
    'Otros'
  ];

  return categoriasValidas.includes(categoria);
}

/**
 * Obtiene lista de categorías predefinidas
 * NOTA: Esta es una función sincrónica que retorna categorías por defecto
 * Para categorías dinámicas desde BD, usar obtenerNombresCategorias() del service inputCategories
 * @returns {Array} Categorías
 */
export function obtenerCategorias() {
  return [
    'Fertilizantes',
    'Fitosanitarios',
    'Semillas',
    'Medicamentos veterinarios',
    'Combustibles',
    'Repuestos',
    'Otros'
  ];
}

/**
 * Obtiene lista de unidades válidas
 * @returns {Array} Unidades
 */
export function obtenerUnidades() {
  return [
    { valor: 'kg', etiqueta: 'Kilogramos (kg)' },
    { valor: 'L', etiqueta: 'Litros (L)' },
    { valor: 'cc', etiqueta: 'Centímetros Cúbicos (cc)' },
    { valor: 'dosis', etiqueta: 'Dosis' },
    { valor: 'ton', etiqueta: 'Toneladas (ton)' }
  ];
}

/**
 * Obtiene lista de tipos de movimiento
 * @returns {Array} Tipos de movimiento
 */
export function obtenerTiposMovimiento() {
  return [
    { valor: 'entry', etiqueta: 'Ingreso', color: 'green' },
    { valor: 'exit', etiqueta: 'Egreso', color: 'red' },
    { valor: 'adjustment', etiqueta: 'Ajuste', color: 'blue' },
    { valor: 'transfer', etiqueta: 'Transferencia', color: 'purple' }
  ];
}

/**
 * Valida nombre único de insumo
 * NOTA: Esta validación se debe hacer en el backend comparando con DB
 * @param {string} nombre - Nombre a validar
 * @param {Array} insumosExistentes - Lista de insumos ya cargados
 * @returns {boolean} Es único
 */
export function validarNombreUnico(nombre, insumosExistentes = []) {
  return !insumosExistentes.some(
    insumo => insumo.name.toLowerCase() === nombre.toLowerCase()
  );
}

/**
 * Calcula días para vencimiento
 * @param {string} fechaVencimiento - Fecha de vencimiento (YYYY-MM-DD)
 * @returns {number} Días para vencer (negativo si ya venció)
 */
export function calcularDiasParaVencimiento(fechaVencimiento) {
  const fechaVenc = new Date(fechaVencimiento);
  const hoy = new Date();
  const diff = fechaVenc - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determina estado de alerta para un insumo
 * @param {Object} insumo - Datos del insumo
 * @returns {string} 'ok' | 'warning' | 'critical'
 */
export function determinarEstadoAlerta(insumo) {
  // Verificar vencimiento
  if (insumo.expiration_date) {
    const diasParaVencer = calcularDiasParaVencimiento(insumo.expiration_date);
    if (diasParaVencer <= 0) {
      return 'critical'; // Vencido
    }
    if (diasParaVencer <= 30) {
      return 'warning'; // Próximo a vencer
    }
  }

  // Verificar stock mínimo
  if (insumo.min_stock_alert > 0 && insumo.current_stock <= insumo.min_stock_alert) {
    if (insumo.current_stock === 0) {
      return 'critical'; // Sin stock
    }
    return 'warning'; // Stock bajo
  }

  return 'ok'; // Sin alertas
}

/**
 * Obtiene color para estado de alerta
 * @param {string} estado - Estado de alerta
 * @returns {string} Clase de color Tailwind
 */
export function obtenerColorEstado(estado) {
  const colores = {
    ok: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    critical: 'text-red-700 bg-red-50 border-red-200'
  };
  return colores[estado] || colores.ok;
}

/**
 * Formatea cantidad con unidad
 * @param {number} cantidad - Cantidad
 * @param {string} unidad - Unidad
 * @returns {string} Cantidad formateada
 */
export function formatearCantidad(cantidad, unidad) {
  if (cantidad === undefined || cantidad === null) return '-';
  return `${cantidad.toFixed(2)} ${unidad}`;
}

/**
 * Formatea precio
 * @param {number} precio - Precio
 * @param {string} moneda - Moneda (defecto: $)
 * @returns {string} Precio formateado
 */
export function formatearPrecio(precio, moneda = '$') {
  if (precio === undefined || precio === null) return '-';
  return `${moneda} ${precio.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Valida RUT proveedor (formato uruguayo)
 * @param {string} rut - RUT a validar
 * @returns {boolean} Es válido
 */
export function validarRUT(rut) {
  if (!rut) return false;
  // Formato: 12345678-9 o 123456789
  const regexRUT = /^[0-9]{6,8}-?[0-9kK]$/;
  return regexRUT.test(rut);
}

/**
 * Obtiene resumen de validación de insumo para mostrar en UI
 * @param {Object} insumoData - Datos del insumo
 * @returns {Object} Resumen con estado
 */
export function obtenerResumenValidacion(insumoData) {
  const validacion = validarInsumo(insumoData);

  return {
    completo: validacion.valido,
    campos_vacios: Object.keys(validacion.errores),
    total_errores: Object.keys(validacion.errores).length,
    primer_error: Object.values(validacion.errores)[0] || null
  };
}
