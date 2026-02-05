import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerIngresos,
  obtenerIngresoPorId,
  crearIngreso,
  actualizarIngreso,
  cambiarEstadoIngreso,
  confirmarIngreso,
  marcarComoCobrado,
  registrarCobroParcial,
  anularIngreso,
  obtenerCuentasPorCobrar
} from '../services/income';

/**
 * Hook personalizado para gestionar ingresos financieros
 * @returns {Object} { incomes, loading, error, loadIncomes, addIncome, updateIncome, confirmIncome, collectIncome, cancelIncome, loadAccountsReceivable }
 */
export function useIncome() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar todos los ingresos de una firma
   */
  const loadIncomes = useCallback(async (firmId, filters = {}) => {
    if (!firmId) {
      setIncomes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await obtenerIngresos(firmId, filters);
      if (fetchError) throw fetchError;
      setIncomes(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar ingresos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar un ingreso específico por ID
   */
  const loadIncomeById = useCallback(async (id) => {
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerIngresoPorId(id);
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar ingreso: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Agregar nuevo ingreso
   */
  const addIncome = useCallback(async (incomeData) => {
    setError(null);
    try {
      const { data: nuevoIngreso, error: createError } = await crearIngreso(incomeData);
      if (createError) throw createError;
      setIncomes(prev => [nuevoIngreso, ...prev]);
      toast.success('Ingreso creado exitosamente');
      return nuevoIngreso;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Actualizar ingreso existente
   */
  const updateIncome = useCallback(async (id, updates) => {
    setError(null);
    try {
      const { data: ingresoActualizado, error: updateError } = await actualizarIngreso(id, updates);
      if (updateError) throw updateError;
      setIncomes(prev => prev.map(i => i.id === id ? ingresoActualizado : i));
      toast.success('Ingreso actualizado');
      return ingresoActualizado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Confirmar ingreso (DRAFT → CONFIRMED)
   */
  const confirmIncome = useCallback(async (id, userId) => {
    setError(null);
    try {
      const { data: ingresoConfirmado, error: confirmError } = await confirmarIngreso(id, userId);
      if (confirmError) throw confirmError;
      setIncomes(prev => prev.map(i => i.id === id ? ingresoConfirmado : i));
      toast.success('Ingreso confirmado');
      return ingresoConfirmado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cambiar estado de ingreso
   */
  const changeIncomeStatus = useCallback(async (id, newStatus, userId, reason = null) => {
    setError(null);
    try {
      const { data: ingresoActualizado, error: statusError } = await cambiarEstadoIngreso(
        id,
        newStatus,
        userId,
        reason
      );
      if (statusError) throw statusError;
      setIncomes(prev => prev.map(i => i.id === id ? ingresoActualizado : i));
      toast.success(`Ingreso cambió a ${newStatus}`);
      return ingresoActualizado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Marcar ingreso como cobrado
   */
  const collectIncome = useCallback(async (id, userId, paymentMethod, reference) => {
    setError(null);
    try {
      const { data: ingresoCobrado, error: collectError } = await marcarComoCobrado(
        id,
        userId,
        paymentMethod,
        reference
      );
      if (collectError) throw collectError;
      setIncomes(prev => prev.map(i => i.id === id ? ingresoCobrado : i));
      toast.success('Ingreso marcado como cobrado');
      return ingresoCobrado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Registrar cobro parcial de un ingreso
   */
  const collectPartially = useCallback(
    async (
      id,
      collectionAmount,
      paymentMethod,
      referenceNumber,
      accountId,
      notes,
      userId
    ) => {
      setError(null);
      try {
        const { data: ingresoActualizado, error: collectError } = await registrarCobroParcial(
          id,
          collectionAmount,
          paymentMethod,
          referenceNumber,
          accountId,
          notes,
          userId
        );
        if (collectError) throw collectError;
        setIncomes(prev => prev.map(i => i.id === id ? ingresoActualizado : i));
        toast.success('Cobro parcial registrado exitosamente');
        return ingresoActualizado;
      } catch (err) {
        setError(err.message);
        toast.error(`Error: ${err.message}`);
        throw err;
      }
    },
    []
  );

  /**
   * Anular ingreso
   */
  const cancelIncome = useCallback(async (id, userId, reason) => {
    setError(null);
    try {
      const { data: ingresoAnulado, error: cancelError } = await anularIngreso(id, userId, reason);
      if (cancelError) throw cancelError;
      setIncomes(prev => prev.map(i => i.id === id ? ingresoAnulado : i));
      toast.success('Ingreso anulado');
      return ingresoAnulado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cargar cuentas por cobrar (ingresos CONFIRMADOS con saldo pendiente)
   */
  const loadAccountsReceivable = useCallback(async (firmId, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await obtenerCuentasPorCobrar(firmId, filters);
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
    incomes,
    loading,
    error,
    // Métodos
    loadIncomes,
    loadIncomeById,
    addIncome,
    updateIncome,
    confirmIncome,
    changeIncomeStatus,
    collectIncome,
    collectPartially,
    cancelIncome,
    loadAccountsReceivable
  };
}
