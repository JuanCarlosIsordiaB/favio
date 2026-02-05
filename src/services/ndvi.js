/**
 * Servicio de integración con Sentinel Hub (Copernicus Data Space Ecosystem)
 * FASE 4B: Visualización real de NDVI desde Sentinel-2 vía WMS
 *
 * Flujo:
 * 1. Usar Sentinel Hub WMS (gratuito, sin autenticación compleja)
 * 2. Acceder a colección Sentinel-2 Level 2A
 * 3. Visualizar NDVI calculado en tiempo real
 * 4. Generar URLs WMS compatible con Leaflet
 */

console.log('[NDVI] Módulo ndvi.js cargado - FASE 4B (Sentinel Hub + Copernicus)');

// Leer variables de entorno
const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;
const SENTINEL_HUB_BASE_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms';

console.log('[NDVI] Configuración Sentinel Hub:');
console.log('[NDVI]  - Instance ID:', SENTINEL_HUB_INSTANCE_ID ? '✓ CONFIGURADO' : '⚠ NO CONFIGURADO (placeholder)');
console.log('[NDVI]  - Base URL:', SENTINEL_HUB_BASE_URL);

let isInitialized = false;

/**
 * Inicializa Sentinel Hub
 * @returns {Promise<boolean>} True si la inicialización fue exitosa
 */
export async function initializeEarthEngine() {
  return new Promise((resolve) => {
    console.log('[NDVI] initializeEarthEngine() llamado');

    // Validar que tenemos Instance ID configurado
    if (!SENTINEL_HUB_INSTANCE_ID) {
      console.warn('[NDVI] ⚠ SENTINEL_HUB_INSTANCE_ID no configurado');
      console.warn('[NDVI] Pasos para configurar:');
      console.warn('[NDVI] 1. Registrate en https://dataspace.copernicus.eu/');
      console.warn('[NDVI] 2. Crea una configuración en Sentinel Hub Dashboard');
      console.warn('[NDVI] 3. Copia el Instance ID');
      console.warn('[NDVI] 4. Agrega a .env: VITE_SENTINEL_HUB_INSTANCE_ID=tu_id');
      console.warn('[NDVI] 5. Reinicia: npm run dev');
      resolve(false);
      return;
    }

    try {
      console.log('[NDVI] ✓ Sentinel Hub configurado correctamente');
      isInitialized = true;
      resolve(true);
    } catch (error) {
      console.error('[NDVI] ✗ Error inicializando Sentinel Hub:', error);
      resolve(false);
    }
  });
}

/**
 * Construye URL WMS para Sentinel Hub
 * @param {string} layer - ID del layer (NDVI, TRUE_COLOR, FALSE_COLOR, etc.)
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {string} URL WMS completa
 */
function buildWmsUrl(layer = 'NDVI', startDate = null, endDate = null) {
  if (!SENTINEL_HUB_INSTANCE_ID) {
    return getNDVIFallbackUrl();
  }

  // Construir parámetros de tiempo
  let timeParam = '';
  if (startDate && endDate) {
    timeParam = `${startDate}/${endDate}`;
  } else {
    // Usar 30 días anteriores a hoy si no se especifica
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    timeParam = `${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`;
  }

  return `${SENTINEL_HUB_BASE_URL}/${SENTINEL_HUB_INSTANCE_ID}?request=GetMap&service=WMS&version=1.1.1&layers=${layer}&bbox={bbox}&srs=EPSG:3857&width=256&height=256&format=image/png&time=${timeParam}&maxcc=20`;
}

/**
 * Obtiene URL de tiles NDVI compatible con Leaflet
 * @param {Object} bounds - GeoJSON polygon (no se usa con WMS, pero se mantiene por compatibilidad)
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<string>} URL WMS NDVI
 */
export async function getNDVITileUrl(bounds, startDate, endDate) {
  console.log('[NDVI] getNDVITileUrl() llamado', { startDate, endDate });

  try {
    if (!isInitialized || !SENTINEL_HUB_INSTANCE_ID) {
      console.warn('[NDVI] ⚠ Sentinel Hub no está inicializado, usando fallback');
      return getNDVIFallbackUrl();
    }

    const url = buildWmsUrl('NDVI', startDate, endDate);
    console.log('[NDVI] ✓ URL WMS NDVI construida:', url);
    return url;
  } catch (error) {
    console.error('[NDVI] ✗ Error construyendo URL NDVI:', error);
    return getNDVIFallbackUrl();
  }
}

/**
 * Obtiene URL WMS para visualización de color verdadero (True Color)
 * @param {Object} bounds - GeoJSON polygon
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<string>} URL WMS True Color
 */
export async function getTrueColorTileUrl(bounds, startDate, endDate) {
  console.log('[NDVI] getTrueColorTileUrl() llamado');

  try {
    if (!isInitialized || !SENTINEL_HUB_INSTANCE_ID) {
      console.warn('[NDVI] ⚠ Sentinel Hub no está inicializado');
      return getNDVIFallbackUrl();
    }

    const url = buildWmsUrl('TRUE_COLOR', startDate, endDate);
    console.log('[NDVI] ✓ URL WMS True Color construida');
    return url;
  } catch (error) {
    console.error('[NDVI] ✗ Error construyendo URL True Color:', error);
    return getNDVIFallbackUrl();
  }
}

/**
 * Obtiene URL WMS para color falso (False Color - uso común en agricultura)
 * Resalta vegetación en rojo
 * @param {Object} bounds - GeoJSON polygon
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<string>} URL WMS False Color
 */
export async function getFalseColorTileUrl(bounds, startDate, endDate) {
  console.log('[NDVI] getFalseColorTileUrl() llamado');

  try {
    if (!isInitialized || !SENTINEL_HUB_INSTANCE_ID) {
      console.warn('[NDVI] ⚠ Sentinel Hub no está inicializado');
      return getNDVIFallbackUrl();
    }

    const url = buildWmsUrl('FALSE_COLOR', startDate, endDate);
    console.log('[NDVI] ✓ URL WMS False Color construida');
    return url;
  } catch (error) {
    console.error('[NDVI] ✗ Error construyendo URL False Color:', error);
    return getNDVIFallbackUrl();
  }
}

/**
 * URL de fallback: Sentinel-2 Cloudless (visual, no NDVI calculado)
 * Se usa cuando Sentinel Hub no está disponible
 */
export function getNDVIFallbackUrl() {
  const year = new Date().getFullYear() - 2;
  const url = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg`;
  console.log('[NDVI] Usando fallback URL (Sentinel-2 Cloudless):', url);
  return url;
}

/**
 * Obtiene fechas disponibles con imágenes Sentinel-2
 * NOTA: Con WMS de Sentinel Hub, cualquier fecha en el rango disponible funciona
 * Sentinel-2 tiene cobertura casi diaria
 */
export async function getAvailableSentinelDates(bounds) {
  console.log('[NDVI] getAvailableSentinelDates() llamado');

  try {
    if (!isInitialized || !SENTINEL_HUB_INSTANCE_ID) {
      console.warn('[NDVI] Sentinel Hub no inicializado, retornando fechas por defecto');
      return getDefaultNDVIDates();
    }

    // Sentinel-2 tiene cobertura casi diaria, así que retornamos los últimos 12 meses
    return getDefaultNDVIDates();
  } catch (error) {
    console.error('[NDVI] Error obteniendo fechas:', error);
    return getDefaultNDVIDates();
  }
}

/**
 * Fechas por defecto para selector de fecha
 * Retorna últimos 12 meses
 */
function getDefaultNDVIDates() {
  const dates = [];
  const today = new Date();

  // Últimos 12 meses
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    dates.push({
      label: date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long'
      }),
      value: date.toISOString().split('T')[0]
    });
  }

  return dates;
}

/**
 * Autentica usuario con Google OAuth (no necesario con Sentinel Hub)
 * Se mantiene por compatibilidad con código existente
 */
export async function authenticateWithGoogle() {
  console.log('[NDVI] authenticateWithGoogle() - No es necesario con Sentinel Hub');
  return true;
}

/**
 * Calcula estadísticas NDVI para un lote
 * IMPLEMENTACIÓN COMPLETA: Usa Sentinel Hub Statistical API (FASE 5)
 * Delega a ndviStatistics.js que tiene toda la lógica
 */
export async function getNDVIStatistics(loteBounds, startDate, endDate) {
  console.log('[NDVI] getNDVIStatistics() - Delegando a ndviStatistics.js');

  // Importar dinámicamente para evitar dependencias circulares
  const { getNDVIStatistics: getStats } = await import('./ndviStatistics.js');

  // loteBounds debe ser un objeto { poligono: GeoJSON }
  return await getStats(loteBounds, startDate, endDate);
}

/**
 * Parámetros de visualización NDVI
 */
export function getNDVIVisualizationParams() {
  return {
    min: 0,
    max: 0.8,
    palette: [
      '#d7191c', // Rojo oscuro
      '#fdae61', // Naranja
      '#ffffbf', // Amarillo
      '#a6d96a', // Verde claro
      '#1a9641'  // Verde oscuro
    ]
  };
}

/**
 * Leyenda NDVI
 */
export function getNDVILegend() {
  return [
    {
      rango: '< 0.2',
      color: '#d7191c',
      label: 'Muy bajo',
      descripcion: 'Sin vegetación o agua'
    },
    {
      rango: '0.2 - 0.4',
      color: '#fdae61',
      label: 'Bajo',
      descripcion: 'Vegetación débil o suelo expuesto'
    },
    {
      rango: '0.4 - 0.6',
      color: '#ffffbf',
      label: 'Medio',
      descripcion: 'Vegetación en desarrollo'
    },
    {
      rango: '0.6 - 0.8',
      color: '#a6d96a',
      label: 'Bueno',
      descripcion: 'Buena cobertura vegetal'
    },
    {
      rango: '> 0.8',
      color: '#1a9641',
      label: 'Óptimo',
      descripcion: 'Vegetación muy vigorosa y saludable'
    }
  ];
}

/**
 * Exporta NDVI como GeoTIFF (FASE 5+)
 */
export async function exportNDVIAsGeoTIFF(bounds, date) {
  console.log('[NDVI] exportNDVIAsGeoTIFF() - FASE 5+');
  return null;
}

/**
 * Capas disponibles en Sentinel Hub
 */
export const AVAILABLE_LAYERS = {
  NDVI: {
    id: 'NDVI',
    label: 'NDVI (Índice de Vegetación)',
    description: 'Índice de Diferencia Normalizada de Vegetación'
  },
  TRUE_COLOR: {
    id: 'TRUE_COLOR',
    label: 'Color Verdadero',
    description: 'Visualización RGB natural'
  },
  FALSE_COLOR: {
    id: 'FALSE_COLOR',
    label: 'Color Falso',
    description: 'NIR-R-G (resalta vegetación en rojo)'
  }
};

console.log('[NDVI] ✓ Módulo ndvi.js FASE 4B completamente cargado (Sentinel Hub)');
