/**
 * Hook personalizado para Módulo 09 - Remitos
 * Maneja estado, CRUD y lógica de remitos con Supabase
 *
 * Expone:
 * - Estado: remittances, loading, error
 * - Operaciones: cargar, crear, actualizar, recibir, cancelar, buscar
 * - Estadísticas: getStatistics
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerRemitosPorFirma,
  obtenerRemitoPorId,
  buscarRemitos,
  obtenerRemitosPorEstado,
  crearRemito,
  actualizarRemito,
  recibirRemito,
  recibirRemitoParciamente,
  cancelarRemito,
  actualizarItemRemito,
  actualizarItemsRecibidos,
  vincularItemAInsumo,
  obtenerEstadisticasRemitos,
  obtenerRemitosPorProveedor,
  obtenerRemitosPorDeposito,
  obtenerRemitosPorRangoFechas,
  obtenerItemsSinVincular,
  validarDuplicado,
  obtenerRemitosPendientesDeResolucion
} from '../services/remittances';

/**
 * Hook principal para Remitos
 * @returns {Object} Métodos y estado del módulo
 */
export function useRemittances() {
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===========================
  // CARGAR DATOS
  // ===========================

  /**
   * Cargar todos los remitos de una firma
   */
  const loadRemittances = useCallback(async (firmId) => {
    if (!firmId) {
      setError('firmId es requerido');
      toast.error('Error: firma no seleccionada');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerRemitosPorFirma(firmId);
      setRemittances(data || []);
    } catch (err) {
      setError(err.message);
      toast.error('Error cargando remitos: ' + err.message);
      console.error('Error en loadRemittances:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener remito completo por ID
   */
  const getRemittanceById = useCallback(async (remittanceId) => {
    try {
      const { data } = await obtenerRemitoPorId(remittanceId);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remito: ' + err.message);
      console.error('Error en getRemittanceById:', err);
      throw err;
    }
  }, []);

  /**
   * Buscar remitos con filtros
   */
  const searchRemittances = useCallback(async (firmId, filters) => {
    if (!firmId) {
      setError('firmId es requerido');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await buscarRemitos(firmId, filters);
      setRemittances(data || []);
    } catch (err) {
      setError(err.message);
      toast.error('Error buscando remitos: ' + err.message);
      console.error('Error en searchRemittances:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener remitos por estado
   */
  const getRemittancesByStatus = useCallback(async (firmId, status) => {
    try {
      const { data } = await obtenerRemitosPorEstado(firmId, status);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remitos: ' + err.message);
      console.error('Error en getRemittancesByStatus:', err);
      throw err;
    }
  }, []);

  // ===========================
  // OPERACIONES CRUD
  // ===========================

  /**
   * Crear remito nuevo con ítems
   */
  const addRemittance = useCallback(async (remittanceData, items) => {
    try {
      // Validar duplicado
      const { isDuplicate, duplicateId } = await validarDuplicado(
        remittanceData.firm_id,
        remittanceData.remittance_number,
        remittanceData.remittance_date,
        remittanceData.supplier_rut
      );

      if (isDuplicate) {
        const msg = `Ya existe un remito con el mismo número, fecha y proveedor (ID: ${duplicateId})`;
        toast.error(msg);
        throw new Error(msg);
      }

      const nuevoRemito = await crearRemito(remittanceData, items);
      setRemittances(prev => [nuevoRemito, ...prev]);
      toast.success('Remito creado exitosamente');
      return nuevoRemito;
    } catch (err) {
      toast.error('Error creando remito: ' + err.message);
      console.error('Error en addRemittance:', err);
      throw err;
    }
  }, []);

  /**
   * Actualizar remito
   */
  const updateRemittance = useCallback(async (remittanceId, updates) => {
    try {
      const updated = await actualizarRemito(remittanceId, updates);
      setRemittances(prev =>
        prev.map(r => r.id === remittanceId ? { ...r, ...updated } : r)
      );
      toast.success('Remito actualizado exitosamente');
      return updated;
    } catch (err) {
      toast.error('Error actualizando remito: ' + err.message);
      console.error('Error en updateRemittance:', err);
      throw err;
    }
  }, []);

  /**
   * Recibir remito (cambia a estado 'received')
   * Dispara trigger automático que crea movimientos de stock
   */
  const receiveRemittance = useCallback(async (remittanceId, receivedBy, receivedDate) => {
    try {
      const updated = await recibirRemito(remittanceId, receivedBy, receivedDate);
      setRemittances(prev =>
        prev.map(r => r.id === remittanceId ? { ...r, ...updated } : r)
      );
      toast.success('✓ Remito recibido exitosamente');
      toast.success('✓ Stock actualizado automáticamente');
      return updated;
    } catch (err) {
      toast.error('Error recibiendo remito: ' + err.message);
      console.error('Error en receiveRemittance:', err);
      throw err;
    }
  }, []);

  /**
   * Recibir remito parcialmente
   */
  const receiveRemittancePartially = useCallback(async (remittanceId, receivedBy, items) => {
    try {
      const updated = await recibirRemitoParciamente(remittanceId, receivedBy, items);
      setRemittances(prev =>
        prev.map(r => r.id === remittanceId ? { ...r, ...updated } : r)
      );
      toast.success('Remito marcado como parcialmente recibido');
      return updated;
    } catch (err) {
      toast.error('Error recibiendo remito parcialmente: ' + err.message);
      console.error('Error en receiveRemittancePartially:', err);
      throw err;
    }
  }, []);

  /**
   * Cancelar remito
   */
  const cancelRemittance = useCallback(async (remittanceId, reason) => {
    try {
      const updated = await cancelarRemito(remittanceId, reason);
      setRemittances(prev =>
        prev.map(r => r.id === remittanceId ? { ...r, ...updated } : r)
      );
      toast.success('Remito cancelado');
      return updated;
    } catch (err) {
      toast.error('Error cancelando remito: ' + err.message);
      console.error('Error en cancelRemittance:', err);
      throw err;
    }
  }, []);

  // ===========================
  // OPERACIONES CON ÍTEMS
  // ===========================

  /**
   * Actualizar un ítem del remito
   */
  const updateRemittanceItem = useCallback(async (itemId, updates) => {
    try {
      const updated = await actualizarItemRemito(itemId, updates);
      toast.success('Ítem actualizado');
      return updated;
    } catch (err) {
      toast.error('Error actualizando ítem: ' + err.message);
      console.error('Error en updateRemittanceItem:', err);
      throw err;
    }
  }, []);

  /**
   * Actualizar múltiples ítems (cantidades recibidas)
   */
  const updateReceivedItems = useCallback(async (itemsUpdates) => {
    try {
      await actualizarItemsRecibidos(itemsUpdates);
      toast.success('Ítems actualizados');
      return true;
    } catch (err) {
      toast.error('Error actualizando ítems: ' + err.message);
      console.error('Error en updateReceivedItems:', err);
      throw err;
    }
  }, []);

  /**
   * Vincular ítem a insumo existente
   */
  const linkItemToInput = useCallback(async (remittanceItemId, inputId) => {
    try {
      const updated = await vincularItemAInsumo(remittanceItemId, inputId);
      toast.success('Ítem vinculado a insumo');
      return updated;
    } catch (err) {
      toast.error('Error vinculando ítem: ' + err.message);
      console.error('Error en linkItemToInput:', err);
      throw err;
    }
  }, []);

  // ===========================
  // REPORTES Y ESTADÍSTICAS
  // ===========================

  /**
   * Obtener estadísticas generales
   */
  const getStatistics = useCallback(async (firmId) => {
    try {
      const stats = await obtenerEstadisticasRemitos(firmId);
      return stats;
    } catch (err) {
      toast.error('Error obteniendo estadísticas: ' + err.message);
      console.error('Error en getStatistics:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener remitos por proveedor
   */
  const getRemittancesBySupplier = useCallback(async (firmId) => {
    try {
      const data = await obtenerRemitosPorProveedor(firmId);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remitos por proveedor: ' + err.message);
      console.error('Error en getRemittancesBySupplier:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener remitos por depósito
   */
  const getRemittancesByDepot = useCallback(async (firmId) => {
    try {
      const data = await obtenerRemitosPorDeposito(firmId);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remitos por depósito: ' + err.message);
      console.error('Error en getRemittancesByDepot:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener remitos en rango de fechas
   */
  const getRemittancesByDateRange = useCallback(async (firmId, dateFrom, dateTo) => {
    try {
      const { data } = await obtenerRemitosPorRangoFechas(firmId, dateFrom, dateTo);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remitos: ' + err.message);
      console.error('Error en getRemittancesByDateRange:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener ítems sin vincular a insumo (requieren creación de nuevo insumo)
   */
  const getUnlinkedItems = useCallback(async (firmId) => {
    try {
      const { data } = await obtenerItemsSinVincular(firmId);
      return data;
    } catch (err) {
      toast.error('Error obteniendo ítems sin vincular: ' + err.message);
      console.error('Error en getUnlinkedItems:', err);
      throw err;
    }
  }, []);

  /**
   * Obtener remitos pendientes de resolución (viejos y en tránsito)
   */
  const getPendingRemittances = useCallback(async (firmId, days = 30) => {
    try {
      const { data } = await obtenerRemitosPendientesDeResolucion(firmId, days);
      return data;
    } catch (err) {
      toast.error('Error obteniendo remitos pendientes: ' + err.message);
      console.error('Error en getPendingRemittances:', err);
      throw err;
    }
  }, []);

  // Retornar API pública
  return {
    // Estado
    remittances,
    loading,
    error,

    // Cargar datos
    loadRemittances,
    getRemittanceById,
    searchRemittances,
    getRemittancesByStatus,

    // CRUD
    addRemittance,
    updateRemittance,
    receiveRemittance,
    receiveRemittancePartially,
    cancelRemittance,

    // Ítems
    updateRemittanceItem,
    updateReceivedItems,
    linkItemToInput,

    // Reportes
    getStatistics,
    getRemittancesBySupplier,
    getRemittancesByDepot,
    getRemittancesByDateRange,
    getUnlinkedItems,
    getPendingRemittances
  };
}
