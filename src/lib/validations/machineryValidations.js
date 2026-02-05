// Validación de orden de servicio
export function validarOrdenServicio(data) {
  const errors = {};

  if (!data.machinery_id) {
    errors.machinery_id = 'Maquinaria es obligatoria';
  }

  if (!data.client_type) {
    errors.client_type = 'Tipo de cliente es obligatorio';
  }

  if (data.client_type === 'internal' && !data.internal_cost_center_id) {
    errors.internal_cost_center_id = 'Centro de costo es obligatorio para servicios internos';
  }

  if (data.client_type === 'external') {
    if (!data.external_client_name || data.external_client_name.trim() === '') {
      errors.external_client_name = 'Nombre del cliente externo es obligatorio';
    }
    if (!data.billing_amount || parseFloat(data.billing_amount) <= 0) {
      errors.billing_amount = 'Monto de facturación es obligatorio para servicios externos';
    }
  }

  if (!data.service_type) {
    errors.service_type = 'Tipo de servicio es obligatorio';
  }

  if (!data.service_description || data.service_description.trim() === '') {
    errors.service_description = 'Descripción del servicio es obligatoria';
  }

  if (!data.order_date) {
    errors.order_date = 'Fecha de orden es obligatoria';
  }

  if (data.start_datetime && data.end_datetime) {
    const start = new Date(data.start_datetime);
    const end = new Date(data.end_datetime);
    if (end < start) {
      errors.end_datetime = 'Fecha/hora fin no puede ser anterior al inicio';
    }
  }

  // Validaciones de valores numéricos
  const numericFields = [
    'hours_worked',
    'hectares_worked',
    'kilometers_traveled',
    'fuel_consumed_liters',
    'cost_per_hour',
    'cost_per_hectare',
    'fuel_cost',
    'operator_cost',
    'other_costs'
  ];

  numericFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (parseFloat(data[field]) < 0) {
        errors[field] = `${field} no puede ser negativo`;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validación de mantenimiento
export function validarMantenimiento(data) {
  const errors = {};

  if (!data.machinery_id) {
    errors.machinery_id = 'Maquinaria es obligatoria';
  }

  if (!data.maintenance_type) {
    errors.maintenance_type = 'Tipo de mantenimiento es obligatorio';
  }

  if (!data.description || data.description.trim() === '') {
    errors.description = 'Descripción es obligatoria';
  }

  if (data.start_date && data.completion_date) {
    const start = new Date(data.start_date);
    const completion = new Date(data.completion_date);
    if (completion < start) {
      errors.completion_date = 'Fecha de finalización no puede ser anterior al inicio';
    }
  }

  if (data.labor_cost !== undefined && data.labor_cost !== null) {
    if (parseFloat(data.labor_cost) < 0) {
      errors.labor_cost = 'Costo de mano de obra no puede ser negativo';
    }
  }

  if (data.parts_cost !== undefined && data.parts_cost !== null) {
    if (parseFloat(data.parts_cost) < 0) {
      errors.parts_cost = 'Costo de repuestos no puede ser negativo';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validación de maquinaria
export function validarMaquinaria(data) {
  const errors = {};

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Nombre es obligatorio';
  }

  if (!data.type) {
    errors.type = 'Tipo de maquinaria es obligatorio';
  }

  if (data.purchase_date) {
    const purchaseDate = new Date(data.purchase_date);
    const today = new Date();
    if (purchaseDate > today) {
      errors.purchase_date = 'Fecha de compra no puede ser futura';
    }
  }

  if (data.cost_per_hour !== undefined && data.cost_per_hour !== null) {
    if (parseFloat(data.cost_per_hour) < 0) {
      errors.cost_per_hour = 'Costo por hora no puede ser negativo';
    }
  }

  if (data.fuel_consumption_per_hour !== undefined && data.fuel_consumption_per_hour !== null) {
    if (parseFloat(data.fuel_consumption_per_hour) < 0) {
      errors.fuel_consumption_per_hour = 'Consumo de combustible no puede ser negativo';
    }
  }

  if (data.insurance_expiry) {
    const expiryDate = new Date(data.insurance_expiry);
    const today = new Date();
    // Advertencia si ya venció
    if (expiryDate < today) {
      errors.insurance_expiry = 'ADVERTENCIA: Seguro vencido';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
