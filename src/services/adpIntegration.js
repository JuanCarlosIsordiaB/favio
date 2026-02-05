// ==================== ADP INTEGRATION ====================
// Sincronización automática de personal desde ADP Workforce Now
// Requisito: R6.4 (Integración con ADP)

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';
import {
  obtenerIntegracion,
  validarDatosPersonnel,
  crearRegistroSincronizacion,
  actualizarRegistroSincronizacion,
  registrarErrorSincronizacion
} from './integrationServices';

const ADP_OAUTH_ENDPOINT = 'https://accounts.adp.com/auth/oauth/v2/authorize';
const ADP_TOKEN_ENDPOINT = 'https://accounts.adp.com/auth/oauth/v2/token';
const ADP_API_BASE = 'https://api.adp.com/hr/v2';

// ==================== SINCRONIZACIÓN PRINCIPAL ====================

/**
 * Ejecutar sincronización completa desde ADP
 */
export async function sincronizarADP(firmId, integrationId, syncType = 'full') {
  try {
    const { data: integration } = await obtenerIntegracion(firmId, 'adp');
    if (!integration) throw new Error('Integración ADP no configurada');

    const { data: syncLog } = await crearRegistroSincronizacion({
      integration_id: integrationId,
      firm_id: firmId,
      sync_type: syncType,
      status: 'running'
    });

    // Obtener empleados desde ADP
    const empleados = await obtenerEmpleadosDeADP(integration);

    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let errors = 0;
    const errorDetails = [];

    // Procesar cada empleado
    for (const empleado of empleados) {
      try {
        const datosPersonnel = mapearDatosADP(empleado);
        const validacion = validarDatosPersonnel(datosPersonnel);

        if (!validacion.valido) {
          errors++;
          errorDetails.push({
            empleado_id: empleado.associateOID,
            errores: validacion.errores.join(', ')
          });
          continue;
        }

        const { data: existente } = await supabase
          .from('personnel')
          .select('id')
          .eq('firm_id', firmId)
          .eq('document_id', datosPersonnel.document_id)
          .maybeSingle();

        if (existente) {
          await supabase
            .from('personnel')
            .update(datosPersonnel)
            .eq('id', existente.id);
          recordsUpdated++;
        } else {
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
        errors++;
        errorDetails.push({
          empleado_id: empleado.associateOID,
          error: err.message
        });
      }
    }

    await actualizarRegistroSincronizacion(syncLog.id, {
      status: errors === 0 ? 'success' : 'partial_success',
      records_synced: recordsSynced,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      errors,
      error_details: errorDetails
    });

    await crearRegistro({
      firmId,
      tipo: 'sincronizacion_adp',
      descripcion: `Sincronización ADP: ${recordsSynced} registros`,
      moduloOrigen: 'integration_manager',
      usuario: 'sistema',
      referencia: syncLog.id
    });

    return {
      success: true,
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

// ==================== CONEXIÓN A ADP API ====================

/**
 * Obtener token de acceso para ADP (OAuth 2.0)
 */
async function obtenerTokenADP(integration) {
  const [clientId, clientSecret] = integration.api_key_encrypted?.split(':') || [];

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales ADP incompletas (requiere clientId:clientSecret)');
  }

  try {
    const response = await fetch(ADP_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'workers'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ADP] Token request failed:', response.status, errorText);
      throw new Error(`ADP token request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[ADP] Non-JSON response received:', contentType, textResponse.substring(0, 100));
      throw new Error(`ADP returned non-JSON response (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[ADP] JSON parsing failed:', jsonError);
      throw new Error(`Failed to parse ADP token response: ${jsonError.message}`);
    }

    if (!data.access_token) {
      console.error('[ADP] No access token in response:', data);
      throw new Error('ADP response missing access_token');
    }

    return data.access_token;
  } catch (err) {
    console.error('[ADP] Error getting token:', err);
    throw new Error(`Error obteniendo token ADP: ${err.message}`);
  }
}

/**
 * Obtener lista de empleados desde ADP
 */
async function obtenerEmpleadosDeADP(integration) {
  const token = await obtenerTokenADP(integration);

  try {
    const response = await fetch(`${ADP_API_BASE}/workers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ADP] Workers API error:', response.status, errorText);
      throw new Error(`ADP API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[ADP] Workers API returned non-JSON:', contentType, textResponse.substring(0, 100));
      throw new Error(`ADP Workers API returned non-JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[ADP] Failed to parse workers response:', jsonError);
      throw new Error(`Failed to parse ADP workers response: ${jsonError.message}`);
    }

    return data.workers || [];
  } catch (err) {
    console.error('[ADP] Error fetching workers:', err);
    throw new Error(`No se pudo conectar a ADP: ${err.message}`);
  }
}

// ==================== MAPEO DE DATOS ====================

/**
 * Mapear datos de ADP a formato de personnel
 */
function mapearDatosADP(empleado) {
  // Estructura típica de ADP Workforce Now API
  const person = empleado.person || {};
  const legalName = person.legalName || {};
  const contact = person.contact || {};
  const employment = empleado.employment || {};
  const workAssignments = (empleado.workAssignments || [{}])[0];

  return {
    full_name: `${legalName.givenName || ''} ${legalName.familyName || ''}`.trim(),
    document_id: empleado.associateOID || empleado.empID,
    phone: contact.mobile?.standardizedPhone || contact.phones?.[0] || null,
    email: contact.emailAddresses?.[0]?.emailAddress || null,
    position_title: workAssignments?.jobTitle || 'Operativo',
    hire_date: employment.originalHireDate || new Date().toISOString().split('T')[0],
    status: mapearEstadoADP(employment.employmentStatus),
    department: workAssignments?.department?.name || null,
    role: mapearRolADP(workAssignments?.jobTitle),
    address: contact.address?.streetLine1 || null,
    notes: `Sincronizado desde ADP - ID: ${empleado.associateOID}`
  };
}

function mapearEstadoADP(status) {
  const statusCode = status?.statusCode;
  const mapping = {
    'A': 'ACTIVE',    // Active
    'I': 'INACTIVE',  // Inactive
    'T': 'INACTIVE',  // Terminated
    'L': 'ON_LEAVE'   // Leave of Absence
  };
  return mapping[statusCode] || 'INACTIVE';
}

function mapearRolADP(jobTitle) {
  if (!jobTitle) return 'operator';
  const titleLower = jobTitle.toLowerCase();

  if (titleLower.includes('director')) return 'director';
  if (titleLower.includes('ingeniero')) return 'engineer';
  if (titleLower.includes('supervisor')) return 'field_supervisor';
  if (titleLower.includes('admin')) return 'admin';

  return 'operator';
}

// ==================== UTILIDADES ====================

/**
 * Probar conexión a ADP
 */
export async function probarConexionADP(firmId) {
  try {
    const { data: integration } = await obtenerIntegracion(firmId, 'adp');
    if (!integration) throw new Error('Integración no configurada');

    const token = await obtenerTokenADP(integration);
    return {
      success: !!token,
      mensaje: 'Conexión exitosa a ADP'
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
export async function obtenerEstadisticasADP(integrationId) {
  const { data: logs } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('started_at', { ascending: false })
    .limit(10);

  return {
    total_sincronizaciones: logs?.length || 0,
    exitosas: logs?.filter(l => l.status === 'success').length || 0,
    parciales: logs?.filter(l => l.status === 'partial_success').length || 0,
    total_registros: logs?.reduce((sum, l) => sum + (l.records_synced || 0), 0) || 0
  };
}
