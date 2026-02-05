import { useState, useCallback, useEffect } from 'react';
import { 
  getAnimals, 
  getHerds, 
  getLivestockCategories, 
  getLivestockSummary 
} from '../services/livestock';

/**
 * Hook para gestionar el estado de ganadería en el predio seleccionado
 */
export function useLivestock(premiseId) {
  const [animals, setAnimals] = useState([]);
  const [herds, setHerds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!premiseId) return;

    setLoading(true);
    setError(null);

    try {
      const [animalsData, herdsData, catData, summaryData] = await Promise.all([
        getAnimals(premiseId),
        getHerds(premiseId),
        getLivestockCategories(),
        getLivestockSummary(premiseId)
      ]);

      setAnimals(animalsData);
      setHerds(herdsData);
      setCategories(catData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading livestock data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [premiseId]);

  // Cargar datos automáticamente si cambia el predio
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    animals,
    herds,
    categories,
    summary,
    loading,
    error,
    refresh: loadData
  };
}
