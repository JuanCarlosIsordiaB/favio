/**
 * Validaciones para el Módulo 08 - Ingresos y Gastos Financieros
 */

/**
 * Validar RUT uruguayo
 * Formato: 11 dígitos + 1 carácter verificador (0-9 o K)
 * O simplemente 12 dígitos
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si es válido
 */
export function validarRUT(rut) {
  if (!rut || typeof rut !== "string") return false;

  // Limpiar formato (remover puntos, guiones, espacios)
  const rutLimpio = rut.trim().replace(/[.\-\s]/g, "");

  // Aceptar dos formatos:
  // 1. 11 dígitos + 1 carácter verificador (0-9 o K)
  // 2. 12 dígitos
  if (/^\d{11}[0-9K]$/i.test(rutLimpio)) {
    return true; // Formato: 11 dígitos + verificador
  }

  if (/^\d{12}$/.test(rutLimpio)) {
    return true; // Formato: 12 dígitos
  }

  return false; // Formato inválido
}

/**
 * Validar factura de compra
 * @param {Object} facturaData - Datos de la factura
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarFacturaCompra(facturaData) {
  const errores = {};

  // Serie y número de factura
  if (!facturaData.invoice_series || !facturaData.invoice_series.trim()) {
    errores.invoice_series = "Serie de factura requerida (ej: 001)";
  }

  if (!facturaData.invoice_number || !facturaData.invoice_number.trim()) {
    errores.invoice_number = "Número de factura requerido";
  } else {
    // Validar formato: solo números
    if (!/^\d+$/.test(facturaData.invoice_number.trim())) {
      errores.invoice_number = "El número debe contener solo dígitos";
    }
  }

  // Proveedor
  if (!facturaData.provider_name || !facturaData.provider_name.trim()) {
    errores.provider_name = "Nombre del proveedor requerido";
  } else if (facturaData.provider_name.trim().length < 3) {
    errores.provider_name = "El nombre debe tener al menos 3 caracteres";
  }

  // RUT proveedor (opcional pero validar si está presente)
  if (facturaData.provider_rut && facturaData.provider_rut.trim()) {
    if (!validarRUT(facturaData.provider_rut)) {
      errores.provider_rut =
        "RUT inválido. Formato: 12 dígitos (ej: 123456789012)";
    }
  }

  // Fecha de emisión
  if (facturaData.invoice_date) {
    const fechaEmision = new Date(facturaData.invoice_date);
    const hoy = new Date();
    if (fechaEmision > hoy) {
      errores.invoice_date = "La fecha de emisión no puede ser futura";
    }
  }

  // Fecha de vencimiento
  if (facturaData.due_date) {
    const vencimiento = new Date(facturaData.due_date);
    const emision = new Date(facturaData.invoice_date || new Date());
    if (vencimiento < emision) {
      errores.due_date = "Fecha de vencimiento debe ser posterior a la emisión";
    }
  }

  // Subtotal
  if (facturaData.subtotal === undefined || facturaData.subtotal === null) {
    errores.subtotal = "El subtotal es requerido";
  } else if (
    typeof facturaData.subtotal !== "number" ||
    facturaData.subtotal < 0
  ) {
    errores.subtotal = "El subtotal debe ser un número mayor o igual a cero";
  }

  // Monto total
  if (
    facturaData.total_amount === undefined ||
    facturaData.total_amount === null
  ) {
    errores.total_amount = "El monto total es requerido";
  } else if (
    typeof facturaData.total_amount !== "number" ||
    facturaData.total_amount <= 0
  ) {
    errores.total_amount = "El monto total debe ser mayor a cero";
  }

  // IVA (tasa válida en Uruguay: 0%, 10%, 22%)
  if (facturaData.tax_rate !== undefined) {
    const tasasValidas = [0, 10, 22];
    if (!tasasValidas.includes(Number(facturaData.tax_rate))) {
      errores.tax_rate = "Tasa de IVA inválida. Usar: 0%, 10% o 22%";
    }
  }

  // Categoría - Permitir cualquier categoría (incluyendo personalizadas)
  if (!facturaData.category || !facturaData.category.trim()) {
    errores.category = "Categoría es requerida";
  } else if (facturaData.category.trim().length < 2) {
    errores.category = "La categoría debe tener al menos 2 caracteres";
  } else if (facturaData.category.trim().length > 100) {
    errores.category = "La categoría no puede exceder 100 caracteres";
  }

  // Condición de pago (Crédito / Contado) - SECTOR 2
  const condicionesPagoValidas = ["credito", "contado"];
  const condicion = facturaData.payment_condition;
  if (!condicion) {
    errores.payment_condition =
      "Condición de pago es requerida (Crédito o Contado)";
  } else if (!condicionesPagoValidas.includes(condicion)) {
    errores.payment_condition = `Condición de pago inválida. Usar: ${condicionesPagoValidas.join(", ")}`;
  }

  // Moneda
  const monedas = ["UYU", "USD"];
  if (facturaData.currency && !monedas.includes(facturaData.currency)) {
    errores.currency = `Moneda inválida. Usar: ${monedas.join(" o ")}`;
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Validar ingreso financiero
 * @param {Object} ingresoData - Datos del ingreso
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarIngreso(ingresoData) {
  const errores = {};

  // Cliente
  if (!ingresoData.client_name || !ingresoData.client_name.trim()) {
    errores.client_name = "Nombre del cliente requerido";
  } else if (ingresoData.client_name.trim().length < 3) {
    errores.client_name = "El nombre debe tener al menos 3 caracteres";
  }

  // RUT cliente (opcional pero validar si está presente)
  if (ingresoData.client_rut && ingresoData.client_rut.trim()) {
    if (!validarRUT(ingresoData.client_rut)) {
      errores.client_rut = "RUT inválido";
    }
  }

  // Monto (total_amount es el campo consistente con el modal y facturas)
  if (
    ingresoData.total_amount === undefined ||
    ingresoData.total_amount === null
  ) {
    errores.total_amount = "El monto es requerido";
  } else if (
    typeof ingresoData.total_amount !== "number" ||
    ingresoData.total_amount <= 0
  ) {
    errores.total_amount = "El monto debe ser mayor a cero";
  }

  // Categoría - Permitir cualquier categoría (incluyendo personalizadas)
  if (!ingresoData.category || !ingresoData.category.trim()) {
    errores.category = "Categoría es requerida";
  } else if (ingresoData.category.trim().length < 2) {
    errores.category = "La categoría debe tener al menos 2 caracteres";
  } else if (ingresoData.category.trim().length > 100) {
    errores.category = "La categoría no puede exceder 100 caracteres";
  }

  // Producto (opcional pero si está, no vacío)
  if (ingresoData.product && !ingresoData.product.trim()) {
    errores.product = "El producto no puede estar vacío";
  }

  // Moneda
  const monedas = ["UYU", "USD"];
  if (ingresoData.currency && !monedas.includes(ingresoData.currency)) {
    errores.currency = `Moneda inválida. Usar: ${monedas.join(" o ")}`;
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Validar orden de pago
 * @param {Object} ordenData - Datos de la orden
 * @param {Array} facturasSeleccionadas - Array de facturas seleccionadas
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarOrdenPago(ordenData, facturasSeleccionadas) {
  const errores = {};

  // Validar que haya facturas seleccionadas
  if (
    !facturasSeleccionadas ||
    !Array.isArray(facturasSeleccionadas) ||
    facturasSeleccionadas.length === 0
  ) {
    errores.facturas = "Debes seleccionar al menos una factura para pagar";
  } else {
    // Validar que el monto total no exceda el saldo de las facturas
    const totalSaldoFacturas = facturasSeleccionadas.reduce((sum, f) => {
      return sum + (f.amount_paid || f.balance || 0);
    }, 0);

    const montoOrden = ordenData.amount || 0;

    if (montoOrden > totalSaldoFacturas) {
      errores.amount = `El monto (${montoOrden}) excede el saldo total de las facturas (${totalSaldoFacturas})`;
    }

    if (montoOrden <= 0) {
      errores.amount = "El monto debe ser mayor a cero";
    }
  }

  // Cuenta de origen (opcional)

  // Método de pago
  const metodosValidos = [
    "transfer",
    "check",
    "cash",
    "credit_card",
    "debit_card",
  ];
  if (!ordenData.payment_method) {
    errores.payment_method = "Método de pago es requerido";
  } else if (!metodosValidos.includes(ordenData.payment_method)) {
    errores.payment_method = `Método inválido. Usar: ${metodosValidos.join(", ")}`;
  }

  if (!ordenData.planned_payment_date) {
    errores.planned_payment_date = "Fecha de pago planificada requerida";
  }

  // Beneficiario
  if (!ordenData.beneficiary_name || !ordenData.beneficiary_name.trim()) {
    errores.beneficiary_name = "Nombre del beneficiario requerido";
  }

  // Concepto
  if (!ordenData.concept || !ordenData.concept.trim()) {
    errores.concept = "El concepto del pago es requerido";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Validar datos de cuenta financiera
 * @param {Object} cuentaData - Datos de la cuenta
 * @returns {Object} { valido: boolean, errores: Object }
 */
export function validarCuentaFinanciera(cuentaData) {
  const errores = {};

  // Nombre
  if (!cuentaData.name || !cuentaData.name.trim()) {
    errores.name = "Nombre de la cuenta requerido";
  } else if (cuentaData.name.trim().length < 3) {
    errores.name = "El nombre debe tener al menos 3 caracteres";
  }

  // Tipo de cuenta
  const tiposValidos = ["CASH", "BANK", "CREDIT_CARD"];
  if (!cuentaData.account_type) {
    errores.account_type = "Tipo de cuenta requerido";
  } else if (!tiposValidos.includes(cuentaData.account_type)) {
    errores.account_type = `Tipo inválido. Usar: ${tiposValidos.join(", ")}`;
  }

  // Moneda
  const monedasValidas = ["UYU", "USD"];
  if (!cuentaData.currency) {
    errores.currency = "Moneda requerida";
  } else if (!monedasValidas.includes(cuentaData.currency)) {
    errores.currency = `Moneda inválida. Usar: ${monedasValidas.join(" o ")}`;
  }

  // Balance inicial
  if (cuentaData.initial_balance !== undefined) {
    if (
      typeof cuentaData.initial_balance !== "number" ||
      cuentaData.initial_balance < 0
    ) {
      errores.initial_balance =
        "El balance inicial debe ser un número no negativo";
    }
  }

  // Datos bancarios (si es BANK)
  if (cuentaData.account_type === "BANK") {
    if (!cuentaData.bank_name || !cuentaData.bank_name.trim()) {
      errores.bank_name = "Nombre del banco requerido para cuentas bancarias";
    }
    if (!cuentaData.account_number || !cuentaData.account_number.trim()) {
      errores.account_number =
        "Número de cuenta requerido para cuentas bancarias";
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}
