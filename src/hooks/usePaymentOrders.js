import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerOrdenesDePago,
  obtenerOrdenPagoPorId,
  crearOrdenPago,
  obtenerFacturasDeOrden,
  aprobarOrdenPago,
  rechazarOrdenPago,
  ejecutarOrdenPago,
  anularOrdenPago
} from '../services/paymentOrders';

/**
 * Hook personalizado para gestionar órdenes de pago
 * @returns {Object} { orders, loading, error, loadOrders, addOrder, approveOrder, rejectOrder, executeOrder, cancelOrder, loadExpensesForOrder }
 */
export function usePaymentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar todas las órdenes de pago de una firma
   */
  const loadOrders = useCallback(async (firmId, filters = {}) => {
    if (!firmId) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await obtenerOrdenesDePago(firmId, filters);
      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar órdenes de pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar una orden específica por ID
   */
  const loadOrderById = useCallback(async (id) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerOrdenPagoPorId(id);
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar orden: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Crear nueva orden de pago vinculada a facturas
   */
  const addOrder = useCallback(async (orderData, selectedExpenses) => {
    setError(null);
    try {
      const { data: nuevaOrden, error: createError } = await crearOrdenPago(
        orderData,
        selectedExpenses
      );
      if (createError) throw createError;
      setOrders(prev => [nuevaOrden, ...prev]);
      toast.success('Orden de pago creada exitosamente');
      return nuevaOrden;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Aprobar orden de pago
   */
  const approveOrder = useCallback(async (id, userId) => {
    setError(null);
    try {
      const { data: ordenAprobada, error: approveError } = await aprobarOrdenPago(id, userId);
      if (approveError) throw approveError;
      setOrders(prev => prev.map(o => o.id === id ? ordenAprobada : o));
      toast.success('Orden de pago aprobada');
      return ordenAprobada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Rechazar orden de pago
   */
  const rejectOrder = useCallback(async (id, userId, reason) => {
    setError(null);
    try {
      const { data: ordenRechazada, error: rejectError } = await rechazarOrdenPago(
        id,
        userId,
        reason
      );
      if (rejectError) throw rejectError;
      setOrders(prev => prev.map(o => o.id === id ? ordenRechazada : o));
      toast.success('Orden de pago rechazada');
      return ordenRechazada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Ejecutar orden de pago (OPERACIÓN CRÍTICA)
   * Actualiza facturas, crea historial de pagos, actualiza cuentas
   */
  const executeOrder = useCallback(async (id, userId) => {
    setError(null);
    try {
      const { data: ordenEjecutada, error: executeError } = await ejecutarOrdenPago(id, userId);
      if (executeError) throw executeError;
      setOrders(prev => prev.map(o => o.id === id ? ordenEjecutada : o));
      toast.success('Orden de pago ejecutada exitosamente');
      return ordenEjecutada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Anular orden de pago
   */
  const cancelOrder = useCallback(async (id, userId, reason) => {
    setError(null);
    try {
      const { data: ordenAnulada, error: cancelError } = await anularOrdenPago(
        id,
        userId,
        reason
      );
      if (cancelError) throw cancelError;
      setOrders(prev => prev.map(o => o.id === id ? ordenAnulada : o));
      toast.success('Orden de pago anulada');
      return ordenAnulada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cargar facturas asociadas a una orden
   */
  const loadExpensesForOrder = useCallback(async (orderId) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerFacturasDeOrden(orderId);
      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  return {
    // Estado
    orders,
    loading,
    error,
    // Métodos
    loadOrders,
    loadOrderById,
    addOrder,
    approveOrder,
    rejectOrder,
    executeOrder,
    cancelOrder,
    loadExpensesForOrder
  };
}
