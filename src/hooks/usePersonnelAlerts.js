import { useState, useCallback, useEffect, useRef } from 'react';
import { verificarAlertasPersonal } from '../services/personnelAlerts';
import { verificarAlertasMaquinaria } from '../services/machineryAlerts';

export function usePersonnelAlerts(firmId, autoCheck = true, intervalMinutes = 5) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const intervalRef = useRef(null);

  const checkAlerts = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    try {
      const [personnelResult, machineryResult] = await Promise.all([
        verificarAlertasPersonal(firmId),
        verificarAlertasMaquinaria(firmId)
      ]);

      const allAlerts = [
        ...personnelResult.alertas,
        ...machineryResult.alertas
      ];

      setAlerts(allAlerts);
      setLastCheck(new Date());
    } catch (err) {
      console.error('Error checking alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    if (!firmId || !autoCheck) return;

    // Check immediately
    checkAlerts();

    // Setup interval
    intervalRef.current = setInterval(() => {
      checkAlerts();
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [firmId, autoCheck, intervalMinutes, checkAlerts]);

  return {
    alerts,
    loading,
    lastCheck,
    checkAlerts
  };
}
