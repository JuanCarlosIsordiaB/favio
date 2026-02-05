/**
 * permissions.js
 *
 * Sistema completo de permisos para MÓDULO 13 - CONFIGURACIÓN
 * Implementa control granular por rol y módulo del sistema
 */

import { differenceInHours } from 'date-fns';

// ============================================================================
// DEFINICIÓN DE ROLES DEL SISTEMA
// ============================================================================

/**
 * Roles nuevos alineados con documentación de Módulo 13
 */
export const USER_ROLES = {
  ADMIN: 'administrador',
  COLLABORATOR: 'colaborador',
  VIEWER: 'visualizador'
};

/**
 * Roles legacy (para compatibilidad temporal)
 */
export const LEGACY_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

// ============================================================================
// DEFINICIÓN DE PERMISOS POR MÓDULO
// ============================================================================

/**
 * Permisos para Estructura Corporativa (Firmas, Predios, Dimensiones)
 */
export const STRUCTURE_PERMISSIONS = {
  VIEW: 'structure:view',
  CREATE: 'structure:create',
  EDIT: 'structure:edit',
  DELETE: 'structure:delete'
};

/**
 * Permisos para Operaciones Transaccionales (Trabajos, Movimientos, Insumos)
 */
export const OPERATIONAL_PERMISSIONS = {
  VIEW: 'operational:view',
  CREATE: 'operational:create',
  EDIT: 'operational:edit',
  DELETE: 'operational:delete'
};

/**
 * Permisos para Finanzas (Gastos, Ingresos, Pagos)
 */
export const FINANCIAL_PERMISSIONS = {
  VIEW: 'financial:view',
  VIEW_FULL: 'financial:view_full', // Solo admin
  CREATE: 'financial:create',
  EDIT: 'financial:edit',
  DELETE: 'financial:delete',
  APPROVE: 'financial:approve'
};

/**
 * Permisos para Reportes
 */
export const REPORT_PERMISSIONS = {
  VIEW_OPERATIONAL: 'reports:view_operational',
  VIEW_FINANCIAL: 'reports:view_financial', // Solo admin
  EXPORT: 'reports:export'
};

/**
 * Permisos para Gestión de Usuarios
 */
export const USER_PERMISSIONS = {
  VIEW: 'users:view',
  CREATE: 'users:create',
  EDIT: 'users:edit',
  DELETE: 'users:delete',
  INVITE: 'users:invite'
};

/**
 * Permisos para Monitoreo (mantener compatibilidad)
 */
export const MONITORING_PERMISSIONS = {
  CREATE: 'monitoring:create',
  READ: 'monitoring:read',
  DELETE: 'monitoring:delete',
  EDIT_HISTORICAL: 'monitoring:edit_historical'
};

/**
 * Permisos para Módulo 15 - KPIs y Umbrales (NUEVO)
 */
export const KPI_PERMISSIONS = {
  VIEW: 'kpi:view',
  EDIT_THRESHOLDS: 'kpi:edit_thresholds',
  VIEW_ALL: 'kpi:view_all', // Solo admin - ver KPIs de todas las firmas
  EDIT_MANDATORY: 'kpi:edit_mandatory' // Solo admin - editar KPIs obligatorios
};

// ============================================================================
// MATRIZ DE PERMISOS POR ROL
// ============================================================================

const ROLE_PERMISSIONS_MAP = {
  [USER_ROLES.ADMIN]: [
    // Estructura
    STRUCTURE_PERMISSIONS.VIEW,
    STRUCTURE_PERMISSIONS.CREATE,
    STRUCTURE_PERMISSIONS.EDIT,
    STRUCTURE_PERMISSIONS.DELETE,

    // Operaciones
    OPERATIONAL_PERMISSIONS.VIEW,
    OPERATIONAL_PERMISSIONS.CREATE,
    OPERATIONAL_PERMISSIONS.EDIT,
    OPERATIONAL_PERMISSIONS.DELETE,

    // Finanzas
    FINANCIAL_PERMISSIONS.VIEW,
    FINANCIAL_PERMISSIONS.VIEW_FULL,
    FINANCIAL_PERMISSIONS.CREATE,
    FINANCIAL_PERMISSIONS.EDIT,
    FINANCIAL_PERMISSIONS.DELETE,
    FINANCIAL_PERMISSIONS.APPROVE,

    // Reportes
    REPORT_PERMISSIONS.VIEW_OPERATIONAL,
    REPORT_PERMISSIONS.VIEW_FINANCIAL,
    REPORT_PERMISSIONS.EXPORT,

    // Usuarios
    USER_PERMISSIONS.VIEW,
    USER_PERMISSIONS.CREATE,
    USER_PERMISSIONS.EDIT,
    USER_PERMISSIONS.DELETE,
    USER_PERMISSIONS.INVITE,

    // Monitoreo
    MONITORING_PERMISSIONS.CREATE,
    MONITORING_PERMISSIONS.READ,
    MONITORING_PERMISSIONS.DELETE,
    MONITORING_PERMISSIONS.EDIT_HISTORICAL,

    // KPIs (Módulo 15)
    KPI_PERMISSIONS.VIEW,
    KPI_PERMISSIONS.EDIT_THRESHOLDS,
    KPI_PERMISSIONS.VIEW_ALL,
    KPI_PERMISSIONS.EDIT_MANDATORY
  ],

  [USER_ROLES.COLLABORATOR]: [
    // Estructura (solo lectura)
    STRUCTURE_PERMISSIONS.VIEW,

    // Operaciones (CRU - sin DELETE)
    OPERATIONAL_PERMISSIONS.VIEW,
    OPERATIONAL_PERMISSIONS.CREATE,
    OPERATIONAL_PERMISSIONS.EDIT,

    // Finanzas (vista limitada, sin crear/editar/eliminar)
    FINANCIAL_PERMISSIONS.VIEW,

    // Reportes (solo operacionales)
    REPORT_PERMISSIONS.VIEW_OPERATIONAL,

    // Monitoreo
    MONITORING_PERMISSIONS.CREATE,
    MONITORING_PERMISSIONS.READ,
    MONITORING_PERMISSIONS.DELETE, // Con ventana de 24h

    // KPIs (Módulo 15)
    KPI_PERMISSIONS.VIEW
  ],

  [USER_ROLES.VIEWER]: [
    // Estructura (solo lectura)
    STRUCTURE_PERMISSIONS.VIEW,

    // Operaciones (solo lectura)
    OPERATIONAL_PERMISSIONS.VIEW,

    // Reportes (solo operacionales)
    REPORT_PERMISSIONS.VIEW_OPERATIONAL,

    // Monitoreo
    MONITORING_PERMISSIONS.READ,

    // KPIs (Módulo 15)
    KPI_PERMISSIONS.VIEW
  ]
};

// ============================================================================
// FUNCIONES PRINCIPALES DE VERIFICACIÓN DE PERMISOS
// ============================================================================

/**
 * Verifica si un usuario tiene un permiso específico
 *
 * @param {Object} user - Usuario { id, role, email, ... }
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;

  const rolePermissions = ROLE_PERMISSIONS_MAP[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Verifica si un usuario tiene TODOS los permisos listados
 *
 * @param {Object} user
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos listados
 *
 * @param {Object} user
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Verifica si un usuario puede eliminar un registro de monitoreo
 * Integra lógica de ventana de 24h con sistema de roles
 *
 * @param {Object} user
 * @param {Object} record
 * @returns {boolean}
 */
export function canDeleteMonitoringRecord(user, record) {
  if (!user || !record) return false;

  // Administradores tienen acceso total
  if (user.role === USER_ROLES.ADMIN) {
    return true;
  }

  // Verificar que el usuario sea el creador del registro
  if (record.usuario !== user.full_name && record.usuario !== user.email) {
    return false;
  }

  // Calcular horas transcurridas
  try {
    const createdAt = new Date(record.created_at);
    const now = new Date();
    const hoursSinceCreation = differenceInHours(now, createdAt);

    // Permitir eliminación solo dentro de las primeras 24 horas
    return hoursSinceCreation < 24;
  } catch (error) {
    console.error('Error calculando diferencia de horas:', error);
    return false;
  }
}

/**
 * Verifica si un usuario puede editar un registro histórico
 *
 * @param {Object} user
 * @param {Object} record
 * @returns {boolean}
 */
export function canEditMonitoringRecord(user, record) {
  return canDeleteMonitoringRecord(user, record);
}

/**
 * Obtiene un mensaje descriptivo sobre por qué un registro no puede ser eliminado
 *
 * @param {Object} user
 * @param {Object} record
 * @returns {string}
 */
export function getDeleteRestrictionMessage(user, record) {
  if (!user || !record) {
    return 'Usuario o registro no válido';
  }

  // Administradores no tienen restricciones
  if (user.role === USER_ROLES.ADMIN) {
    return '';
  }

  // Verificar si es el creador
  if (record.usuario !== user.full_name && record.usuario !== user.email) {
    return 'Solo puedes eliminar tus propios registros';
  }

  // Calcular horas transcurridas
  try {
    const createdAt = new Date(record.created_at);
    const now = new Date();
    const hoursSinceCreation = differenceInHours(now, createdAt);

    if (hoursSinceCreation >= 24) {
      const daysSince = Math.floor(hoursSinceCreation / 24);
      return `Los registros solo pueden eliminarse durante las primeras 24 horas. Este registro tiene ${daysSince} día${daysSince > 1 ? 's' : ''}.`;
    }

    const hoursRemaining = 24 - hoursSinceCreation;
    return `Puedes eliminar este registro durante ${hoursRemaining} hora${hoursRemaining > 1 ? 's' : ''} más.`;
  } catch (error) {
    console.error('Error calculando mensaje:', error);
    return 'Error al verificar permisos';
  }
}

/**
 * Verifica si un usuario puede acceder a un módulo específico
 *
 * @param {Object} user
 * @param {string} module - Nombre del módulo
 * @returns {boolean}
 */
export function canAccessModule(user, module) {
  const MODULE_ACCESS = {
    // Módulos de Estructura (Accesibles a todos)
    firms: [STRUCTURE_PERMISSIONS.VIEW],
    premises: [STRUCTURE_PERMISSIONS.VIEW],
    alerts: [OPERATIONAL_PERMISSIONS.VIEW],
    records: [OPERATIONAL_PERMISSIONS.VIEW],

    // Módulos Operacionales (Accesibles a colaborador y admin)
    lots: [OPERATIONAL_PERMISSIONS.VIEW],
    livestock: [OPERATIONAL_PERMISSIONS.VIEW],
    inputs: [OPERATIONAL_PERMISSIONS.VIEW],
    works: [OPERATIONAL_PERMISSIONS.VIEW],
    gestiones: [OPERATIONAL_PERMISSIONS.VIEW],
    monitoring: [MONITORING_PERMISSIONS.READ],
    reports: [REPORT_PERMISSIONS.VIEW_OPERATIONAL],
    kpis: [KPI_PERMISSIONS.VIEW],

    // Módulos Financieros (Solo admin)
    finance: [FINANCIAL_PERMISSIONS.VIEW_FULL],
    'purchase-orders': [FINANCIAL_PERMISSIONS.VIEW_FULL],
    remittances: [FINANCIAL_PERMISSIONS.VIEW_FULL],
    'payment-orders': [FINANCIAL_PERMISSIONS.VIEW_FULL],

    // Módulos Administrativos (Solo admin)
    personnel: [USER_PERMISSIONS.VIEW],
    machinery: [USER_PERMISSIONS.VIEW],
    integrations: [USER_PERMISSIONS.VIEW],
    settings: [USER_PERMISSIONS.VIEW],
    users: [USER_PERMISSIONS.VIEW]
  };

  const requiredPermissions = MODULE_ACCESS[module];
  if (!requiredPermissions) return true; // Módulo no restringido

  return hasAnyPermission(user, requiredPermissions);
}

/**
 * Obtiene lista de módulos accesibles para un usuario
 *
 * @param {Object} user
 * @returns {string[]}
 */
export function getAccessibleModules(user) {
  const ALL_MODULES = [
    'alerts', 'firms', 'premises', 'lots', 'livestock',
    'inputs', 'works', 'finance', 'purchase-orders',
    'remittances', 'payment-orders', 'monitoring',
    'reports', 'kpis', 'personnel', 'machinery', 'settings', 'users'
  ];

  return ALL_MODULES.filter(module => canAccessModule(user, module));
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/**
 * Calcula el tiempo restante (en horas) para editar/eliminar un registro
 *
 * @param {Object} record
 * @returns {number}
 */
export function getTimeRemainingForEdit(record) {
  if (!record || !record.created_at) return 0;

  try {
    const createdAt = new Date(record.created_at);
    const now = new Date();
    const hoursSinceCreation = differenceInHours(now, createdAt);
    const hoursRemaining = 24 - hoursSinceCreation;

    return Math.max(0, hoursRemaining);
  } catch (error) {
    console.error('Error calculando tiempo restante:', error);
    return 0;
  }
}

/**
 * Verifica si un registro está dentro de la ventana de edición (24 horas)
 *
 * @param {Object} record
 * @returns {boolean}
 */
export function isWithinEditWindow(record) {
  return getTimeRemainingForEdit(record) > 0;
}

/**
 * Formatea el tiempo restante en formato legible
 *
 * @param {number} hours
 * @returns {string}
 */
export function formatTimeRemaining(hours) {
  if (hours <= 0) return 'Expirado';
  if (hours >= 1) return `${Math.floor(hours)} hora${Math.floor(hours) > 1 ? 's' : ''}`;

  const minutes = Math.floor(hours * 60);
  return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
}

/**
 * Formatea el nombre del rol para display
 *
 * @param {string} role
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  const ROLE_NAMES = {
    [USER_ROLES.ADMIN]: 'Administrador',
    [USER_ROLES.COLLABORATOR]: 'Colaborador',
    [USER_ROLES.VIEWER]: 'Visualizador',
    // Legacy
    [LEGACY_ROLES.ADMIN]: 'Administrador',
    [LEGACY_ROLES.MANAGER]: 'Manager',
    [LEGACY_ROLES.OPERATOR]: 'Operador',
    [LEGACY_ROLES.VIEWER]: 'Visualizador'
  };

  return ROLE_NAMES[role] || role;
}

/**
 * Obtiene el color del badge según el rol
 *
 * @param {string} role
 * @returns {string}
 */
export function getRoleColor(role) {
  const ROLE_COLORS = {
    [USER_ROLES.ADMIN]: 'red',
    [USER_ROLES.COLLABORATOR]: 'blue',
    [USER_ROLES.VIEWER]: 'gray',
    // Legacy
    [LEGACY_ROLES.ADMIN]: 'red',
    [LEGACY_ROLES.MANAGER]: 'blue',
    [LEGACY_ROLES.OPERATOR]: 'yellow',
    [LEGACY_ROLES.VIEWER]: 'gray'
  };

  return ROLE_COLORS[role] || 'gray';
}
