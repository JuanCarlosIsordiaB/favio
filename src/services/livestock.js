/**
 * Servicio para gestión de Ganadería en Supabase
 * Maneja Animales, Rodeos, Eventos y Automatización DICOSE
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene todas las categorías activas
 */
export async function getLivestockCategories() {
  const { data, error } = await supabase
    .from('livestock_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtiene el inventario de animales de un predio
 */
export async function getAnimals(premiseId, filters = {}) {
  let query = supabase
    .from('animals')
    .select('*, current_category:current_category_id(*), lot:current_lot_id(*)')
    .eq('premise_id', premiseId)
    .eq('status', 'ACTIVE');

  if (filters.categoryId) query = query.eq('current_category_id', filters.categoryId);
  if (filters.lotId) query = query.eq('current_lot_id', filters.lotId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Obtiene los rodeos activos de un predio (enriquecidos con KPIs)
 */
export async function getHerds(premiseId) {
  const { data, error } = await supabase
    .from('herds')
    .select('*, lot:current_lot_id(*)')
    .eq('premise_id', premiseId)
    .eq('is_active', true);

  if (error) throw error;

  // Enriquecer cada rodeo con conteos e KPIs
  const herdsWithCounts = await Promise.all(data.map(async (herd) => {
    // Obtener conteo de animales
    const { count } = await supabase
      .from('herd_animals')
      .select('*', { count: 'exact', head: true })
      .eq('herd_id', herd.id)
      .is('end_date', null);

    // NUEVO: Obtener resumen de pesos e último evento
    const [weightSummary, lastEvent] = await Promise.all([
      getHerdWeightSummary(herd.id),
      getHerdLastEvent(herd.id)
    ]);

    return {
      ...herd,
      animal_count: count || 0,
      weight_summary: weightSummary,
      last_event: lastEvent
    };
  }));

  return herdsWithCounts;
}

/**
 * Registra un nuevo animal (Alta)
 */
export async function createAnimal(animalData) {
  // Extraer herd_id antes de insertar en animals (no es columna de animals)
  const { herd_id, ...animalDataForInsert } = animalData;

  const { data: animal, error } = await supabase
    .from('animals')
    .insert([animalDataForInsert])
    .select()
    .single();

  if (error) throw error;

  // Si se proporcionó herd_id, crear relación en herd_animals
  if (herd_id) {
    const { error: herdError } = await supabase
      .from('herd_animals')
      .insert([{
        herd_id: herd_id,
        animal_id: animal.id,
        start_date: new Date().toISOString()
      }]);

    if (herdError) {
      console.error('Error al asociar animal a rodeo:', herdError);
      // No lanzar error - animal se creó exitosamente
    }
  }

  return animal;
}

/**
 * Actualiza datos de un animal existente
 */
export async function updateAnimal(animalId, animalData) {
  // Extraer herd_id si viene (no es columna de animals)
  const { herd_id, ...animalDataForUpdate } = animalData;

  const { data: animal, error } = await supabase
    .from('animals')
    .update(animalDataForUpdate)
    .eq('id', animalId)
    .select()
    .single();

  if (error) throw error;

  // Si se proporcionó un nuevo herd_id, actualizar relación en herd_animals
  if (herd_id) {
    // Primero obtener si ya existe una asociación activa
    const { data: existingAssociation } = await supabase
      .from('herd_animals')
      .select('id')
      .eq('animal_id', animalId)
      .is('end_date', null)
      .single();

    if (!existingAssociation) {
      // No hay asociación activa, crear una nueva
      const { error: herdError } = await supabase
        .from('herd_animals')
        .insert([{
          herd_id: herd_id,
          animal_id: animalId,
          start_date: new Date().toISOString()
        }]);

      if (herdError) {
        console.error('Error al asociar animal a rodeo:', herdError);
        // No lanzar error - animal se actualizó exitosamente
      }
    } else if (existingAssociation.id) {
      // Hay una asociación, verificar si es el mismo rodeo
      const { data: currentAssociation } = await supabase
        .from('herd_animals')
        .select('herd_id')
        .eq('id', existingAssociation.id)
        .single();

      if (currentAssociation.herd_id !== herd_id) {
        // Cambiar de rodeo: cerrar la antigua y crear la nueva
        await supabase
          .from('herd_animals')
          .update({ end_date: new Date().toISOString() })
          .eq('id', existingAssociation.id);

        await supabase
          .from('herd_animals')
          .insert([{
            herd_id: herd_id,
            animal_id: animalId,
            start_date: new Date().toISOString()
          }]);
      }
    }
  }

  return animal;
}

/**
 * Registra un evento ganadero (Nacimiento, Muerte, Traslado, etc.)
 */
export async function registerLivestockEvent(eventData) {
  const { data, error } = await supabase
    .from('herd_events')
    .insert([eventData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra un pesaje masivo (WEIGHING a nivel HERD)
 * Crea un evento INDIVIDUAL por cada ANIMAL del rodeo
 * @param {string} herdId - ID del rodeo
 * @param {object} eventData - Datos base del evento (firm_id, premise_id, event_date, qty_kg, etc.)
 * @returns {Promise<array>} Array de eventos creados
 */
export async function registerBulkWeighingEvent(herdId, eventData) {
  try {
    // 1. Obtener todos los animales activos del rodeo
    const { data: herdAnimals, error: herdError } = await supabase
      .from('herd_animals')
      .select('animal_id')
      .eq('herd_id', herdId)
      .is('end_date', null);

    if (herdError) throw herdError;
    if (!herdAnimals || herdAnimals.length === 0) {
      throw new Error('El rodeo no tiene animales activos para pesar');
    }

    // 2. Crear un evento INDIVIDUAL por cada animal
    // ⚠️ IMPORTANTE: scope DEBE ser 'ANIMAL' ya que creamos eventos individuales
    const eventsToCreate = herdAnimals.map(ha => ({
      // Copiar datos base pero FORZAR valores correctos para eventos individuales
      firm_id: eventData.firm_id,
      premise_id: eventData.premise_id,
      event_type: eventData.event_type,  // 'WEIGHING'
      event_date: eventData.event_date,
      species: eventData.species,
      animal_id: ha.animal_id,           // ← ASIGNAR animal específico
      herd_id: herdId,                   // ← Mantener referencia al rodeo
      scope: 'ANIMAL',                   // ← CRÍTICO: evento INDIVIDUAL, no de HERD
      qty_kg: eventData.qty_kg,
      notes: eventData.notes,
      status: eventData.status,
      metadata: eventData.metadata,
      // No copiar campos que no aplican a WEIGHING
      to_lote_id: null,
      category_from_id: null,
      category_to_id: null,
      qty_heads: null,
      guide_series: null,
      guide_number: null
    }));

    // 3. Insertar todos los eventos en batch
    const { data, error } = await supabase
      .from('herd_events')
      .insert(eventsToCreate)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en registerBulkWeighingEvent:', error);
    throw error;
  }
}

/**
 * Obtiene el resumen estadístico de un predio (incluyendo carga animal)
 */
export async function getLivestockSummary(premiseId) {
    const { data: animals, error } = await supabase
        .from('animals')
        .select('id, current_category_id, species')
        .eq('premise_id', premiseId)
        .eq('status', 'ACTIVE');

    if (error) throw error;

    const totalCabezas = animals.length;
    const porCategoria = animals.reduce((acc, curr) => {
        acc[curr.current_category_id] = (acc[curr.current_category_id] || 0) + 1;
        return acc;
    }, {});

    // NUEVO: Contar por especie
    const porEspecie = animals.reduce((acc, curr) => {
        acc[curr.species] = (acc[curr.species] || 0) + 1;
        return acc;
    }, {});

    // NUEVO: Obtener hectáreas totales del predio
    // Intentar query simplificada sin filtros extra
    const { data: lots, error: lotsError } = await supabase
        .from('lots')
        .select('area_hectares')
        .eq('premise_id', premiseId);

    if (lotsError) console.error('Error al obtener hectáreas:', lotsError);

    const totalHectareas = (lots || []).reduce((sum, lot) => sum + (lot.area_hectares || 0), 0);

    // NUEVO: Calcular carga animal (cabezas/ha)
    const cargaAnimal = totalHectareas > 0
        ? (totalCabezas / totalHectareas).toFixed(2)
        : '0.0';

    return {
        totalCabezas,
        porCategoria,
        porEspecie,
        totalHectareas: Math.round(totalHectareas * 10) / 10,
        cargaAnimal
    };
}

/**
 * Obtiene el conteo de animales agrupado por lote
 */
export async function getAnimalCountByLot(premiseId) {
    const { data, error } = await supabase
        .from('animals')
        .select('current_lot_id')
        .eq('premise_id', premiseId)
        .eq('status', 'ACTIVE');

    if (error) throw error;

    return data.reduce((acc, curr) => {
        if (curr.current_lot_id) {
            acc[curr.current_lot_id] = (acc[curr.current_lot_id] || 0) + 1;
        }
        return acc;
    }, {});
}

/**
 * Obtiene los animales que integran un rodeo actualmente
 */
export async function getHerdAnimals(herdId) {
    const { data, error } = await supabase
        .from('herd_animals')
        .select(`
            id,
            animal:animal_id (
                id,
                visual_tag,
                rfid_tag,
                species,
                breed,
                sex,
                birth_date,
                status,
                withdraw_until,
                initial_weight,
                current_category:current_category_id(id, name),
                current_lot:current_lot_id(id, name),
                origin_premise:origin_premise_id(id, name),
                premise:premise_id(id, name)
            )
        `)
        .eq('herd_id', herdId)
        .is('end_date', null);

    if (error) throw error;

    // PASO 2: Obtener last_weight desde eventos WEIGHING (Opción B - post-fetch)
    const animalIds = data.map(ha => ha.animal.id);
    if (animalIds.length === 0) return [];

    const { data: weights, error: weightsError } = await supabase
        .from('herd_events')
        .select('animal_id, qty_kg, event_date')
        .in('animal_id', animalIds)
        .eq('event_type', 'WEIGHING')
        .not('qty_kg', 'is', null)
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false });

    // Agrupar por animal_id y tomar el primero (más reciente)
    const weightMap = new Map();
    weights?.forEach(w => {
        if (!weightMap.has(w.animal_id)) {
            weightMap.set(w.animal_id, w.qty_kg);
        }
    });

    // Agregar last_weight a cada animal (usar initial_weight como fallback si no hay pesaje)
    const animalsWithWeights = data.map(ha => ({
        ...ha.animal,
        last_weight: { weight: weightMap.get(ha.animal.id) || ha.animal.initial_weight || null }
    }));

    return animalsWithWeights;
}

/**
 * Obtiene resumen de pesos del rodeo basado en últimos pesajes
 * @param {string} herdId - ID del rodeo
 * @returns {Promise<object>} { pesoPromedio, kgTotales, animalesPesados, totalAnimales }
 */
export async function getHerdWeightSummary(herdId) {
    try {
        // 1. Obtener IDs de animales activos en el rodeo
        const { data: members, error: membersError } = await supabase
            .from('herd_animals')
            .select('animal_id')
            .eq('herd_id', herdId)
            .is('end_date', null);

        if (membersError) throw membersError;
        if (!members || members.length === 0) {
            return { pesoPromedio: 0, kgTotales: 0, animalesPesados: 0, totalAnimales: 0 };
        }

        const animalIds = members.map(m => m.animal_id);

        // 2. Obtener todos los pesajes aprobados de estos animales
        const { data: weights, error: weightsError } = await supabase
            .from('herd_events')
            .select('animal_id, qty_kg, event_date')
            .in('animal_id', animalIds)
            .eq('event_type', 'WEIGHING')
            .eq('status', 'APPROVED')
            .order('event_date', { ascending: false });

        if (weightsError) throw weightsError;

        // 3. Filtrar último pesaje por animal
        const latestWeights = {};
        (weights || []).forEach(w => {
            if (!latestWeights[w.animal_id] ||
                new Date(w.event_date) > new Date(latestWeights[w.animal_id].event_date)) {
                latestWeights[w.animal_id] = w;
            }
        });

        // 4. Calcular estadísticas
        const pesos = Object.values(latestWeights).map(w => w.qty_kg || 0);
        const pesoPromedio = pesos.length > 0
            ? pesos.reduce((sum, p) => sum + p, 0) / pesos.length
            : 0;
        const kgTotales = pesos.reduce((sum, p) => sum + p, 0);

        return {
            pesoPromedio: Math.round(pesoPromedio * 10) / 10,  // 1 decimal
            kgTotales: Math.round(kgTotales * 10) / 10,
            animalesPesados: pesos.length,
            totalAnimales: animalIds.length
        };
    } catch (error) {
        console.error('Error en getHerdWeightSummary:', error);
        return { pesoPromedio: 0, kgTotales: 0, animalesPesados: 0, totalAnimales: 0 };
    }
}

/**
 * Obtiene el último evento relevante del rodeo (nivel HERD o de sus animales)
 * @param {string} herdId - ID del rodeo
 * @returns {Promise<object|null>} { tipo, fecha, notas }
 */
export async function getHerdLastEvent(herdId) {
    try {
        // Primero intentar eventos a nivel de rodeo (scope = HERD)
        const { data: herdEvent } = await supabase
            .from('herd_events')
            .select('event_type, event_date, notes')
            .eq('herd_id', herdId)
            .eq('scope', 'HERD')
            .eq('status', 'APPROVED')
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (herdEvent) return {
            tipo: herdEvent.event_type,
            fecha: herdEvent.event_date,
            notas: herdEvent.notes
        };

        // Si no hay eventos de rodeo, buscar último evento de animales del rodeo
        const { data: members } = await supabase
            .from('herd_animals')
            .select('animal_id')
            .eq('herd_id', herdId)
            .is('end_date', null);

        if (!members || members.length === 0) return null;

        const animalIds = members.map(m => m.animal_id);

        // Tipos relevantes (excluir WEIGHING que es muy frecuente)
        const relevantTypes = [
            'MOVE_INTERNAL',
            'CATEGORY_CHANGE',
            'HEALTH_TREATMENT',
            'PURCHASE',
            'SALE',
            'BIRTH',
            'DEATH',
            'CONSUMPTION',
            'LOST_WITH_HIDE',
            'FAENA'
        ];

        const { data: animalEvent } = await supabase
            .from('herd_events')
            .select('event_type, event_date, notes')
            .in('animal_id', animalIds)
            .in('event_type', relevantTypes)
            .eq('status', 'APPROVED')
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!animalEvent) return null;

        return {
            tipo: animalEvent.event_type,
            fecha: animalEvent.event_date,
            notas: animalEvent.notes
        };
    } catch (error) {
        console.error('Error en getHerdLastEvent:', error);
        return null;
    }
}

/**
 * Calcula kg totales de carne en pie del predio
 * Basado en último pesaje de cada animal activo
 * @param {string} premiseId - ID del predio
 * @returns {Promise<number>} Kg totales de carne en pie
 */
export async function getTotalLiveWeightKg(premiseId) {
    try {
        // 1. Obtener todos los animales activos del predio
        const { data: animals, error: animalsError } = await supabase
            .from('animals')
            .select('id')
            .eq('premise_id', premiseId)
            .eq('status', 'ACTIVE');

        if (animalsError) throw animalsError;
        if (!animals || animals.length === 0) return 0;

        const animalIds = animals.map(a => a.id);

        // 2. Obtener todos los pesajes aprobados
        const { data: weights, error: weightsError } = await supabase
            .from('herd_events')
            .select('animal_id, qty_kg, event_date')
            .in('animal_id', animalIds)
            .eq('event_type', 'WEIGHING')
            .eq('status', 'APPROVED')
            .order('event_date', { ascending: false });

        if (weightsError) throw weightsError;

        // 3. Filtrar último pesaje por animal
        const latestWeights = {};
        (weights || []).forEach(w => {
            if (!latestWeights[w.animal_id]) {
                latestWeights[w.animal_id] = w.qty_kg || 0;
            }
        });

        // 4. Sumar todos los pesos
        const totalKg = Object.values(latestWeights).reduce((sum, kg) => sum + kg, 0);

        return Math.round(totalKg * 10) / 10;  // 1 decimal
    } catch (error) {
        console.error('Error en getTotalLiveWeightKg:', error);
        return 0;
    }
}

/**
 * Obtiene animales disponibles para agregar a un rodeo
 * Excluye animales que ya están en el rodeo
 * @param {string} premiseId - ID del predio
 * @param {string} herdId - ID del rodeo
 * @param {string} species - Especie del rodeo (para filtrar)
 * @returns {Promise<Array>} Lista de animales disponibles
 */
export async function getAvailableAnimalsForHerd(premiseId, herdId, species) {
    try {
        // 1. Obtener IDs de animales que YA están en el rodeo
        const { data: currentMembers, error: membersError } = await supabase
            .from('herd_animals')
            .select('animal_id')
            .eq('herd_id', herdId)
            .is('end_date', null);

        if (membersError) throw membersError;

        const excludeIds = (currentMembers || []).map(m => m.animal_id);

        // 2. Obtener animales activos del predio (misma especie, no en rodeo)
        let query = supabase
            .from('animals')
            .select(`
                id,
                visual_tag,
                rfid_tag,
                species,
                current_category:current_category_id(id, name),
                current_lot:current_lot_id(id, name)
            `)
            .eq('premise_id', premiseId)
            .eq('status', 'ACTIVE')
            .eq('species', species);

        // Excluir animales que ya están en el rodeo
        if (excludeIds.length > 0) {
            query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data, error } = await query.order('visual_tag', { ascending: true });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error en getAvailableAnimalsForHerd:', error);
        return [];
    }
}

/**
 * Agrega múltiples animales a un rodeo de forma masiva
 * @param {string} herdId - ID del rodeo
 * @param {Array<string>} animalIds - IDs de animales a agregar
 * @returns {Promise<number>} Cantidad de animales agregados
 */
export async function addAnimalsToHerdBulk(herdId, animalIds) {
    if (!animalIds || animalIds.length === 0) {
        throw new Error('Debe seleccionar al menos un animal');
    }

    try {
        const now = new Date().toISOString();

        // Preparar inserciones en batch
        const inserts = animalIds.map(animalId => ({
            herd_id: herdId,
            animal_id: animalId,
            start_date: now,
            end_date: null
        }));

        // Insertar todas las relaciones de una vez
        const { data, error } = await supabase
            .from('herd_animals')
            .insert(inserts)
            .select();

        if (error) throw error;

        return data?.length || 0;
    } catch (error) {
        console.error('Error en addAnimalsToHerdBulk:', error);
        throw error;
    }
}

/**
 * Agrega un animal a un rodeo
 */
export async function addAnimalToHerd(herdId, animalId) {
    const { data, error } = await supabase
        .from('herd_animals')
        .insert([{ herd_id: herdId, animal_id: animalId, start_date: new Date() }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Quita un animal de un rodeo (Cierre histórico)
 */
export async function removeAnimalFromHerd(herdId, animalId) {
    const { error } = await supabase
        .from('herd_animals')
        .update({ end_date: new Date() })
        .eq('herd_id', herdId)
        .eq('animal_id', animalId)
        .is('end_date', null);

    if (error) throw error;
}

/**
 * Obtiene eventos pendientes de aprobación para un predio
 */
export async function getPendingEvents(premiseId) {
    const { data, error } = await supabase
        .from('herd_events')
        .select(`
            *,
            animal:animal_id(visual_tag, rfid_tag, species, current_category_id),
            herd:herd_id(name),
            category_from:category_from_id(name),
            category_to:category_to_id(name),
            lote:lote_id(name),
            to_lote:to_lote_id(name)
        `)
        .eq('premise_id', premiseId)
        .eq('status', 'PENDING')
        .order('event_date', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Actualiza el estado de un evento (APPROVED / REJECTED)
 * Si se aprueba, dispara la automatización DICOSE
 */
export async function updateEventStatus(eventId, status, userId) {
    // 1. Obtener los datos completos del evento antes de actualizar
    const { data: event, error: eventError } = await supabase
        .from('herd_events')
        .select('*, animal:animal_id(*)')
        .eq('id', eventId)
        .single();

    if (eventError) throw eventError;

    // 2. Actualizar estado del evento
    const { data: updatedEvent, error: updateError } = await supabase
        .from('herd_events')
        .update({
            status,
            approved_by: userId || 'Sistema',  // NOTA: userId debería ser UUID real (requiere Supabase Auth)
            approved_at: new Date()
        })
        .eq('id', eventId)
        .select()
        .single();

    if (updateError) throw updateError;

    // 3. Automaciones al aprobar:
    // - DICOSE: Trigger SQL sync_event_to_dicose() se ejecuta automáticamente ✅
    // - Sanidad: Trigger SQL update_animal_withdraw() se ejecuta automáticamente ✅
    // No necesitan llamadas manuales aquí

    return updatedEvent;
}

/**
 * Busca el evento complementario (espejo) para SALE ↔ PURCHASE
 * Retorna null si no existe, o el evento si lo encuentra
 */
export async function findMirrorSalePurchaseEvent(eventType, guideSeries, guideNumber) {
    // Solo buscar para SALE o PURCHASE
    if (!['SALE', 'PURCHASE'].includes(eventType)) {
        return null;
    }

    // Determinar tipo de evento complementario
    const complementaryEventType = eventType === 'SALE' ? 'PURCHASE' : 'SALE';

    try {
        const { data, error } = await supabase
            .from('herd_events')
            .select(`
                id,
                event_type,
                event_date,
                guide_series,
                guide_number,
                premise_id,
                species,
                qty_heads,
                status,
                herd:herd_id(name),
                animal:animal_id(visual_tag, rfid_tag)
            `)
            .eq('event_type', complementaryEventType)
            .eq('guide_series', guideSeries)
            .eq('guide_number', guideNumber)
            .eq('status', 'APPROVED')
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error searching mirror event:', error);
        return null;
    }
}

// DEPRECATED: automatizarRegistroDicose() fue eliminada en FASE P1.1
// Ahora reemplazada por trigger SQL sync_event_to_dicose() que se ejecuta automáticamente
// Esto hace la sincronización más robusta y a nivel de base de datos

/**
 * Obtiene el historial completo de eventos de un animal
 */
export async function getAnimalEvents(animalId) {
    const { data, error } = await supabase
        .from('herd_events')
        .select(`
            *,
            lote:lote_id(name),
            to_lote:to_lote_id(name),
            category_from:category_from_id(name),
            category_to:category_to_id(name)
        `)
        .eq('animal_id', animalId)
        .eq('status', 'APPROVED')
        .order('event_date', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Obtiene las planillas de contralor interno de un predio
 */
export async function getDicoseSheets(premiseId) {
    const { data, error } = await supabase
        .from('contralor_sheets')
        .select('*')
        .eq('premise_id', premiseId)
        .order('period_start', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Obtiene los renglones de una planilla específica
 */
export async function getDicoseEntries(sheetId) {
    const { data, error } = await supabase
        .from('contralor_entries')
        .select(`
            *,
            lines:contralor_entry_lines(
                qty_heads,
                direction,
                category:category_id(name, code)
            )
        `)
        .eq('contralor_sheet_id', sheetId)
        .order('entry_date', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Valida que el nombre de un rodeo sea único dentro de un predio
 * @param {string} premiseId - ID del predio
 * @param {string} herdName - Nombre del rodeo a validar
 * @param {string} excludeHerdId - ID del rodeo a excluir (para ediciones)
 * @returns {Promise<boolean>} - true si el nombre es único, false si ya existe
 */
export async function validateHerdNameUnique(premiseId, herdName, excludeHerdId = null) {
    let query = supabase
        .from('herds')
        .select('id, name')
        .eq('premise_id', premiseId)
        .ilike('name', herdName);

    if (excludeHerdId) {
        query = query.neq('id', excludeHerdId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.length === 0; // True si no hay duplicados
}

/**
 * Mapea automáticamente la inscripción DICOSE basada en el tipo de guía
 * @param {object} event - Evento DICOSE
 * @returns {string} - Código DICOSE (A, B, C, D, E) o null
 */
export async function mapDicoseRegistration(event) {
    // Eventos que requieren mapeo automático
    const requiresMapping = [
        'PURCHASE', 'SALE',
        'MOVE_EXTERNAL_OUT', 'MOVE_EXTERNAL_IN',
        'CONSIGNACION_OUT', 'CONSIGNACION_IN',
        'REMATE_OUT', 'REMATE_IN'
    ];

    if (!requiresMapping.includes(event.event_type)) {
        return null;
    }

    // Si hay guía, intenta buscarla en dicose_guides
    if (event.guide_series && event.guide_number) {
        const guideFull = `${event.guide_series}-${event.guide_number}`;

        try {
            const { data: guide } = await supabase
                .from('dicose_guides')
                .select('dicose_type')
                .eq('guide_full', guideFull)
                .maybeSingle();

            if (guide) {
                return guide.dicose_type; // A, B, C, D, o E
            }
        } catch (err) {
            console.warn('Error al buscar guía DICOSE:', err);
        }
    }

    // Fallback: mapeo simple basado en tipo de evento
    const fallbackMap = {
        'PURCHASE': 'A',           // Compra = Tipo A (propios)
        'SALE': 'B',               // Venta = Tipo B (propios)
        'MOVE_EXTERNAL_OUT': 'C',  // Movimiento externo salida = Tipo C (propios fuera)
        'MOVE_EXTERNAL_IN': 'C',   // Movimiento externo entrada = Tipo C
        'CONSIGNACION_OUT': 'D',   // Consignación = Tipo D (ajenos)
        'CONSIGNACION_IN': 'D',
        'REMATE_OUT': 'A',         // Remate = Tipo A
        'REMATE_IN': 'A'
    };

    return fallbackMap[event.event_type] || null;
}

/**
 * Cierra una planilla DICOSE y persiste los saldos finales
 * @param {string} sheetId - ID de la planilla a cerrar
 * @param {string} userId - ID del usuario que cierra la planilla
 * @returns {Promise<object>} - Objeto con { success: true, saldos: array }
 */
export async function closeContralSheet(sheetId, userId) {
    try {
        // 1. Obtener planilla con todos sus renglones y detalles
        const { data: sheet, error: sheetError } = await supabase
            .from('contralor_sheets')
            .select(`
                *,
                entries:contralor_entries(
                    *,
                    lines:contralor_entry_lines(*)
                )
            `)
            .eq('id', sheetId)
            .single();

        if (sheetError) throw sheetError;

        // 2. Verificar si ya está cerrada
        if (sheet.status === 'CLOSED') {
            throw new Error('La planilla ya está cerrada. No se puede cerrar nuevamente.');
        }

        // 3. Calcular saldos por categoría
        const saldos = {};

        sheet.entries.forEach(entry => {
            // Ignorar renglones anulados
            if (entry.is_voided) return;

            entry.lines.forEach(line => {
                if (!saldos[line.category_id]) {
                    saldos[line.category_id] = {
                        category_id: line.category_id,
                        initial_qty_heads: 0,
                        total_in_qty_heads: 0,
                        total_out_qty_heads: 0
                    };
                }

                // Sumar entradas/salidas
                if (line.direction === 'IN') {
                    saldos[line.category_id].total_in_qty_heads += line.qty_heads;
                } else if (line.direction === 'OUT') {
                    saldos[line.category_id].total_out_qty_heads += line.qty_heads;
                }
            });
        });

        // 4. Calcular saldos finales
        const balancesToInsert = Object.values(saldos).map(s => ({
            contralor_sheet_id: sheetId,
            category_id: s.category_id,
            initial_qty_heads: s.initial_qty_heads,
            total_in_qty_heads: s.total_in_qty_heads,
            total_out_qty_heads: s.total_out_qty_heads,
            final_qty_heads: s.initial_qty_heads + s.total_in_qty_heads - s.total_out_qty_heads,
            calculated_by: userId || 'Sistema'  // NOTA: userId debería ser UUID real
        }));

        // 5. Insertar saldos en tabla contralor_balances
        if (balancesToInsert.length > 0) {
            const { error: balanceError } = await supabase
                .from('contralor_balances')
                .insert(balancesToInsert);

            if (balanceError) throw balanceError;
        }

        // 6. Actualizar estado de planilla a CLOSED
        const { error: closeError } = await supabase
            .from('contralor_sheets')
            .update({ status: 'CLOSED' })
            .eq('id', sheetId);

        if (closeError) throw closeError;

        console.log(`[DICOSE] Planilla ${sheet.sheet_type} cerrada. ${balancesToInsert.length} saldos persistidos.`);

        return { success: true, saldos: balancesToInsert };
    } catch (error) {
        console.error('Error al cerrar planilla DICOSE:', error);
        throw error;
    }
}

/**
 * FASE P1.4: Crea entrada correctiva en DICOSE
 * Anula entrada original y crea nueva vinculada para auditoría
 * @param {string} originalEntryId - ID de entrada a corregir
 * @param {object} correctionData - Datos corregidos (qty_heads, category_id, etc.)
 * @param {string} correctionReason - Motivo de la corrección
 * @param {string} userId - Usuario que corrige
 * @returns {Promise<object>} Nueva entrada correctiva
 */
export async function createCorrectiveEntry(originalEntryId, correctionData, correctionReason, userId) {
    try {
        // PASO 1: Obtener entrada original con sus líneas
        const { data: originalEntry, error: fetchError } = await supabase
            .from('contralor_entries')
            .select(`
                *,
                contralor_entry_lines(*)
            `)
            .eq('id', originalEntryId)
            .single();

        if (fetchError) throw fetchError;

        if (originalEntry.is_voided) {
            throw new Error('La entrada ya está anulada. No se puede corregir una entrada ya void.');
        }

        // PASO 2: Anular entrada original
        const { error: voidError } = await supabase
            .from('contralor_entries')
            .update({
                is_voided: true,
                void_reason: `Corregida - ${correctionReason}`,
                voided_at: new Date().toISOString(),
                voided_by: userId || null  // NOTA: userId debe ser UUID del usuario autenticado
            })
            .eq('id', originalEntryId);

        if (voidError) throw voidError;

        // PASO 3: Crear entrada correctiva vinculada
        // ⚠️ NOTA: guide_full NO se inserta (es GENERATED COLUMN - se calcula automáticamente)
        const { data: correctiveEntry, error: insertError } = await supabase
            .from('contralor_entries')
            .insert([{
                contralor_sheet_id: originalEntry.contralor_sheet_id,
                event_id: originalEntry.event_id,
                entry_date: correctionData.entry_date || originalEntry.entry_date,
                operation_type: correctionData.operation_type || originalEntry.operation_type,
                guide_id: correctionData.guide_id || originalEntry.guide_id,
                registration_number_dicose: originalEntry.registration_number_dicose,
                origin_dicose_number: correctionData.origin_dicose_number || originalEntry.origin_dicose_number,
                destination_dicose_number: correctionData.destination_dicose_number || originalEntry.destination_dicose_number,
                corrected_entry_id: originalEntryId, // Vinculación: esta es corrección de original
                correction_reason: correctionReason,
                is_voided: false
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        // PASO 4: Crear líneas correctivas
        // ✅ MEJORADO: Maneja correctamente entradas con múltiples líneas (ej: CATEGORY_CHANGE)
        if (correctionData.lines && correctionData.lines.length > 0) {
            // Si se proveen líneas explícitamente (desde modal), usar esas
            const correctiveLines = correctionData.lines.map(line => ({
                contralor_entry_id: correctiveEntry.id,
                category_id: line.category_id,
                direction: line.direction,
                qty_heads: line.qty_heads
            }));

            const { error: linesError } = await supabase
                .from('contralor_entry_lines')
                .insert(correctiveLines);

            if (linesError) throw linesError;
        } else {
            // Si no se proveen líneas, copiar las líneas originales tal cual
            // (IMPORTANTE: No aplicar correctionData a cada línea, que sobrescribiría todos los values)
            const correctiveLines = originalEntry.contralor_entry_lines.map(line => ({
                contralor_entry_id: correctiveEntry.id,
                category_id: line.category_id,
                direction: line.direction,
                qty_heads: line.qty_heads
            }));

            const { error: linesError } = await supabase
                .from('contralor_entry_lines')
                .insert(correctiveLines);

            if (linesError) throw linesError;
        }

        console.log(`[DICOSE] Entrada correctiva creada. Original ${originalEntryId} anulada, nueva: ${correctiveEntry.id}`);

        return correctiveEntry;
    } catch (error) {
        console.error('Error en createCorrectiveEntry:', error);
        throw error;
    }
}

/**
 * FASE P1.6: Valida guía DICOSE antes de aprobar evento
 * Verifica existencia, status, duplicados y compatibilidad
 * @param {string} guideSeries - Serie de guía (A, B, C, D)
 * @param {string} guideNumber - Número de guía
 * @param {string} eventType - Tipo de evento (PURCHASE, SALE, etc.)
 * @param {string} species - Especie del animal (BOVINO/OVINO)
 * @param {string} premiseId - ID del predio
 * @returns {Promise<object>} { valid: boolean, error?: string, guide?: object, autoRegister?: boolean }
 */
export async function validateGuide(guideSeries, guideNumber, eventType, species, premiseId) {
    try {
        const guideFull = `${guideSeries}-${guideNumber}`;

        // VALIDACIÓN 1: Buscar guía en dicose_guides
        const { data: guide, error: fetchError } = await supabase
            .from('dicose_guides')
            .select('*')
            .eq('guide_series', guideSeries)
            .eq('guide_number', guideNumber)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // Si no existe, es válido (se auto-registrará en trigger)
        if (!guide) {
            return {
                valid: true,
                error: null,
                guide: null,
                autoRegister: true
            };
        }

        // VALIDACIÓN 2: Verificar status
        if (guide.status !== 'VALID') {
            return {
                valid: false,
                error: `Guía ${guideFull} tiene status "${guide.status}". Solo se aceptan guías VALID.`,
                guide
            };
        }

        // VALIDACIÓN 3: Verificar especie
        if (guide.species && guide.species !== species) {
            return {
                valid: false,
                error: `Guía ${guideFull} es para especie "${guide.species}", pero el evento es de "${species}".`,
                guide
            };
        }

        // VALIDACIÓN 4: Verificar duplicados (guía ya usada en otro evento)
        const { data: existingEvents, error: eventsError } = await supabase
            .from('herd_events')
            .select('id, event_type, event_date, status')
            .eq('guide_series', guideSeries)
            .eq('guide_number', guideNumber)
            .eq('premise_id', premiseId)
            .neq('status', 'REJECTED');

        if (eventsError) throw eventsError;

        if (existingEvents && existingEvents.length > 0) {
            // Permitir reutilización solo en eventos vinculados
            const allowedDuplicates = [
                ['PURCHASE', 'MOVE_EXTERNAL_IN'],
                ['SALE', 'MOVE_EXTERNAL_OUT'],
                ['CONSIGNACION_IN', 'MOVE_EXTERNAL_IN'],
                ['CONSIGNACION_OUT', 'MOVE_EXTERNAL_OUT']
            ];

            const isDuplicateAllowed = allowedDuplicates.some(pair =>
                pair.includes(eventType) &&
                existingEvents.some(e => pair.includes(e.event_type))
            );

            if (!isDuplicateAllowed) {
                return {
                    valid: false,
                    error: `Guía ${guideFull} ya fue usada en evento ${existingEvents[0].event_type} ` +
                           `del ${new Date(existingEvents[0].event_date).toLocaleDateString('es-UY')}. ` +
                           `No se puede reutilizar.`,
                    guide,
                    existingEvents
                };
            }
        }

        // VALIDACIÓN 5: Verificar DICOSE number del predio destino (para ingresos)
        if (['PURCHASE', 'MOVE_EXTERNAL_IN', 'CONSIGNACION_IN', 'REMATE_IN'].includes(eventType)) {
            if (guide.destination_dicose_number) {
                // Verificar que el predio actual tenga ese DICOSE number
                const { data: sheet } = await supabase
                    .from('contralor_sheets')
                    .select('dicose_number')
                    .eq('premise_id', premiseId)
                    .eq('status', 'OPEN')
                    .maybeSingle();

                if (sheet && guide.destination_dicose_number !== sheet.dicose_number) {
                    return {
                        valid: false,
                        error: `Guía ${guideFull} está destinada a DICOSE ${guide.destination_dicose_number}, ` +
                               `pero el predio actual tiene DICOSE ${sheet.dicose_number}.`,
                        guide
                    };
                }
            }
        }

        // ✅ Todas las validaciones pasaron
        return {
            valid: true,
            error: null,
            guide
        };
    } catch (error) {
        console.error('Error en validateGuide:', error);
        return {
            valid: false,
            error: 'Error al validar guía: ' + error.message,
            guide: null
        };
    }
}

/**
 * Calcula KPIs financieros completos del predio ganadero
 * Incluye: costo/kg, margen/ha, kg/ha, ROI
 */
export async function getFinancialKPIs(premiseId) {
    try {
        // 1. Obtener total de kg de carne en pie (peso vivo acumulado)
        // Primero obtener animales activos
        const { data: animals, error: animalsError } = await supabase
            .from('animals')
            .select('id, initial_weight')
            .eq('premise_id', premiseId)
            .eq('status', 'ACTIVE');

        if (animalsError) throw animalsError;

        // Obtener últimos pesajes desde herd_events para estos animales
        const animalIds = (animals || []).map(a => a.id);
        let latestWeights = {};

        if (animalIds.length > 0) {
            const { data: weightEvents } = await supabase
                .from('herd_events')
                .select('animal_id, qty_kg')
                .in('animal_id', animalIds)
                .eq('event_type', 'WEIGHING')
                .order('event_date', { ascending: false })
                .limit(animalIds.length);

            // Crear mapa del primer (más reciente) peso por animal
            if (weightEvents) {
                const seen = new Set();
                weightEvents.forEach(w => {
                    if (!seen.has(w.animal_id)) {
                        latestWeights[w.animal_id] = w.qty_kg;
                        seen.add(w.animal_id);
                    }
                });
            }
        }

        // Calcular total de kg usando peso más reciente o peso inicial como fallback
        const totalKgCarne = (animals || [])
            .reduce((sum, a) => {
                const weight = latestWeights[a.id] || a.initial_weight || 0;
                return sum + weight;
            }, 0);

        // 2. Obtener total de costos de eventos ganaderos (work_costs con status POSTED o CONVERTED)
        // Primero obtener los IDs de eventos para este predio
        const { data: premiseEvents, error: eventsError } = await supabase
            .from('herd_events')
            .select('id')
            .eq('premise_id', premiseId);

        if (eventsError) throw eventsError;

        const eventIds = (premiseEvents || []).map(e => e.id);
        let totalCostos = 0;

        // Si hay eventos, obtener los costos asociados
        if (eventIds.length > 0) {
            const { data: costEvents, error: costError } = await supabase
                .from('work_costs')
                .select('cost_amount')
                .in('event_id', eventIds);

            if (costError) throw costError;

            totalCostos = (costEvents || [])
                .reduce((sum, c) => sum + (c.cost_amount || 0), 0);
        }

        // 3. Obtener total de ingresos por ventas de ganado
        const { data: incomeData, error: incomeError } = await supabase
            .from('income')
            .select('total_amount')
            .eq('premise_id', premiseId)
            .match({ category: 'Venta de Ganado' });

        if (incomeError) throw incomeError;

        const totalIngresos = (incomeData || [])
            .reduce((sum, i) => sum + (i.total_amount || 0), 0);

        // 4. Obtener área total del predio
        const { data: premiseData, error: premiseError } = await supabase
            .from('premises')
            .select('total_area')
            .eq('id', premiseId)
            .single();

        if (premiseError && premiseError.code !== 'PGRST116') throw premiseError;

        const areaHa = premiseData?.total_area || 1;

        // 5. Calcular KPIs
        const costoPorKg = totalKgCarne > 0 ? totalCostos / totalKgCarne : 0;
        const margenTotal = totalIngresos - totalCostos;
        const margenPorHa = areaHa > 0 ? margenTotal / areaHa : 0;
        const kgPorHa = areaHa > 0 ? totalKgCarne / areaHa : 0;
        const roi = totalCostos > 0 ? ((margenTotal / totalCostos) * 100) : 0;

        return {
            totalKgCarne: parseFloat(totalKgCarne.toFixed(2)),
            totalCostos: parseFloat(totalCostos.toFixed(2)),
            totalIngresos: parseFloat(totalIngresos.toFixed(2)),
            costoPorKg: parseFloat(costoPorKg.toFixed(2)),
            margenTotal: parseFloat(margenTotal.toFixed(2)),
            margenPorHa: parseFloat(margenPorHa.toFixed(2)),
            kgPorHa: parseFloat(kgPorHa.toFixed(2)),
            areaTotal: parseFloat(areaHa.toFixed(2)),
            roi: parseFloat(roi.toFixed(2))
        };
    } catch (error) {
        console.error('Error calculating financial KPIs:', error);
        return {
            totalKgCarne: 0,
            totalCostos: 0,
            totalIngresos: 0,
            costoPorKg: 0,
            margenTotal: 0,
            margenPorHa: 0,
            kgPorHa: 0,
            areaTotal: 0,
            roi: 0,
            error: error.message
        };
    }
}

/**
 * Detecta eventos de mortandad sin registrar dentro del plazo DICOSE (30 días)
 * Retorna alertas de incumplimiento para animales que murieron hace más de 30 días
 */
export async function checkDeadlineExceededEvents(premiseId) {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

        // 1. Obtener todos los animales del predio
        const { data: animals, error: animalsError } = await supabase
            .from('animals')
            .select('id, rfid_tag, visual_tag, current_category_id, herd_id, created_at')
            .eq('premise_id', premiseId)
            .eq('status', 'ACTIVE');

        if (animalsError) throw animalsError;

        // 2. Para cada animal, verificar si tiene evento DEATH registrado
        const alerts = [];

        for (const animal of animals || []) {
            const { data: deathEvent, error: deathError } = await supabase
                .from('herd_events')
                .select('id, event_date, status')
                .eq('animal_id', animal.id)
                .eq('event_type', 'DEATH')
                .eq('status', 'APPROVED')
                .single();

            if (deathError && deathError.code !== 'PGRST116') {
                console.warn('Error checking death event:', deathError);
                continue;
            }

            // Si NO hay evento de death registrado y el animal fue creado hace más de 30 días
            if (!deathEvent) {
                const animalCreateDate = new Date(animal.created_at);

                // Solo alertar si el animal existe desde hace más de 30 días
                if (animalCreateDate < thirtyDaysAgo) {
                    const daysExceeded = Math.floor(
                        (today.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000)
                    );

                    alerts.push({
                        type: 'MORTANDAD_PLAZO',
                        severity: 'CRITICAL',
                        animal_id: animal.id,
                        animal_identifier: animal.visual_tag || animal.rfid_tag,
                        message: `Mortandad sin registrar hace ${daysExceeded} días (límite DICOSE: 30 días)`,
                        days_exceeded: daysExceeded,
                        created_date: animalCreateDate
                    });
                }
            }
        }

        return alerts;
    } catch (error) {
        console.error('Error checking deadline exceeded events:', error);
        return [];
    }
}

/**
 * Registra una violación de compliance para mortandad sin registrar
 */
export async function recordComplianceViolation(data) {
    try {
        const { data: violation, error } = await supabase
            .from('compliance_violations')
            .insert([{
                firm_id: data.firm_id,
                premise_id: data.premise_id,
                violation_type: data.violation_type || 'MORTANDAD_PLAZO',
                animal_id: data.animal_id,
                event_id: data.event_id || null,
                days_exceeded: data.days_exceeded || 0,
                severity: data.severity || 'CRITICAL',
                reported_at: new Date().toISOString(),
                resolved_at: null,
                created_by: data.created_by,
                notes: data.notes || null
            }])
            .select();

        if (error) throw error;
        return violation;
    } catch (error) {
        console.error('Error recording compliance violation:', error);
        throw error;
    }
}

/**
 * Obtiene todas las violaciones de compliance pendientes de un predio
 */
export async function getPendingComplianceViolations(premiseId) {
    try {
        const { data, error } = await supabase
            .from('compliance_violations')
            .select('*')
            .eq('premise_id', premiseId)
            .is('resolved_at', null)
            .order('reported_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting compliance violations:', error);
        return [];
    }
}

/**
 * Marca una violación de compliance como resuelta
 */
export async function resolveComplianceViolation(violationId, eventId = null) {
    try {
        const { data, error } = await supabase
            .from('compliance_violations')
            .update({
                resolved_at: new Date().toISOString(),
                event_id: eventId
            })
            .eq('id', violationId)
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error resolving compliance violation:', error);
        throw error;
    }
}