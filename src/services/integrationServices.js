// ==================== INTEGRATION SERVICES ====================
// Framework para integraciones con sistemas externos de RR.HH.
// Soporta: BambooHR, Workday, ADP, Custom APIs
// Requirement: R6 (Integración Ecosistema Tecnológico)

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

// ==================== GESTIÓN DE INTEGRACIONES ====================

/**
 * Obtener todas las integraciones configuradas para una firma
 */
export async function obtenerIntegraciones(firmId) {
  const { data, error } = await supabase
    .from('external_integrations')
    .select('*')
    .eq('firm_id', firmId)
    .order('provider_name');

  if (error) throw error;
  return { data };
}

/**
 * Obtener integración específica
 */
export async function obtenerIntegracion(firmId, providerName) {
  const { data, error } = await supabase
    .from('external_integrations')
    .select('*')
    .eq('firm_id', firmId)
    .eq('provider_name', providerName)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return { data };
}

/**
 * Crear nueva integración
 */
export async function crearIntegracion(integracionData) {
  const { currentUser, ...dataToInsert } = integracionData;

  const { data, error } = await supabase
    .from('external_integrations')
    .insert([{
      ...dataToInsert,
      status: 'testing',
      api_key_encrypted: dataToInsert.api_key, // En prod: encriptar
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  // Auditoría
  await crearRegistro({
    firmId: dataToInsert.firm_id,
    tipo: 'integracion_creada',
    descripcion: `Integración con ${dataToInsert.provider_name} configurada`,
    moduloOrigen: 'integration_manager',
    usuario: currentUser || 'sistema',
    referencia: data.id
  });

  return { data };
}

/**
 * Actualizar configuración de integración
 */
export async function actualizarIntegracion(integrationId, updates) {
  const { data, error } = await supabase
    .from('external_integrations')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', integrationId)
    .select()
    .single();

  if (error) throw error;
  return { data };
}

/**
 * Activar integración (cambiar a estado 'active')
 */
export async function activarIntegracion(integrationId, firmId, currentUser) {
  const { data, error } = await supabase
    .from('external_integrations')
    .update({
      status: 'active',
      activated_at: new Date().toISOString()
    })
    .eq('id', integrationId)
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId,
    tipo: 'integracion_activada',
    descripcion: `Integración ${data.provider_name} activada`,
    moduloOrigen: 'integration_manager',
    usuario: currentUser,
    referencia: integrationId
  });

  return { data };
}

/**
 * Desactivar integración
 */
export async function desactivarIntegracion(integrationId, firmId, currentUser) {
  const { data, error } = await supabase
    .from('external_integrations')
    .update({
      status: 'paused'
    })
    .eq('id', integrationId)
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId,
    tipo: 'integracion_pausada',
    descripcion: `Integración ${data.provider_name} pausada`,
    moduloOrigen: 'integration_manager',
    usuario: currentUser,
    referencia: integrationId
  });

  return { data };
}

/**
 * Probar conectividad de una integración
 */
export async function testIntegracion(integrationId) {
  const { data: integration, error: integError } = await supabase
    .from('external_integrations')
    .select('*')
    .eq('id', integrationId)
    .single();

  if (integError) throw integError;

  try {
    // Llamar al endpoint de la integración
    const response = await fetch(integration.api_endpoint + '/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.api_key_encrypted}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return {
        success: true,
        message: `${integration.provider_name} está conectado`,
        status: 'connected'
      };
    } else {
      return {
        success: false,
        message: `Error de conectividad: ${response.statusText}`,
        status: 'disconnected',
        error: response.statusText
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error al conectar: ${err.message}`,
      status: 'error',
      error: err.message
    };
  }
}

// ==================== HISTORIAL DE SINCRONIZACIONES ====================

/**
 * Obtener historial de sincronizaciones
 */
export async function obtenerHistorialSincronizaciones(integrationId, limit = 50) {
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return { data };
}

/**
 * Crear registro de sincronización
 */
export async function crearRegistroSincronizacion(syncData) {
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .insert([{
      ...syncData,
      started_at: new Date().toISOString(),
      status: 'running'
    }])
    .select()
    .single();

  if (error) throw error;
  return { data };
}

/**
 * Actualizar registro de sincronización
 */
export async function actualizarRegistroSincronizacion(syncLogId, updates) {
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .update({
      ...updates,
      completed_at: updates.status === 'success' ? new Date().toISOString() : null
    })
    .eq('id', syncLogId)
    .select()
    .single();

  if (error) throw error;
  return { data };
}

// ==================== ESTADÍSTICAS DE INTEGRACIONES ====================

/**
 * Obtener estado actual de todas las integraciones
 */
export async function obtenerEstadoIntegraciones(firmId) {
  const { data, error } = await supabase
    .from('v_integration_status')
    .select('*')
    .eq('firm_id', firmId);

  if (error) throw error;

  const stats = {
    total_integraciones: data?.length || 0,
    activas: data?.filter(i => i.status === 'active').length || 0,
    pausadas: data?.filter(i => i.status === 'paused').length || 0,
    en_error: data?.filter(i => i.status === 'error').length || 0,
    integraciones: data || []
  };

  return stats;
}

// ==================== MAPEO DE CAMPOS ====================

/**
 * Obtener mapeo de campos para una integración
 */
export async function obtenerMapeoCampos(integrationId) {
  const { data: integration, error } = await supabase
    .from('external_integrations')
    .select('field_mappings')
    .eq('id', integrationId)
    .single();

  if (error) throw error;
  return { data: integration?.field_mappings || {} };
}

/**
 * Actualizar mapeo de campos
 */
export async function actualizarMapeoCampos(integrationId, fieldMappings) {
  const { data, error } = await supabase
    .from('external_integrations')
    .update({ field_mappings: fieldMappings })
    .eq('id', integrationId)
    .select()
    .single();

  if (error) throw error;
  return { data };
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Mapear campos según configuración
 * @param {Object} sourceData - Datos del sistema externo
 * @param {Object} fieldMappings - Mapeo de campos {sourceField: targetField}
 * @returns {Object} Datos mapeados
 */
export function mapearCampos(sourceData, fieldMappings) {
  const resultado = {};

  Object.entries(fieldMappings).forEach(([sourceField, targetField]) => {
    if (sourceData.hasOwnProperty(sourceField)) {
      resultado[targetField] = sourceData[sourceField];
    }
  });

  return resultado;
}

/**
 * Validar datos antes de sincronizar
 */
export function validarDatosPersonnel(data) {
  const errores = [];

  if (!data.full_name?.trim()) errores.push('full_name requerido');
  if (!data.document_id?.trim()) errores.push('document_id requerido');
  if (!data.hire_date) errores.push('hire_date requerido');
  if (!data.role) errores.push('role requerido');

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Registrar error de sincronización
 */
export async function registrarErrorSincronizacion(firmId, integrationId, error, detalles = {}) {
  const { data: integration } = await supabase
    .from('external_integrations')
    .select('id')
    .eq('id', integrationId)
    .single();

  if (!integration) return;

  await supabase
    .from('external_integrations')
    .update({
      status: 'error',
      error_message: error.message || error,
      updated_at: new Date().toISOString()
    })
    .eq('id', integrationId);

  // Registrar en audit
  await crearRegistro({
    firmId,
    tipo: 'error_integracion',
    descripcion: `Error en sincronización: ${error.message}`,
    moduloOrigen: 'integration_manager',
    usuario: 'sistema',
    referencia: integrationId
  });

  return true;
}
