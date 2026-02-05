import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar campos
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      setLoading(false);
      return;
    }

    const result = await signIn(email, password);

    if (result.success) {
      // El redirección se maneja automáticamente en App.jsx
      // cuando detecta que el usuario está autenticado
    } else {
      setError(
        result.error?.message ||
        'Error al iniciar sesión. Por favor intenta nuevamente.'
      );
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-green-100
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card principal */}
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
                <p className="text-sm text-slate-500">ERP Agrícola</p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2
                               text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300
                            rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500
                            focus:border-transparent transition-all"
                  placeholder="usuario@ejemplo.com"
                  disabled={loading}
                />
              </div>
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
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300
                            rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500
                            focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700
                       hover:from-green-700 hover:to-green-800 text-white font-semibold
                       py-2.5 rounded-lg transition-all duration-200 flex items-center
                       justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">O</span>
            </div>
          </div>

          {/* Recovery Links */}
          <div className="space-y-2">
            <a
              href="/forgot-password"
              className="block text-center text-sm text-green-600 hover:text-green-700
                       font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-slate-600">
            ¿Eres nuevo usuario?
          </p>
          <p className="text-xs text-slate-500">
            Contacta con tu administrador para recibir una invitación
          </p>
        </div>

        {/* Demo Credentials (Solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              🧪 Credenciales de Demo (Solo desarrollo)
            </p>
            <div className="space-y-1 text-xs text-blue-800">
              <p>
                <strong>Admin:</strong> admin@test.com / password123
              </p>
              <p>
                <strong>Colaborador:</strong> collab@test.com / password123
              </p>
              <p>
                <strong>Visualizador:</strong> viewer@test.com / password123
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
