/**
 * PermissionGuard.jsx
 *
 * Higher-Order Component (HOC) para proteger componentes por permisos
 * Valida permisos antes de renderizar un componente
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../../lib/permissions';
import AccessDenied from './AccessDenied';

/**
 * Protege un componente con validación de permisos
 *
 * Uso:
 *   <PermissionGuard permission="financial:view" fallback={<CustomFallback />}>
 *     <FinanceManager />
 *   </PermissionGuard>
 *
 * O con HOC:
 *   const ProtectedFinance = withPermission(FinanceManager, 'financial:view');
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente a proteger
 * @param {string|string[]} props.permission - Permiso(s) requerido(s)
 * @param {string} props.mode - 'single', 'all', 'any' (default: 'single')
 * @param {React.ReactNode} props.fallback - Componente a mostrar si no tiene permisos
 * @param {string} props.message - Mensaje personalizado de acceso denegado
 */
export function PermissionGuard({
  children,
  permission,
  mode = 'single',
  fallback = <AccessDenied />,
  message
}) {
  const { user } = useAuth();

  if (!user) {
    return fallback;
  }

  // Determinar si tiene permiso
  let hasAccess = false;

  if (mode === 'all' && Array.isArray(permission)) {
    hasAccess = hasAllPermissions(user, permission);
  } else if (mode === 'any' && Array.isArray(permission)) {
    hasAccess = hasAnyPermission(user, permission);
  } else if (typeof permission === 'string') {
    hasAccess = hasPermission(user, permission);
  } else if (Array.isArray(permission)) {
    // Default a 'any' para arrays
    hasAccess = hasAnyPermission(user, permission);
  }

  if (!hasAccess) {
    // Si es fallback personalizado, renderizar
    if (fallback) {
      return typeof fallback === 'function'
        ? fallback({ user, permission, message })
        : fallback;
    }

    return <AccessDenied message={message} />;
  }

  return children;
}

/**
 * HOC para envolver componentes con protección de permisos
 *
 * Uso:
 *   export default withPermission(FinanceManager, 'financial:view');
 *
 * @param {React.Component} Component - Componente a proteger
 * @param {string|string[]} permission - Permiso(s) requerido(s)
 * @param {Object} options - Opciones adicionales
 * @returns {React.Component} Componente protegido
 */
export function withPermission(Component, permission, options = {}) {
  return function PermissionGuardWrapper(props) {
    return (
      <PermissionGuard
        permission={permission}
        mode={options.mode}
        fallback={options.fallback}
        message={options.message}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Hook para verificar permisos en componentes
 *
 * Uso:
 *   const { canAccess, user } = usePermissionCheck('financial:view');
 *   if (!canAccess) return <AccessDenied />;
 *
 * @param {string|string[]} permission - Permiso(s) a verificar
 * @param {string} mode - 'single', 'all', 'any'
 * @returns {Object} { canAccess: boolean, user: userObject }
 */
export function usePermissionCheck(permission, mode = 'single') {
  const { user } = useAuth();

  let canAccess = false;

  if (!user) {
    return { canAccess: false, user: null };
  }

  if (mode === 'all' && Array.isArray(permission)) {
    canAccess = hasAllPermissions(user, permission);
  } else if (mode === 'any' && Array.isArray(permission)) {
    canAccess = hasAnyPermission(user, permission);
  } else if (typeof permission === 'string') {
    canAccess = hasPermission(user, permission);
  } else if (Array.isArray(permission)) {
    canAccess = hasAnyPermission(user, permission);
  }

  return { canAccess, user };
}

/**
 * Hook para renderizado condicional basado en permisos
 *
 * Uso:
 *   const { show, canDelete, canEdit } = usePermissions({
 *     delete: 'financial:delete',
 *     edit: 'financial:edit'
 *   });
 *
 * @param {Object} permissions - Objeto de { key: permission }
 * @returns {Object} Objeto con propiedades booleanas de acceso
 */
export function usePermissions(permissions) {
  const { user } = useAuth();

  const result = {};

  if (!user) {
    Object.keys(permissions).forEach(key => {
      result[key] = false;
    });
    return result;
  }

  Object.entries(permissions).forEach(([key, perm]) => {
    if (typeof perm === 'string') {
      result[key] = hasPermission(user, perm);
    } else if (Array.isArray(perm)) {
      result[key] = hasAnyPermission(user, perm);
    }
  });

  return result;
}

export default PermissionGuard;
