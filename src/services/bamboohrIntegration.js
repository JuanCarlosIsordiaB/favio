// ==================== BAMBOOHR INTEGRATION ====================
// Sincronización automática de personal desde BambooHR
// Soporta: Altas, bajas, cambios de datos

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';
import {
  obtenerIntegracion,
  mapearCampos,
  validarDatosPersonnel,
  crearRegistroSincronizacion,
  actualizarRegistroSincronizacion,
  registrarErrorSincronizacion
} from './integrationServices';

const BAMBOOHR_API_BASE = 'https://api.bamboohr.com/api/gateway.php';

// ==================== SINCRONIZACIÓN PRINCIPAL ====================

/**
 * Ejecutar sincronización completa desde BambooHR
 */
export async function sincronizarBambooHR(firmId, integrationId, syncType = 'full') {
  try {
    // Obtener configuración
    const { data: integration } = await obtenerIntegracion(firmId, 'bamboohr');
    if (!integration) throw new Error('Integración BambooHR no configurada');

    // Crear registro de sincronización
    const { data: syncLog } = await crearRegistroSincronizacion({
      integration_id: integrationId,
      firm_id: firmId,
      sync_type: syncType,
      status: 'running'
    });

    // Obtener empleados desde BambooHR
    const empleadosBamboo = await obtenerEmpleadosDeBambooHR(integration);

    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let errors = 0;
    const errorDetails = [];

    // Procesar cada empleado
    for (const empleado of empleadosBamboo) {
      try {
        // Validar y mapear datos
        const datosPersonnel = mapearDatosBambooHR(empleado, integration.field_mappings);
        const validacion = validarDatosPersonnel(datosPersonnel);

        if (!validacion.valido) {
          errors++;
          errorDetails.push({
            empleado_id: empleado.id,
            nombre: empleado.firstName + ' ' + empleado.lastName,
            errores: validacion.errores.join(', ')
          });
          continue;
        }

        // Verificar si ya existe
        const { data: existente } = await supabase
          .from('personnel')
          .select('id')
          .eq('firm_id', firmId)
          .eq('document_id', datosPersonnel.document_id)
          .maybeSingle();

        if (existente) {
          // Actualizar
          await supabase
            .from('personnel')
            .update(datosPersonnel)
            .eq('id', existente.id);
          recordsUpdated++;
        } else {
          // Crear nuevo
          await supabase
            .from('personnel')
            .insert([{
              ...datosPersonnel,
              firm_id: firmId,
              is_system_user: false
            }]);
          recordsCreated++;
        }

        recordsSynced++;
      } catch (err) {
        console.error('Error procesando empleado:', err);
        errors++;
        errorDetails.push({
          empleado_id: empleado.id,
          error: err.message
        });
      }
    }

    // Actualizar log de sincronización
    await actualizarRegistroSincronizacion(syncLog.id, {
      status: errors === 0 ? 'success' : 'partial_success',
      records_synced: recordsSynced,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      errors,
      error_details: errorDetails
    });

    // Auditoría
    await crearRegistro({
      firmId,
      tipo: 'sincronizacion_bamboohr',
      descripcion: `Sincronización BambooHR: ${recordsSynced} registros (${recordsCreated} nuevos, ${recordsUpdated} actualizados)`,
      moduloOrigen: 'integration_manager',
      usuario: 'sistema',
      referencia: syncLog.id
    });

    return {
      success: true,
      syncLogId: syncLog.id,
      recordsSynced,
      recordsCreated,
      recordsUpdated,
      errors
    };
  } catch (err) {
    await registrarErrorSincronizacion(firmId, integrationId, err);
    throw err;
  }
}

/**
 * Sincronización incremental (solo cambios desde última sincronización)
 */
export async function sincronizarBambooHRIncremental(firmId, integrationId) {
  const { data: integration } = await obtenerIntegracion(firmId, 'bamboohr');
  if (!integration?.last_sync_timestamp) {
    return sincronizarBambooHR(firmId, integrationId, 'full');
  }

  // Obtener empleados modificados desde última sincronización
  const empleadosModificados = await obtenerEmpleadosModificados(
    integration,
    new Date(integration.last_sync_timestamp)
  );

  return sincronizarBambooHR(firmId, integrationId, 'incremental');
}

// ==================== CONEXIÓN A BAMBOOHR API ====================

/**
 * Obtener lista de empleados desde BambooHR
 */
async function obtenerEmpleadosDeBambooHR(integration) {
  const { api_endpoint, api_key_encrypted } = integration;

  // Formato: https://api.bamboohr.com/api/gateway.php/{SUBDOMAIN}/v1/employees/
  const subdomain = api_endpoint.split('/').pop();
  const url = `${BAMBOOHR_API_BASE}/${subdomain}/v1/employees/?fields=*`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${api_key_encrypted}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BambooHR] API error:', response.status, errorText);
      throw new Error(`BambooHR API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[BambooHR] Non-JSON response:', contentType, textResponse.substring(0, 100));
      throw new Error(`BambooHR returned non-JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[BambooHR] JSON parsing failed:', jsonError);
      throw new Error(`Failed to parse BambooHR response: ${jsonError.message}`);
    }

    return data.employees || [];
  } catch (err) {
    console.error('[BambooHR] Error fetching employees:', err);
    throw new Error(`No se pudo conectar a BambooHR: ${err.message}`);
  }
}

/**
 * Obtener empleados modificados desde fecha específica
 */
async function obtenerEmpleadosModificados(integration, sinceDate) {
  const { api_endpoint, api_key_encrypted } = integration;
  const subdomain = api_endpoint.split('/').pop();

  // BambooHR soporta filtro de modificación
  const url = new URL(`${BAMBOOHR_API_BASE}/${subdomain}/v1/employees/`);
  url.searchParams.append('fields', '*');
  url.searchParams.append('modifiedBefore', sinceDate.toISOString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${api_key_encrypted}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BambooHR] Modified employees API error:', response.status, errorText);
      throw new Error(`BambooHR API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[BambooHR] Modified employees non-JSON:', contentType, textResponse.substring(0, 100));
      throw new Error(`BambooHR returned non-JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[BambooHR] Failed to parse modified employees:', jsonError);
      throw new Error(`Failed to parse BambooHR response: ${jsonError.message}`);
    }

    return data.employees || [];
  } catch (err) {
    console.error('[BambooHR] Error fetching modified employees:', err);
    throw err;
  }
}

// ==================== MAPEO DE DATOS ====================

/**
 * Mapear datos de BambooHR a formato de personnel
 */
function mapearDatosBambooHR(empleadoBamboo, fieldMappings = {}) {
  // Mapeo por defecto si no hay custom mapping
  const mapeoDefault = {
    'firstName lastName': 'full_name',
    'ssn': 'document_id', // O usar otro campo
    'mobilePhone': 'phone',
    'email': 'email',
    'jobTitle': 'position_title',
    'hireDate': 'hire_date',
    'status': 'status', // active/inactive
    'department': 'department'
  };

  const campos = { ...mapeoDefault, ...fieldMappings };

  return {
    full_name: `${empleadoBamboo.firstName} ${empleadoBamboo.lastName}`.trim(),
    document_id: empleadoBamboo.ssn || empleadoBamboo.id, // Usar ID si no hay SSN
    phone: empleadoBamboo.mobilePhone || empleadoBamboo.workPhone || null,
    email: empleadoBamboo.email || null,
    position_title: empleadoBamboo.jobTitle || 'Operativo',
    hire_date: empleadoBamboo.hireDate || new Date().toISOString().split('T')[0],
    status: mapearEstadoBambooHR(empleadoBamboo.status),
    department: empleadoBamboo.department || null,
    role: mapearRolBambooHR(empleadoBamboo.jobTitle),
    // Campos opcionales
    address: empleadoBamboo.address1 || null,
    emergency_contact_name: empleadoBamboo.emergencyContactName || null,
    emergency_contact_phone: empleadoBamboo.emergencyContactPhone || null,
    notes: `Sincronizado desde BambooHR - ID: ${empleadoBamboo.id}`
  };
}

/**
 * Mapear estado de BambooHR a nuestros valores
 */
function mapearEstadoBambooHR(status) {
  const mapping = {
    'Active': 'ACTIVE',
    'Inactive': 'INACTIVE',
    'Terminated': 'INACTIVE',
    'On Leave': 'ON_LEAVE'
  };
  return mapping[status] || 'INACTIVE';
}

/**
 * Mapear puesto de BambooHR a nuestros roles
 */
function mapearRolBambooHR(jobTitle) {
  if (!jobTitle) return 'operator';

  const titleLower = jobTitle.toLowerCase();

  if (titleLower.includes('director') || titleLower.includes('gerente')) return 'director';
  if (titleLower.includes('ingeniero') || titleLower.includes('agrónomo')) return 'engineer';
  if (titleLower.includes('supervisor') || titleLower.includes('encargado')) return 'field_supervisor';
  if (titleLower.includes('admin')) return 'admin';

  return 'operator';
}

// ==================== PRUEBAS Y UTILIDADES ====================

/**
 * Probar conexión a BambooHR
 */
export async function probarConexionBambooHR(firmId) {
  try {
    const { data: integration } = await obtenerIntegracion(firmId, 'bamboohr');
    if (!integration) throw new Error('Integración no configurada');

    const subdomain = integration.api_endpoint.split('/').pop();
    const url = `${BAMBOOHR_API_BASE}/${subdomain}/v1/employees/directory/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${integration.api_key_encrypted}`
      }
    });

    return {
      success: response.ok,
      status: response.status,
      mensaje: response.ok ? 'Conexión exitosa a BambooHR' : 'Error de conexión'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Obtener estadísticas de sincronización
 */
export async function obtenerEstadisticasBambooHR(integrationId) {
  const { data: logs, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const stats = {
    total_sincronizaciones: logs?.length || 0,
    exitosas: logs?.filter(l => l.status === 'success').length || 0,
    parciales: logs?.filter(l => l.status === 'partial_success').length || 0,
    fallidas: logs?.filter(l => l.status === 'failed').length || 0,
    total_registros: logs?.reduce((sum, l) => sum + (l.records_synced || 0), 0) || 0,
    historial: logs || []
  };

  return stats;
}
