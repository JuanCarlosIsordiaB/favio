import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerCuentas,
  obtenerCuentaPorId,
  crearCuenta,
  actualizarCuenta,
  eliminarCuenta,
  actualizarBalanceCuenta,
  obtenerMovimientosCuenta,
  obtenerResumenCuentas
} from '../services/financialAccounts';

/**
 * Hook personalizado para gestionar cuentas financieras
 * @returns {Object} { accounts, loading, error, loadAccounts, addAccount, updateAccount, deleteAccount, updateBalance, loadMovements, loadSummary }
 */
export function useFinancialAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar todas las cuentas financieras de una firma
   */
  const loadAccounts = useCallback(async (firmId, filters = {}) => {
    if (!firmId) {
      setAccounts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await obtenerCuentas(firmId, filters);
      if (fetchError) throw fetchError;
      setAccounts(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar cuentas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar una cuenta específica por ID
   */
  const loadAccountById = useCallback(async (id) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerCuentaPorId(id);
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar cuenta: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Agregar nueva cuenta financiera
   */
  const addAccount = useCallback(async (accountData) => {
    setError(null);
    try {
      const { data: nuevaCuenta, error: createError } = await crearCuenta(accountData);
      if (createError) throw createError;
      setAccounts(prev => [...prev, nuevaCuenta]);
      toast.success('Cuenta financiera creada exitosamente');
      return nuevaCuenta;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Actualizar cuenta financiera
   */
  const updateAccount = useCallback(async (id, updates) => {
    setError(null);
    try {
      const { data: cuentaActualizada, error: updateError } = await actualizarCuenta(id, updates);
      if (updateError) throw updateError;
      setAccounts(prev => prev.map(a => a.id === id ? cuentaActualizada : a));
      toast.success('Cuenta actualizada');
      return cuentaActualizada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Eliminar cuenta financiera (soft-delete o hard-delete según si tiene movimientos)
   */
  const deleteAccount = useCallback(async (id, userId) => {
    setError(null);
    try {
      const { data, error: deleteError } = await eliminarCuenta(id, userId);
      if (deleteError) throw deleteError;
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success('Cuenta eliminada o desactivada');
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Actualizar balance de una cuenta
   * @param {string} accountId - ID de la cuenta
   * @param {number} amount - Monto a restar (negativo) o sumar (positivo)
   */
  const updateBalance = useCallback(async (accountId, amount) => {
    setError(null);
    try {
      const { data: cuentaActualizada, error: updateError } = await actualizarBalanceCuenta(
        accountId,
        amount
      );
      if (updateError) throw updateError;
      setAccounts(prev =>
        prev.map(a => a.id === accountId ? cuentaActualizada : a)
      );
      toast.success('Balance actualizado');
      return cuentaActualizada;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cargar movimientos de una cuenta en un rango de fechas
   */
  const loadMovements = useCallback(async (accountId, dateFrom, dateTo) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerMovimientosCuenta(
        accountId,
        dateFrom,
        dateTo
      );
      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cargar resumen de todas las cuentas (balances totales, por tipo)
   */
  const loadSummary = useCallback(async (firmId) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerResumenCuentas(firmId);
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  return {
    // Estado
    accounts,
    loading,
    error,
    // Métodos
    loadAccounts,
    loadAccountById,
    addAccount,
    updateAccount,
    deleteAccount,
    updateBalance,
    loadMovements,
    loadSummary
  };
}
