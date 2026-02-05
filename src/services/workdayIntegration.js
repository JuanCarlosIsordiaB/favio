// ==================== WORKDAY INTEGRATION ====================
// Sincronización automática de personal desde Workday
// Requisito: R6.3 (Integración con Workday)

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

const WORKDAY_API_ENDPOINT = 'https://wd2-impl-services1.workday.com/ccx/service/';

// ==================== SINCRONIZACIÓN PRINCIPAL ====================

/**
 * Ejecutar sincronización completa desde Workday
 */
export async function sincronizarWorkday(firmId, integrationId, syncType = 'full') {
  try {
    const { data: integration } = await obtenerIntegracion(firmId, 'workday');
    if (!integration) throw new Error('Integración Workday no configurada');

    const { data: syncLog } = await crearRegistroSincronizacion({
      integration_id: integrationId,
      firm_id: firmId,
      sync_type: syncType,
      status: 'running'
    });

    // Obtener trabajadores desde Workday
    const trabajadores = await obtenerTrabajadoresDeWorkday(integration);

    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let errors = 0;
    const errorDetails = [];

    // Procesar cada trabajador
    for (const trabajador of trabajadores) {
      try {
        const datosPersonnel = mapearDatosWorkday(trabajador, integration.field_mappings);
        const validacion = validarDatosPersonnel(datosPersonnel);

        if (!validacion.valido) {
          errors++;
          errorDetails.push({
            trabajador_id: trabajador.ID,
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
          trabajador_id: trabajador.ID,
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
      tipo: 'sincronizacion_workday',
      descripcion: `Sincronización Workday: ${recordsSynced} registros`,
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

// ==================== CONEXIÓN A WORKDAY API ====================

/**
 * Obtener lista de trabajadores desde Workday
 */
async function obtenerTrabajadoresDeWorkday(integration) {
  const url = new URL(integration.api_endpoint);
  url.pathname = '/ccx/service/customreport2/v1/workers';

  // Workday requiere OAuth 2.0
  const accessToken = await obtenerTokenWorkday(integration);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Workday] Workers API error:', response.status, errorText);
      throw new Error(`Workday API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[Workday] Non-JSON response:', contentType, textResponse.substring(0, 100));
      throw new Error(`Workday returned non-JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[Workday] JSON parsing failed:', jsonError);
      throw new Error(`Failed to parse Workday response: ${jsonError.message}`);
    }

    return data.Report_Entry || [];
  } catch (err) {
    console.error('[Workday] Error fetching workers:', err);
    throw new Error(`No se pudo conectar a Workday: ${err.message}`);
  }
}

/**
 * Obtener token de acceso OAuth 2.0 para Workday
 */
async function obtenerTokenWorkday(integration) {
  const tokenUrl = new URL(integration.api_endpoint);
  tokenUrl.pathname = '/ccx/oauth2/v1/token';

  const clientId = integration.api_key_encrypted?.split(':')[0];
  const clientSecret = integration.api_key_encrypted?.split(':')[1];

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Workday incompletas (requiere clientId:clientSecret)');
  }

  try {
    const response = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Workday] Token request failed:', response.status, errorText);
      throw new Error(`Workday token request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Verify response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[Workday] Token response non-JSON:', contentType, textResponse.substring(0, 100));
      throw new Error(`Workday returned non-JSON token response (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[Workday] Failed to parse token response:', jsonError);
      throw new Error(`Failed to parse Workday token response: ${jsonError.message}`);
    }

    if (!data.access_token) {
      console.error('[Workday] No access token in response:', data);
      throw new Error('Workday response missing access_token');
    }

    return data.access_token;
  } catch (err) {
    console.error('[Workday] Error getting token:', err);
    throw new Error(`Error obteniendo token Workday: ${err.message}`);
  }
}

// ==================== MAPEO DE DATOS ====================

/**
 * Mapear datos de Workday a formato de personnel
 */
function mapearDatosWorkday(trabajador, fieldMappings = {}) {
  // Estructura típica de Workday
  const primerNombre = trabajador['First_Name'] || '';
  const apellido = trabajador['Last_Name'] || '';

  return {
    full_name: `${primerNombre} ${apellido}`.trim(),
    document_id: trabajador['Employee_ID'] || trabajador['ID'],
    phone: trabajador['Mobile_Phone'] || trabajador['Work_Phone'] || null,
    email: trabajador['Email_Address'] || null,
    position_title: trabajador['Job_Title'] || 'Operativo',
    hire_date: trabajador['Hire_Date'] || new Date().toISOString().split('T')[0],
    status: mapearEstadoWorkday(trabajador['Employment_Status']),
    department: trabajador['Department'] || null,
    role: mapearRolWorkday(trabajador['Job_Title']),
    address: trabajador['Address_Line_1'] || null,
    notes: `Sincronizado desde Workday - ID: ${trabajador.ID}`
  };
}

function mapearEstadoWorkday(status) {
  const mapping = {
    'Active': 'ACTIVE',
    'Inactive': 'INACTIVE',
    'On Leave': 'ON_LEAVE',
    'Terminated': 'INACTIVE'
  };
  return mapping[status] || 'INACTIVE';
}

function mapearRolWorkday(jobTitle) {
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
 * Probar conexión a Workday
 */
export async function probarConexionWorkday(firmId) {
  try {
    const { data: integration } = await obtenerIntegracion(firmId, 'workday');
    if (!integration) throw new Error('Integración no configurada');

    const token = await obtenerTokenWorkday(integration);
    return {
      success: !!token,
      mensaje: 'Conexión exitosa a Workday'
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
export async function obtenerEstadisticasWorkday(integrationId) {
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
