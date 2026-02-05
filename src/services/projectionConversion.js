/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Servicios de conversión Proyección → Trabajo
 *
 * Funcionalidad:
 * - Convertir proyecciones agrícolas a trabajos
 * - Convertir proyecciones ganaderas a trabajos
 * - Pre-llenar datos del trabajo desde proyección
 * - Vincular trabajo con proyección original
 */

import { supabase } from '../lib/supabase';
import { crearTrabajoAgricola } from './agriculturalWorks';
import { crearTrabajoGanadero } from './livestockWorks';
import { crearRegistro } from './registros';

// =============================================
// CONVERSIÓN DE PROYECCIONES AGRÍCOLAS
// =============================================

/**
 * Convierte una proyección agrícola en un trabajo ejecutado
 */
export async function convertirProyeccionAgricolaATrabajo(proyeccionId, usuario) {
  try {
    // 1. Obtener proyección completa
    const { data: proyeccion, error: proyeccionError } = await supabase
      .from('proyecciones_agricolas')
      .select('*')
      .eq('id', proyeccionId)
      .single();

    if (proyeccionError) throw proyeccionError;
    if (!proyeccion) throw new Error('Proyección agrícola no encontrada');

    // 2. Validar que no esté ya convertida
    if (proyeccion.trabajo_agricola_id) {
      throw new Error('Esta proyección ya fue convertida en trabajo agrícola');
    }

    // 3. Obtener activity_id basado en el tipo de trabajo
    let activity_id = null;
    if (proyeccion.tipo_trabajo) {
      const { data: activity } = await supabase
        .from('activities')
        .select('id')
        .eq('firm_id', proyeccion.firm_id)
        .eq('activity_type', 'AGRICULTURAL')
        .ilike('name', `%${proyeccion.tipo_trabajo}%`)
        .limit(1)
        .single();

      if (activity) {
        activity_id = activity.id;
      } else {
        // Si no encuentra por nombre, intenta obtener la primera actividad AGRICULTURAL
        const { data: defaultActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('firm_id', proyeccion.firm_id)
          .eq('activity_type', 'AGRICULTURAL')
          .limit(1)
          .single();

        if (defaultActivity) {
          activity_id = defaultActivity.id;
        }
      }
    }

    if (!activity_id) {
      throw new Error('No se encontró una actividad agrícola válida para este tipo de trabajo');
    }

    // 4. Crear trabajo basado en proyección
    const trabajoData = {
      firm_id: proyeccion.firm_id,
      premise_id: proyeccion.premise_id,
      lot_id: proyeccion.lot_id,
      date: proyeccion.fecha_tentativa || new Date().toISOString().split('T')[0], // Usar fecha de proyección
      activity_id: activity_id, // Usar el activity_id encontrado
      work_type: proyeccion.tipo_trabajo || 'Siembra', // Mantener por retrocompatibilidad
      hectares: parseFloat(proyeccion.hectareas) || 0,
      cost_center_id: proyeccion.cost_center_id || null,
      campaign_id: proyeccion.campaign_id || null,
      responsible_person: proyeccion.responsible_person || usuario,
      detail: `Generado desde proyección del ${proyeccion.fecha_tentativa}. Cultivo: ${proyeccion.cultivo_proyectado}`,
      status: 'DRAFT',
      currentUser: usuario,

      // Pre-llenar insumos con datos de proyección
      insumos: proyeccion.producto && proyeccion.dosis_ha ? [
        {
          input_id: null, // Usuario debe seleccionar
          dose_projected: parseFloat(proyeccion.dosis_ha),
          dose_applied: parseFloat(proyeccion.dosis_ha), // Sugerir misma dosis
          unit: 'kg/ha',
          quantity_projected: parseFloat(proyeccion.total),
          quantity_applied: parseFloat(proyeccion.total),
          cost_per_unit: 0 // Usuario completa
        }
      ] : [],

      maquinaria: [],
      labor: []
    };

    // 5. Crear trabajo agrícola
    const trabajo = await crearTrabajoAgricola(trabajoData);

    // 5. Vincular proyección con trabajo
    const { error: linkError } = await supabase
      .from('proyecciones_agricolas')
      .update({
        trabajo_agricola_id: trabajo.id,
        estado: 'COMPLETADA'
      })
      .eq('id', proyeccionId);

    if (linkError) throw linkError;

    // 6. Auditoría
    await crearRegistro({
      firmId: proyeccion.firm_id,
      tipo: 'proyeccion_agricola',
      descripcion: `Proyección agrícola convertida en trabajo: ${trabajo.id}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: proyeccionId,
      metadata: {
        trabajo_id: trabajo.id,
        cultivo: proyeccion.cultivo_proyectado,
        hectareas: proyeccion.hectareas
      }
    });

    return {
      success: true,
      trabajo,
      proyeccion
    };
  } catch (error) {
    console.error('Error en convertirProyeccionAgricolaATrabajo:', error);
    throw error;
  }
}

// =============================================
// CONVERSIÓN DE PROYECCIONES GANADERAS
// =============================================

/**
 * Convierte una proyección ganadera en un trabajo ejecutado
 */
export async function convertirProyeccionGanaderaATrabajo(proyeccionId, usuario) {
  try {
    // 1. Obtener proyección completa
    const { data: proyeccion, error: proyeccionError } = await supabase
      .from('proyecciones_ganaderas')
      .select('*')
      .eq('id', proyeccionId)
      .single();

    if (proyeccionError) throw proyeccionError;
    if (!proyeccion) throw new Error('Proyección ganadera no encontrada');

    // 2. Validar que no esté ya convertida
    if (proyeccion.trabajo_ganadero_id) {
      throw new Error('Esta proyección ya fue convertida en trabajo ganadero');
    }

    // 3. Obtener rodeo para determinar herd_id
    let herd_id = null;
    if (proyeccion.lote_id) {
      const { data: lotData } = await supabase
        .from('lots')
        .select('herd_id')
        .eq('id', proyeccion.lote_id)
        .single();

      if (lotData) herd_id = lotData.herd_id;
    }

    // Si no hay herd_id, intenta obtener el primer rodeo del predio
    if (!herd_id) {
      const { data: herdData } = await supabase
        .from('herds')
        .select('id')
        .eq('premise_id', proyeccion.premise_id)
        .limit(1)
        .single();

      if (herdData) herd_id = herdData.id;
    }

    if (!herd_id) {
      throw new Error('No se encontró rodeo asociado. Por favor selecciona uno manualmente.');
    }

    // 4. Obtener activity_id basado en el tipo de evento
    let activity_id = null;
    if (proyeccion.tipo_evento) {
      const { data: activity } = await supabase
        .from('activities')
        .select('id')
        .eq('firm_id', proyeccion.firm_id)
        .eq('activity_type', 'LIVESTOCK')
        .ilike('name', `%${proyeccion.tipo_evento}%`)
        .limit(1)
        .single();

      if (activity) {
        activity_id = activity.id;
      } else {
        // Si no encuentra por nombre, intenta obtener la primera actividad LIVESTOCK
        const { data: defaultActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('firm_id', proyeccion.firm_id)
          .eq('activity_type', 'LIVESTOCK')
          .limit(1)
          .single();

        if (defaultActivity) {
          activity_id = defaultActivity.id;
        }
      }
    }

    if (!activity_id) {
      throw new Error('No se encontró una actividad ganadera válida para este tipo de evento');
    }

    // 5. Mapear tipo_evento español a código aceptado por BD
    const eventTypeMap = {
      'Vacunaciones': 'VACCINATION',
      'Tratamiento': 'MEDICAL_TREATMENT',
      'Entore': 'BREEDING',
      'Destete': 'WEANING',
      'Pesadas': 'WEIGHING',
      'Otros': 'OTHER',
      'VACCINATION': 'VACCINATION',
      'MEDICAL_TREATMENT': 'MEDICAL_TREATMENT',
      'BREEDING': 'BREEDING',
      'WEANING': 'WEANING',
      'WEIGHING': 'WEIGHING',
      'OTHER': 'OTHER'
    };

    const mappedEventType = eventTypeMap[proyeccion.tipo_evento] || 'OTHER';

    // 6. Crear trabajo basado en proyección
    const trabajoData = {
      firm_id: proyeccion.firm_id,
      premise_id: proyeccion.premise_id,
      herd_id: herd_id,
      activity_id: activity_id, // Usar el activity_id encontrado
      date: proyeccion.fecha_tentativa || new Date().toISOString().split('T')[0], // Usar fecha de proyección
      event_type: mappedEventType, // Usar valor mapeado que acepta BD
      work_mode: 'GROUP', // Por defecto grupal, usuario puede cambiar
      quantity: parseInt(proyeccion.cantidad) || 0,
      cost_center_id: proyeccion.cost_center_id || null,
      campaign_id: proyeccion.campaign_id || null,
      responsible_person: proyeccion.responsible_person || usuario,
      detail: `Generado desde proyección del ${proyeccion.fecha_tentativa}. Categoría: ${proyeccion.categoria}. ${proyeccion.observaciones || ''}`,
      status: 'DRAFT',
      currentUser: usuario,

      insumos: [],
      maquinaria: [],
      labor: []
    };

    // 7. Crear trabajo ganadero
    const trabajo = await crearTrabajoGanadero(trabajoData);

    // 8. Vincular proyección con trabajo
    const { error: linkError } = await supabase
      .from('proyecciones_ganaderas')
      .update({
        trabajo_ganadero_id: trabajo.id,
        estado: 'COMPLETADA'
      })
      .eq('id', proyeccionId);

    if (linkError) throw linkError;

    // 9. Auditoría
    await crearRegistro({
      firmId: proyeccion.firm_id,
      tipo: 'proyeccion_ganadera',
      descripcion: `Proyección ganadera convertida en trabajo: ${trabajo.id}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: proyeccionId,
      metadata: {
        trabajo_id: trabajo.id,
        tipo_evento: proyeccion.tipo_evento,
        cantidad: proyeccion.cantidad,
        categoria: proyeccion.categoria
      }
    });

    return {
      success: true,
      trabajo,
      proyeccion
    };
  } catch (error) {
    console.error('Error en convertirProyeccionGanaderaATrabajo:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de proyecciones no convertidas (para mostrar botones de conversión)
 */
export async function obtenerProyeccionesNoConvertidas(filtros = {}) {
  try {
    let queryAgricola = supabase
      .from('proyecciones_agricolas')
      .select('*')
      .is('trabajo_agricola_id', null);

    let queryGanadera = supabase
      .from('proyecciones_ganaderas')
      .select('*')
      .is('trabajo_ganadero_id', null);

    // Aplicar filtros
    if (filtros.firm_id) {
      queryAgricola = queryAgricola.eq('firm_id', filtros.firm_id);
      queryGanadera = queryGanadera.eq('firm_id', filtros.firm_id);
    }
    if (filtros.premise_id) {
      queryAgricola = queryAgricola.eq('premise_id', filtros.premise_id);
      queryGanadera = queryGanadera.eq('premise_id', filtros.premise_id);
    }
    if (filtros.estado) {
      queryAgricola = queryAgricola.eq('estado', filtros.estado);
      queryGanadera = queryGanadera.eq('estado', filtros.estado);
    }

    const [{ data: agricolas }, { data: ganaderas }] = await Promise.all([
      queryAgricola,
      queryGanadera
    ]);

    return {
      agricolas: agricolas || [],
      ganaderas: ganaderas || []
    };
  } catch (error) {
    console.error('Error en obtenerProyeccionesNoConvertidas:', error);
    throw error;
  }
}
