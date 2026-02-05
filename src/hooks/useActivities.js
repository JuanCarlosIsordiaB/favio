/**
 * useActivities.js
 * Hook para gestión de actividades maestras
 */

import { useState, useCallback, useMemo } from 'react';
import * as activitiesService from '../services/activities';
import { toast } from 'sonner';

export function useActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadActivities = useCallback(async (firmId, activityType = null) => {
    if (!firmId) {
      console.warn('⚠️ loadActivities llamado sin firmId');
      setActivities([]);
      return;
    }

    setLoading(true);
    try {
      const data = await activitiesService.getActivities(firmId, activityType);
      setActivities(data);

      // ✅ Toast informativo si carga exitosa
      if (data && data.length > 0) {
        console.log(`✅ ${data.length} actividades cargadas para firma ${firmId}`);
      } else {
        // ⚠️ Warning específico si no hay datos
        toast.warning('No se encontraron actividades para esta firma');
        console.warn('⚠️ Query exitosa pero sin resultados. Revisar:');
        console.warn('  - ¿Existe la firma en la BD?');
        console.warn('  - ¿Se ejecutó la migración seed?');
        console.warn('  - ¿RLS está desactivado?');
      }
    } catch (error) {
      console.error('❌ Error loading activities:', error);
      // ✅ Toast con más información
      toast.error(`Error al cargar actividades: ${error.message}`);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveActivities = useCallback(async (firmId, activityType = null) => {
    if (!firmId) {
      console.warn('⚠️ loadActiveActivities llamado sin firmId');
      setActivities([]);
      return;
    }

    setLoading(true);
    try {
      const data = await activitiesService.getActiveActivities(firmId, activityType);
      setActivities(data);

      if (data && data.length > 0) {
        console.log(`✅ ${data.length} actividades activas cargadas`);
      } else {
        toast.warning('No se encontraron actividades activas');
      }
    } catch (error) {
      console.error('❌ Error loading active activities:', error);
      toast.error(`Error al cargar actividades: ${error.message}`);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createActivity = useCallback(async (activityData) => {
    try {
      const newActivity = await activitiesService.createActivity(activityData);
      toast.success('Actividad creada exitosamente');
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error(error.message || 'Error al crear actividad');
      throw error;
    }
  }, []);

  const updateActivity = useCallback(async (activityId, updates) => {
    try {
      const updated = await activitiesService.updateActivity(activityId, updates);
      toast.success('Actividad actualizada exitosamente');
      return updated;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error(error.message || 'Error al actualizar actividad');
      throw error;
    }
  }, []);

  const deactivateActivity = useCallback(async (activityId) => {
    try {
      await activitiesService.deactivateActivity(activityId);
      toast.success('Actividad desactivada exitosamente');
    } catch (error) {
      console.error('Error deactivating activity:', error);
      toast.error(error.message || 'Error al desactivar actividad');
      throw error;
    }
  }, []);

  const activateActivity = useCallback(async (activityId) => {
    try {
      await activitiesService.activateActivity(activityId);
      toast.success('Actividad activada exitosamente');
    } catch (error) {
      console.error('Error activating activity:', error);
      toast.error(error.message || 'Error al activar actividad');
      throw error;
    }
  }, []);

  // Computed properties para filtrar por tipo
  const getAgriculturalActivities = useMemo(() => {
    return activities.filter(a =>
      a.is_active && ['AGRICULTURAL', 'BOTH'].includes(a.activity_type)
    );
  }, [activities]);

  const getLivestockActivities = useMemo(() => {
    return activities.filter(a =>
      a.is_active && ['LIVESTOCK', 'BOTH'].includes(a.activity_type)
    );
  }, [activities]);

  const getSystemActivities = useMemo(() => {
    return activities.filter(a => a.is_system);
  }, [activities]);

  const getCustomActivities = useMemo(() => {
    return activities.filter(a => !a.is_system);
  }, [activities]);

  return {
    activities,
    loading,
    loadActivities,
    loadActiveActivities,
    createActivity,
    updateActivity,
    deactivateActivity,
    activateActivity,
    getAgriculturalActivities,
    getLivestockActivities,
    getSystemActivities,
    getCustomActivities
  };
}
