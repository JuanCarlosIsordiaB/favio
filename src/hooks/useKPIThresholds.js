/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook para gestión de umbrales de KPIs
 *
 * Proporciona:
 * - Obtener umbrales (específicos o defaults)
 * - Actualizar umbrales (validación incluida)
 * - Resetear a defaults
 * - Historial de cambios
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  obtenerUmbrales,
  actualizarUmbrales,
  resetToDefaults,
  obtenerUmbralesMultiples,
  obtenerHistorialUmbrales,
  validarRangos,
  evaluarStatus,
  formatearUmbrales
} from '../services/kpiThresholds';

export function useKPIThresholds(firmId) {
  const [umbrales, setUmbrales] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [historial, setHistorial] = useState({});

  /**
   * Obtiene umbrales para un KPI
   */
  const cargarUmbrales = useCallback(async (kpiId) => {
    if (!firmId || !kpiId) {
      setError('Falta firmware o ID KPI');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const umbralData = await obtenerUmbrales(firmId, kpiId);
      setUmbrales(prev => ({
        ...prev,
        [kpiId]: umbralData
      }));
      return umbralData;
    } catch (err) {
      console.error(`Error cargando umbrales para ${kpiId}:`, err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene múltiples umbrales de una vez
   */
  const cargarUmbralesMultiples = useCallback(async (kpiIds) => {
    if (!firmId || !kpiIds || kpiIds.length === 0) {
      setError('Falta firmware o IDs de KPIs');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const umsData = await obtenerUmbralesMultiples(firmId, kpiIds);

      const map = {};
      umsData.forEach(um => {
        map[um.kpi_id] = um;
      });

      setUmbrales(map);
      return map;
    } catch (err) {
      console.error('Error cargando umbrales múltiples:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Actualiza umbrales de un KPI
   */
  const guardarUmbrales = useCallback(async (kpiId, nuevosUmbrales, userId) => {
    if (!firmId || !kpiId) {
      setError('Falta firmware o ID KPI');
      return false;
    }

    // Validar rangos antes de enviar
    const errores = validarRangos(nuevosUmbrales);
    if (errores.length > 0) {
      setError(errores.join(', '));
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await actualizarUmbrales(firmId, kpiId, nuevosUmbrales, userId);
      setUmbrales(prev => ({
        ...prev,
        [kpiId]: resultado
      }));
      setEditando(null);
      return true;
    } catch (err) {
      console.error('Error guardando umbrales:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Resetea umbrales a defaults globales
   */
  const resetearADefaults = useCallback(async (kpiId) => {
    if (!firmId || !kpiId) {
      setError('Falta firmware o ID KPI');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await resetToDefaults(firmId, kpiId);
      setUmbrales(prev => ({
        ...prev,
        [kpiId]: resultado
      }));
      setEditando(null);
      return true;
    } catch (err) {
      console.error('Error reseteando a defaults:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene historial de cambios en umbrales
   */
  const cargarHistorial = useCallback(async (kpiId, limit = 20) => {
    if (!firmId || !kpiId) {
      setError('Falta firmware o ID KPI');
      return null;
    }

    try {
      const hist = await obtenerHistorialUmbrales(firmId, kpiId, limit);
      setHistorial(prev => ({
        ...prev,
        [kpiId]: hist
      }));
      return hist;
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError(err.message);
      return null;
    }
  }, [firmId]);

  /**
   * Evalúa status de un valor contra umbrales
   */
  const evaluarStatusValor = useCallback((valor, kpiId) => {
    const umbral = umbrales[kpiId];
    if (!umbral) return 'DESCONOCIDO';

    return evaluarStatus(valor, umbral);
  }, [umbrales]);

  /**
   * Valida un nuevo conjunto de umbrales
   */
  const validarNuevosUmbrales = useCallback((nuevosUmbrales) => {
    return validarRangos(nuevosUmbrales);
  }, []);

  /**
   * Formatea umbrales para mostrar en UI
   */
  const formatearParaUI = useCallback((kpiId) => {
    const umbral = umbrales[kpiId];
    if (!umbral) return null;

    return formatearUmbrales(umbral);
  }, [umbrales]);

  /**
   * Obtiene descripción de rango para UI
   */
  const obtenerDescripcionRango = useCallback((kpiId, valor) => {
    const umbral = umbrales[kpiId];
    if (!umbral) return '';

    const status = evaluarStatus(valor, umbral);

    const descripciones = {
      VERDE: `✅ Óptimo (${umbral.optimal_min} - ${umbral.optimal_max})`,
      AMARILLO: `⚠️ Advertencia (${umbral.warning_min} - ${umbral.warning_max})`,
      ROJO: `❌ Crítico (< ${umbral.critical_min} o > ${umbral.critical_max})`
    };

    return descripciones[status] || 'Desconocido';
  }, [umbrales]);

  /**
   * Comienza edición de umbrales
   */
  const iniciarEdicion = useCallback((kpiId) => {
    setEditando(kpiId);
  }, []);

  /**
   * Cancela edición
   */
  const cancelarEdicion = useCallback(() => {
    setEditando(null);
  }, []);

  /**
   * Verifica si usuario puede editar umbrales
   */
  const puedeEditar = useCallback((kpiId, userRole) => {
    // Obtener info del KPI para saber si es obligatorio
    // Por ahora asumir que solo ADMIN puede editar
    return userRole === 'ADMIN';
  }, []);

  return {
    // Estado
    umbrales,
    loading,
    error,
    editando,
    historial,

    // Funciones principales
    cargarUmbrales,
    cargarUmbralesMultiples,
    guardarUmbrales,
    resetearADefaults,
    cargarHistorial,

    // Funciones de utilidad
    evaluarStatusValor,
    validarNuevosUmbrales,
    formatearParaUI,
    obtenerDescripcionRango,

    // Control de edición
    iniciarEdicion,
    cancelarEdicion,
    puedeEditar
  };
}
