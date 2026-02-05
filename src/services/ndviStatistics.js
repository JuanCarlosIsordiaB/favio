/**
 * Servicio para obtener estadísticas NDVI usando Sentinel Hub Statistical API
 * FASE 5: Obtiene valores numéricos NDVI de lotes y los almacena en BD
 *
 * Documentación: https://docs.sentinel-hub.com/api/latest/api/statistical/
 */

import { getAccessToken } from './sentinelAuth';
import { SENTINEL_HUB_CONFIG } from '../lib/sentinelHub.config';

console.log('[NDVI Stats] Módulo ndviStatistics.js cargado');

/**
 * Convierte polígono GeoJSON a formato requerido por Sentinel Hub
 * @param {Object} poligono - GeoJSON Polygon del lote
 * @returns {Object} Geometry en formato Sentinel Hub
 * @throws {Error} Si el polígono es inválido
 */
function convertirPoligonoAGeometry(poligono) {
  if (!poligono || poligono.type !== 'Polygon' || !poligono.coordinates) {
    throw new Error('Polígono inválido: debe ser GeoJSON Polygon con coordenadas');
  }

  return {
    type: 'Polygon',
    coordinates: poligono.coordinates,
  };
}

/**
 * Evalscript para calcular NDVI usando bandas B04 (Red) y B08 (NIR)
 * Retorna valor NDVI por píxel y máscara de datos
 *
 * NDVI = (NIR - Red) / (NIR + Red)
 */
const EVALSCRIPT_NDVI_STATS = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "dataMask"],
      units: "DN"
    }],
    output: [
      {
        id: "ndvi",
        bands: 1,
        sampleType: "FLOAT32"
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

function evaluatePixel(samples) {
  let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);

  // Manejar casos de división por cero
  if (!isFinite(ndvi)) {
    ndvi = -1;
  }

  return {
    ndvi: [ndvi],
    dataMask: [samples.dataMask]
  };
}
`;

/**
 * Obtiene estadísticas NDVI para un lote específico
 * Consulta Sentinel-2 Level 2A desde Sentinel Hub Statistical API
 *
 * @param {Object} lote - Objeto lote con poligono (GeoJSON)
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD), default: hace 30 días
 * @param {string} endDate - Fecha fin (YYYY-MM-DD), default: hoy
 * @param {number} maxCloudCoverage - Máximo porcentaje de nubes (0-100)
 * @returns {Promise<Object>} Estadísticas: { mean, min, max, stDev, validPixels, cloudCoverage, date }
 * @throws {Error} Si falla la consulta a API
 */
export async function getNDVIStatistics(
  lote,
  startDate = null,
  endDate = null,
  maxCloudCoverage = SENTINEL_HUB_CONFIG.DEFAULT_MAX_CLOUD_COVERAGE
) {
  console.log('[NDVI Stats] Obteniendo estadísticas para lote:', lote.name);

  try {
    // Validar que el lote tiene polígono
    if (!lote.polygon_data) {
      throw new Error('Lote no tiene polígono definido');
    }

    // Calcular fechas si no se proporcionan
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - SENTINEL_HUB_CONFIG.DEFAULT_TIME_RANGE_DAYS);
      startDate = start.toISOString().split('T')[0];
    }

    console.log('[NDVI Stats] Rango de fechas:', startDate, 'a', endDate);

    // Obtener token de autenticación
    const accessToken = await getAccessToken();

    // Construir request body según documentación de Statistical API
    const requestBody = {
      input: {
        bounds: {
          geometry: convertirPoligonoAGeometry(lote.polygon_data),
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: `${startDate}T00:00:00Z`,
                to: `${endDate}T23:59:59Z`,
              },
              maxCloudCoverage: maxCloudCoverage,
              mosaickingOrder: 'leastCC', // Imagen con menos nubes
            },
          },
        ],
      },
      aggregation: {
        timeRange: {
          from: `${startDate}T00:00:00Z`,
          to: `${endDate}T23:59:59Z`,
        },
        aggregationInterval: {
          of: 'P1D', // Intervalo de 1 día
        },
        evalscript: EVALSCRIPT_NDVI_STATS,
        resx: 10, // Resolución 10m (Sentinel-2)
        resy: 10,
      },
      calculations: {
        ndvi: {
          statistics: {
            default: {
              percentiles: {
                k: [10, 50, 90],
              },
            },
          },
        },
      },
    };

    console.log('[NDVI Stats] Enviando request a Statistical API...');

    // Hacer request a Statistical API
    const response = await fetch(SENTINEL_HUB_CONFIG.STATISTICAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Statistical API error: ${response.status} - ${errorText}`);
    }

    // Verificar que la respuesta sea JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      throw new Error(`Statistical API response is not JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error(`Failed to parse Statistical API JSON response: ${jsonError.message}`);
    }
    console.log('[NDVI Stats] Respuesta recibida, procesando...');

    // Procesar respuesta
    if (!data.data || data.data.length === 0) {
      throw new Error('No hay datos disponibles para el período seleccionado');
    }

    // Tomar el dato más reciente (último en el array)
    const latestData = data.data[data.data.length - 1];
    const ndviStats = latestData.outputs.ndvi.bands.B0.stats;

    const resultado = {
      mean: ndviStats.mean || null,
      min: ndviStats.min || null,
      max: ndviStats.max || null,
      stDev: ndviStats.stDev || null,
      percentiles: ndviStats.percentiles || {},
      validPixels: ndviStats.sampleCount || 0,
      cloudCoverage: latestData.outputs.dataMask?.bands?.B0?.stats?.cloudCoverage || 0,
      date: latestData.interval.from.split('T')[0],
      interval: latestData.interval,
    };

    console.log('[NDVI Stats] ✓ Estadísticas obtenidas:', {
      mean: resultado.mean?.toFixed(2),
      date: resultado.date,
      cloudCoverage: resultado.cloudCoverage + '%',
    });

    return resultado;
  } catch (error) {
    console.error('[NDVI Stats] Error:', error.message);
    throw error;
  }
}

/**
 * Actualiza el valor NDVI de un lote individual en la base de datos
 * Obtiene stats y guarda en tabla lotes
 *
 * @param {string} loteId - ID del lote
 * @param {Object} lote - Objeto lote completo (con polígono)
 * @param {Object} supabase - Cliente Supabase
 * @returns {Promise<Object>} { success, ndviValor, stats, lote, error }
 */
export async function actualizarNDVILote(loteId, lote, supabase) {
  console.log('[NDVI Stats] Actualizando NDVI para lote:', loteId);

  try {
    // Obtener estadísticas NDVI
    const stats = await getNDVIStatistics(lote);

    // Actualizar en base de datos
    const { data, error } = await supabase
      .from('lots')
      .update({
        ndvi_valor: stats.mean,
        ndvi_fecha_actualizacion: new Date().toISOString(),
        ndvi_cloud_coverage: stats.cloudCoverage,
        ndvi_error: null,
      })
      .eq('id', loteId)
      .select()
      .single();

    if (error) {
      console.error('[NDVI Stats] Error actualizando BD:', error);
      throw error;
    }

    console.log('[NDVI Stats] ✓ NDVI actualizado en BD:', stats.mean?.toFixed(2));

    return {
      success: true,
      ndviValor: stats.mean,
      stats: stats,
      lote: data,
      error: null,
    };
  } catch (error) {
    console.error('[NDVI Stats] Error actualizando NDVI:', error.message);

    // Guardar error en BD para auditoría
    try {
      await supabase
        .from('lots')
        .update({
          ndvi_error: error.message,
          ndvi_fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', loteId);
    } catch (updateError) {
      console.error('[NDVI Stats] Error guardando error en BD:', updateError);
    }

    return {
      success: false,
      ndviValor: null,
      stats: null,
      lote: null,
      error: error.message,
    };
  }
}

/**
 * Actualiza NDVI de TODOS los lotes de un predio (procesamiento batch)
 * Procesa secuencialmente para respetar rate limiting de API
 *
 * @param {string} predioId - ID del predio
 * @param {Object} supabase - Cliente Supabase
 * @param {Function} onProgress - Callback de progreso: (e) => { current, total, loteNombre }
 * @returns {Promise<Object>} { total, exitosos, fallidos, resultados[] }
 */
export async function actualizarNDVIPredio(predioId, supabase, onProgress = null) {
  console.log('[NDVI Stats] Actualizando NDVI de todos los lotes del predio:', predioId);

  try {
    // Obtener todos los lotes activos del predio
    const { data: lotes, error } = await supabase
      .from('lots')
      .select('*')
      .eq('premise_id', predioId)
      .eq('activo', true);

    if (error) throw error;

    if (!lotes || lotes.length === 0) {
      console.log('[NDVI Stats] No hay lotes activos en este predio');
      return { total: 0, exitosos: 0, fallidos: 0, resultados: [] };
    }

    console.log(`[NDVI Stats] Procesando ${lotes.length} lotes...`);

    const resultados = [];
    let exitosos = 0;
    let fallidos = 0;

    // Procesar cada lote secuencialmente (para no saturar la API)
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: lotes.length,
          loteNombre: lote.nombre,
        });
      }

      try {
        const resultado = await actualizarNDVILote(lote.id, lote, supabase);

        if (resultado.success) {
          exitosos++;
        } else {
          fallidos++;
        }

        resultados.push({
          loteId: lote.id,
          loteNombre: lote.nombre,
          ...resultado,
        });

        // Pausa pequeña entre requests (rate limiting de API)
        // Sentinel Hub: 1000 requests/mes en free tier = ~33/día = ~1.4/hora = 1 cada ~25 min
        // Pero además es sensible a burst, así que esperamos 500ms entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[NDVI Stats] Error en lote ${lote.nombre}:`, error.message);
        fallidos++;
        resultados.push({
          loteId: lote.id,
          loteNombre: lote.nombre,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`[NDVI Stats] ✓ Batch completado: ${exitosos}/${lotes.length} exitosos, ${fallidos} fallidos`);

    return {
      total: lotes.length,
      exitosos,
      fallidos,
      resultados,
    };
  } catch (error) {
    console.error('[NDVI Stats] Error en batch update:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de NDVI almacenado en la base de datos para un lote
 * @param {string} loteId - ID del lote
 * @param {Object} supabase - Cliente Supabase
 * @returns {Promise<Array>} Array de registros históricos ordenados por fecha
 */
export async function obtenerHistorialNDVI(loteId, supabase) {
  try {
    const { data, error } = await supabase
      .from('ndvi_history')
      .select('*')
      .eq('lot_id', loteId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[NDVI Stats] Error obteniendo historial:', error);
    return [];
  }
}
