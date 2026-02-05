import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Hook para gestionar centros de costo
 */
export function useCostCenters() {
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCostCenters = useCallback(async (firmId) => {
    if (!firmId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('firm_id', firmId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (err) {
      console.error('Error loading cost centers:', err);
      toast.error('Error al cargar centros de costo');
    } finally {
      setLoading(false);
    }
  }, []);

  return { costCenters, loading, loadCostCenters };
}
