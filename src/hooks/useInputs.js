/**
 * Hook personalizado para gestión de insumos
 * Maneja estado local y llamadas a servicios
 * Patrón: Similar a useLotes.js
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  obtenerInsumosDelFirma,
  obtenerInsumo,
  obtenerInsumosPorCategoria,
  obtenerInsumosDelDeposito,
  buscarInsumos,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  obtenerInsumosProximosAVencer,
  obtenerInsumosVencidos,
  obtenerInsumosStockMinimo,
  obtenerInsumosSinStock,
  recalcularStockInsumo,
  obtenerStockValorizado,
  obtenerEstadisticasInsumos,
  obtenerInsumosDeposito
} from '../services/inputs';

/**
 * Hook para gestión de insumos
 * @returns {Object} Estado y funciones de insumos
 */
export function useInputs() {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga todos los insumos de una firma
   * @param {string} firmId - ID de la firma
   */
  const loadInputs = useCallback(async (firmId) => {
    if (!firmId) {
      setError('firmId es requerido');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerInsumosDelFirma(firmId);
      setInsumos(data || []);
    } catch (err) {
      const mensajeError = err.message || 'Error al cargar insumos';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga un insumo específico por ID
   * @param {string} insumoId - ID del insumo
   * @returns {Promise<Object>} Insumo
   */
  const loadInsumo = useCallback(async (insumoId) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return null;
    }

    try {
      const insumo = await obtenerInsumo(insumoId);
      return insumo;
    } catch (err) {
      toast.error(err.message || 'Error al cargar insumo');
      return null;
    }
  }, []);

  /**
   * Crea un nuevo insumo
   * @param {Object} insumoData - Datos del insumo
   * @returns {Promise<Object>} Insumo creado
   */
  const addInput = useCallback(async (insumoData) => {
    if (!insumoData) {
      toast.error('Datos del insumo requeridos');
      return null;
    }

    try {
      const nuevoInsumo = await crearInsumo(insumoData);
      setInsumos(prev => [...prev, nuevoInsumo]);
      toast.success(`Insumo "${nuevoInsumo.name}" creado exitosamente`);
      return nuevoInsumo;
    } catch (err) {
      const mensajeError = err.message || 'Error al crear insumo';
      toast.error(mensajeError);
      throw err;
    }
  }, []);

  /**
   * Actualiza un insumo existente
   * @param {string} insumoId - ID del insumo
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} Insumo actualizado
   */
  const updateInput = useCallback(async (insumoId, updates) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return null;
    }

    try {
      const insumoActualizado = await actualizarInsumo(insumoId, updates);
      setInsumos(prev =>
        prev.map(i => i.id === insumoId ? insumoActualizado : i)
      );
      toast.success('Insumo actualizado exitosamente');
      return insumoActualizado;
    } catch (err) {
      const mensajeError = err.message || 'Error al actualizar insumo';
      toast.error(mensajeError);
      throw err;
    }
  }, []);

  /**
   * Elimina un insumo (soft delete)
   * @param {string} insumoId - ID del insumo
   */
  const deleteInput = useCallback(async (insumoId) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return;
    }

    try {
      await eliminarInsumo(insumoId);
      setInsumos(prev => prev.filter(i => i.id !== insumoId));
      toast.success('Insumo eliminado exitosamente');
    } catch (err) {
      const mensajeError = err.message || 'Error al eliminar insumo';
      toast.error(mensajeError);
      throw err;
    }
  }, []);

  /**
   * Busca insumos por nombre
   * @param {string} firmId - ID de la firma
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Object>} { data, count }
   */
  const searchInputs = useCallback(async (firmId, termino) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      const resultado = await buscarInsumos(firmId, termino);
      return resultado;
    } catch (err) {
      toast.error(err.message || 'Error en búsqueda');
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Filtra insumos por categoría
   * @param {string} firmId - ID de la firma
   * @param {string} categoria - Categoría
   * @returns {Promise<Object>} { data, count }
   */
  const filterByCategory = useCallback(async (firmId, categoria) => {
    if (!firmId || !categoria) {
      toast.error('Parámetros requeridos');
      return { data: [], count: 0 };
    }

    try {
      const resultado = await obtenerInsumosPorCategoria(firmId, categoria);
      return resultado;
    } catch (err) {
      toast.error(err.message || 'Error al filtrar');
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Filtra insumos por depósito
   * @param {string} firmId - ID de la firma
   * @param {string} depotId - ID del depósito
   * @returns {Promise<Object>} { data, count }
   */
  const filterByDepot = useCallback(async (firmId, depotId) => {
    if (!firmId || !depotId) {
      toast.error('Parámetros requeridos');
      return { data: [], count: 0 };
    }

    try {
      const resultado = await obtenerInsumosDelDeposito(firmId, depotId);
      return resultado;
    } catch (err) {
      toast.error(err.message || 'Error al filtrar');
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Obtiene insumos próximos a vencer (30 días)
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getExpiringSoon = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerInsumosProximosAVencer(firmId);
    } catch (err) {
      console.error('Error obteniendo insumos próximos a vencer:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Obtiene insumos vencidos
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getExpired = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerInsumosVencidos(firmId);
    } catch (err) {
      console.error('Error obteniendo insumos vencidos:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Obtiene insumos con stock por debajo del mínimo
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getLowStock = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerInsumosStockMinimo(firmId);
    } catch (err) {
      console.error('Error obteniendo insumos con stock mínimo:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Obtiene insumos sin stock
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getOutOfStock = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerInsumosSinStock(firmId);
    } catch (err) {
      console.error('Error obteniendo insumos sin stock:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Recalcula stock de un insumo
   * @param {string} insumoId - ID del insumo
   * @returns {Promise<Object>} Stock recalculado
   */
  const recalculateStock = useCallback(async (insumoId) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return null;
    }

    try {
      const resultado = await recalcularStockInsumo(insumoId);
      // Actualizar en estado local
      const insumoActualizado = await obtenerInsumo(insumoId);
      setInsumos(prev =>
        prev.map(i => i.id === insumoId ? insumoActualizado : i)
      );
      return resultado;
    } catch (err) {
      console.error('Error recalculando stock:', err);
      throw err;
    }
  }, []);

  /**
   * Obtiene stock valorizado
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { total, por_categoria }
   */
  const getValorizedStock = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { total: 0, por_categoria: {} };
    }

    try {
      return await obtenerStockValorizado(firmId);
    } catch (err) {
      console.error('Error obteniendo stock valorizado:', err);
      return { total: 0, por_categoria: {} };
    }
  }, []);

  /**
   * Obtiene estadísticas de insumos
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} Estadísticas
   */
  const getStatistics = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return null;
    }

    try {
      return await obtenerEstadisticasInsumos(firmId);
    } catch (err) {
      console.error('Error obteniendo estadísticas:', err);
      return null;
    }
  }, []);

  /**
   * Obtiene insumos que funcionan como depósitos
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getDepots = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerInsumosDeposito(firmId);
    } catch (err) {
      console.error('Error obteniendo depósitos:', err);
      return { data: [], count: 0 };
    }
  }, []);

  return {
    // Estado
    insumos,
    loading,
    error,

    // CRUD principal
    loadInputs,
    loadInsumo,
    addInput,
    updateInput,
    deleteInput,

    // Búsqueda y filtros
    searchInputs,
    filterByCategory,
    filterByDepot,

    // Alertas y reportes
    getExpiringSoon,
    getExpired,
    getLowStock,
    getOutOfStock,

    // Cálculos
    recalculateStock,
    getValorizedStock,
    getStatistics,
    getDepots
  };
}
