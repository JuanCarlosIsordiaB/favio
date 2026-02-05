/**
 * Configuración centralizada de Sentinel Hub APIs
 * Gestiona tanto WMS (visualización) como Statistical API (valores numéricos)
 */

export const SENTINEL_HUB_CONFIG = {
  // WMS API (ya implementado en FASE 4)
  WMS_BASE_URL: 'https://sh.dataspace.copernicus.eu/ogc/wms',

  // Statistical API (NDVI Statistics - FASE 5)
  STATISTICAL_API_URL: 'https://sh.dataspace.copernicus.eu/api/v1/statistics',

  // OAuth2 para autenticación
  OAUTH_TOKEN_URL: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',

  // Credenciales desde variables de entorno
  INSTANCE_ID: import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID,
  CLIENT_ID: import.meta.env.VITE_SENTINEL_HUB_CLIENT_ID,
  CLIENT_SECRET: import.meta.env.VITE_SENTINEL_HUB_CLIENT_SECRET,

  // Parámetros por defecto para Statistical API
  DEFAULT_MAX_CLOUD_COVERAGE: 20, // Máximo 20% de nubes
  DEFAULT_TIME_RANGE_DAYS: 30, // Buscar imágenes en últimos 30 días

  // Validación de NDVI
  NDVI_MIN_THRESHOLD: -1,
  NDVI_MAX_THRESHOLD: 1,
};

/**
 * Valida que todas las variables de entorno necesarias estén configuradas
 * @returns {boolean} true si la configuración es válida
 */
export function validateSentinelHubConfig() {
  const missing = [];

  if (!SENTINEL_HUB_CONFIG.INSTANCE_ID) missing.push('VITE_SENTINEL_HUB_INSTANCE_ID');
  if (!SENTINEL_HUB_CONFIG.CLIENT_ID) missing.push('VITE_SENTINEL_HUB_CLIENT_ID');
  if (!SENTINEL_HUB_CONFIG.CLIENT_SECRET) missing.push('VITE_SENTINEL_HUB_CLIENT_SECRET');

  if (missing.length > 0) {
    console.warn('[Sentinel Hub] Variables de entorno faltantes:', missing);
    return false;
  }

  console.log('[Sentinel Hub] ✓ Configuración válida');
  return true;
}
