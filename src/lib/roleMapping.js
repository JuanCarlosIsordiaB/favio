/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Utilidad: Mapeo de roles entre BD y Frontend
 *
 * IMPORTANTE: La base de datos usa roles en ESPAÑOL (definido en migración 20260118)
 * - administrador
 * - colaborador
 * - visualizador
 *
 * Esta utilidad centraliza todas las constantes y funciones de mapeo de roles
 * para evitar discrepancias entre BD y Frontend.
 */

// ============================================================================
// CONSTANTES DE ROLES (Fuente de Verdad: Base de Datos)
// ============================================================================

/**
 * Roles válidos en la base de datos
 * Estos son los ÚNICOS valores permitidos en la columna users.role
 */
export const DB_ROLES = {
  ADMIN: 'administrador',
  COLLABORATOR: 'colaborador',
  VIEWER: 'visualizador'
};

/**
 * Alias para frontend (compatibilidad)
 * Siempre mapea a DB_ROLES
 */
export const FRONTEND_ROLES = {
  ADMIN: DB_ROLES.ADMIN,
  COLLABORATOR: DB_ROLES.COLLABORATOR,
  VIEWER: DB_ROLES.VIEWER
};

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normalizar rol desde BD a formato consistente
 * Maneja variantes legacy y valores inválidos
 *
 * @param {string} role - Rol desde base de datos o input del usuario
 * @returns {string} Rol normalizado (uno de DB_ROLES)
 *
 * @example
 * normalizeRole('administrador') // 'administrador'
 * normalizeRole('ADMIN') // 'administrador' (normaliza legacy)
 * normalizeRole('invalid') // 'visualizador' (default seguro)
 */
export function normalizeRole(role) {
  if (!role) return DB_ROLES.VIEWER;

  const normalized = role.toLowerCase().trim();

  // Mapeo de roles (incluyendo variantes legacy y formatos alternativos)
  const roleMap = {
    'administrador': DB_ROLES.ADMIN,
    'admin': DB_ROLES.ADMIN,
    'administrator': DB_ROLES.ADMIN,
    'collab': DB_ROLES.COLLABORATOR,
    'colaborador': DB_ROLES.COLLABORATOR,
    'collaborator': DB_ROLES.COLLABORATOR,
    'manager': DB_ROLES.COLLABORATOR,
    'view': DB_ROLES.VIEWER,
    'viewer': DB_ROLES.VIEWER,
    'visualizer': DB_ROLES.VIEWER,
    'visualizador': DB_ROLES.VIEWER,
    'read-only': DB_ROLES.VIEWER
  };

  return roleMap[normalized] || DB_ROLES.VIEWER;
}

/**
 * Verificar si un rol tiene un permiso específico
 *
 * @param {string} role - Rol del usuario
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 *
 * @example
 * hasPermission('administrador', 'kpi:edit_thresholds') // true
 * hasPermission('colaborador', 'kpi:edit_thresholds') // false
 */
export function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);

  // Matriz de permisos por rol
  const permissions = {
    [DB_ROLES.ADMIN]: [
      'kpi:view',
      'kpi:edit_thresholds',
      'kpi:view_all_categories',
      'kpi:download_reports',
      'kpi:view_audit',
      'kpi:create_custom',
      'kpi:manage_alerts'
    ],
    [DB_ROLES.COLLABORATOR]: [
      'kpi:view',
      'kpi:view_operational',  // productivos + pasturas + gestión
      'kpi:download_reports',
      'kpi:resolve_alerts'
    ],
    [DB_ROLES.VIEWER]: [
      'kpi:view',
      'kpi:view_operational'  // solo productivos + pasturas
    ]
  };

  return permissions[normalizedRole]?.includes(permission) || false;
}

/**
 * Obtener categorías de KPI visibles según el rol
 *
 * @param {string} role - Rol del usuario
 * @returns {string[]} Array de códigos de categorías permitidas
 *
 * @example
 * getAllowedKPICategories('administrador')
 * // ['PRODUCTIVO_GANADERO', 'ECONOMICO', 'PASTURAS', 'GESTION']
 *
 * getAllowedKPICategories('colaborador')
 * // ['PRODUCTIVO_GANADERO', 'PASTURAS', 'GESTION']
 *
 * getAllowedKPICategories('visualizador')
 * // ['PRODUCTIVO_GANADERO', 'PASTURAS']
 */
export function getAllowedKPICategories(role) {
  const normalizedRole = normalizeRole(role);

  const categoryMap = {
    [DB_ROLES.ADMIN]: [
      'PRODUCTIVO_GANADERO',
      'ECONOMICO',
      'PASTURAS',
      'GESTION'
    ],
    [DB_ROLES.COLLABORATOR]: [
      'PRODUCTIVO_GANADERO',
      'PASTURAS',
      'GESTION'
    ],
    [DB_ROLES.VIEWER]: [
      'PRODUCTIVO_GANADERO',
      'PASTURAS'
    ]
  };

  return categoryMap[normalizedRole] || [];
}

/**
 * Verificar si usuario puede editar umbrales de KPI
 * Solo ADMIN puede editar
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canEditThresholds(role) {
  return normalizeRole(role) === DB_ROLES.ADMIN;
}

/**
 * Verificar si usuario puede ver KPIs económicos
 * Solo ADMIN puede ver
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canViewEconomicKPIs(role) {
  return normalizeRole(role) === DB_ROLES.ADMIN;
}

/**
 * Verificar si usuario puede ver KPIs de gestión
 * ADMIN y COLLABORATOR pueden ver
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canViewManagementKPIs(role) {
  const normalizedRole = normalizeRole(role);
  return [DB_ROLES.ADMIN, DB_ROLES.COLLABORATOR].includes(normalizedRole);
}

/**
 * Verificar si usuario puede descargar reportes
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canDownloadReports(role) {
  const normalizedRole = normalizeRole(role);
  return [DB_ROLES.ADMIN, DB_ROLES.COLLABORATOR].includes(normalizedRole);
}

/**
 * Verificar si usuario puede ver auditoría
 * Solo ADMIN puede ver
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canViewAudit(role) {
  return normalizeRole(role) === DB_ROLES.ADMIN;
}

/**
 * Obtener descripción legible del rol
 *
 * @param {string} role - Rol del usuario
 * @returns {string} Descripción del rol
 */
export function getRoleDescription(role) {
  const normalizedRole = normalizeRole(role);

  const descriptions = {
    [DB_ROLES.ADMIN]: 'Administrador - Acceso completo a KPIs y configuración',
    [DB_ROLES.COLLABORATOR]: 'Colaborador - Acceso a KPIs operativos y reportes',
    [DB_ROLES.VIEWER]: 'Visualizador - Solo lectura de KPIs operativos'
  };

  return descriptions[normalizedRole] || 'Rol desconocido';
}

/**
 * Validar que un rol es válido
 *
 * @param {string} role - Rol a validar
 * @returns {boolean}
 */
export function isValidRole(role) {
  const normalized = normalizeRole(role);
  return Object.values(DB_ROLES).includes(normalized);
}

/**
 * Obtener nombre corto del rol para UI
 *
 * @param {string} role - Rol del usuario
 * @returns {string} Nombre corto (ej. "Admin", "Collab", "Viewer")
 */
export function getShortRoleName(role) {
  const normalizedRole = normalizeRole(role);

  const shortNames = {
    [DB_ROLES.ADMIN]: 'Admin',
    [DB_ROLES.COLLABORATOR]: 'Collab',
    [DB_ROLES.VIEWER]: 'Viewer'
  };

  return shortNames[normalizedRole] || 'Unknown';
}

// ============================================================================
// VALIDACIÓN DE ACCESO (Para componentes/vistas)
// ============================================================================

/**
 * Validar acceso a módulo KPI
 * Todos pueden acceder al módulo, pero ven contenido filtrado por rol
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canAccessKPIModule(role) {
  const normalizedRole = normalizeRole(role);
  return Object.values(DB_ROLES).includes(normalizedRole);
}

/**
 * Validar acceso a editor de umbrales (solo ADMIN)
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canAccessThresholdsEditor(role) {
  return canEditThresholds(role);
}

/**
 * Validar acceso a reportes (ADMIN + COLLABORATOR)
 *
 * @param {string} role - Rol del usuario
 * @returns {boolean}
 */
export function canAccessReports(role) {
  return canDownloadReports(role);
}

// ============================================================================
// EXPORTAR TODAS LAS FUNCIONES COMO OBJETO TAMBIÉN (alternativa de uso)
// ============================================================================

export const RoleUtils = {
  normalizeRole,
  hasPermission,
  getAllowedKPICategories,
  canEditThresholds,
  canViewEconomicKPIs,
  canViewManagementKPIs,
  canDownloadReports,
  canViewAudit,
  getRoleDescription,
  isValidRole,
  getShortRoleName,
  canAccessKPIModule,
  canAccessThresholdsEditor,
  canAccessReports,
  DB_ROLES,
  FRONTEND_ROLES
};
