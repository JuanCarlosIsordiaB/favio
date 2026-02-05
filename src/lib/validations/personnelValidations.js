// Validación de cédula uruguaya (formato básico)
export function validarCedulaUY(cedula) {
  if (!cedula) return false;
  const cleanCedula = cedula.replace(/[.-]/g, '');
  return /^\d{7,8}$/.test(cleanCedula);
}

// Validación de email
export function validarEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validación de teléfono uruguayo
export function validarTelefonoUY(phone) {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  return /^(?:0?9\d{7,8}|0?[24]\d{6,7})$/.test(cleanPhone);
}

// Validación completa de datos de personal
export function validarDatosPersonal(data, isEdit = false) {
  const errors = {};

  // Nombre completo
  if (!data.full_name || data.full_name.trim() === '') {
    errors.full_name = 'Nombre completo es obligatorio';
  } else if (data.full_name.trim().length < 3) {
    errors.full_name = 'Nombre debe tener al menos 3 caracteres';
  }

  // Documento
  if (!data.document_id || data.document_id.trim() === '') {
    errors.document_id = 'Documento es obligatorio';
  } else if (!validarCedulaUY(data.document_id)) {
    errors.document_id = 'Cédula inválida (formato: 1234567-8)';
  }

  // Email (opcional pero si existe debe ser válido)
  if (data.email && !validarEmail(data.email)) {
    errors.email = 'Email inválido';
  }

  // Teléfono (opcional pero si existe debe ser válido)
  if (data.phone && !validarTelefonoUY(data.phone)) {
    errors.phone = 'Teléfono inválido';
  }

  // Rol
  if (!data.role) {
    errors.role = 'Rol es obligatorio';
  }

  // Cargo
  if (!data.position_title || data.position_title.trim() === '') {
    errors.position_title = 'Cargo es obligatorio';
  }

  // Fecha de ingreso
  if (!data.hire_date) {
    errors.hire_date = 'Fecha de ingreso es obligatoria';
  } else {
    const hireDate = new Date(data.hire_date);
    const today = new Date();
    if (hireDate > today) {
      errors.hire_date = 'Fecha de ingreso no puede ser futura';
    }
  }

  // Salario (opcional pero debe ser positivo)
  if (data.salary_amount !== undefined && data.salary_amount !== null) {
    if (parseFloat(data.salary_amount) < 0) {
      errors.salary_amount = 'Salario no puede ser negativo';
    }
  }

  // Costo por hora (opcional pero debe ser positivo)
  if (data.cost_per_hour !== undefined && data.cost_per_hour !== null) {
    if (parseFloat(data.cost_per_hour) < 0) {
      errors.cost_per_hour = 'Costo por hora no puede ser negativo';
    }
  }

  // Jerarquía (no puede reportar a sí mismo)
  if (isEdit && data.reports_to_id && data.id && data.reports_to_id === data.id) {
    errors.reports_to_id = 'El personal no puede reportar a sí mismo';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validación de capacitación
export function validarCapacitacion(data) {
  const errors = {};

  if (!data.training_name || data.training_name.trim() === '') {
    errors.training_name = 'Nombre de capacitación es obligatorio';
  }

  if (!data.training_type) {
    errors.training_type = 'Tipo de capacitación es obligatorio';
  }

  if (data.start_date && data.completion_date) {
    const start = new Date(data.start_date);
    const completion = new Date(data.completion_date);
    if (completion < start) {
      errors.completion_date = 'Fecha de finalización no puede ser anterior al inicio';
    }
  }

  if (data.completion_date && data.expiration_date) {
    const completion = new Date(data.completion_date);
    const expiration = new Date(data.expiration_date);
    if (expiration < completion) {
      errors.expiration_date = 'Fecha de vencimiento no puede ser anterior a la finalización';
    }
  }

  if (data.cost_amount !== undefined && data.cost_amount !== null) {
    if (parseFloat(data.cost_amount) < 0) {
      errors.cost_amount = 'Costo no puede ser negativo';
    }
  }

  if (data.score !== undefined && data.score !== null) {
    const score = parseFloat(data.score);
    if (score < 0 || score > 100) {
      errors.score = 'Calificación debe estar entre 0 y 100';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validación de asignación
export function validarAsignacion(data) {
  const errors = {};

  if (!data.personnel_id) {
    errors.personnel_id = 'Personal es obligatorio';
  }

  if (!data.assignment_type) {
    errors.assignment_type = 'Tipo de asignación es obligatorio';
  }

  // Validación específica según tipo de asignación
  if (data.assignment_type === 'work') {
    // Para trabajos, debe haber al menos un trabajo agrícola o ganadero
    if (!data.agricultural_work_id && !data.livestock_work_id) {
      errors.reference = 'Debe especificar un trabajo agrícola o ganadero';
    }
  } else if (data.assignment_type === 'machinery') {
    // Para maquinaria, debe haber un machinery_id
    if (!data.machinery_id) {
      errors.machinery_id = 'Debe seleccionar una máquina';
    }
  }
  // Para otros tipos (proyecto, supervisión, otro), no se requiere referencia

  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) {
      errors.end_date = 'Fecha fin no puede ser anterior al inicio';
    }
  }

  if (data.hours_assigned !== undefined && data.hours_assigned !== null) {
    if (parseFloat(data.hours_assigned) < 0) {
      errors.hours_assigned = 'Horas no pueden ser negativas';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
