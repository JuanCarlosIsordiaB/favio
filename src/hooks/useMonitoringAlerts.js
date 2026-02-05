/**
 * useMonitoringAlerts.js
 *
 * Hook personalizado para gestionar alertas de monitoreo
 * Integra verificaciones de lluvia, suelo, semillas y pasturas
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  verificarTodasLasAlertasLluvia,
  obtenerResumenEstadoLluvia
} from '../services/rainfallAlerts';
import {
  verificarTodasLasAlertasSuelo,
  obtenerResumenEstadoSuelo
} from '../services/soilAlerts';
import {
  verificarTodasLasAlertasSemillas,
  obtenerResumenEstadoSemillas
} from '../services/seedAlerts';

/**
 * Hook para gestionar todas las alertas de monitoreo
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio
 * @returns {Object} Alertas y funciones de verificación
 */
export function useMonitoringAlerts(firmId, premiseId) {
  const [alertas, setAlertas] = useState([]);
  const [alertasPorTipo, setAlertasPorTipo] = useState({
    lluvia: [],
    suelo: [],
    semillas: [],
    pasturas: []
  });
  const [resumenLluvia, setResumenLluvia] = useState(null);
  const [resumenSuelo, setResumenSuelo] = useState(null);
  const [resumenSemillas, setResumenSemillas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  /**
   * Carga alertas activas desde la base de datos
   */
  const loadAlertas = useCallback(async () => {
    if (!firmId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener alertas activas de monitoreo
      const { data: alertasData, error: alertasError } = await supabase
        .from('alerts')
        .select('*')
        .eq('firm_id', firmId)
        .in('tipo', [
          // Lluvia
          'deficit_hidrico',
          'exceso_agua',
          'campania_seca',
          'dias_sin_lluvia',
          // Suelo
          'deficit_fosforo',
          'deficit_potasio',
          'ph_critico',
          'deficit_nitrogeno',
          'baja_materia_organica',
          'deficit_azufre',
          'fertilizacion_pendiente',
          // Semillas
          'baja_germinacion',
          'semilla_inviable',
          'baja_pureza',
          'humedad_alta',
          'baja_viabilidad_tetrazolio',
          'discrepancia_tests',
          'semilla_deteriorada',
          // Pasturas
          'pastura_critica'
        ])
        .eq('estado', 'pendiente')
        .order('prioridad', { ascending: false })
        .order('created_at', { ascending: false });

      if (alertasError) throw alertasError;

      setAlertas(alertasData || []);

      // Agrupar alertas por tipo
      const alertasPorTipoTemp = {
        lluvia: [],
        suelo: [],
        semillas: [],
        pasturas: []
      };

      (alertasData || []).forEach(alerta => {
        if (['deficit_hidrico', 'exceso_agua', 'campania_seca', 'dias_sin_lluvia'].includes(alerta.tipo)) {
          alertasPorTipoTemp.lluvia.push(alerta);
        } else if ([
          'deficit_fosforo',
          'deficit_potasio',
          'ph_critico',
          'deficit_nitrogeno',
          'baja_materia_organica',
          'deficit_azufre',
          'fertilizacion_pendiente'
        ].includes(alerta.tipo)) {
          alertasPorTipoTemp.suelo.push(alerta);
        } else if ([
          'baja_germinacion',
          'semilla_inviable',
          'baja_pureza',
          'humedad_alta',
          'baja_viabilidad_tetrazolio',
          'discrepancia_tests',
          'semilla_deteriorada'
        ].includes(alerta.tipo)) {
          alertasPorTipoTemp.semillas.push(alerta);
        } else if (alerta.tipo === 'pastura_critica') {
          alertasPorTipoTemp.pasturas.push(alerta);
        }
      });

      setAlertasPorTipo(alertasPorTipoTemp);

      // Cargar resúmenes de estado
      if (premiseId) {
        const [lluvia, suelo] = await Promise.all([
          obtenerResumenEstadoLluvia(premiseId, firmId),
          obtenerResumenEstadoSuelo(premiseId, firmId)
        ]);

        setResumenLluvia(lluvia);
        setResumenSuelo(suelo);
      }

      // Resumen de semillas (a nivel firma, no predio)
      const semillas = await obtenerResumenEstadoSemillas(firmId);
      setResumenSemillas(semillas);

    } catch (err) {
      console.error('Error cargando alertas de monitoreo:', err);
      setError(err.message || 'Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  }, [firmId, premiseId]);

  /**
   * Ejecuta todas las verificaciones automáticas de alertas
   */
  const verificarTodasLasAlertas = useCallback(async () => {
    if (!firmId) return;

    try {
      setVerificando(true);

      const promises = [];

      // Verificar alertas de lluvia (si hay predio seleccionado)
      if (premiseId) {
        promises.push(verificarTodasLasAlertasLluvia(firmId, premiseId));
        promises.push(verificarTodasLasAlertasSuelo(firmId, premiseId));
      }

      // Verificar alertas de semillas
      promises.push(verificarTodasLasAlertasSemillas(firmId));

      // Ejecutar todas las verificaciones en paralelo
      const resultados = await Promise.all(promises);

      // Contar alertas creadas
      const totalAlertasCreadas = resultados.reduce(
        (sum, resultado) => sum + (resultado.totalAlertas || 0),
        0
      );

      console.log(`✅ Verificación completada: ${totalAlertasCreadas} alertas creadas`);

      // Recargar alertas para mostrar las nuevas
      await loadAlertas();

      return {
        success: true,
        totalAlertas: totalAlertasCreadas,
        resultados
      };

    } catch (err) {
      console.error('Error verificando alertas:', err);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setVerificando(false);
    }
  }, [firmId, premiseId, loadAlertas]);

  /**
   * Marca una alerta como resuelta
   */
  const resolverAlerta = useCallback(async (alertaId, observaciones = '') => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          estado: 'resuelta',
          resolved_at: new Date().toISOString(),
          resolved_notes: observaciones
        })
        .eq('id', alertaId);

      if (error) throw error;

      // Recargar alertas
      await loadAlertas();

      return true;
    } catch (err) {
      console.error('Error resolviendo alerta:', err);
      return false;
    }
  }, [loadAlertas]);

  /**
   * Marca una alerta como descartada
   */
  const descartarAlerta = useCallback(async (alertaId, motivo = '') => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          estado: 'descartada',
          resolved_at: new Date().toISOString(),
          resolved_notes: motivo
        })
        .eq('id', alertaId);

      if (error) throw error;

      // Recargar alertas
      await loadAlertas();

      return true;
    } catch (err) {
      console.error('Error descartando alerta:', err);
      return false;
    }
  }, [loadAlertas]);

  /**
   * Obtiene alertas filtradas por prioridad
   */
  const getAlertasPorPrioridad = useCallback((prioridad) => {
    return alertas.filter(a => a.prioridad === prioridad);
  }, [alertas]);

  /**
   * Obtiene alertas de un tipo específico
   */
  const getAlertasPorTipo = useCallback((tipo) => {
    return alertasPorTipo[tipo] || [];
  }, [alertasPorTipo]);

  /**
   * Recarga alertas
   */
  const refetch = useCallback(() => {
    loadAlertas();
  }, [loadAlertas]);

  // Cargar alertas al montar o cuando cambian firmId/premiseId
  useEffect(() => {
    loadAlertas();
  }, [loadAlertas]);

  return {
    // Datos
    alertas,
    alertasPorTipo,
    resumenLluvia,
    resumenSuelo,
    resumenSemillas,

    // Contadores
    totalAlertas: alertas.length,
    alertasAlta: alertas.filter(a => a.prioridad === 'alta').length,
    alertasMedia: alertas.filter(a => a.prioridad === 'media').length,
    alertasBaja: alertas.filter(a => a.prioridad === 'baja').length,

    // Estado
    loading,
    error,
    verificando,

    // Funciones
    verificarTodasLasAlertas,
    resolverAlerta,
    descartarAlerta,
    getAlertasPorPrioridad,
    getAlertasPorTipo,
    refetch
  };
}

/**
 * Hook simplificado para obtener contador de alertas activas
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio (opcional)
 * @returns {Object} Contadores de alertas
 */
export function useAlertasCounter(firmId, premiseId = null) {
  const [total, setTotal] = useState(0);
  const [alta, setAlta] = useState(0);
  const [media, setMedia] = useState(0);
  const [baja, setBaja] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firmId) {
      setLoading(false);
      return;
    }

    const loadCounter = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('alerts')
          .select('prioridad', { count: 'exact' })
          .eq('firm_id', firmId)
          .eq('estado', 'pendiente');

        if (premiseId) {
          query = query.eq('premise_id', premiseId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const alertas = data || [];
        setTotal(alertas.length);
        setAlta(alertas.filter(a => a.prioridad === 'alta').length);
        setMedia(alertas.filter(a => a.prioridad === 'media').length);
        setBaja(alertas.filter(a => a.prioridad === 'baja').length);

      } catch (err) {
        console.error('Error cargando contador de alertas:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCounter();
  }, [firmId, premiseId]);

  return {
    total,
    alta,
    media,
    baja,
    loading
  };
}

/**
 * Hook para alertas en tiempo real (con polling)
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio
 * @param {number} intervalo - Intervalo de polling en ms (default: 60000 = 1 minuto)
 * @returns {Object} Alertas con actualización automática
 */
export function useMonitoringAlertsRealtime(firmId, premiseId, intervalo = 60000) {
  const {
    alertas,
    alertasPorTipo,
    totalAlertas,
    loading,
    error,
    refetch
  } = useMonitoringAlerts(firmId, premiseId);

  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  useEffect(() => {
    // Configurar polling
    const intervalId = setInterval(() => {
      refetch();
      setUltimaActualizacion(new Date());
    }, intervalo);

    // Limpiar interval al desmontar
    return () => clearInterval(intervalId);
  }, [intervalo, refetch]);

  return {
    alertas,
    alertasPorTipo,
    totalAlertas,
    loading,
    error,
    ultimaActualizacion,
    refetch
  };
}

/**
 * Hook para alertas de un lote específico
 * @param {string} firmId - ID de la firma
 * @param {string} lotId - ID del lote
 * @returns {Object} Alertas del lote
 */
export function useLotAlerts(firmId, lotId) {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firmId || !lotId) {
      setLoading(false);
      return;
    }

    const loadLotAlerts = async () => {
      try {
        setLoading(true);

        // Buscar alertas que tengan lot_id en metadata
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('firm_id', firmId)
          .eq('estado', 'pendiente')
          .order('prioridad', { ascending: false });

        if (error) throw error;

        // Filtrar alertas que pertenezcan al lote
        const alertasDelLote = (data || []).filter(alerta => {
          return alerta.metadata && alerta.metadata.lot_id === lotId;
        });

        setAlertas(alertasDelLote);

      } catch (err) {
        console.error('Error cargando alertas del lote:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLotAlerts();
  }, [firmId, lotId]);

  return {
    alertas,
    totalAlertas: alertas.length,
    loading
  };
}
