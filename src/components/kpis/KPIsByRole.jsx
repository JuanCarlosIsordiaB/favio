/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Wrapper KPIDashboard con control de rol
 */

import React, { useMemo } from 'react';
import { normalizeRole, DB_ROLES } from '../../lib/roleMapping';
import KPIDashboard from './KPIDashboard';

/**
 * Wrapper que filtra KPIs según el rol del usuario
 * - ADMIN: Ve todos los KPIs
 * - COLLABORATOR: No ve KPIs económicos
 * - VIEWER: Solo operativos
 */
export default function KPIsByRole({ firmId, premiseId, currentUser }) {
  const userRole = normalizeRole(currentUser?.role);

  // Validar acceso
  const canAccess = useMemo(() => {
    const allowedRoles = [DB_ROLES.ADMIN, DB_ROLES.COLLABORATOR, DB_ROLES.VIEWER];
    return allowedRoles.includes(userRole);
  }, [userRole]);

  if (!canAccess) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>No tienes permisos para acceder al módulo de KPIs</p>
      </div>
    );
  }

  return (
    <KPIDashboard
      firmId={firmId}
      premiseId={premiseId}
      userRole={userRole}
    />
  );
}
