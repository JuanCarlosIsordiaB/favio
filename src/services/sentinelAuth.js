/**
 * Servicio de autenticación OAuth2 para Sentinel Hub
 * Gestiona tokens con cache automático y renovación
 */

import { SENTINEL_HUB_CONFIG } from '../lib/sentinelHub.config';

// Cache del token en memoria (no persistente por seguridad)
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Obtiene un access token válido
 * Usa cache si está disponible y válido
 * Auto-renueva si está expirado
 *
 * @returns {Promise<string>} Access token para Sentinel Hub API
 * @throws {Error} Si la autenticación falla
 */
export async function getAccessToken() {
  // Verificar si el token en cache es válido
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    console.log('[Sentinel Auth] Usando token en cache (válido por', Math.round((tokenCache.expiresAt - Date.now()) / 1000), 's)');
    return tokenCache.accessToken;
  }

  console.log('[Sentinel Auth] Obteniendo nuevo token OAuth2...');

  try {
    const response = await fetch(SENTINEL_HUB_CONFIG.OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SENTINEL_HUB_CONFIG.CLIENT_ID,
        client_secret: SENTINEL_HUB_CONFIG.CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth2 failed: ${response.status} - ${errorText}`);
    }

    // Verificar que la respuesta sea JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      throw new Error(`OAuth2 response is not JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error(`Failed to parse OAuth2 JSON response: ${jsonError.message}`);
    }

    // Guardar en cache (expires_in está en segundos, restar 60s como buffer)
    tokenCache.accessToken = data.access_token;
    tokenCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    console.log('[Sentinel Auth] ✓ Token obtenido exitosamente (válido por', data.expires_in - 60, 's)');
    return data.access_token;
  } catch (error) {
    console.error('[Sentinel Auth] Error obteniendo token:', error);
    throw new Error(`No se pudo autenticar con Sentinel Hub: ${error.message}`);
  }
}

/**
 * Limpia el cache de token
 * Útil para forzar renovación o en caso de error
 */
export function clearTokenCache() {
  tokenCache.accessToken = null;
  tokenCache.expiresAt = null;
  console.log('[Sentinel Auth] Cache de token limpiado');
}
