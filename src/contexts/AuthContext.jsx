import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const AuthContext = createContext();

// Credenciales de demo para testing en desarrollo
const DEMO_CREDENTIALS = {
  'admin@test.com': { password: 'password123', role: 'administrador' },
  'collab@test.com': { password: 'password123', role: 'colaborador' },
  'viewer@test.com': { password: 'password123', role: 'visualizador' }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userFirms, setUserFirms] = useState([]);

  // ============================================================================
  // INICIALIZAR SESIÓN AL MONTAR EL COMPONENTE
  // ============================================================================
  useEffect(() => {
    // Verificar sesión existente
    checkSession();

    // Listener para cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, authSession) => {
        console.log('Auth state changed:', event);
        setSession(authSession);

        try {
          if (authSession?.user) {
            // Agregar timeout de 5 segundos para loadUserData
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout loading user data')), 5000)
            );

            await Promise.race([
              loadUserData(authSession.user.id),
              timeoutPromise
            ]);
          } else {
            setUser(null);
            setUserFirms([]);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          // No fallar completamente, solo continuar sin datos de usuario
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // ============================================================================
  // VERIFICAR SESIÓN EXISTENTE
  // ============================================================================
  async function checkSession() {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      console.log('Session restored from localStorage:', authSession?.user?.id);
      setSession(authSession);

      // CRÍTICO: Establecer la sesión en el cliente Supabase para que incluya el JWT en las requests
      if (authSession) {
        console.log('Setting session in Supabase client...');
        await supabase.auth.setSession({
          access_token: authSession.access_token,
          refresh_token: authSession.refresh_token
        });
        console.log('Session set in Supabase client');
      }

      if (authSession?.user) {
        await loadUserData(authSession.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // CARGAR DATOS DEL USUARIO Y SUS FIRMAS
  // ============================================================================
  async function loadUserData(userId) {
    try {
      // Cargar datos del usuario desde public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        throw userError;
      }

      // Cargar firmas accesibles para este usuario
      const { data: firmAccess, error: firmError } = await supabase
        .from('user_firm_access')
        .select(`
          firm_id,
          role,
          is_default,
          firms:firm_id (
            id,
            name,
            rut,
            location,
            currency,
            management_currency,
            taxpayer_profile,
            business_units
          )
        `)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .order('is_default', { ascending: false });

      if (firmError) {
        console.error('Error loading firm access:', firmError);
        throw firmError;
      }

      setUser({
        ...userData,
        id: userId
      });

      setUserFirms(firmAccess || []);

      // Actualizar last_login_at
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error al cargar datos del usuario');
    }
  }

  // ============================================================================
  // SIGN IN - LOGIN CON EMAIL Y CONTRASEÑA
  // ============================================================================
  async function signIn(email, password) {
    try {
      setLoading(true);

      // En desarrollo, permitir credenciales de demo
      if (import.meta.env.DEV && DEMO_CREDENTIALS[email]) {
        const demoUser = DEMO_CREDENTIALS[email];
        if (demoUser.password === password) {
          // IMPORTANTE: En desarrollo, usar Supabase Auth real incluso para demo
          // porque RLS necesita un auth.uid() válido en Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (!error && data?.user) {
            // Éxito: usuario real de Supabase
            await loadUserData(data.user.id);
            return { success: true, data };
          }

          // Si falla, es porque el usuario no existe en auth real
          console.warn('Demo credentials not found in Supabase Auth. Use signUp to create test users.');
          return { success: false, error: new Error('Usuario de demo no encontrado. Usa credentials reales de Supabase.') };
        }
      }

      // En producción o si no es credencial demo, usar Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast.success('Inicio de sesión exitoso');
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      const errorMessage = error.message || 'Error al iniciar sesión';
      toast.error(errorMessage);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // SIGN OUT - CERRAR SESIÓN
  // ============================================================================
  async function signOut() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserFirms([]);
      setSession(null);

      toast.success('Sesión cerrada');
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // ACCEPT INVITATION - ACEPTAR INVITACIÓN Y CREAR CUENTA
  // ============================================================================
  async function acceptInvitation(token, password, fullName) {
    try {
      setLoading(true);

      // 1. Verificar token de invitación
      const { data: invitation, error: invError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (invError || !invitation) {
        throw new Error('Invitación inválida o expirada');
      }

      // 2. Verificar expiración
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('La invitación ha expirado');
      }

      // 3. Crear usuario en auth.users
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            role: invitation.role
          }
        }
      });

      if (signUpError) throw signUpError;

      // 4. Crear acceso a la firma
      const { error: accessError } = await supabase
        .from('user_firm_access')
        .insert({
          user_id: authData.user.id,
          firm_id: invitation.firm_id,
          role: invitation.role,
          is_default: true,
          granted_by: invitation.invited_by
        });

      if (accessError) throw accessError;

      // 5. Marcar invitación como aceptada
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast.success('Cuenta creada exitosamente');
      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error.message || 'Error al aceptar invitación';
      toast.error(errorMessage);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // RESET PASSWORD - SOLICITAR RESET DE CONTRASEÑA
  // ============================================================================
  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Se ha enviado un enlace de recuperación a tu email');
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Error al solicitar recuperación');
      return { success: false, error };
    }
  }

  // ============================================================================
  // UPDATE PASSWORD - ACTUALIZAR CONTRASEÑA
  // ============================================================================
  async function updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente');
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Error al actualizar contraseña');
      return { success: false, error };
    }
  }

  // ============================================================================
  // CAMBIAR FIRMA ACTIVA
  // ============================================================================
  function setActiveFirm(firmAccessId) {
    const firmAccess = userFirms.find(f => f.firm_id === firmAccessId);
    if (firmAccess) {
      // Se podría guardar en localStorage si es necesario
      return firmAccess;
    }
    return null;
  }

  // ============================================================================
  // PROPORCIONAR VALORES DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado
    user,
    session,
    loading,
    userFirms,

    // Métodos
    signIn,
    signOut,
    acceptInvitation,
    resetPassword,
    updatePassword,
    setActiveFirm,
    loadUserData,

    // Helpers booleanos
    isAuthenticated: !!user && !!session,
    isAdmin: user?.role === 'administrador',
    isCollaborator: user?.role === 'colaborador',
    isViewer: user?.role === 'visualizador'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK PARA USAR EL CONTEXTO DE AUTENTICACIÓN
// ============================================================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
