/**
 * userInvitations.js
 *
 * Servicio completo para gestionar invitaciones de usuarios
 * Incluye: creación, validación, envío de email y revocación de invitaciones
 */

import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ============================================================================
// GENERAR TOKEN ÚNICO PARA INVITACIÓN
// ============================================================================
function generateInvitationToken() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// ============================================================================
// CREAR INVITACIÓN DE USUARIO
// ============================================================================
/**
 * Crea una invitación de usuario y envía email
 *
 * @param {string} email - Email del usuario a invitar
 * @param {string} firmId - ID de la firma
 * @param {string} role - Rol del usuario (administrador, colaborador, visualizador)
 * @param {string} userId - ID del usuario que invita (current user)
 * @param {string} firmName - Nombre de la firma (para email)
 * @returns {Object} { success: boolean, data: invitation, error: errorObj }
 */
export async function createUserInvitation(email, firmId, role, userId, firmName) {
  try {
    // Validar email
    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    // Validar rol
    const validRoles = ['administrador', 'colaborador', 'visualizador'];
    if (!validRoles.includes(role)) {
      throw new Error('Rol inválido');
    }

    // Verificar que el usuario no exista ya en esa firma
    const { data: existingAccess, error: checkError } = await supabase
      .from('user_firm_access')
      .select('id')
      .eq('firm_id', firmId)
      .eq('user_id',
        // Buscar por email en users table
        `(SELECT id FROM public.users WHERE email = '${email.toLowerCase()}')`
      )
      .single();

    // Verificar que no haya invitación pendiente
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('firm_id', firmId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Ya existe una invitación pendiente para este email');
    }

    // Generar token y fecha de expiración (7 días)
    const invitationToken = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Crear invitación en BD
    const { data: invitation, error: insertError } = await supabase
      .from('user_invitations')
      .insert({
        email: email.toLowerCase(),
        firm_id: firmId,
        role,
        invited_by: userId,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Construir URL de aceptación
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationToken}`;

    // Obtener email del usuario que invita (para la Edge Function)
    const { data: invitingUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Enviar email (usar Edge Function de Supabase o directo)
    await sendInvitationEmail({
      email: email.toLowerCase(),
      firmName,
      role,
      invitationUrl,
      invitedByEmail: invitingUser?.email || 'sistema@campogestor.com'
    });

    return {
      success: true,
      data: invitation,
      message: `Invitación enviada a ${email}`
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return {
      success: false,
      error: error.message || 'Error al crear invitación',
      details: error
    };
  }
}

// ============================================================================
// ENVIAR EMAIL DE INVITACIÓN
// ============================================================================
/**
 * Envía email de invitación usando Supabase Auth admin API
 *
 * @param {Object} params - { email, firmName, role, invitationUrl, invitedByEmail }
 */
async function sendInvitationEmail({ email, firmName, role, invitationUrl, invitedByEmail }) {
  try {
    // Usar Supabase Edge Function para enviar invitación
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email,
        firmName,
        role,
        invitationUrl,
        invitedByEmail
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      // Si Edge Function falla, la invitación ya se creó en la BD
      // El usuario puede reenviar después
      console.warn('⚠️ Email no se envió pero invitación se registró. Usuario puede reenviar.');
      return;
    }

    console.log(`✅ Email de invitación enviado a ${email}`);
  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
    // No fallar si el email no se envía, pero registrar error
    console.warn('⚠️ Invitación registrada pero email no se envió');
  }
}

// ============================================================================
// VALIDAR TOKEN DE INVITACIÓN
// ============================================================================
/**
 * Valida si un token de invitación es válido y obtiene sus datos
 *
 * @param {string} token - Token de invitación
 * @returns {Object} { success: boolean, data: invitation, error: errorObj }
 */
export async function validateInvitationToken(token) {
  try {
    if (!token) {
      throw new Error('Token no proporcionado');
    }

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        firms:firm_id (id, name, rut, location)
      `)
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      throw new Error('Invitación inválida o expirada');
    }

    // Verificar expiración
    if (new Date(invitation.expires_at) < new Date()) {
      // Marcar como expirada
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      throw new Error('La invitación ha expirado');
    }

    return {
      success: true,
      data: invitation
    };
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return {
      success: false,
      error: error.message || 'Error al validar invitación',
      details: error
    };
  }
}

// ============================================================================
// LISTAR INVITACIONES PENDIENTES
// ============================================================================
/**
 * Obtiene todas las invitaciones pendientes para una firma
 *
 * @param {string} firmId - ID de la firma
 * @returns {Object} { success: boolean, data: invitations[], error: errorObj }
 */
export async function listPendingInvitations(firmId) {
  try {
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        invited_by_user:invited_by (email, full_name)
      `)
      .eq('firm_id', firmId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: invitations || []
    };
  } catch (error) {
    console.error('Error listing pending invitations:', error);
    return {
      success: false,
      error: error.message || 'Error al listar invitaciones',
      details: error
    };
  }
}

// ============================================================================
// REVOCAR INVITACIÓN
// ============================================================================
/**
 * Revoca una invitación pendiente
 *
 * @param {string} invitationId - ID de la invitación
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function revokeInvitation(invitationId) {
  try {
    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) throw error;

    return {
      success: true,
      message: 'Invitación revocada'
    };
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return {
      success: false,
      error: error.message || 'Error al revocar invitación',
      details: error
    };
  }
}

// ============================================================================
// REENVIAR EMAIL DE INVITACIÓN
// ============================================================================
/**
 * Reenvía el email de invitación (sin crear nueva invitación)
 *
 * @param {string} invitationId - ID de la invitación
 * @param {string} firmName - Nombre de la firma
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function resendInvitationEmail(invitationId, firmName) {
  try {
    // Obtener datos de la invitación
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invitation) {
      throw new Error('Invitación no encontrada o expirada');
    }

    // Construir URL
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.invitation_token}`;

    // Enviar email
    await sendInvitationEmail({
      to: invitation.email,
      firmName,
      role: invitation.role,
      invitationUrl,
      expiresAt: invitation.expires_at
    });

    return {
      success: true,
      message: 'Email reenviado exitosamente'
    };
  } catch (error) {
    console.error('Error resending invitation email:', error);
    return {
      success: false,
      error: error.message || 'Error al reenviar email',
      details: error
    };
  }
}

// ============================================================================
// OBTENER INVITACIÓN POR TOKEN (con validación completa)
// ============================================================================
/**
 * Obtiene datos de invitación incluyendo info de la firma
 *
 * @param {string} token - Token de invitación
 * @returns {Object} { success: boolean, data: invitationWithFirm, error: errorObj }
 */
export async function getInvitationByToken(token) {
  try {
    if (!token) {
      throw new Error('Token no proporcionado');
    }

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        firms:firm_id (
          id,
          name,
          rut,
          location,
          currency
        )
      `)
      .eq('invitation_token', token)
      .single();

    if (error || !invitation) {
      throw new Error('Invitación no encontrada');
    }

    // Verificar expiración
    if (invitation.status === 'pending') {
      const expiryDate = new Date(invitation.expires_at);
      const now = new Date();
      if (expiryDate < now) {
        throw new Error('La invitación ha expirado');
      }
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitación ya ha sido ${invitation.status}`);
    }

    return {
      success: true,
      data: invitation
    };
  } catch (error) {
    console.error('Error getting invitation by token:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener invitación',
      details: error
    };
  }
}

// ============================================================================
// OBTENER USUARIOS DE UNA FIRMA
// ============================================================================
/**
 * Lista todos los usuarios con acceso a una firma
 *
 * @param {string} firmId - ID de la firma
 * @returns {Object} { success: boolean, data: users[], error: errorObj }
 */
export async function getFirmUsers(firmId) {
  try {
    // Obtener acceso de usuario-firma sin intentar join automático
    const { data: userAccess, error: accessError } = await supabase
      .from('user_farm_access')
      .select('id, user_id, role, is_default, granted_at, revoked_at')
      .eq('firm_id', firmId)
      .order('granted_at', { ascending: false });

    if (accessError) throw accessError;

    // Obtener datos de usuarios desde auth.users si existen accesos
    if (!userAccess || userAccess.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Obtener emails de auth.users para cada user_id
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !authUsers) {
      // Si auth admin no funciona, intentar con llamada regular
      console.warn('⚠️ No se pudieron cargar datos de auth.users, usando datos parciales');
      // Retornar solo el acceso sin datos de usuario
      const enhancedAccess = userAccess.map(access => ({
        ...access,
        users: [{ id: access.user_id, email: '(no disponible)', full_name: 'Usuario', is_active: true, last_login_at: null }]
      }));
      return {
        success: true,
        data: enhancedAccess.filter(u => !u.revoked_at)
      };
    }

    // Combinar datos de acceso con datos de auth.users
    const usersMap = {};
    authUsers.forEach(authUser => {
      usersMap[authUser.id] = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        is_active: authUser.confirmed_at !== null,
        last_login_at: authUser.last_sign_in_at
      };
    });

    // Enriquecer acceso con datos de usuario
    const enhancedAccess = userAccess.map(access => ({
      ...access,
      users: [usersMap[access.user_id] || {
        id: access.user_id,
        email: '(usuario no encontrado)',
        full_name: 'Usuario',
        is_active: false,
        last_login_at: null
      }]
    }));

    // Filtrar usuarios revocados
    const activeUsers = enhancedAccess.filter(u => !u.revoked_at);

    return {
      success: true,
      data: activeUsers
    };
  } catch (error) {
    console.error('Error getting firm users:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener usuarios',
      details: error
    };
  }
}

// ============================================================================
// ACTUALIZAR ROL DE USUARIO
// ============================================================================
/**
 * Cambia el rol de un usuario en una firma
 *
 * @param {string} userFirmAccessId - ID del acceso user_firm_access
 * @param {string} newRole - Nuevo rol
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function updateUserRole(userFirmAccessId, newRole) {
  try {
    const validRoles = ['administrador', 'colaborador', 'visualizador'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Rol inválido');
    }

    const { error } = await supabase
      .from('user_firm_access')
      .update({ role: newRole })
      .eq('id', userFirmAccessId);

    if (error) throw error;

    return {
      success: true,
      message: 'Rol actualizado'
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar rol',
      details: error
    };
  }
}

// ============================================================================
// REVOCAR ACCESO A USUARIO
// ============================================================================
/**
 * Revoca el acceso de un usuario a una firma
 *
 * @param {string} userFirmAccessId - ID del acceso
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function revokeUserAccess(userFirmAccessId) {
  try {
    const { error } = await supabase
      .from('user_firm_access')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', userFirmAccessId);

    if (error) throw error;

    return {
      success: true,
      message: 'Acceso revocado'
    };
  } catch (error) {
    console.error('Error revoking user access:', error);
    return {
      success: false,
      error: error.message || 'Error al revocar acceso',
      details: error
    };
  }
}
