import { useState, useCallback, useEffect } from 'react';
import {
  obtenerPersonal,
  obtenerPersonalPorId,
  crearPersonal,
  actualizarPersonal,
  eliminarPersonal,
  obtenerEstadisticasPersonal,
  obtenerOrganigrama
} from '../services/personnel';
import { toast } from 'sonner';

export function usePersonnel(firmId) {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const loadPersonnel = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await obtenerPersonal(firmId);
      setPersonnel(data || []);
    } catch (err) {
      setError(err.message);
      toast.error(`Error al cargar personal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const loadStatistics = useCallback(async () => {
    if (!firmId) return;

    try {
      const stats = await obtenerEstadisticasPersonal(firmId);
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  }, [firmId]);

  const getPersonnelById = useCallback(async (id) => {
    try {
      const { data } = await obtenerPersonalPorId(id);
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const addPersonnel = useCallback(async (personnelData) => {
    setLoading(true);
    try {
      const data = await crearPersonal({ ...personnelData, firm_id: firmId });
      setPersonnel(prev => [...prev, data]);
      toast.success(`Personal creado: ${data.full_name}`);
      return data;
    } catch (err) {
      toast.error(`Error al crear personal: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const updatePersonnel = useCallback(async (id, updates) => {
    setLoading(true);
    try {
      const data = await actualizarPersonal(id, updates);
      setPersonnel(prev => prev.map(p => p.id === id ? data : p));
      toast.success('Personal actualizado');
      return data;
    } catch (err) {
      toast.error(`Error al actualizar: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePersonnel = useCallback(async (id, currentUser) => {
    setLoading(true);
    try {
      await eliminarPersonal(id, currentUser);
      setPersonnel(prev => prev.filter(p => p.id !== id));
      toast.success('Personal dado de baja');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrgChart = useCallback(async () => {
    if (!firmId) return [];

    try {
      const { data } = await obtenerOrganigrama(firmId);
      return data;
    } catch (err) {
      toast.error(`Error al cargar organigrama: ${err.message}`);
      return [];
    }
  }, [firmId]);

  // Auto-load on mount
  useEffect(() => {
    if (firmId) {
      loadPersonnel();
      loadStatistics();
    }
  }, [firmId, loadPersonnel, loadStatistics]);

  return {
    personnel,
    loading,
    error,
    statistics,
    loadPersonnel,
    getPersonnelById,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    getOrgChart,
    loadStatistics
  };
}
