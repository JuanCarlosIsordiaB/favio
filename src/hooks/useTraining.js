import { useState, useCallback } from 'react';
import {
  obtenerCapacitaciones,
  obtenerCapacitacionesPorFirma,
  crearCapacitacion,
  actualizarCapacitacion,
  obtenerCapacitacionesVencidas,
  obtenerCapacitacionesPorVencer
} from '../services/training';
import { toast } from 'sonner';

export function useTraining(firmId) {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTrainings = useCallback(async (personnelId = null) => {
    setLoading(true);
    try {
      const { data } = personnelId
        ? await obtenerCapacitaciones(personnelId)
        : await obtenerCapacitacionesPorFirma(firmId);
      setTrainings(data || []);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const addTraining = useCallback(async (trainingData) => {
    try {
      const data = await crearCapacitacion({ ...trainingData, firm_id: firmId });
      setTrainings(prev => [data, ...prev]);
      toast.success('Capacitación registrada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  const updateTraining = useCallback(async (id, updates) => {
    try {
      const data = await actualizarCapacitacion(id, updates);
      setTrainings(prev => prev.map(t => t.id === id ? data : t));
      toast.success('Capacitación actualizada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const getExpiredTrainings = useCallback(async () => {
    try {
      const { data } = await obtenerCapacitacionesVencidas(firmId);
      return data;
    } catch (err) {
      console.error('Error loading expired trainings:', err);
      return [];
    }
  }, [firmId]);

  const getExpiringTrainings = useCallback(async (days = 30) => {
    try {
      const { data } = await obtenerCapacitacionesPorVencer(firmId, days);
      return data;
    } catch (err) {
      console.error('Error loading expiring trainings:', err);
      return [];
    }
  }, [firmId]);

  return {
    trainings,
    loading,
    loadTrainings,
    addTraining,
    updateTraining,
    getExpiredTrainings,
    getExpiringTrainings
  };
}
