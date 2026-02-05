/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * useScenarios.js - Hook para Gestión de Escenarios
 *
 * Funcionalidad:
 * - Cargar escenarios
 * - Crear escenarios
 * - Eliminar escenarios
 * - Convertir a proyecciones
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as scenarioEngine from '../services/simulation/scenarioEngine';

export function useScenarios(firmId, premiseId = null) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar escenarios con filtros
   */
  const loadScenarios = useCallback(
    async (filters = {}) => {
      setLoading(true);
      setError(null);

      try {
        const result = await scenarioEngine.getScenarios({
          firm_id: firmId,
          premise_id: premiseId,
          ...filters
        });

        if (result.success) {
          setScenarios(result.scenarios || []);
          return result.scenarios;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error cargando escenarios';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en loadScenarios:', err);
      } finally {
        setLoading(false);
      }
    },
    [firmId, premiseId]
  );

  /**
   * Crear escenario desde proyección agrícola
   */
  const createFromAgriculturalProjection = useCallback(
    async (projectionId, currentUser) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.createScenarioFromAgriculturalProjection(
          projectionId,
          currentUser
        );

        if (result.success) {
          toast.success('Escenario agrícola creado exitosamente');
          setScenarios(prev => [...prev, result.scenario]);
          return result.scenario;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error creando escenario agrícola';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en createFromAgriculturalProjection:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Crear escenario desde proyección ganadera
   */
  const createFromLivestockProjection = useCallback(
    async (projectionId, currentUser) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.createScenarioFromLivestockProjection(
          projectionId,
          currentUser
        );

        if (result.success) {
          toast.success('Escenario ganadero creado exitosamente');
          setScenarios(prev => [...prev, result.scenario]);
          return result.scenario;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error creando escenario ganadero';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en createFromLivestockProjection:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Crear escenario personalizado
   */
  const createCustomScenario = useCallback(
    async (scenarioData, currentUser) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.createCustomScenario(
          scenarioData,
          currentUser
        );

        if (result.success) {
          toast.success('Escenario personalizado creado exitosamente');
          setScenarios(prev => [...prev, result.scenario]);
          return result.scenario;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error creando escenario personalizado';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en createCustomScenario:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Ejecutar simulación de un escenario
   */
  const executeSimulation = useCallback(
    async (scenarioId) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.executeSimulation(scenarioId);

        if (result.success) {
          toast.success('Simulación ejecutada exitosamente');

          // Actualizar escenario en estado local
          setScenarios(prev =>
            prev.map(s => s.id === scenarioId ? result.scenario : s)
          );

          return result.scenario;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error ejecutando simulación';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en executeSimulation:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Generar variantes automáticas
   */
  const generateVariants = useCallback(
    async (baseScenarioId, currentUser) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.generateScenarioVariants(
          baseScenarioId,
          currentUser
        );

        if (result.success) {
          toast.success(
            `${result.variants.length} variantes generadas exitosamente`
          );

          // Agregar variantes al estado
          setScenarios(prev => [...prev, ...result.variants]);

          return result.variants;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error generando variantes';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en generateVariants:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Guardar cambios en un escenario
   */
  const saveScenario = useCallback(
    async (scenarioId, updates) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.saveScenario(scenarioId, updates);

        if (result.success) {
          toast.success('Escenario guardado exitosamente');

          // Actualizar en estado local
          setScenarios(prev =>
            prev.map(s => s.id === scenarioId ? result.scenario : s)
          );

          return result.scenario;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error guardando escenario';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en saveScenario:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Eliminar escenario
   */
  const deleteScenario = useCallback(
    async (scenarioId) => {
      if (!window.confirm('¿Estás seguro de que deseas eliminar este escenario?')) {
        return;
      }

      setLoading(true);

      try {
        const result = await scenarioEngine.deleteScenario(scenarioId);

        if (result.success) {
          toast.success('Escenario eliminado exitosamente');

          // Remover del estado local
          setScenarios(prev => prev.filter(s => s.id !== scenarioId));

          return true;
        }
      } catch (err) {
        const errorMessage = err.message || 'Error eliminando escenario';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en deleteScenario:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Convertir escenario a proyección agrícola real
   */
  const convertToAgriculturalProjection = useCallback(
    async (scenarioId, currentUser) => {
      setLoading(true);

      try {
        const result = await scenarioEngine.convertScenarioToAgriculturalProjection(
          scenarioId,
          currentUser
        );

        if (result.success) {
          toast.success('Escenario convertido a proyección exitosamente');

          // Actualizar estado del escenario
          setScenarios(prev =>
            prev.map(s =>
              s.id === scenarioId
                ? {
                    ...s,
                    converted_to_projection_id: result.projection.id,
                    converted_at: new Date().toISOString()
                  }
                : s
            )
          );

          return result.projection;
        }
      } catch (err) {
        const errorMessage =
          err.message || 'Error convirtiendo escenario a proyección';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en convertToAgriculturalProjection:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtener escenario específico
   */
  const getScenario = useCallback(
    async (scenarioId) => {
      try {
        const result = await scenarioEngine.getScenario(scenarioId);

        if (result.success) {
          return result.scenario;
        }
      } catch (err) {
        console.error('Error obteniendo escenario:', err);
      }
    },
    []
  );

  /**
   * Limpiar errores
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    scenarios,
    loading,
    error,

    // Acciones principales
    loadScenarios,
    createFromAgriculturalProjection,
    createFromLivestockProjection,
    createCustomScenario,
    executeSimulation,
    generateVariants,
    saveScenario,
    deleteScenario,
    convertToAgriculturalProjection,
    getScenario,
    clearError
  };
}

export default useScenarios;
