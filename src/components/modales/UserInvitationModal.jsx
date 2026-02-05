/**
 * UserInvitationModal.jsx
 *
 * Modal para invitar nuevos usuarios a una firma
 * Maneja: email, selección de rol, validación y envío de invitación
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createUserInvitation } from '../../services/userInvitations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

// Descripciones de roles
const ROLE_DESCRIPTIONS = {
  administrador: {
    title: 'Administrador',
    description: 'Acceso completo a todos los módulos y funciones. Puede gestionar usuarios, firmas, predios y finanzas.',
    color: 'red'
  },
  colaborador: {
    title: 'Colaborador',
    description: 'Puede crear y editar trabajos e insumos. No tiene acceso a módulo de finanzas ni puede eliminar registros.',
    color: 'blue'
  },
  visualizador: {
    title: 'Visualizador',
    description: 'Acceso de solo lectura. Puede visualizar datos pero no crear ni editar registros.',
    color: 'gray'
  }
};

export default function UserInvitationModal({
  isOpen,
  onClose,
  firmId,
  firmName,
  onSuccess
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('colaborador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Limpiar form al abrir/cerrar
  const handleOpenChange = (open) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setEmail('');
    setRole('colaborador');
    setError('');
    setSuccess(false);
  };

  // Validar email
  const validateEmail = (emailValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Manejar envío
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!email.trim()) {
      setError('Por favor ingresa un email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (!role) {
      setError('Por favor selecciona un rol');
      return;
    }

    setLoading(true);

    try {
      const result = await createUserInvitation(
        email,
        firmId,
        role,
        user.id,
        firmName
      );

      if (result.success) {
        setSuccess(true);
        toast.success(result.message || 'Invitación enviada correctamente');

        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          if (onSuccess) onSuccess();
          handleOpenChange(false);
        }, 2000);
      } else {
        setError(result.error || 'Error al enviar invitación');
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error inesperado');
      toast.error('Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación a {firmName}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          // Pantalla de éxito
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                ¡Invitación enviada!
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Se ha enviado un email a <strong>{email}</strong> con instrucciones para aceptar la invitación.
              </p>
            </div>
          </div>
        ) : (
          // Formulario
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Email del Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="usuario@ejemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
                />
              </div>
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
              >
                <option value="administrador">Administrador</option>
                <option value="colaborador">Colaborador</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </div>

            {/* Role Description */}
            {role && ROLE_DESCRIPTIONS[role] && (
              <div className={`bg-${ROLE_DESCRIPTIONS[role].color}-50 border border-${ROLE_DESCRIPTIONS[role].color}-200 rounded-lg p-4`}>
                <div className="flex gap-3">
                  <Shield className={`w-5 h-5 text-${ROLE_DESCRIPTIONS[role].color}-600 flex-shrink-0 mt-0.5`} />
                  <div className="space-y-1">
                    <p className={`font-semibold text-${ROLE_DESCRIPTIONS[role].color}-900`}>
                      {ROLE_DESCRIPTIONS[role].title}
                    </p>
                    <p className={`text-sm text-${ROLE_DESCRIPTIONS[role].color}-800`}>
                      {ROLE_DESCRIPTIONS[role].description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                Se enviará un email con un link para aceptar la invitación. El link expirará en 7 días.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium
                         rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar Invitación'
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
