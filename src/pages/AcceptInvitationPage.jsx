/**
 * AcceptInvitationPage.jsx
 *
 * Página pública para aceptar invitaciones por email y crear cuenta
 * Flujo: Validar token → Mostrar detalles → Crear contraseña → Crear cuenta
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getInvitationByToken } from '../services/userInvitations';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function AcceptInvitationPage() {
  // Obtener token de la URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const { acceptInvitation } = useAuth();

  // Estado
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('validating'); // validating, form, success, error
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) {
          setError('Token no proporcionado');
          setStep('error');
          setLoading(false);
          return;
        }

        const result = await getInvitationByToken(token);

        if (result.success) {
          setInvitation(result.data);
          setStep('form');
        } else {
          setError(result.error);
          setStep('error');
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Error al validar la invitación');
        setStep('error');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Manejar submit del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validaciones
    if (!fullName.trim()) {
      setFormError('Por favor ingresa tu nombre');
      return;
    }

    if (!password) {
      setFormError('Por favor ingresa una contraseña');
      return;
    }

    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);

    try {
      const result = await acceptInvitation(token, password, fullName);

      if (result.success) {
        setStep('success');
      } else {
        setFormError(result.error?.message || 'Error al crear cuenta');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setFormError(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-green-100
                     flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Validando invitación...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-green-100
                     flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Invitación Inválida</h1>
                <p className="text-slate-600 mt-2">{error}</p>
              </div>
              <a
                href="/"
                className="inline-block mt-6 px-6 py-2.5 bg-green-600 hover:bg-green-700
                         text-white font-semibold rounded-lg transition-colors"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-green-100
                     flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">¡Bienvenido!</h1>
                <p className="text-slate-600 mt-2">
                  Tu cuenta ha sido creada exitosamente. Será redirigido al dashboard en unos momentos...
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-6">
                Si no es redirigido automáticamente,{' '}
                <a href="/" className="text-green-600 hover:text-green-700 font-medium">
                  haz clic aquí
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-green-100
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">🌾</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Campo Gestor
                </h1>
                <p className="text-sm text-slate-500">Aceptar Invitación</p>
              </div>
            </div>
          </div>

          {/* Invitation Info */}
          {invitation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase">Invitado a</p>
                <p className="text-lg font-bold text-green-900">{invitation.firms?.[0]?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-green-800">
                  <strong>Email:</strong> {invitation.email}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Rol:</strong> {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">{formError}</p>
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Nombre Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
                placeholder="Juan Pérez"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2
                               text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mínimo 8 caracteres
              </p>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2
                               text-slate-400" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700
                       hover:from-green-700 hover:to-green-800 text-white font-semibold
                       py-2.5 rounded-lg transition-all duration-200 flex items-center
                       justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Crear Cuenta
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              Al crear tu cuenta, aceptas los términos de servicio de Campo Gestor ERP.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <a href="/" className="text-green-600 hover:text-green-700 font-medium">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
