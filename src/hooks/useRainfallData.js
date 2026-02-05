/**
 * useRainfallData.js
 *
 * Hook personalizado para datos y análisis de lluvia
 * Abstrae la lógica de rainfallAnalytics.js
 */

import { useState, useEffect, useCallback } from 'react';
import {
  obtenerRegistrosLluvia,
  calcularAcumuladoLluvia,
  obtenerAcumuladosMensuales,
  obtenerCampaniaActual,
  compararConPromedio,
  obtenerComparacionInteranual,
  obtenerDistribucionMensual,
  detectarDeficitHidrico,
  detectarExcesoLluvia
} from '../services/rainfallAnalytics';
import { calcularDiasSinLluvia } from '../lib/rainfallCalculations';

/**
 * Hook para gestionar datos de lluvia de un predio
 * @param {string} premiseId - ID del predio
 * @returns {Object} Datos y funciones de lluvia
 */
export function useRainfallData(premiseId) {
  const [registros, setRegistros] = useState([]);
  const [acumuladoMensual, setAcumuladoMensual] = useState(null);
  const [acumuladoCampania, setAcumuladoCampania] = useState(null);
  const [promedioHistorico, setPromedioHistorico] = useState(null);
  const [comparacionInteranual, setComparacionInteranual] = useState(null);
  const [distribucionMensual, setDistribucionMensual] = useState(null);
  const [deficitHidrico, setDeficitHidrico] = useState(null);
  const [excesoLluvia, setExcesoLluvia] = useState(null);
  const [diasSinLluvia, setDiasSinLluvia] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carga todos los datos de lluvia
   */
  const loadData = useCallback(async () => {
    if (!premiseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cargar registros (últimos 365 días)
      const registrosData = await obtenerRegistrosLluvia(premiseId);
      setRegistros(registrosData);

      // Calcular días sin lluvia
      const diasSinLluviaCalc = calcularDiasSinLluvia(registrosData, 1);
      setDiasSinLluvia(diasSinLluviaCalc);

      // Calcular acumulado mensual (últimos 30 días)
      const fechaFin = new Date();
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 30);

      const acumuladoMes = await calcularAcumuladoLluvia(premiseId, fechaInicio, fechaFin);
      setAcumuladoMensual(acumuladoMes);

      // Obtener campaña actual
      const campaniaActual = await obtenerCampaniaActual(premiseId);
      setAcumuladoCampania(campaniaActual);

      // Comparar con promedio histórico (últimos 5 años)
      const comparacion = await compararConPromedio(
        premiseId,
        campaniaActual.fechaInicio,
        campaniaActual.fechaFin,
        5
      );
      setPromedioHistorico(comparacion.promedioHistorico);

      // Obtener comparación interanual
      const interanual = await obtenerComparacionInteranual(premiseId, 3);
      setComparacionInteranual(interanual);

      // Obtener distribución mensual
      const distribucion = await obtenerDistribucionMensual(
        premiseId,
        campaniaActual.fechaInicio,
        campaniaActual.fechaFin
      );
      setDistribucionMensual(distribucion);

      // Detectar déficit hídrico
      const deficit = await detectarDeficitHidrico(premiseId, 30, 50);
      setDeficitHidrico(deficit);

      // Detectar exceso de lluvia
      const exceso = await detectarExcesoLluvia(premiseId, 7, 150);
      setExcesoLluvia(exceso);

    } catch (err) {
      console.error('Error cargando datos de lluvia:', err);
      setError(err.message || 'Error al cargar datos de lluvia');
    } finally {
      setLoading(false);
    }
  }, [premiseId]);

  /**
   * Recarga los datos
   */
  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Obtiene acumulados mensuales del año actual
   */
  const getAcumuladosMensuales = useCallback(async (anio = new Date().getFullYear()) => {
    if (!premiseId) return null;

    try {
      const acumulados = await obtenerAcumuladosMensuales(premiseId, anio);
      return acumulados;
    } catch (err) {
      console.error('Error obteniendo acumulados mensuales:', err);
      return null;
    }
  }, [premiseId]);

  /**
   * Obtiene datos de campaña específica
   */
  const getCampaniaData = useCallback(async (anioInicio) => {
    if (!premiseId) return null;

    try {
      const campaniaData = await obtenerCampaniaActual(premiseId, anioInicio);
      return campaniaData;
    } catch (err) {
      console.error('Error obteniendo datos de campaña:', err);
      return null;
    }
  }, [premiseId]);

  // Cargar datos al montar o cuando cambia premiseId
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Datos
    registros,
    acumuladoMensual,
    acumuladoCampania,
    promedioHistorico,
    comparacionInteranual,
    distribucionMensual,
    deficitHidrico,
    excesoLluvia,
    diasSinLluvia,

    // Estado
    loading,
    error,

    // Funciones
    refetch,
    getAcumuladosMensuales,
    getCampaniaData
  };
}

/**
 * Hook simplificado para obtener solo acumulados básicos
 * @param {string} premiseId - ID del predio
 * @returns {Object} Acumulados básicos
 */
export function useRainfallSummary(premiseId) {
  const [acumulado30Dias, setAcumulado30Dias] = useState(0);
  const [acumuladoCampania, setAcumuladoCampania] = useState(0);
  const [diasSinLluvia, setDiasSinLluvia] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!premiseId) {
      setLoading(false);
      return;
    }

    const loadSummary = async () => {
      try {
        setLoading(true);

        // Acumulado últimos 30 días
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);

        const acumulado30 = await calcularAcumuladoLluvia(premiseId, fechaInicio, fechaFin);
        setAcumulado30Dias(acumulado30.acumulado);

        // Acumulado campaña
        const campania = await obtenerCampaniaActual(premiseId);
        setAcumuladoCampania(campania.acumulado);

        // Días sin lluvia
        const registros = await obtenerRegistrosLluvia(premiseId, null, null, 60);
        const dias = calcularDiasSinLluvia(registros, 1);
        setDiasSinLluvia(dias);

      } catch (err) {
        console.error('Error cargando resumen de lluvia:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [premiseId]);

  return {
    acumulado30Dias,
    acumuladoCampania,
    diasSinLluvia,
    loading
  };
}
