import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerFacturas,
  obtenerFacturaPorId,
  crearFactura,
  actualizarFactura,
  cambiarEstadoFactura,
  aprobarFactura,
  anularFactura,
  obtenerCuentasPorPagar
} from '../services/expenses';

/**
 * Hook personalizado para gestionar facturas de compra
 * @returns {Object} { expenses, loading, error, loadExpenses, addExpense, updateExpense, approveExpense, cancelExpense, loadAccountsPayable }
 */
export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar todas las facturas de una firma
   */
  const loadExpenses = useCallback(async (firmId, filters = {}) => {
    if (!firmId) {
      setExpenses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await obtenerFacturas(firmId, filters);
      if (fetchError) throw fetchError;
      setExpenses(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar facturas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar una factura específica por ID
   */
  const loadExpenseById = useCallback(async (id) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerFacturaPorId(id);
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar factura: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Agregar nueva factura
   */
  const addExpense = useCallback(async (expenseData) => {
    setError(null);
    try {
      const { data: nuevaFactura, error: createError } = await crearFactura(expenseData);
      if (createError) throw createError;
      setExpenses(prev => [nuevaFactura, ...prev]);
      toast.success('Factura creada exitosamente');
      return nuevaFactura;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Actualizar factura existente
   */
  const updateExpense = useCallback(async (id, updates) => {
    setError(null);
    try {
      const { data: facturaActualizada, error: updateError } = await actualizarFactura(id, updates);
      if (updateError) throw updateError;
      setExpenses(prev => prev.map(e => e.id === id ? facturaActualizada : e));
      toast.success('Factura actualizada');
      return facturaActualizada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Aprobar factura
   */
  const approveExpense = useCallback(async (id, userId) => {
    setError(null);
    try {
      const { data: facturaAprobada, error: approveError } = await aprobarFactura(id, userId);
      if (approveError) throw approveError;
      setExpenses(prev => prev.map(e => e.id === id ? facturaAprobada : e));
      toast.success('Factura aprobada');
      return facturaAprobada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cambiar estado de factura
   */
  const changeExpenseStatus = useCallback(async (id, newStatus, userId, reason = null) => {
    setError(null);
    try {
      const { data: facturaActualizada, error: statusError } = await cambiarEstadoFactura(
        id,
        newStatus,
        userId,
        reason
      );
      if (statusError) throw statusError;
      setExpenses(prev => prev.map(e => e.id === id ? facturaActualizada : e));
      toast.success(`Factura cambió a ${newStatus}`);
      return facturaActualizada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Anular factura
   */
  const cancelExpense = useCallback(async (id, userId, reason) => {
    setError(null);
    try {
      const { data: facturaAnulada, error: cancelError } = await anularFactura(id, userId, reason);
      if (cancelError) throw cancelError;
      setExpenses(prev => prev.map(e => e.id === id ? facturaAnulada : e));
      toast.success('Factura anulada');
      return facturaAnulada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cargar cuentas por pagar (facturas APROBADAS con saldo pendiente)
   */
  const loadAccountsPayable = useCallback(async (firmId, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerCuentasPorPagar(firmId, filters);
      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Estado
    expenses,
    loading,
    error,
    // Métodos
    loadExpenses,
    loadExpenseById,
    addExpense,
    updateExpense,
    approveExpense,
    changeExpenseStatus,
    cancelExpense,
    loadAccountsPayable
  };
}
