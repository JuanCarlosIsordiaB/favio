/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * usePredictiveAlerts.js - Hook para Gestión de Alertas Predictivas
 *
 * Funcionalidad:
 * - Cargar alertas predictivas activas
 * - Reconocer/resolver/descartar alertas
 * - Filtrar por tipo y severidad
 * - Suscripción a cambios en tiempo real
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export function usePredictiveAlerts(firmId, premiseId = null) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'ACTIVE',
    severity: null,
    alertType: null
  });

  /**
   * Cargar alertas predictivas
   */
  const loadAlerts = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('predictive_alerts')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      if (premiseId) {
        query = query.eq('premise_id', premiseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAlerts(data || []);
    } catch (err) {
      const errorMessage = err.message || 'Error cargando alertas predictivas';
      setError(errorMessage);
      console.error('Error en loadAlerts:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId, premiseId, filters]);

  /**
   * Reconocer alerta
   */
  const acknowledgeAlert = useCallback(
    async (alertId, userId) => {
      try {
        const { error: updateError } = await supabase
          .from('predictive_alerts')
          .update({
            status: 'ACKNOWLEDGED',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: userId
          })
          .eq('id', alertId);

        if (updateError) throw updateError;

        // Actualizar estado local
        setAlerts(prev =>
          prev.map(a =>
            a.id === alertId
              ? {
                  ...a,
                  status: 'ACKNOWLEDGED',
                  acknowledged_at: new Date().toISOString(),
                  acknowledged_by: userId
                }
              : a
          )
        );

        toast.success('Alerta reconocida');
      } catch (err) {
        const errorMessage = err.message || 'Error reconociendo alerta';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Error en acknowledgeAlert:', err);
      }
    },
    []
  );

  /**
   * Descartar alerta
   */
  const dismissAlert = useCallback(async (alertId) => {
    try {
      const { error: updateError } = await supabase
        .from('predictive_alerts')
        .update({
          status: 'DISMISSED'
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      // Actualizar estado local
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      toast.success('Alerta descartada');
    } catch (err) {
      const errorMessage = err.message || 'Error descartando alerta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error en dismissAlert:', err);
    }
  }, []);

  /**
   * Resolver alerta
   */
  const resolveAlert = useCallback(async (alertId) => {
    try {
      const { error: updateError } = await supabase
        .from('predictive_alerts')
        .update({
          status: 'RESOLVED'
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      // Actualizar estado local
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      toast.success('Alerta resuelta');
    } catch (err) {
      const errorMessage = err.message || 'Error resolviendo alerta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error en resolveAlert:', err);
    }
  }, []);

  /**
   * Obtener alerta específica
   */
  const getAlert = useCallback(
    async (alertId) => {
      try {
        const { data, error: fetchError } = await supabase
          .from('predictive_alerts')
          .select('*')
          .eq('id', alertId)
          .single();

        if (fetchError) throw fetchError;

        return data;
      } catch (err) {
        console.error('Error obteniendo alerta:', err);
        return null;
      }
    },
    []
  );

  /**
   * Cambiar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  /**
   * Limpiar errores
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cargar alertas al montar y cuando cambian dependencias
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Suscribirse a cambios en tiempo real (opcional)
  useEffect(() => {
    if (!firmId) return;

    const subscription = supabase
      .channel(`predictive_alerts:${firmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictive_alerts',
          filter: `firm_id=eq.${firmId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev =>
              prev.map(a => (a.id === payload.new.id ? payload.new : a))
            );
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [firmId]);

  // Estadísticas
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    high: alerts.filter(a => a.severity === 'HIGH').length,
    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
    low: alerts.filter(a => a.severity === 'LOW').length,
    byType: {
      riesgo_forrajero: alerts.filter(a => a.alert_type === 'RIESGO_FORRAJERO').length,
      margen_negativo: alerts.filter(a => a.alert_type === 'MARGEN_NEGATIVO').length,
      costo_fuera_rango: alerts.filter(a => a.alert_type === 'COSTO_KG_FUERA_RANGO').length,
      sobrepastoreo: alerts.filter(a => a.alert_type === 'SOBREPASTOREO').length,
      precio_critico: alerts.filter(a => a.alert_type === 'PRECIO_CRITICO').length,
      clima_adverso: alerts.filter(a => a.alert_type === 'CLIMA_ADVERSO').length
    }
  };

  return {
    // Estado
    alerts,
    loading,
    error,
    filters,
    stats,

    // Acciones
    loadAlerts,
    acknowledgeAlert,
    dismissAlert,
    resolveAlert,
    getAlert,
    updateFilters,
    clearError
  };
}

export default usePredictiveAlerts;
