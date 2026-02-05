/**
 * MÓDULO 11: REPORTES
 * gestionesService.js
 *
 * Gestión de períodos/gestiones
 * - Apertura de gestión con inventario inicial
 * - Cierre de gestión con validaciones
 * - Ajustes post-cierre con auditoría
 * - Reapertura excepcional
 */

import { supabase } from '../lib/supabase';
import { validateGestionNotClosed, validateGestionIsClosed, ReportError } from './reportService';

/**
 * Abrir nueva gestión
 * Crea periodo con estado ACTIVE y genera inventario inicial
 */
export async function abrirGestion(firmId, data) {
  try {
    const {
      name,
      startDate,
      endDate,
      notes
    } = data;

    // Validar que no haya gestión abierta
    const { data: openGestions } = await supabase
      .from('campaigns')
      .select('id')
      .eq('firm_id', firmId)
      .eq('status', 'ACTIVE')
      .limit(1);

    if (openGestions && openGestions.length > 0) {
      throw new ReportError(
        'Ya existe una gestión abierta',
        'OPEN_GESTION_EXISTS',
        { gestionId: openGestions[0].id }
      );
    }

    // Crear nueva gestión
    const { data: newCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert([{
        firm_id: firmId,
        name: name || `Gestión ${new Date(startDate).getFullYear()}/${new Date(endDate).getFullYear()}`,
        start_date: startDate,
        end_date: endDate,
        status: 'ACTIVE'
      }])
      .select()
      .single();

    if (campaignError) {
      throw new ReportError(
        'Error creando gestión',
        'CAMPAIGN_CREATE_ERROR',
        { error: campaignError.message }
      );
    }

    // Registrar en auditoría
    await supabase
      .from('audit')
      .insert([{
        firm_id: firmId,
        tipo: 'GESTION_OPENED',
        descripcion: `Apertura de gestión: ${newCampaign.name}`,
        modulo_origen: 'modulo_11',
        usuario: 'sistema',
        referencia: newCampaign.id,
        metadata: {
          start_date: startDate,
          end_date: endDate,
          notes: notes
        }
      }]);

    return newCampaign;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado al abrir gestión',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}

/**
 * Cerrar gestión (CRÍTICO)
 * 1. Validar que todos los trabajos estén aprobados
 * 2. Generar inventario final
 * 3. Calcular resultado
 * 4. Bloquear período
 * 5. Crear inventario inicial siguiente gestión
 * 6. Registrar en auditoría
 */
export async function cerrarGestion(campaignId, data) {
  try {
    const {
      valorizationMethod,
      notes,
      userId
    } = data;

    // ============================================================================
    // CRÍTICO: Restaurar y refrescar sesión autenticada ANTES de hacer queries
    // Sin esto, auth.uid() es NULL en las políticas RLS de Supabase
    // ============================================================================
    // Obtener sesión actual
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting auth session:', sessionError);
    }
    console.log('Auth session obtained:', sessionData?.session?.user?.id);

    // Refrescar token para asegurar que está vigente
    if (sessionData?.session?.refresh_token) {
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Warning refreshing session:', refreshError);
        // Continuar con la sesión anterior aunque falle el refresh
      } else if(refreshedSession?.session) {
        console.log('Auth session refreshed successfully');
        // CRÍTICO: Establecer la sesión refrescada en el cliente para que la use en el UPDATE
        await supabase.auth.setSession(refreshedSession.session);
        console.log('Refreshed session set in Supabase client');

        // Forzar que el cliente relea la sesión haciendo una query de prueba
        const testSession = await supabase.auth.getSession();
        console.log('Test session after setSession:', testSession?.data?.session?.user?.id);
      }
    }

    // Obtener gestión actual
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      throw new ReportError(
        'Error obteniendo gestión',
        'CAMPAIGN_FETCH_ERROR',
        { error: campaignError.message }
      );
    }

    // VALIDACIÓN EN APLICACIÓN: Verificar que el usuario tiene acceso a la firma
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) {
      throw new ReportError(
        'Usuario no autenticado',
        'AUTH_REQUIRED',
        {}
      );
    }

    const { data: userAccess, error: accessError } = await supabase
      .from('user_firm_access')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('firm_id', campaign.firm_id)
      .is('revoked_at', null)
      .single();

    if (accessError || !userAccess) {
      throw new ReportError(
        'No tienes permiso para cerrar gestiones de esta firma',
        'UNAUTHORIZED',
        { firmId: campaign.firm_id, userId: currentUserId }
      );
    }

    // Validación: No cerrar gestión ya cerrada
    if (campaign.status === 'CLOSED') {
      throw new ReportError(
        'Gestión ya está cerrada',
        'GESTION_ALREADY_CLOSED',
        { campaignId }
      );
    }

    // Validación: Todos los trabajos deben estar aprobados
    const { data: pendingWorks, error: worksError } = await supabase
      .from('agricultural_works')
      .select('id')
      .eq('campaign_id', campaignId)
      .not('status', 'in', '(APPROVED,CLOSED,CANCELLED)')
      .limit(1);

    if (pendingWorks && pendingWorks.length > 0) {
      throw new ReportError(
        'No se puede cerrar: existen trabajos agrícolas no aprobados',
        'PENDING_AGRICULTURAL_WORKS',
        { count: pendingWorks.length }
      );
    }

    // Validación: Trabajos ganaderos
    const { data: pendingLivestockWorks } = await supabase
      .from('livestock_works')
      .select('id')
      .eq('campaign_id', campaignId)
      .not('status', 'in', '(APPROVED,CLOSED,CANCELLED)')
      .limit(1);

    if (pendingLivestockWorks && pendingLivestockWorks.length > 0) {
      throw new ReportError(
        'No se puede cerrar: existen trabajos ganaderos no aprobados',
        'PENDING_LIVESTOCK_WORKS',
        { count: pendingLivestockWorks.length }
      );
    }

    // TODO: Generar inventario final valorizado
    // TODO: Calcular resultado económico y productivo
    // TODO: Crear inventario inicial siguiente gestión

    // Actualizar gestión: cambiar a CLOSED e is_locked
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'CLOSED',
        is_locked: true,
        closed_by: userId,
        closed_at: new Date().toISOString(),
        closed_notes: notes
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (updateError) {
      console.error('SUPABASE UPDATE ERROR DETAIL:', {
        message: updateError.message,
        status: updateError.status,
        statusText: updateError.statusText,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        fullError: JSON.stringify(updateError, null, 2)
      });
      throw new ReportError(
        'Error cerrando gestión',
        'CAMPAIGN_CLOSE_ERROR',
        { error: updateError.message, details: updateError.details, hint: updateError.hint }
      );
    }

    // Registrar en auditoría
    await supabase
      .from('audit')
      .insert([{
        firm_id: campaign.firm_id,
        tipo: 'GESTION_CLOSED',
        descripcion: `Cierre de gestión: ${campaign.name} - Método: ${valorizationMethod}`,
        modulo_origen: 'modulo_11',
        usuario: userId || 'sistema',
        referencia: campaignId,
        metadata: {
          valuation_method: valorizationMethod,
          notes: notes,
          closed_at: new Date().toISOString()
        }
      }]);

    return updatedCampaign;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado al cerrar gestión',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}

/**
 * Crear ajuste de cierre (post-cierre)
 * Solo se permite en gestiones cerradas
 * Requiere motivo obligatorio
 */
export async function crearAjusteCierre(campaignId, data) {
  try {
    const {
      adjustmentType,
      description,
      oldValue,
      newValue,
      referenceTable,
      referenceId,
      userId
    } = data;

    // Validar que gestión esté cerrada
    await validateGestionIsClosed(campaignId);

    // Validar descripción/motivo obligatorio
    if (!description || description.trim().length === 0) {
      throw new ReportError(
        'Motivo del ajuste es obligatorio',
        'MISSING_DESCRIPTION',
        {}
      );
    }

    // Obtener gestión para firm_id
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('firm_id')
      .eq('id', campaignId)
      .single();

    // Crear ajuste
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('campaign_adjustments')
      .insert([{
        campaign_id: campaignId,
        adjustment_type: adjustmentType,
        description: description,
        adjustment_date: new Date().toISOString().split('T')[0],
        old_value: oldValue,
        new_value: newValue,
        reference_table: referenceTable,
        reference_id: referenceId,
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (adjustmentError) {
      throw new ReportError(
        'Error creando ajuste',
        'ADJUSTMENT_CREATE_ERROR',
        { error: adjustmentError.message }
      );
    }

    // Auditoría se registra automáticamente por trigger
    // pero podemos hacer log adicional aquí si es necesario

    return adjustment;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado al crear ajuste',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}

/**
 * Reabrir gestión (excepcional, requiere motivo)
 */
export async function reabrirGestion(campaignId, data) {
  try {
    const {
      reopenReason,
      userId
    } = data;

    if (!reopenReason || reopenReason.trim().length === 0) {
      throw new ReportError(
        'Motivo de reapertura es obligatorio',
        'MISSING_REOPEN_REASON',
        {}
      );
    }

    // Obtener gestión
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new ReportError(
        'Gestión no encontrada',
        'CAMPAIGN_NOT_FOUND',
        { campaignId }
      );
    }

    if (campaign.status !== 'CLOSED') {
      throw new ReportError(
        'Solo se pueden reabrir gestiones cerradas',
        'GESTION_NOT_CLOSED',
        {}
      );
    }

    // Reabrir gestión
    const { data: updatedCampaign, error } = await supabase
      .from('campaigns')
      .update({
        status: 'ACTIVE',
        is_locked: false,
        reopened_by: userId,
        reopened_at: new Date().toISOString(),
        reopen_reason: reopenReason
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      throw new ReportError(
        'Error reabriendo gestión',
        'CAMPAIGN_REOPEN_ERROR',
        { error: error.message }
      );
    }

    // Registrar en auditoría (crítico)
    await supabase
      .from('audit')
      .insert([{
        firm_id: campaign.firm_id,
        tipo: 'GESTION_REOPENED',
        descripcion: `⚠️ REAPERTURA EXCEPCIONAL de gestión: ${campaign.name} - Motivo: ${reopenReason}`,
        modulo_origen: 'modulo_11',
        usuario: userId || 'sistema',
        referencia: campaignId,
        metadata: {
          reopen_reason: reopenReason,
          reopened_at: new Date().toISOString(),
          warning: 'OPERACIÓN EXCEPCIONAL - Revisar auditoría'
        }
      }]);

    return updatedCampaign;
  } catch (error) {
    if (error instanceof ReportError) throw error;

    throw new ReportError(
      'Error inesperado al reabrir gestión',
      'UNKNOWN_ERROR',
      { error: error.message }
    );
  }
}
