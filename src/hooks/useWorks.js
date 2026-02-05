/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Hook personalizado para gestionar trabajos agrícolas con CRUD + estados
 * Patrón: Similar a useInputs.js del proyecto
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  obtenerTrabajosAgricolas,
  obtenerDetalleTrabajoAgricola,
  crearTrabajoAgricola,
  actualizarTrabajoAgricola,
  enviarTrabajoAprobacion,
  aprobarTrabajoAgricola,
  rechazarTrabajoAgricola,
  cerrarTrabajoAgricola,
  anularTrabajoAgricola
} from '../services/agriculturalWorks';
import {
  obtenerTrabajosGanaderos,
  obtenerDetalleTrabajoGanadero,
  crearTrabajoGanadero,
  actualizarTrabajoGanadero,
  aprobarTrabajoGanadero,
  rechazarTrabajoGanadero,
  cerrarTrabajoGanadero,
  anularTrabajoGanadero
} from '../services/livestockWorks';

/**
 * Hook para gestionar trabajos agrícolas
 * Maneja CRUD, estados y transiciones de workflow
 */
export function useAgriculturalWorks() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga trabajos con filtros
   */
  const loadWorks = useCallback(async (filtros) => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await obtenerTrabajosAgricolas(filtros);
      setWorks(data || []);
      return { data, count };
    } catch (err) {
      const errorMsg = err.message || 'Error al cargar trabajos';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error en loadWorks:', err);
      return { data: [], count: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga detalle completo de un trabajo
   */
  const loadWorkDetail = useCallback(async (trabajoId) => {
    try {
      const trabajo = await obtenerDetalleTrabajoAgricola(trabajoId);
      return trabajo;
    } catch (err) {
      toast.error('Error al cargar detalle del trabajo');
      console.error('Error en loadWorkDetail:', err);
      return null;
    }
  }, []);

  /**
   * Crea un nuevo trabajo (siempre en estado DRAFT)
   */
  const createWork = useCallback(async (workData) => {
    setLoading(true);
    setError(null);
    try {
      const newWork = await crearTrabajoAgricola(workData);
      setWorks((prev) => [newWork, ...prev]);
      toast.success('✓ Trabajo creado como BORRADOR');
      return newWork;
    } catch (err) {
      const errorMsg = err.message || 'Error al crear trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualiza un trabajo agrícola existente
   * Solo permite editar trabajos en estado DRAFT
   */
  const updateWork = useCallback(async (trabajoId, workData) => {
    setLoading(true);
    setError(null);
    try {
      const { trabajo } = await actualizarTrabajoAgricola(trabajoId, workData);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, ...trabajo } : w
        )
      );
      toast.success('✓ Trabajo actualizado correctamente');
      return trabajo;
    } catch (err) {
      const errorMsg = err.message || 'Error al actualizar trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Envía trabajo a aprobación
   * DRAFT → PENDING_APPROVAL
   */
  const submitForApproval = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      await enviarTrabajoAprobacion(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'PENDING_APPROVAL' } : w
        )
      );
      toast.success('✓ Trabajo enviado a aprobación');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al enviar a aprobación';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aprueba un trabajo
   * PENDING_APPROVAL → APPROVED
   * DESCUENTA STOCK AUTOMÁTICAMENTE
   */
  const approve = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      const { trabajo } = await aprobarTrabajoAgricola(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'APPROVED', ...trabajo } : w
        )
      );
      toast.success(
        '✅ Trabajo aprobado. Stock descontado automáticamente de inventario.'
      );
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al aprobar trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rechaza un trabajo
   * PENDING_APPROVAL → DRAFT
   */
  const reject = useCallback(async (trabajoId, usuario, motivo) => {
    setLoading(true);
    setError(null);
    try {
      await rechazarTrabajoAgricola(trabajoId, usuario, motivo);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId
            ? { ...w, status: 'DRAFT', cancellation_reason: motivo }
            : w
        )
      );
      toast.success('✓ Trabajo rechazado y devuelto a BORRADOR');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al rechazar trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cierra un trabajo aprobado
   * APPROVED → CLOSED (inmutable)
   */
  const closeWork = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      await cerrarTrabajoAgricola(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'CLOSED' } : w
        )
      );
      toast.success('✓ Trabajo cerrado (ahora es inmutable)');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al cerrar trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Anula un trabajo
   * CUALQUIER ESTADO → CANCELLED
   * Revierte automáticamente el stock si estaba aprobado
   */
  const cancel = useCallback(async (trabajoId, usuario, motivo) => {
    setLoading(true);
    setError(null);
    try {
      await anularTrabajoAgricola(trabajoId, usuario, motivo);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId
            ? { ...w, status: 'CANCELLED', cancellation_reason: motivo }
            : w
        )
      );
      toast.success(
        '✓ Trabajo anulado. Stock revertido si estaba aprobado.'
      );
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al anular trabajo';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene trabajos por estado
   */
  const getWorksByStatus = useCallback((status) => {
    return works.filter((w) => w.status === status);
  }, [works]);

  /**
   * Cuenta trabajos pendientes de aprobación
   */
  const getPendingCount = useCallback(() => {
    return works.filter((w) => w.status === 'PENDING_APPROVAL').length;
  }, [works]);

  /**
   * Calcula suma de costos de trabajos
   */
  const getTotalCost = useCallback((filtredWorks = works) => {
    return filtredWorks.reduce((sum, w) => sum + (w.total_cost || 0), 0);
  }, [works]);

  return {
    // Estado
    works,
    loading,
    error,

    // CRUD
    loadWorks,
    loadWorkDetail,
    createWork,
    updateWork,

    // Transiciones de estado
    submitForApproval,
    approve,
    reject,
    closeWork,
    cancel,

    // Utilidades
    getWorksByStatus,
    getPendingCount,
    getTotalCost
  };
}

/**
 * Hook para gestionar trabajos ganaderos
 * Similar a useAgriculturalWorks pero para livestock_works
 * Maneja CRUD, estados y transiciones de workflow para ganadería
 */
export function useLivestockWorks() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga trabajos ganaderos con filtros
   */
  const loadWorks = useCallback(async (filtros) => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await obtenerTrabajosGanaderos(filtros);
      setWorks(data || []);
      return { data, count };
    } catch (err) {
      const errorMsg = err.message || 'Error al cargar trabajos ganaderos';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error en loadWorks (livestock):', err);
      return { data: [], count: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga detalle completo de un trabajo ganadero
   */
  const loadWorkDetail = useCallback(async (trabajoId) => {
    try {
      const trabajo = await obtenerDetalleTrabajoGanadero(trabajoId);
      return trabajo;
    } catch (err) {
      toast.error('Error al cargar detalle del trabajo ganadero');
      console.error('Error en loadWorkDetail (livestock):', err);
      return null;
    }
  }, []);

  /**
   * Crea un nuevo trabajo ganadero (siempre en estado DRAFT)
   */
  const createWork = useCallback(async (workData) => {
    setLoading(true);
    setError(null);
    try {
      const newWork = await crearTrabajoGanadero(workData);
      setWorks((prev) => [newWork, ...prev]);
      toast.success('✓ Trabajo ganadero creado como BORRADOR');
      return newWork;
    } catch (err) {
      const errorMsg = err.message || 'Error al crear trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualiza un trabajo ganadero existente
   * Solo permite editar trabajos en estado DRAFT
   */
  const updateWork = useCallback(async (trabajoId, workData) => {
    setLoading(true);
    setError(null);
    try {
      const { trabajo } = await actualizarTrabajoGanadero(trabajoId, workData);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, ...trabajo } : w
        )
      );
      toast.success('✓ Trabajo ganadero actualizado correctamente');
      return trabajo;
    } catch (err) {
      const errorMsg = err.message || 'Error al actualizar trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Envía trabajo a aprobación
   * DRAFT → PENDING_APPROVAL
   */
  const submitForApproval = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      await enviarTrabajoAprobacion(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'PENDING_APPROVAL' } : w
        )
      );
      toast.success('✓ Trabajo ganadero enviado a aprobación');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al enviar a aprobación';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aprueba un trabajo ganadero
   * PENDING_APPROVAL → APPROVED
   * DESCUENTA STOCK AUTOMÁTICAMENTE (si hay insumos)
   */
  const approve = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      const { trabajo } = await aprobarTrabajoGanadero(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'APPROVED', ...trabajo } : w
        )
      );
      toast.success(
        '✅ Trabajo ganadero aprobado. Stock descontado automáticamente si corresponde.'
      );
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al aprobar trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rechaza un trabajo ganadero
   * PENDING_APPROVAL → DRAFT
   */
  const reject = useCallback(async (trabajoId, usuario, motivo) => {
    setLoading(true);
    setError(null);
    try {
      await rechazarTrabajoGanadero(trabajoId, usuario, motivo);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId
            ? { ...w, status: 'DRAFT', cancellation_reason: motivo }
            : w
        )
      );
      toast.success('✓ Trabajo ganadero rechazado y devuelto a BORRADOR');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al rechazar trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cierra un trabajo ganadero aprobado
   * APPROVED → CLOSED (inmutable)
   */
  const closeWork = useCallback(async (trabajoId, usuario) => {
    setLoading(true);
    setError(null);
    try {
      await cerrarTrabajoGanadero(trabajoId, usuario);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId ? { ...w, status: 'CLOSED' } : w
        )
      );
      toast.success('✓ Trabajo ganadero cerrado (ahora es inmutable)');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al cerrar trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Anula un trabajo ganadero
   * CUALQUIER ESTADO → CANCELLED
   * Revierte automáticamente el stock si estaba aprobado
   */
  const cancel = useCallback(async (trabajoId, usuario, motivo) => {
    setLoading(true);
    setError(null);
    try {
      await anularTrabajoGanadero(trabajoId, usuario, motivo);
      setWorks((prev) =>
        prev.map((w) =>
          w.id === trabajoId
            ? { ...w, status: 'CANCELLED', cancellation_reason: motivo }
            : w
        )
      );
      toast.success(
        '✓ Trabajo ganadero anulado. Stock revertido si estaba aprobado.'
      );
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Error al anular trabajo ganadero';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene trabajos por estado
   */
  const getWorksByStatus = useCallback((status) => {
    return works.filter((w) => w.status === status);
  }, [works]);

  /**
   * Cuenta trabajos pendientes de aprobación
   */
  const getPendingCount = useCallback(() => {
    return works.filter((w) => w.status === 'PENDING_APPROVAL').length;
  }, [works]);

  /**
   * Calcula suma de costos de trabajos ganaderos
   */
  const getTotalCost = useCallback((filtredWorks = works) => {
    return filtredWorks.reduce((sum, w) => sum + (w.total_cost || 0), 0);
  }, [works]);

  return {
    // Estado
    works,
    loading,
    error,

    // CRUD
    loadWorks,
    loadWorkDetail,
    createWork,
    updateWork,

    // Transiciones de estado
    submitForApproval,
    approve,
    reject,
    closeWork,
    cancel,

    // Utilidades
    getWorksByStatus,
    getPendingCount,
    getTotalCost
  };
}
