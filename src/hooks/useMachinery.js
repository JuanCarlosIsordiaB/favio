import { useState, useCallback, useEffect } from 'react';
import {
  obtenerOrdenesServicio,
  crearOrdenServicio,
  actualizarOrdenServicio,
  completarOrdenServicio,
  obtenerRentabilidadMaquinaria
} from '../services/machineryService';
import { obtenerMaquinaria } from '../services/machinery';
import { toast } from 'sonner';

export function useMachinery(firmId) {
  const [machinery, setMachinery] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profitability, setProfitability] = useState([]);

  const loadMachinery = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    try {
      const machinery = await obtenerMaquinaria(firmId);
      setMachinery(machinery || []);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const loadServiceOrders = useCallback(async (filters = {}) => {
    if (!firmId) return;

    setLoading(true);
    try {
      const { data } = await obtenerOrdenesServicio(firmId, filters);
      setServiceOrders(data || []);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const addServiceOrder = useCallback(async (orderData) => {
    try {
      const data = await crearOrdenServicio({ ...orderData, firm_id: firmId });
      setServiceOrders(prev => [data, ...prev]);
      toast.success('Orden de servicio creada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, [firmId]);

  const updateServiceOrder = useCallback(async (id, updates) => {
    try {
      const data = await actualizarOrdenServicio(id, updates);
      setServiceOrders(prev => prev.map(o => o.id === id ? data : o));
      toast.success('Orden actualizada');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const completeServiceOrder = useCallback(async (id, completionData) => {
    try {
      const data = await completarOrdenServicio(id, completionData);
      setServiceOrders(prev => prev.map(o => o.id === id ? data : o));
      toast.success('Servicio completado');
      return data;
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      throw err;
    }
  }, []);

  const loadProfitability = useCallback(async (filters = {}) => {
    if (!firmId) return;

    try {
      const { data } = await obtenerRentabilidadMaquinaria(firmId, filters);
      setProfitability(data || []);
    } catch (err) {
      console.error('Error loading profitability:', err);
    }
  }, [firmId]);

  useEffect(() => {
    if (firmId) {
      loadMachinery();
      loadServiceOrders();
      loadProfitability();
    }
  }, [firmId, loadMachinery, loadServiceOrders, loadProfitability]);

  return {
    machinery,
    serviceOrders,
    profitability,
    loading,
    loadMachinery,
    loadServiceOrders,
    addServiceOrder,
    updateServiceOrder,
    completeServiceOrder,
    loadProfitability
  };
}
