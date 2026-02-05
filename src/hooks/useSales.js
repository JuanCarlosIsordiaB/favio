import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerVentasPorFirma,
  obtenerVentaPorId,
  buscarVentas,
  crearVenta,
  actualizarVenta,
  confirmarVenta,
  cancelarVenta,
  calcularRentabilidadVenta,
  obtenerRentabilidadPorLote,
  obtenerEstadisticasVentas
} from '../services/sales';

/**
 * Hook personalizado para gestión de ventas
 * Patrón: Similar a useIncome, useInputs
 * @returns {Object} Estado y funciones de ventas
 */
export function useSales() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar todas las ventas de una firma
   */
  const loadSales = useCallback(async (firmId, filtros = {}) => {
    if (!firmId) {
      setVentas([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await obtenerVentasPorFirma(firmId, filtros);
      setVentas(data || []);
    } catch (err) {
      const mensajeError = err.message || 'Error al cargar ventas';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar venta específica por ID
   */
  const loadSaleById = useCallback(async (saleId) => {
    setError(null);
    try {
      const { data } = await obtenerVentaPorId(saleId);
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar venta: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Crear nueva venta (estado DRAFT)
   */
  const addSale = useCallback(async (ventaData, items) => {
    setError(null);
    try {
      const nuevaVenta = await crearVenta(ventaData, items);
      setVentas(prev => [nuevaVenta, ...prev]);
      toast.success('Venta creada exitosamente');
      return nuevaVenta;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Actualizar venta (solo DRAFT)
   */
  const updateSale = useCallback(async (saleId, updates) => {
    setError(null);
    try {
      const ventaActualizada = await actualizarVenta(saleId, updates);
      setVentas(prev => prev.map(v => v.id === saleId ? ventaActualizada : v));
      toast.success('Venta actualizada');
      return ventaActualizada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Confirmar venta (DRAFT → CONFIRMED)
   * Dispara descarga de stock e ingreso financiero automáticos
   */
  const confirmSale = useCallback(async (saleId, userId) => {
    setError(null);
    try {
      const ventaConfirmada = await confirmarVenta(saleId, userId);
      setVentas(prev => prev.map(v => v.id === saleId ? ventaConfirmada : v));
      toast.success('Venta confirmada. Stock descargado e ingreso registrado.');
      return ventaConfirmada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al confirmar: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cancelar venta
   * Revierte movimientos de stock e ingreso financiero
   */
  const cancelSale = useCallback(async (saleId, userId, reason) => {
    setError(null);
    try {
      const ventaCancelada = await cancelarVenta(saleId, userId, reason);
      setVentas(prev => prev.map(v => v.id === saleId ? ventaCancelada : v));
      toast.success('Venta cancelada. Movimientos revertidos.');
      return ventaCancelada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cancelar: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Calcular rentabilidad de venta
   */
  const calculateProfitability = useCallback(async (saleId) => {
    setError(null);
    try {
      const rentabilidad = await calcularRentabilidadVenta(saleId);
      return rentabilidad;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Obtener estadísticas
   */
  const loadStatistics = useCallback(async (firmId, desde, hasta) => {
    setError(null);
    try {
      const stats = await obtenerEstadisticasVentas(firmId, desde, hasta);
      return stats;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  return {
    ventas,
    loading,
    error,
    loadSales,
    loadSaleById,
    addSale,
    updateSale,
    confirmSale,
    cancelSale,
    calculateProfitability,
    loadStatistics
  };
}
