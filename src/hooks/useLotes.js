import { useState, useCallback } from 'react';
import {
  obtenerLotesPorPredio,
  crearLote,
  actualizarLote,
  eliminarLote,
} from '../services/lotes';

/**
 * Hook personalizado para gestionar el estado de lotes
 * Proporciona funciones para CRUD y gestión de estados de carga
 */
export function useLotes() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga todos los lotes de un predio específico
   * @param {string} predioId - ID del predio
   */
  const loadLotes = useCallback(async (predioId) => {
    if (!predioId) {
      setLotes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await obtenerLotesPorPredio(predioId);
      setLotes(result.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar lotes');
      console.error('Error en loadLotes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea un nuevo lote
   * @param {Object} loteData - Datos del lote
   * @returns {Promise<Object>} Lote creado
   */
  const addLote = useCallback(async (loteData) => {
    setError(null);

    try {
      const nuevoLote = await crearLote(loteData);
      setLotes((prev) => [...prev, nuevoLote]);
      return nuevoLote;
    } catch (err) {
      const mensaje = err.message || 'Error al crear lote';
      setError(mensaje);
      console.error('Error en addLote:', err);
      throw err;
    }
  }, []);

  /**
   * Actualiza un lote existente
   * @param {string} loteId - ID del lote
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Lote actualizado
   */
  const updateLote = useCallback(async (loteId, updateData) => {
    setError(null);

    try {
      const loteActualizado = await actualizarLote(loteId, updateData);
      setLotes((prev) =>
        prev.map((lote) =>
          lote.id === loteId ? { ...lote, ...loteActualizado } : lote
        )
      );
      return loteActualizado;
    } catch (err) {
      const mensaje = err.message || 'Error al actualizar lote';
      setError(mensaje);
      console.error('Error en updateLote:', err);
      throw err;
    }
  }, []);

  /**
   * Elimina un lote (soft delete)
   * @param {string} loteId - ID del lote
   */
  const deleteLote = useCallback(async (loteId) => {
    setError(null);

    try {
      await eliminarLote(loteId);
      setLotes((prev) => prev.filter((lote) => lote.id !== loteId));
    } catch (err) {
      const mensaje = err.message || 'Error al eliminar lote';
      setError(mensaje);
      console.error('Error en deleteLote:', err);
      throw err;
    }
  }, []);

  /**
   * Limpia los estados
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    lotes,
    loading,
    error,
    loadLotes,
    addLote,
    updateLote,
    deleteLote,
    clearError,
  };
}
