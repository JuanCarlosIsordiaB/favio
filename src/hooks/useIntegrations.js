import { useState, useCallback, useEffect } from 'react';
import {
  obtenerIntegraciones,
  obtenerIntegracion,
  crearIntegracion,
  actualizarIntegracion,
  activarIntegracion,
  desactivarIntegracion,
  testIntegracion,
  obtenerHistorialSincronizaciones,
  obtenerEstadoIntegraciones
} from '../services/integrationServices';
import {
  sincronizarBambooHR,
  probarConexionBambooHR,
  obtenerEstadisticasBambooHR
} from '../services/bamboohrIntegration';
import {
  sincronizarWorkday,
  probarConexionWorkday,
  obtenerEstadisticasWorkday
} from '../services/workdayIntegration';
import {
  sincronizarADP,
  probarConexionADP,
  obtenerEstadisticasADP
} from '../services/adpIntegration';
import { toast } from 'sonner';

export function useIntegrations(firmId) {
  const [integraciones, setIntegraciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Cargar integraciones
  const cargarIntegraciones = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    try {
      const { data } = await obtenerIntegraciones(firmId);
      setIntegraciones(data || []);
    } catch (err) {
      console.error('Error cargando integraciones:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  // Cargar estado general
  const cargarEstado = useCallback(async () => {
    if (!firmId) return;

    try {
      const stats = await obtenerEstadoIntegraciones(firmId);
      setEstado(stats);
    } catch (err) {
      console.error('Error cargando estado:', err);
    }
  }, [firmId]);

  // Crear integración
  const crear = useCallback(async (data) => {
    try {
      const nuevaIntegracion = await crearIntegracion({
        ...data,
        firm_id: firmId,
        currentUser: 'usuario'
      });
      setIntegraciones(prev => [...prev, nuevaIntegracion]);
      toast.success('Integración creada');
      return nuevaIntegracion;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  // Actualizar integración
  const actualizar = useCallback(async (integrationId, updates) => {
    try {
      const { data } = await actualizarIntegracion(integrationId, updates);
      setIntegraciones(prev =>
        prev.map(i => i.id === integrationId ? data : i)
      );
      toast.success('Integración actualizada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  // Activar integración
  const activar = useCallback(async (integrationId) => {
    try {
      const { data } = await activarIntegracion(integrationId, firmId, 'usuario');
      setIntegraciones(prev =>
        prev.map(i => i.id === integrationId ? data : i)
      );
      toast.success('Integración activada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  // Desactivar integración
  const desactivar = useCallback(async (integrationId) => {
    try {
      const { data } = await desactivarIntegracion(integrationId, firmId, 'usuario');
      setIntegraciones(prev =>
        prev.map(i => i.id === integrationId ? data : i)
      );
      toast.success('Integración pausada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  // Probar conexión
  const probarConexion = useCallback(async (integrationId, provider) => {
    try {
      let resultado;
      if (provider === 'bamboohr') {
        resultado = await probarConexionBambooHR(firmId);
      } else if (provider === 'workday') {
        resultado = await probarConexionWorkday(firmId);
      } else if (provider === 'adp') {
        resultado = await probarConexionADP(firmId);
      } else {
        resultado = await testIntegracion(integrationId);
      }

      if (resultado.success) {
        toast.success('Conexión exitosa');
      } else {
        toast.error(`Error: ${resultado.error || resultado.mensaje}`);
      }

      return resultado;
    } catch (err) {
      toast.error(`Error de conexión: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  // Sincronizar
  const sincronizar = useCallback(async (integrationId, provider, syncType = 'full') => {
    setSyncing(true);
    try {
      let resultado;
      if (provider === 'bamboohr') {
        resultado = await sincronizarBambooHR(firmId, integrationId, syncType);
      } else if (provider === 'workday') {
        resultado = await sincronizarWorkday(firmId, integrationId, syncType);
      } else if (provider === 'adp') {
        resultado = await sincronizarADP(firmId, integrationId, syncType);
      }

      toast.success(
        `Sincronización completada: ${resultado.recordsSynced} registros ` +
        `(${resultado.recordsCreated} nuevos, ${resultado.recordsUpdated} actualizados)`
      );

      // Recargar integraciones para obtener última_sync actualizada
      await cargarIntegraciones();
      await cargarEstado();

      return resultado;
    } catch (err) {
      toast.error(`Error en sincronización: ${err.message}`);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [firmId, cargarIntegraciones, cargarEstado]);

  // Obtener historial de una integración
  const obtenerHistorial = useCallback(async (integrationId, limit = 50) => {
    try {
      const { data } = await obtenerHistorialSincronizaciones(integrationId, limit);
      return data || [];
    } catch (err) {
      console.error('Error cargando historial:', err);
      return [];
    }
  }, []);

  // Auto-load en mount
  useEffect(() => {
    if (firmId) {
      cargarIntegraciones();
      cargarEstado();

      // Recargar estado cada 30 segundos
      const interval = setInterval(() => {
        cargarEstado();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [firmId, cargarIntegraciones, cargarEstado]);

  return {
    integraciones,
    estado,
    loading,
    syncing,
    cargarIntegraciones,
    cargarEstado,
    crear,
    actualizar,
    activar,
    desactivar,
    probarConexion,
    sincronizar,
    obtenerHistorial
  };
}
