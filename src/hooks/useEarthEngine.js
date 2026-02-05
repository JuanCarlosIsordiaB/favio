import { useEffect, useState } from 'react';
import { initializeEarthEngine, authenticateWithGoogle } from '@/services/ndvi';

/**
 * Hook para inicializar y manejar Google Earth Engine
 * Se ejecuta una sola vez al cargar la aplicación
 */
export function useEarthEngine() {
  const [eeReady, setEeReady] = useState(false);
  const [eeError, setEeError] = useState(null);
  const [eeAuthenticated, setEeAuthenticated] = useState(false);

  // Inicializar GEE al montar el componente
  useEffect(() => {
    const initGEE = async () => {
      try {
        const initialized = await initializeEarthEngine();

        if (initialized) {
          console.log('[GEE] ✓ Earth Engine inicializado correctamente');
          setEeReady(true);
          setEeAuthenticated(true);
        } else {
          console.warn('[GEE] ⚠ Earth Engine no disponible, usando fallback');
          setEeReady(false);
          setEeError('GEE no está configurado. Usando fallback a Sentinel-2 Cloudless');
        }
      } catch (error) {
        console.error('[GEE] ✗ Error inicializando:', error);
        setEeError(error.message);
        setEeReady(false);
      }
    };

    initGEE();
  }, []);

  // Función para autenticar manualmente si es necesario
  const authenticate = async () => {
    try {
      const authenticated = await authenticateWithGoogle();
      setEeAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      console.error('[GEE] Error autenticando:', error);
      setEeError(error.message);
      return false;
    }
  };

  return {
    eeReady,
    eeAuthenticated,
    eeError,
    authenticate,
  };
}
