import { useState, useCallback } from 'react';
import {
  obtenerMantenimientos,
  obtenerMantenimientosPorFirma,
  crearMantenimiento,
  actualizarMantenimiento,
  completarMantenimiento,
  obtenerMantenimientosVencidos
} from '../services/machineryService';
import { toast } from 'sonner';

export function useMaintenance(firmId) {
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMaintenances = useCallback(async (machineryId = null, filters = {}) => {
    setLoading(true);
    try {
      const { data } = machineryId
        ? await obtenerMantenimientos(machineryId)
        : await obtenerMantenimientosPorFirma(firmId, filters);
      setMaintenances(data || []);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const addMaintenance = useCallback(async (maintenanceData) => {
    try {
      const data = await crearMantenimiento({ ...maintenanceData, firm_id: firmId });
      setMaintenances(prev => [data, ...prev]);
      toast.success('Mantenimiento programado');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  const updateMaintenance = useCallback(async (id, updates) => {
    try {
      const data = await actualizarMantenimiento(id, updates);
      setMaintenances(prev => prev.map(m => m.id === id ? data : m));
      toast.success('Mantenimiento actualizado');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const completeMaintenance = useCallback(async (id, completionData) => {
    try {
      const data = await completarMantenimiento(id, completionData);
      setMaintenances(prev => prev.map(m => m.id === id ? data : m));
      toast.success('Mantenimiento completado');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const getOverdueMaintenances = useCallback(async () => {
    try {
      const { data } = await obtenerMantenimientosVencidos(firmId);
      return data;
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  }, [firmId]);

  return {
    maintenances,
    loading,
    loadMaintenances,
    addMaintenance,
    updateMaintenance,
    completeMaintenance,
    getOverdueMaintenances
  };
}
