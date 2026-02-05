/**
 * Hook personalizado para gestión de movimientos de stock
 * Maneja registro de movimientos y consulta de historial
 * Patrón: Similar a useLotes.js
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  registrarMovimiento,
  obtenerMovimientosInsumo,
  obtenerMovimientosFirma,
  obtenerMovimientosLote,
  obtenerUltimoMovimiento,
  obtenerMovimientosAgrupados,
  obtenerConsumoInsumos,
  obtenerIngresosInsumos,
  validarDisponibilidad,
  obtenerKardexInsumo,
  obtenerTransferenciasDepositos,
  obtenerMovimientosPendientes
} from '../services/inputMovements';

/**
 * Hook para gestión de movimientos de stock
 * @returns {Object} Estado y funciones de movimientos
 */
export function useInputMovements() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga movimientos de una firma con filtros opcionales
   * @param {string} firmId - ID de la firma
   * @param {Object} filtros - Filtros opcionales
   */
  const loadMovementsFirma = useCallback(async (firmId, filtros = {}) => {
    if (!firmId) {
      setError('firmId es requerido');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerMovimientosFirma(firmId, filtros);
      setMovimientos(data || []);
    } catch (err) {
      const mensajeError = err.message || 'Error al cargar movimientos';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga movimientos de un insumo específico
   * @param {string} insumoId - ID del insumo
   * @param {Object} filtros - Filtros opcionales
   */
  const loadMovementsInput = useCallback(async (insumoId, filtros = {}) => {
    if (!insumoId) {
      setError('insumoId es requerido');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerMovimientosInsumo(insumoId, filtros);
      setMovimientos(data || []);
    } catch (err) {
      const mensajeError = err.message || 'Error al cargar movimientos';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga movimientos de un lote
   * @param {string} loteId - ID del lote
   */
  const loadMovementsLot = useCallback(async (loteId) => {
    if (!loteId) {
      setError('loteId es requerido');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerMovimientosLote(loteId);
      setMovimientos(data || []);
    } catch (err) {
      const mensajeError = err.message || 'Error al cargar movimientos';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registra un nuevo movimiento de stock
   * Operación crítica con validaciones
   * @param {Object} movimientoData - Datos del movimiento
   * @returns {Promise<Object>} Movimiento creado
   */
  const registerMovement = useCallback(async (movimientoData) => {
    if (!movimientoData) {
      toast.error('Datos del movimiento requeridos');
      return null;
    }

    // Validaciones básicas
    if (!movimientoData.input_id) {
      toast.error('Debes seleccionar un insumo');
      return null;
    }

    if (!movimientoData.quantity || movimientoData.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a cero');
      return null;
    }

    if (!movimientoData.type) {
      toast.error('Debes seleccionar un tipo de movimiento');
      return null;
    }

    if (!movimientoData.description || !movimientoData.description.trim()) {
      toast.error('La referencia/descripción es obligatoria');
      return null;
    }

    try {
      const nuevoMovimiento = await registrarMovimiento(movimientoData);

      // Agregar al inicio (más reciente primero)
      setMovimientos(prev => [nuevoMovimiento, ...prev]);

      // Feedback específico según tipo
      const tiposMsg = {
        entry: 'Ingreso',
        exit: 'Egreso',
        adjustment: 'Ajuste',
        transfer: 'Transferencia'
      };

      toast.success(
        `${tiposMsg[movimientoData.type]} registrado exitosamente`
      );

      return nuevoMovimiento;
    } catch (err) {
      const mensajeError = err.message || 'Error al registrar movimiento';
      toast.error(mensajeError);
      throw err;
    }
  }, []);

  /**
   * Obtiene el último movimiento de un insumo
   * @param {string} insumoId - ID del insumo
   * @returns {Promise<Object>} Último movimiento
   */
  const getLastMovement = useCallback(async (insumoId) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return null;
    }

    try {
      return await obtenerUltimoMovimiento(insumoId);
    } catch (err) {
      console.error('Error obteniendo último movimiento:', err);
      return null;
    }
  }, []);

  /**
   * Obtiene movimientos agrupados por tipo
   * @param {string} firmId - ID de la firma
   * @param {string} desde - Fecha desde
   * @param {string} hasta - Fecha hasta
   * @returns {Promise<Object>} Movimientos agrupados
   */
  const getGroupedMovements = useCallback(async (firmId, desde, hasta) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { agrupados: {}, totales: {} };
    }

    try {
      return await obtenerMovimientosAgrupados(firmId, desde, hasta);
    } catch (err) {
      console.error('Error obteniendo movimientos agrupados:', err);
      return { agrupados: {}, totales: {} };
    }
  }, []);

  /**
   * Obtiene consumo de insumos en un período
   * @param {string} firmId - ID de la firma
   * @param {string} desde - Fecha desde
   * @param {string} hasta - Fecha hasta
   * @returns {Promise<Object>} Consumo por insumo
   */
  const getConsumption = useCallback(async (firmId, desde, hasta) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { porInsumo: {}, total_cantidad: 0, total_valor: 0 };
    }

    try {
      return await obtenerConsumoInsumos(firmId, desde, hasta);
    } catch (err) {
      console.error('Error obteniendo consumo:', err);
      return { porInsumo: {}, total_cantidad: 0, total_valor: 0 };
    }
  }, []);

  /**
   * Obtiene ingresos de insumos en un período
   * @param {string} firmId - ID de la firma
   * @param {string} desde - Fecha desde
   * @param {string} hasta - Fecha hasta
   * @returns {Promise<Object>} Ingresos por insumo
   */
  const getIncome = useCallback(async (firmId, desde, hasta) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { porInsumo: {}, total_cantidad: 0, total_valor: 0 };
    }

    try {
      return await obtenerIngresosInsumos(firmId, desde, hasta);
    } catch (err) {
      console.error('Error obteniendo ingresos:', err);
      return { porInsumo: {}, total_cantidad: 0, total_valor: 0 };
    }
  }, []);

  /**
   * Valida disponibilidad de un insumo
   * @param {string} insumoId - ID del insumo
   * @param {number} cantidad - Cantidad solicitada
   * @returns {Promise<Object>} { disponible, actual, faltante }
   */
  const checkAvailability = useCallback(async (insumoId, cantidad) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return { disponible: false, actual: 0, faltante: 0 };
    }

    if (!cantidad || cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a cero');
      return { disponible: false, actual: 0, faltante: 0 };
    }

    try {
      return await validarDisponibilidad(insumoId, cantidad);
    } catch (err) {
      console.error('Error validando disponibilidad:', err);
      return { disponible: false, actual: 0, faltante: 0 };
    }
  }, []);

  /**
   * Obtiene kardex completo de un insumo
   * @param {string} insumoId - ID del insumo
   * @returns {Promise<Object>} Kardex con saldos progresivos
   */
  const getKardex = useCallback(async (insumoId) => {
    if (!insumoId) {
      toast.error('insumoId es requerido');
      return { insumo: null, kardex: [], saldo_final: 0 };
    }

    try {
      return await obtenerKardexInsumo(insumoId);
    } catch (err) {
      console.error('Error obteniendo kardex:', err);
      return { insumo: null, kardex: [], saldo_final: 0 };
    }
  }, []);

  /**
   * Obtiene transferencias entre depósitos
   * @param {string} firmId - ID de la firma
   * @param {string} desde - Fecha desde
   * @param {string} hasta - Fecha hasta
   * @returns {Promise<Object>} { data, count }
   */
  const getTransfers = useCallback(async (firmId, desde, hasta) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerTransferenciasDepositos(firmId, desde, hasta);
    } catch (err) {
      console.error('Error obteniendo transferencias:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Obtiene movimientos pendientes de reconciliación
   * @param {string} firmId - ID de la firma
   * @returns {Promise<Object>} { data, count }
   */
  const getPending = useCallback(async (firmId) => {
    if (!firmId) {
      toast.error('firmId es requerido');
      return { data: [], count: 0 };
    }

    try {
      return await obtenerMovimientosPendientes(firmId);
    } catch (err) {
      console.error('Error obteniendo movimientos pendientes:', err);
      return { data: [], count: 0 };
    }
  }, []);

  /**
   * Limpia el estado de movimientos
   */
  const clearMovements = useCallback(() => {
    setMovimientos([]);
    setError(null);
  }, []);

  return {
    // Estado
    movimientos,
    loading,
    error,

    // CRUD principal
    loadMovementsFirma,
    loadMovementsInput,
    loadMovementsLot,
    registerMovement,

    // Consultas especializadas
    getLastMovement,
    getGroupedMovements,
    getConsumption,
    getIncome,
    checkAvailability,
    getKardex,
    getTransfers,
    getPending,

    // Utilidades
    clearMovements
  };
}
