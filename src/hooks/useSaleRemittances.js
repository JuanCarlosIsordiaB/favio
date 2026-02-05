import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  crearRemitoSalida,
  marcarRemitoComoEntregado,
  obtenerRemitosSalida,
  marcarRemitoComoDespacho,
  cancelarRemito,
  validarDiferenciasRemito
} from '../services/saleRemittances';

/**
 * Hook para gestión de remitos de salida
 */
export function useSaleRemittances() {
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar remitos de una firma
   */
  const loadRemittances = useCallback(async (firmId) => {
    if (!firmId) {
      setRemitos([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await obtenerRemitosSalida(firmId);
      setRemitos(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar remitos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear remito de salida
   */
  const addRemittance = useCallback(async (saleId, remittanceData) => {
    setError(null);
    try {
      const nuevoRemito = await crearRemitoSalida(saleId, remittanceData);
      setRemitos(prev => [nuevoRemito, ...prev]);
      toast.success('Remito de salida creado');
      return nuevoRemito;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Marcar como despachado
   */
  const markAsDispatch = useCallback(async (remittanceId) => {
    setError(null);
    try {
      const remito = await marcarRemitoComoDespacho(remittanceId);
      setRemitos(prev => prev.map(r => r.id === remittanceId ? remito : r));
      toast.success('Remito marcado como despachado');
      return remito;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Marcar como entregado
   */
  const markAsDelivered = useCallback(async (remittanceId) => {
    setError(null);
    try {
      const remito = await marcarRemitoComoEntregado(remittanceId);
      setRemitos(prev => prev.map(r => r.id === remittanceId ? remito : r));
      toast.success('Remito marcado como entregado');
      return remito;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Cancelar remito
   */
  const cancelRemittance = useCallback(async (remittanceId, reason) => {
    setError(null);
    try {
      const remito = await cancelarRemito(remittanceId, reason);
      setRemitos(prev => prev.map(r => r.id === remittanceId ? remito : r));
      toast.success('Remito cancelado');
      return remito;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Validar diferencias entre remito y factura
   */
  const checkDifferences = useCallback(async (remittanceId) => {
    setError(null);
    try {
      const resultado = await validarDiferenciasRemito(remittanceId);

      if (resultado.hasDifferences) {
        const diferenciasText = resultado.differences
          .map(d => `${d.input_name}: ${d.quantity_ordered} vs ${d.quantity_delivered}`)
          .join(', ');

        toast.warning(`⚠️ Diferencias encontradas: ${diferenciasText}`);
      } else {
        toast.success('✅ No hay diferencias entre remito y factura');
      }

      return resultado;
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  return {
    remitos,
    loading,
    error,
    loadRemittances,
    addRemittance,
    markAsDispatch,
    markAsDelivered,
    cancelRemittance,
    checkDifferences
  };
}
