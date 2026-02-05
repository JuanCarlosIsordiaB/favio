/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook principal para gestión de KPIs
 *
 * Proporciona:
 * - Carga de KPIs actuales
 * - Cálculo de KPIs específicos
 * - Historial y tendencias
 * - Cache de 5 minutos para performance
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  calcularKPI,
  calcularTodosLosKPIs,
  obtenerTendencia
} from '../services/kpiService';
import { obtenerUmbrales } from '../services/kpiThresholds';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useKPIs(firmId, premiseId = null, filters = {}) {
  const [kpis, setKpis] = useState([]);
  const [historico, setHistorico] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});
  const cacheTimestampRef = useRef({});

  /**
   * Obtiene todas las definiciones de KPIs activos
   */
  const obtenerDefinicionesKPIs = useCallback(async (categoria = null) => {
    try {
      let query = supabase
        .from('kpi_definitions')
        .select('id, code, name, category, unit, description, is_mandatory, is_active')
        .eq('is_active', true)
        .order('category, code');

      if (categoria) {
        query = query.eq('category', categoria);
      }

      const { data, error: errorDef } = await query;

      if (errorDef) throw errorDef;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo definiciones KPIs:', error);
      throw error;
    }
  }, []);

  /**
   * Carga KPIs con datos actuales para el período especificado
   * NO incluir filters en las dependencias para evitar bucle infinito
   */
  const loadKPIs = useCallback(async (periodo = null) => {
    if (!firmId) return;

    setLoading(true);
    setError(null);

    try {
      // Usar período actual si no se especifica
      const hoy = new Date();
      const periodoReal = periodo || {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        fin: hoy
      };

      // Intentar obtener del cache
      const cacheKey = `kpis_${periodoReal.inicio.toISOString()}_${periodoReal.fin.toISOString()}`;
      const now = Date.now();

      if (
        cacheRef.current[cacheKey] &&
        now - (cacheTimestampRef.current[cacheKey] || 0) < CACHE_DURATION
      ) {
        console.log('📦 KPIs obtenidos del cache');
        setKpis(cacheRef.current[cacheKey]);
        return;
      }

      // Calcular todos los KPIs
      const kpisCalculados = await calcularTodosLosKPIs(
        firmId,
        periodoReal.inicio,
        periodoReal.fin
      );

      // Obtener umbrales para cada KPI
      const kpisConUmbrales = await Promise.all(
        (kpisCalculados || []).map(async (kpi) => {
          try {
            const umbral = await obtenerUmbrales(firmId, kpi.id);
            return { ...kpi, umbral };
          } catch (err) {
            console.warn(`No se encontraron umbrales para KPI ${kpi.code}`);
            return { ...kpi, umbral: null };
          }
        })
      );

      // Guardar en cache (sin filtros - los filtros se aplican después)
      cacheRef.current[cacheKey] = kpisConUmbrales;
      cacheTimestampRef.current[cacheKey] = now;

      setKpis(kpisConUmbrales);
    } catch (err) {
      console.error('Error cargando KPIs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Calcula un KPI específico
   */
  const calcularKPIEspecifico = useCallback(async (kpiCode, periodoInicio, periodoFin) => {
    if (!firmId || !kpiCode) {
      setError('Falta firmware o código KPI');
      return null;
    }

    try {
      const valor = await calcularKPI(firmId, kpiCode, periodoInicio, periodoFin);
      return valor;
    } catch (err) {
      console.error(`Error calculando KPI ${kpiCode}:`, err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Calcula todos los KPIs manualmente (refresh)
   */
  const calcularTodos = useCallback(async (periodoInicio, periodoFin) => {
    if (!firmId) return null;

    setLoading(true);
    setError(null);

    try {
      const valores = await calcularTodosLosKPIs(firmId, periodoInicio, periodoFin);
      setKpis(valores);
      return valores;
    } catch (err) {
      console.error('Error calculando todos los KPIs:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene tendencia histórica de un KPI
   */
  const obtenerTendenciaKPI = useCallback(async (kpiCode, periodos = 12) => {
    if (!firmId || !kpiCode) {
      setError('Falta firmware o código KPI');
      return null;
    }

    try {
      const tendencia = await obtenerTendencia(firmId, kpiCode, periodos);
      return tendencia;
    } catch (err) {
      console.error(`Error obteniendo tendencia de ${kpiCode}:`, err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Obtiene KPI por código
   */
  const obtenerKPI = useCallback((kpiCode) => {
    return kpis.find(k => k.code === kpiCode);
  }, [kpis]);

  /**
   * Obtiene KPIs por categoría
   */
  const obtenerKPIsPorCategoria = useCallback((categoria) => {
    return kpis.filter(k => k.category === categoria);
  }, [kpis]);

  /**
   * Obtiene KPIs por status (VERDE, AMARILLO, ROJO)
   */
  const obtenerKPIsPorStatus = useCallback((status) => {
    return kpis.filter(k => k.status === status);
  }, [kpis]);

  /**
   * Limpia el cache
   */
  const limpiarCache = useCallback(() => {
    cacheRef.current = {};
    cacheTimestampRef.current = {};
  }, []);

  /**
   * Resumen de KPIs por status
   */
  const resumen = useMemo(() => {
    return {
      total: kpis.length,
      verdes: kpis.filter(k => k.status === 'VERDE').length,
      amarillos: kpis.filter(k => k.status === 'AMARILLO').length,
      rojos: kpis.filter(k => k.status === 'ROJO').length,
      porcentajeVerde: kpis.length > 0
        ? ((kpis.filter(k => k.status === 'VERDE').length / kpis.length) * 100).toFixed(1)
        : 0,
      porcentajeAmarillo: kpis.length > 0
        ? ((kpis.filter(k => k.status === 'AMARILLO').length / kpis.length) * 100).toFixed(1)
        : 0,
      porcentajeRojo: kpis.length > 0
        ? ((kpis.filter(k => k.status === 'ROJO').length / kpis.length) * 100).toFixed(1)
        : 0
    };
  }, [kpis]);

  // Cargar KPIs al montar o cambiar firmware
  // IMPORTANTE: NO incluir loadKPIs en dependencias para evitar bucle infinito
  useEffect(() => {
    if (firmId) {
      loadKPIs();
    }
  }, [firmId]);

  return {
    // Estado
    kpis,
    historico,
    loading,
    error,
    resumen,

    // Funciones
    loadKPIs,
    calcularKPIEspecifico,
    calcularTodos,
    obtenerTendenciaKPI,
    obtenerKPI,
    obtenerKPIsPorCategoria,
    obtenerKPIsPorStatus,
    obtenerDefinicionesKPIs,
    limpiarCache
  };
}
