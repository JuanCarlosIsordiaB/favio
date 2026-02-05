/**
 * AccessDenied.jsx
 *
 * Componente para mostrar cuando el usuario no tiene permisos para acceder a una sección
 */

import React from 'react';
import { Lock, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDisplayName } from '../../lib/permissions';

export default function AccessDenied({ message, actionButton = null }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Title y Mensaje */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Acceso Denegado</h1>
            <p className="text-slate-600">
              {message || 'No tienes permisos para acceder a esta sección.'}
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Tu cuenta</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Rol</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {getRoleDisplayName(user.role)}
                </p>
              </div>
            </div>
          )}

          {/* Explicación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Esta acción requiere permisos especiales. Contacta con un administrador si crees que deberías tener acceso.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {actionButton ? (
              actionButton
            ) : (
              <>
                <a
                  href="/"
                  className="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-semibold
                           rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Home size={18} />
                  Ir al Inicio
                </a>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Código: PERMISSION_DENIED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
