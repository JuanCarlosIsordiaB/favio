/**
 * activities.js
 * Servicio para gestión del catálogo maestro de actividades
 */

import { supabase } from '../lib/supabase';

/**
 * Obtener todas las actividades de una firma
 */
export async function getActivities(firmId, activityType = null) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('code', { ascending: true });

  if (activityType) {
    query = query.in('activity_type', [activityType, 'BOTH']);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Error en getActivities:', error);
    throw new Error(`Error al cargar actividades: ${error.message}`);
  }

  // ✅ Log para debugging
  console.log(`✅ getActivities: Retornó ${data?.length || 0} de ${count} actividades totales`);

  // ⚠️ Warning si no hay datos
  if (!data || data.length === 0) {
    console.warn('⚠️ No se encontraron actividades. Posibles causas:');
    console.warn('  - RLS bloqueando acceso (revisar auth.uid())');
    console.warn('  - Firma sin actividades seed');
    console.warn('  - firmId incorrecto:', firmId);
  }

  return data || [];
}

/**
 * Obtener solo actividades activas
 */
export async function getActiveActivities(firmId, activityType = null) {
  if (!firmId) {
    throw new Error('firmId es requerido');
  }

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (activityType) {
    query = query.in('activity_type', [activityType, 'BOTH']);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Error en getActiveActivities:', error);
    throw new Error(`Error al cargar actividades activas: ${error.message}`);
  }

  console.log(`✅ getActiveActivities: Retornó ${data?.length || 0} activas de ${count} totales`);

  if (!data || data.length === 0) {
    console.warn('⚠️ No se encontraron actividades activas para firmId:', firmId);
  }

  return data || [];
}

/**
 * Obtener una actividad específica
 */
export async function getActivity(activityId) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crear actividad personalizada (no sistema)
 */
export async function createActivity({
  firmId,
  code,
  name,
  description,
  activityType,
  category
}) {
  // Validar código único
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('firm_id', firmId)
    .eq('code', code)
    .single();

  if (existing) {
    throw new Error('Ya existe una actividad con este código');
  }

  const { data, error } = await supabase
    .from('activities')
    .insert([{
      firm_id: firmId,
      code,
      name,
      description,
      activity_type: activityType,
      category,
      is_system: false,
      is_active: true
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar actividad (solo si no es sistema)
 */
export async function updateActivity(activityId, updates) {
  // Verificar que no sea actividad del sistema
  const { data: activity } = await supabase
    .from('activities')
    .select('is_system')
    .eq('id', activityId)
    .single();

  if (activity?.is_system) {
    throw new Error('No se pueden editar actividades del sistema');
  }

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Desactivar actividad (soft delete)
 */
export async function deactivateActivity(activityId) {
  return updateActivity(activityId, { is_active: false });
}

/**
 * Activar actividad
 */
export async function activateActivity(activityId) {
  return updateActivity(activityId, { is_active: true });
}

/**
 * Buscar actividad por legacy work_type
 */
export async function getActivityByLegacyWorkType(firmId, workType) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('firm_id', firmId)
    .eq('legacy_work_type', workType)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data || null;
}

/**
 * Buscar actividad por legacy event_type
 */
export async function getActivityByLegacyEventType(firmId, eventType) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('firm_id', firmId)
    .eq('legacy_event_type', eventType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Obtener actividades agrícolas
 */
export async function getAgriculturalActivities(firmId) {
  return getActiveActivities(firmId, 'AGRICULTURAL');
}

/**
 * Obtener actividades ganaderas
 */
export async function getLivestockActivities(firmId) {
  return getActiveActivities(firmId, 'LIVESTOCK');
}
