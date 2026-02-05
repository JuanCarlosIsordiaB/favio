/**
 * useLivestockAnalytics.js
 *
 * Hook personalizado para análisis de pasturas y ganadería
 * Abstrae la lógica de livestockAnalytics.js
 */

import { useState, useEffect, useCallback } from 'react';
import {
  calcularVelocidadCrecimiento,
  proyectarDiasHastaRemanente,
  calcularAlturaPromedioHistorica,
  detectarTendencia,
  calcularCargaRecomendada,
  compararLotesPorOferta,
  obtenerRegistrosPastura
} from '../services/livestockAnalytics';

/**
 * Hook para análisis completo de pastura de un lote
 * @param {string} lotId - ID del lote
 * @returns {Object} Datos y análisis de pastura
 */
export function useLivestockAnalytics(lotId) {
  const [ultimaMedicion, setUltimaMedicion] = useState(null);
  const [alturaPromedio, setAlturaPromedio] = useState(null);
  const [alturaPromedioHistorica, setAlturaPromedioHistorica] = useState(null);
  const [velocidadCrecimiento, setVelocidadCrecimiento] = useState(null);
  const [diasHastaRemanente, setDiasHastaRemanente] = useState(null);
  const [tendencia, setTendencia] = useState(null);
  const [cargaRecomendada, setCargaRecomendada] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carga todos los datos de análisis de pastura
   */
  const loadData = useCallback(async () => {
    if (!lotId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener historial (últimos 90 días)
      const hist = await obtenerRegistrosPastura(lotId, 90);
      setHistorial(hist);

      // La última medición es el primer elemento (ya viene ordenado DESC)
      const ultimaMed = hist && hist.length > 0 ? hist[0] : null;
      setUltimaMedicion(ultimaMed);

      if (ultimaMed) {
        setAlturaPromedio(ultimaMed.altura_promedio_cm);
      }

      // Calcular velocidad de crecimiento (últimos 30 días)
      const velocidad = await calcularVelocidadCrecimiento(lotId, 30);
      setVelocidadCrecimiento(velocidad);

      // Detectar tendencia
      const tend = await detectarTendencia(lotId, 30);
      setTendencia(tend);

      // Proyectar días hasta remanente crítico
      if (ultimaMed?.remanente_objetivo_cm) {
        const proyeccion = await proyectarDiasHastaRemanente(
          lotId,
          ultimaMed.remanente_objetivo_cm
        );
        setDiasHastaRemanente(proyeccion);
      }

      // Calcular altura promedio histórica (últimos 12 meses)
      const fechaFin = new Date();
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 12);

      const promedioHistorico = await calcularAlturaPromedioHistorica(
        lotId,
        fechaInicio,
        fechaFin
      );
      setAlturaPromedioHistorica(promedioHistorico);

      // Calcular carga recomendada (consumo promedio: 10 kg MS/animal/día)
      const carga = await calcularCargaRecomendada(lotId, 10);
      setCargaRecomendada(carga);

    } catch (err) {
      console.error('Error cargando análisis de pastura:', err);
      setError(err.message || 'Error al cargar análisis de pastura');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  /**
   * Recarga los datos
   */
  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Obtiene velocidad de crecimiento para un período personalizado
   */
  const getVelocidadCrecimiento = useCallback(async (dias = 30) => {
    if (!lotId) return null;

    try {
      const velocidad = await calcularVelocidadCrecimiento(lotId, dias);
      return velocidad;
    } catch (err) {
      console.error('Error obteniendo velocidad de crecimiento:', err);
      return null;
    }
  }, [lotId]);

  /**
   * Calcula carga recomendada con consumo personalizado
   */
  const getCargaRecomendada = useCallback(async (consumoDiarioPorAnimal = 10) => {
    if (!lotId) return null;

    try {
      const carga = await calcularCargaRecomendada(lotId, consumoDiarioPorAnimal);
      return carga;
    } catch (err) {
      console.error('Error obteniendo carga recomendada:', err);
      return null;
    }
  }, [lotId]);

  // Cargar datos al montar o cuando cambia lotId
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Datos
    ultimaMedicion,
    alturaPromedio,
    alturaPromedioHistorica,
    velocidadCrecimiento,
    diasHastaRemanente,
    tendencia,
    cargaRecomendada,
    historial,

    // Estado
    loading,
    error,

    // Funciones
    refetch,
    getVelocidadCrecimiento,
    getCargaRecomendada
  };
}

/**
 * Hook para comparar oferta forrajera entre lotes de un predio
 * @param {string} premiseId - ID del predio
 * @returns {Object} Comparación de lotes
 */
export function useLotesComparison(premiseId) {
  const [comparacion, setComparacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!premiseId) {
      setLoading(false);
      return;
    }

    const loadComparison = async () => {
      try {
        setLoading(true);
        setError(null);

        const comp = await compararLotesPorOferta(premiseId);
        setComparacion(comp);

      } catch (err) {
        console.error('Error comparando lotes:', err);
        setError(err.message || 'Error al comparar lotes');
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [premiseId]);

  const refetch = useCallback(async () => {
    if (!premiseId) return;

    try {
      setLoading(true);
      const comp = await compararLotesPorOferta(premiseId);
      setComparacion(comp);
    } catch (err) {
      console.error('Error recargando comparación:', err);
    } finally {
      setLoading(false);
    }
  }, [premiseId]);

  return {
    comparacion,
    loading,
    error,
    refetch
  };
}

/**
 * Hook simplificado para obtener solo métricas básicas de pastura
 * @param {string} lotId - ID del lote
 * @returns {Object} Métricas básicas
 */
export function usePastureSummary(lotId) {
  const [alturaActual, setAlturaActual] = useState(null);
  const [estado, setEstado] = useState(null); // 'CRITICO', 'URGENTE', 'ATENCION', 'NORMAL'
  const [color, setColor] = useState('gray');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lotId) {
      setLoading(false);
      return;
    }

    const loadSummary = async () => {
      try {
        setLoading(true);

        // Obtener última medición
        const registros = await obtenerRegistrosPastura(lotId, 1);
        const ultimaMed = registros && registros.length > 0 ? registros[0] : null;

        if (ultimaMed) {
          setAlturaActual(ultimaMed.altura_promedio_cm);

          // Proyectar días hasta remanente
          const proyeccion = await proyectarDiasHastaRemanente(
            lotId,
            ultimaMed.remanente_objetivo_cm
          );

          setEstado(proyeccion.estado);
          setColor(proyeccion.color);
        }

      } catch (err) {
        console.error('Error cargando resumen de pastura:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [lotId]);

  return {
    alturaActual,
    estado,
    color,
    loading
  };
}

/**
 * Hook para seguimiento de tendencia de pastura en tiempo real
 * @param {string} lotId - ID del lote
 * @param {number} diasAnalisis - Días a analizar para tendencia
 * @returns {Object} Tendencia y recomendaciones
 */
export function usePastureTrend(lotId, diasAnalisis = 30) {
  const [tendencia, setTendencia] = useState(null);
  const [velocidad, setVelocidad] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lotId) {
      setLoading(false);
      return;
    }

    const loadTrend = async () => {
      try {
        setLoading(true);

        const tend = await detectarTendencia(lotId, diasAnalisis);
        setTendencia(tend);

        const vel = await calcularVelocidadCrecimiento(lotId, diasAnalisis);
        setVelocidad(vel);

      } catch (err) {
        console.error('Error cargando tendencia:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrend();
  }, [lotId, diasAnalisis]);

  return {
    tendencia,
    velocidad,
    loading
  };
}
