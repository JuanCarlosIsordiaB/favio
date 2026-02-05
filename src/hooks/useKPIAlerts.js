/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook para gestión de alertas de KPIs
 *
 * Proporciona:
 * - Obtención de alertas (con filtros)
 * - Resolución de alertas
 * - Detección de alertas combinadas
 * - Polling automático opcional
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  obtenerAlertasDeKPIs,
  resolverAlertaKPI,
  detectarAlertasCombinadas,
  obtenerAlertasCríticas,
  obtenerAlertasAdvertencia,
  obtenerKPIsEnAmarilloConsecutivo,
  contarAlertasDeKPIs
} from '../services/kpiAlerts';

const POLLING_INTERVAL = 2 * 60 * 1000; // 2 minutos

export function useKPIAlerts(firmId, autoPolling = false) {
  const [alertas, setAlertas] = useState([]);
  const [alertasCriticas, setAlertasCriticas] = useState([]);
  const [alertasAdvertencia, setAlertasAdvertencia] = useState([]);
  const [alertasCombinadas, setAlertasCombinadas] = useState([]);
  const [kpisEnAmarillo, setKpisEnAmarillo] = useState([]);
  const [conteos, setConteos] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);

  /**
   * Obtiene alertas con filtros opcionales
   */
  const cargarAlertas = useCallback(async (filtros = {}) => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const alertasData = await obtenerAlertasDeKPIs(firmId, {
        ...filtros,
        limit: filtros.limit || 100
      });

      setAlertas(alertasData);
      return alertasData;
    } catch (err) {
      console.error('Error cargando alertas:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene solo alertas críticas (ROJO)
   */
  const cargarAlertasCriticas = useCallback(async () => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    try {
      const alertasData = await obtenerAlertasCríticas(firmId);
      setAlertasCriticas(alertasData);
      return alertasData;
    } catch (err) {
      console.error('Error cargando alertas críticas:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Obtiene solo alertas de advertencia (AMARILLO)
   */
  const cargarAlertasAdvertencia = useCallback(async () => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    try {
      const alertasData = await obtenerAlertasAdvertencia(firmId);
      setAlertasAdvertencia(alertasData);
      return alertasData;
    } catch (err) {
      console.error('Error cargando alertas de advertencia:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Detecta alertas combinadas (múltiples KPIs críticos)
   */
  const detectarCombinadas = useCallback(async () => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    try {
      const alertasData = await detectarAlertasCombinadas(firmId);
      setAlertasCombinadas(alertasData);
      return alertasData;
    } catch (err) {
      console.error('Error detectando alertas combinadas:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Obtiene KPIs en amarillo consecutivo (>N días)
   */
  const cargarKPIsEnAmarillo = useCallback(async (diasThreshold = 3) => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    try {
      const kpisData = await obtenerKPIsEnAmarilloConsecutivo(firmId, diasThreshold);
      setKpisEnAmarillo(kpisData);
      return kpisData;
    } catch (err) {
      console.error('Error cargando KPIs en amarillo:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Obtiene conteos de alertas por tipo
   */
  const cargarConteos = useCallback(async () => {
    if (!firmId) {
      setError('Falta firmware');
      return null;
    }

    try {
      const conteosData = await contarAlertasDeKPIs(firmId);
      setConteos(conteosData);
      return conteosData;
    } catch (err) {
      console.error('Error obteniendo conteos:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Resuelve una alerta (la marca como completada)
   */
  const resolverAlerta = useCallback(async (alertId, userId, notas = '') => {
    if (!firmId || !alertId) {
      setError('Falta firmware o ID de alerta');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await resolverAlertaKPI(alertId, userId, notas);

      // Actualizar lista local
      setAlertas(prev => prev.map(a => a.id === alertId ? { ...a, estado: 'completed' } : a));
      setAlertasCriticas(prev => prev.filter(a => a.id !== alertId));
      setAlertasAdvertencia(prev => prev.filter(a => a.id !== alertId));

      return true;
    } catch (err) {
      console.error('Error resolviendo alerta:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Carga todas las alertas (críticas + advertencia + conteos)
   */
  const cargarTodasLasAlertas = useCallback(async () => {
    if (!firmId) {
      setError('Falta firmware');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        cargarAlertas(),
        cargarAlertasCriticas(),
        cargarAlertasAdvertencia(),
        detectarCombinadas(),
        cargarKPIsEnAmarillo(),
        cargarConteos()
      ]);

      return true;
    } catch (err) {
      console.error('Error cargando todas las alertas:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [firmId, cargarAlertas, cargarAlertasCriticas, cargarAlertasAdvertencia, detectarCombinadas, cargarKPIsEnAmarillo, cargarConteos]);

  /**
   * Inicia polling automático de alertas
   */
  const iniciarPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Cargar inmediatamente
    cargarTodasLasAlertas();

    // Configurar polling
    pollingIntervalRef.current = setInterval(() => {
      cargarTodasLasAlertas();
    }, POLLING_INTERVAL);

    console.log('✅ Polling de alertas iniciado (cada 2 minutos)');
  }, [cargarTodasLasAlertas]);

  /**
   * Detiene polling automático
   */
  const detenerPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('⏹️ Polling de alertas detenido');
    }
  }, []);

  /**
   * Obtiene resumen de alertas
   */
  const obtenerResumen = useCallback(() => {
    return {
      totalAlertas: alertas.length,
      alertasCriticas: alertasCriticas.length,
      alertasAdvertencia: alertasAdvertencia.length,
      alertasCombinadas: alertasCombinadas.length,
      kpisEnAmarillo: kpisEnAmarillo.length,
      ...conteos
    };
  }, [alertas, alertasCriticas, alertasAdvertencia, alertasCombinadas, kpisEnAmarillo, conteos]);

  /**
   * Filtra alertas por criterios múltiples
   */
  const filtrarAlertas = useCallback((criterios = {}) => {
    let filtered = alertas;

    if (criterios.estado) {
      filtered = filtered.filter(a => a.estado === criterios.estado);
    }

    if (criterios.prioridad) {
      filtered = filtered.filter(a => a.prioridad === criterios.prioridad);
    }

    if (criterios.loteId) {
      filtered = filtered.filter(a => a.lot_id === criterios.loteId);
    }

    if (criterios.kpiCode) {
      filtered = filtered.filter(a =>
        a.regla_aplicada && a.regla_aplicada.includes(criterios.kpiCode)
      );
    }

    if (criterios.diasAntes) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - criterios.diasAntes);
      filtered = filtered.filter(a => new Date(a.fecha) >= fechaLimite);
    }

    return filtered;
  }, [alertas]);

  /**
   * Ordena alertas
   */
  const ordenarAlertas = useCallback((alertasToSort, campo = 'fecha', orden = 'desc') => {
    return [...alertasToSort].sort((a, b) => {
      let valorA = a[campo];
      let valorB = b[campo];

      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }

      if (orden === 'desc') {
        return valorA < valorB ? 1 : -1;
      } else {
        return valorA > valorB ? 1 : -1;
      }
    });
  }, []);

  // Configurar polling automático si se especifica
  useEffect(() => {
    if (autoPolling && firmId) {
      iniciarPolling();
    }

    return () => {
      if (autoPolling) {
        detenerPolling();
      }
    };
  }, [autoPolling, firmId, iniciarPolling, detenerPolling]);

  return {
    // Estado
    alertas,
    alertasCriticas,
    alertasAdvertencia,
    alertasCombinadas,
    kpisEnAmarillo,
    conteos,
    loading,
    error,

    // Funciones de carga
    cargarAlertas,
    cargarAlertasCriticas,
    cargarAlertasAdvertencia,
    detectarCombinadas,
    cargarKPIsEnAmarillo,
    cargarConteos,
    cargarTodasLasAlertas,

    // Funciones de acción
    resolverAlerta,

    // Control de polling
    iniciarPolling,
    detenerPolling,

    // Funciones de utilidad
    obtenerResumen,
    filtrarAlertas,
    ordenarAlertas
  };
}
