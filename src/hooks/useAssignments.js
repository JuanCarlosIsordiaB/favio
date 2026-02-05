import { useState, useCallback } from 'react';
import {
  obtenerAsignaciones,
  obtenerAsignacionesActivas,
  crearAsignacion,
  actualizarAsignacion,
  completarAsignacion
} from '../services/assignments';
import { toast } from 'sonner';

export function useAssignments(firmId) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAssignments = useCallback(async (personnelId = null) => {
    setLoading(true);
    try {
      const { data } = personnelId
        ? await obtenerAsignaciones(personnelId)
        : await obtenerAsignacionesActivas(firmId);
      setAssignments(data || []);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const addAssignment = useCallback(async (assignmentData) => {
    try {
      const data = await crearAsignacion({ ...assignmentData, firm_id: firmId });
      setAssignments(prev => [data, ...prev]);
      toast.success('Asignación creada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  const updateAssignment = useCallback(async (id, updates) => {
    try {
      const data = await actualizarAsignacion(id, updates);
      setAssignments(prev => prev.map(a => a.id === id ? data : a));
      toast.success('Asignación actualizada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const completeAssignment = useCallback(async (id, currentUser) => {
    try {
      const data = await completarAsignacion(id, currentUser);
      setAssignments(prev => prev.map(a => a.id === id ? data : a));
      toast.success('Asignación completada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  return {
    assignments,
    loading,
    loadAssignments,
    addAssignment,
    updateAssignment,
    completeAssignment
  };
}
