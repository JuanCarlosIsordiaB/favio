/**
 * UsersManager.jsx
 *
 * Gestor completo de usuarios y permisos por firma
 * Incluye: lista de usuarios, invitaciones pendientes, cambio de rol, revocación de acceso
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Mail, MoreVertical, Trash2, Edit2, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getFirmUsers,
  listPendingInvitations,
  updateUserRole,
  revokeUserAccess,
  revokeInvitation,
  resendInvitationEmail
} from '../services/userInvitations';
import { getRoleDisplayName, getRoleColor } from '../lib/permissions';
import UserInvitationModal from './modales/UserInvitationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function UsersManager({ firmId, firmName }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'administrador';

  // Estado
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    setError('');

    try {
      const [usersResult, invitationsResult] = await Promise.all([
        getFirmUsers(firmId),
        listPendingInvitations(firmId)
      ]);

      if (usersResult.success) {
        setUsers(usersResult.data || []);
      } else {
        setError(usersResult.error);
      }

      if (invitationsResult.success) {
        setInvitations(invitationsResult.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejar cambio de rol
  const handleRoleChange = async (userFirmAccessId, newRole) => {
    try {
      const result = await updateUserRole(userFirmAccessId, newRole);
      if (result.success) {
        toast.success('Rol actualizado');
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al actualizar rol');
    }
    setEditingRoleId(null);
  };

  // Revocar acceso
  const handleRevokeAccess = async (userFirmAccessId) => {
    if (!confirm('¿Estás seguro de que deseas revocar el acceso a este usuario?')) {
      return;
    }

    try {
      const result = await revokeUserAccess(userFirmAccessId);
      if (result.success) {
        toast.success('Acceso revocado');
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al revocar acceso');
    }
  };

  // Revocar invitación
  const handleRevokeInvitation = async (invitationId) => {
    if (!confirm('¿Estás seguro de que deseas revocar esta invitación?')) {
      return;
    }

    try {
      const result = await revokeInvitation(invitationId);
      if (result.success) {
        toast.success('Invitación revocada');
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al revocar invitación');
    }
  };

  // Reenviar email
  const handleResendEmail = async (invitationId) => {
    try {
      const result = await resendInvitationEmail(invitationId, firmName);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al reenviar email');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios y Permisos</h2>
          <p className="text-sm text-slate-600 mt-1">{firmName}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvitationModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium
                     rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Invitar Usuario
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Invitaciones Pendientes */}
      {invitations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Mail size={18} />
            Invitaciones Pendientes ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white border border-blue-100 rounded p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{inv.email}</p>
                  <p className="text-xs text-slate-500">
                    Rol: <span className="font-medium">{getRoleDisplayName(inv.role)}</span>
                    {' • '}
                    Expira: {formatDistanceToNow(new Date(inv.expires_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleResendEmail(inv.id)}
                        title="Reenviar email"
                        className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Mail size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        title="Revocar invitación"
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      >
                        <X size={16} className="text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Usuario</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Rol</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Último Acceso</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                {isAdmin && <th className="px-6 py-3 text-right font-semibold text-slate-900">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500">
                    No hay usuarios en esta firma
                  </td>
                </tr>
              ) : (
                users.map((access) => {
                  const userData = access.users?.[0] || {};
                  const isEditing = editingRoleId === access.id;

                  return (
                    <tr key={access.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{userData.full_name || 'Sin nombre'}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{userData.email}</td>
                      <td className="px-6 py-4">
                        {isEditing && isAdmin ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => handleRoleChange(access.id, e.target.value)}
                            onBlur={() => setEditingRoleId(null)}
                            autoFocus
                            className="px-2 py-1 border border-slate-300 rounded bg-white text-sm"
                          >
                            <option value="administrador">Administrador</option>
                            <option value="colaborador">Colaborador</option>
                            <option value="visualizador">Visualizador</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => {
                              if (isAdmin) {
                                setEditingRoleId(access.id);
                                setSelectedRole(access.role);
                              }
                            }}
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                              ${access.role === 'administrador' ? 'bg-red-100 text-red-800' : ''}
                              ${access.role === 'colaborador' ? 'bg-blue-100 text-blue-800' : ''}
                              ${access.role === 'visualizador' ? 'bg-gray-100 text-gray-800' : ''}
                              ${isAdmin ? 'cursor-pointer hover:opacity-75' : ''}`}
                          >
                            {getRoleDisplayName(access.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {userData.last_login_at ? (
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDistanceToNow(new Date(userData.last_login_at), { locale: es, addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Nunca</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {userData.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                            <CheckCircle size={14} />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                            <AlertCircle size={14} />
                            Inactivo
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                                <MoreVertical size={18} className="text-slate-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingRoleId(access.id);
                                  setSelectedRole(access.role);
                                }}
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <Edit2 size={16} />
                                Cambiar Rol
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRevokeAccess(access.id)}
                                className="cursor-pointer flex items-center gap-2 text-red-600"
                              >
                                <Trash2 size={16} />
                                Revocar Acceso
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Nota:</strong> Solo los administradores pueden invitar usuarios, cambiar roles y revocar accesos.
        </p>
      </div>

      {/* Modal de Invitación */}
      <UserInvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        firmId={firmId}
        firmName={firmName}
        onSuccess={loadData}
      />
    </div>
  );
}
