/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Servicios para trabajos ganaderos (livestock_works)
 *
 * Funcionalidad:
 * - CRUD de trabajos ganaderos
 * - Sistema de estados (DRAFT, PENDING_APPROVAL, APPROVED, CLOSED, CANCELLED)
 * - Gestión de modo grupal vs individual
 * - Validación de stock (similar a trabajos agrícolas)
 * - Descuento automático de stock al aprobar
 */

import { supabase } from '../lib/supabase';
import { registrarMovimiento, validarDisponibilidad } from './inputMovements';
import { crearRegistro } from './registros';

// =============================================
// OBTENER TRABAJOS GANADEROS
// =============================================

/**
 * Obtiene trabajos ganaderos con filtros
 */
export async function obtenerTrabajosGanaderos(filtros = {}) {
  try {
    let query = supabase
      .from('livestock_works')
      .select(`
        *,
        firms(id, name),
        premises(id, name),
        herds(id, name),
        cost_centers(id, code, name)
      `);

    // Aplicar filtros
    if (filtros.firmId) {
      query = query.eq('firm_id', filtros.firmId);
    }
    if (filtros.premiseId) {
      query = query.eq('premise_id', filtros.premiseId);
    }
    if (filtros.herdId) {
      query = query.eq('herd_id', filtros.herdId);
    }
    if (filtros.status) {
      query = query.eq('status', filtros.status);
    }
    if (filtros.workMode) {
      query = query.eq('work_mode', filtros.workMode);
    }

    query = query.order('date', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('Error en obtenerTrabajosGanaderos:', error);
    throw error;
  }
}

/**
 * Obtiene detalle completo de un trabajo ganadero
 */
export async function obtenerDetalleTrabajoGanadero(trabajoId) {
  try {
    const { data, error } = await supabase
      .from('livestock_works')
      .select(`
        *,
        firms(id, name),
        premises(id, name),
        herds(id, name),
        cost_centers(id, code, name)
      `)
      .eq('id', trabajoId)
      .single();

    if (error) throw error;

    // Si es modo individual, cargar detalles de animales
    let animalDetails = [];
    if (data.work_mode === 'INDIVIDUAL') {
      const { data: details, error: detailsError } = await supabase
        .from('work_animal_details')
        .select(`
          *,
          animals(id, caravana, rfid, category, weight)
        `)
        .eq('livestock_work_id', trabajoId);

      if (!detailsError) {
        animalDetails = details || [];
      }
    }

    return {
      ...data,
      animal_details: animalDetails
    };
  } catch (error) {
    console.error('Error en obtenerDetalleTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// CREAR TRABAJO GANADERO
// =============================================

/**
 * Crea un nuevo trabajo ganadero (siempre en DRAFT)
 */
export async function crearTrabajoGanadero(trabajoData) {
  try {
    // Validar datos obligatorios
    if (!trabajoData.firm_id || !trabajoData.premise_id || !trabajoData.herd_id || !trabajoData.activity_id) {
      throw new Error('Firma, Predio, Rodeo y Tipo de Evento son obligatorios');
    }

    // Crear trabajo en DRAFT
    const { data: trabajo, error: trabajoError } = await supabase
      .from('livestock_works')
      .insert([
        {
          firm_id: trabajoData.firm_id,
          premise_id: trabajoData.premise_id,
          herd_id: trabajoData.herd_id,
          activity_id: trabajoData.activity_id,
          event_type: trabajoData.event_type, // Mantener por retrocompatibilidad
          date: trabajoData.date || new Date().toISOString().split('T')[0],
          work_mode: trabajoData.work_mode || 'GROUP',
          quantity: trabajoData.quantity || 0,
          detail: trabajoData.detail || null,
          cost_center_id: trabajoData.cost_center_id || null,
          campaign_id: trabajoData.campaign_id || null,
          responsible_person: trabajoData.responsible_person || null,
          other_costs: parseFloat(trabajoData.other_costs) || 0,
          status: 'DRAFT'
        }
      ])
      .select()
      .single();

    if (trabajoError) throw trabajoError;

    // Insertar insumos si hay
    if (trabajoData.insumos && trabajoData.insumos.length > 0) {
      const insumosData = trabajoData.insumos.map((ins) => ({
        livestock_work_id: trabajo.id,
        input_id: ins.input_id,
        quantity_applied: parseFloat(ins.quantity_applied) || 0,
        unit: ins.unit || 'kg',
        cost_per_unit: parseFloat(ins.cost_per_unit) || 0
      }));

      const { error: insumosError } = await supabase
        .from('work_inputs')
        .insert(insumosData);

      if (insumosError) throw insumosError;
    }

    // Insertar maquinaria si hay
    if (trabajoData.maquinaria && trabajoData.maquinaria.length > 0) {
      const maquinariaData = trabajoData.maquinaria.map((maq) => ({
        livestock_work_id: trabajo.id,
        machinery_id: maq.machinery_id,
        hours_used: parseFloat(maq.hours_used) || 0,
        cost_per_hour: parseFloat(maq.cost_per_hour) || 0
      }));

      const { error: maqError } = await supabase
        .from('work_machinery')
        .insert(maquinariaData);

      if (maqError) throw maqError;
    }

    // Insertar mano de obra si hay
    if (trabajoData.labor && trabajoData.labor.length > 0) {
      const laborData = trabajoData.labor.map((lab) => ({
        livestock_work_id: trabajo.id,
        worker_name: lab.worker_name,
        hours_worked: parseFloat(lab.hours_worked) || 0,
        cost_per_hour: parseFloat(lab.cost_per_hour) || 0
      }));

      const { error: laborError } = await supabase
        .from('work_labor')
        .insert(laborData);

      if (laborError) throw laborError;
    }

    // Insertar detalles de animales individuales si modo INDIVIDUAL
    if (trabajoData.work_mode === 'INDIVIDUAL' && trabajoData.animal_details) {
      const detailsData = Object.entries(trabajoData.animal_details).map(([animalId, detail]) => ({
        livestock_work_id: trabajo.id,
        animal_id: animalId,
        applied: detail.applied || false,
        dose_applied: detail.dose_applied || null,
        weight_at_work: detail.weight_at_work || null,
        notes: detail.notes || null
      }));

      const { error: detailsError } = await supabase
        .from('work_animal_details')
        .insert(detailsData);

      if (detailsError) throw detailsError;
    }

    // Auditoría
    await crearRegistro({
      firmId: trabajoData.firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: `Trabajo ganadero creado: ${trabajoData.event_type} (BORRADOR)`,
      moduloOrigen: 'work_manager',
      usuario: trabajoData.currentUser || 'sistema',
      referencia: trabajo.id,
      metadata: { event_type: trabajoData.event_type, work_mode: trabajoData.work_mode }
    });

    return trabajo;
  } catch (error) {
    console.error('Error en crearTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// ACTUALIZAR TRABAJO GANADERO
// =============================================

/**
 * Actualiza un trabajo ganadero existente
 * Solo se pueden actualizar trabajos en estado DRAFT
 * CRÍTICO: Maneja modo INDIVIDUAL con detalles de animales
 */
export async function actualizarTrabajoGanadero(trabajoId, trabajoData) {
  try {
    // 1. Validar que el trabajo existe y está en DRAFT
    const { data: trabajo, error: fetchError } = await supabase
      .from('livestock_works')
      .select('status, firm_id, premise_id, herd_id, work_mode')
      .eq('id', trabajoId)
      .single();

    if (fetchError) throw fetchError;
    if (!trabajo) throw new Error('Trabajo ganadero no encontrado');

    if (trabajo.status !== 'DRAFT') {
      throw new Error('Solo se pueden editar trabajos en estado BORRADOR');
    }

    // 2. UPDATE trabajo base
    const { data: updatedWork, error: updateError } = await supabase
      .from('livestock_works')
      .update({
        herd_id: trabajoData.herd_id,
        date: trabajoData.date,
        activity_id: trabajoData.activity_id,
        event_type: trabajoData.event_type, // Mantener por retrocompatibilidad
        work_mode: trabajoData.work_mode || 'GROUP',
        quantity: trabajoData.quantity || 0,
        cost_center_id: trabajoData.cost_center_id || null,
        campaign_id: trabajoData.campaign_id || null,
        responsible_person: trabajoData.responsible_person || null,
        detail: trabajoData.detail || null,
        other_costs: parseFloat(trabajoData.other_costs) || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', trabajoId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Actualizar insumos (DELETE + INSERT)
    const { error: deleteInsumosError } = await supabase
      .from('work_inputs')
      .delete()
      .eq('livestock_work_id', trabajoId);

    if (deleteInsumosError) throw deleteInsumosError;

    if (trabajoData.insumos && trabajoData.insumos.length > 0) {
      const insumosData = trabajoData.insumos
        .filter((i) => i.input_id)
        .map((i) => ({
          livestock_work_id: trabajoId,
          input_id: i.input_id,
          quantity_applied: parseFloat(i.quantity_applied) || 0,
          unit: i.unit || 'kg',
          cost_per_unit: parseFloat(i.cost_per_unit) || 0
        }));

      if (insumosData.length > 0) {
        const { error: insertInsumosError } = await supabase
          .from('work_inputs')
          .insert(insumosData);

        if (insertInsumosError) throw insertInsumosError;
      }
    }

    // 4. Actualizar maquinaria (DELETE + INSERT)
    const { error: deleteMaquinariaError } = await supabase
      .from('work_machinery')
      .delete()
      .eq('livestock_work_id', trabajoId);

    if (deleteMaquinariaError) throw deleteMaquinariaError;

    if (trabajoData.maquinaria && trabajoData.maquinaria.length > 0) {
      const maquinariaData = trabajoData.maquinaria
        .filter((m) => m.machinery_id)
        .map((m) => ({
          livestock_work_id: trabajoId,
          machinery_id: m.machinery_id,
          hours_used: parseFloat(m.hours_used) || 0,
          cost_per_hour: parseFloat(m.cost_per_hour) || 0
        }));

      if (maquinariaData.length > 0) {
        const { error: insertMaquinariaError } = await supabase
          .from('work_machinery')
          .insert(maquinariaData);

        if (insertMaquinariaError) throw insertMaquinariaError;
      }
    }

    // 5. Actualizar labor (DELETE + INSERT)
    const { error: deleteLaborError } = await supabase
      .from('work_labor')
      .delete()
      .eq('livestock_work_id', trabajoId);

    if (deleteLaborError) throw deleteLaborError;

    if (trabajoData.labor && trabajoData.labor.length > 0) {
      const laborData = trabajoData.labor
        .filter((l) => l.worker_name)
        .map((l) => ({
          livestock_work_id: trabajoId,
          worker_name: l.worker_name,
          hours_worked: parseFloat(l.hours_worked) || 0,
          cost_per_hour: parseFloat(l.cost_per_hour) || 0
        }));

      if (laborData.length > 0) {
        const { error: insertLaborError } = await supabase
          .from('work_labor')
          .insert(laborData);

        if (insertLaborError) throw insertLaborError;
      }
    }

    // 6. Actualizar detalles de animales individuales (si modo INDIVIDUAL)
    if (trabajoData.work_mode === 'INDIVIDUAL') {
      const { error: deleteAnimalDetailsError } = await supabase
        .from('work_animal_details')
        .delete()
        .eq('livestock_work_id', trabajoId);

      if (deleteAnimalDetailsError) throw deleteAnimalDetailsError;

      if (trabajoData.selected_animals && trabajoData.selected_animals.length > 0) {
        const animalDetailsData = trabajoData.selected_animals.map((animalId) => ({
          livestock_work_id: trabajoId,
          animal_id: animalId,
          applied: trabajoData.animal_details?.[animalId]?.applied || false,
          dose_applied: parseFloat(trabajoData.animal_details?.[animalId]?.dose_applied) || null,
          weight_at_work: parseFloat(trabajoData.animal_details?.[animalId]?.weight_at_work) || null,
          notes: trabajoData.animal_details?.[animalId]?.notes || null
        }));

        const { error: insertAnimalDetailsError } = await supabase
          .from('work_animal_details')
          .insert(animalDetailsData);

        if (insertAnimalDetailsError) throw insertAnimalDetailsError;
      }
    }

    // 7. Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      tipo: 'trabajo_ganadero_actualizado',
      descripcion: `Trabajo ganadero actualizado: ${trabajoData.event_type}`,
      moduloOrigen: 'work_manager',
      usuario: trabajoData.currentUser || 'sistema',
      referencia: trabajoId,
      metadata: {
        accion: 'UPDATE',
        event_type: trabajoData.event_type,
        work_mode: trabajoData.work_mode,
        insumos_count: trabajoData.insumos?.length || 0,
        maquinaria_count: trabajoData.maquinaria?.length || 0,
        labor_count: trabajoData.labor?.length || 0
      }
    });

    return { success: true, trabajo: updatedWork };
  } catch (error) {
    console.error('Error en actualizarTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// ENVIAR A APROBACIÓN
// =============================================

/**
 * Envía trabajo a aprobación (DRAFT → PENDING_APPROVAL)
 */
export async function enviarTrabajoAprobacion(trabajoId, usuario) {
  try {
    const trabajo = await obtenerDetalleTrabajoGanadero(trabajoId);

    // Validar estado
    if (trabajo.status !== 'DRAFT') {
      throw new Error('Solo se pueden enviar trabajos en BORRADOR');
    }

    // Validar centro de costo
    if (!trabajo.cost_center_id) {
      throw new Error('Centro de costo es obligatorio para enviar a aprobación');
    }

    // Cambiar estado
    const { error } = await supabase
      .from('livestock_works')
      .update({
        status: 'PENDING_APPROVAL',
        submitted_at: new Date().toISOString(),
        submitted_by: usuario
      })
      .eq('id', trabajoId);

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: `Trabajo ganadero enviado a aprobación: ${trabajo.event_type}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId
    });

    return { success: true };
  } catch (error) {
    console.error('Error en enviarTrabajoAprobacion:', error);
    throw error;
  }
}

// =============================================
// APROBAR TRABAJO (DESCUENTA STOCK)
// =============================================

/**
 * Aprueba un trabajo ganadero (PENDING_APPROVAL → APPROVED)
 * DESCUENTA STOCK AUTOMÁTICAMENTE
 */
export async function aprobarTrabajoGanadero(trabajoId, usuario) {
  try {
    const trabajo = await obtenerDetalleTrabajoGanadero(trabajoId);

    // Validar estado
    if (trabajo.status !== 'PENDING_APPROVAL') {
      throw new Error('Solo se pueden aprobar trabajos PENDIENTES');
    }

    // Validar centro de costo
    if (!trabajo.cost_center_id) {
      throw new Error('Centro de costo obligatorio');
    }

    // Obtener insumos del trabajo
    const { data: insumos, error: insumosError } = await supabase
      .from('work_inputs')
      .select('*, inputs(id, name)')
      .eq('livestock_work_id', trabajoId);

    if (insumosError) throw insumosError;

    // Validar stock disponible para TODOS los insumos
    for (const insumo of insumos || []) {
      const disponibilidad = await validarDisponibilidad(
        insumo.input_id,
        insumo.quantity_applied
      );

      if (!disponibilidad.disponible) {
        throw new Error(
          `Stock insuficiente de ${insumo.inputs?.name || insumo.input_id}. ` +
          `Disponible: ${disponibilidad.actual}, Requerido: ${insumo.quantity_applied}`
        );
      }
    }

    // PASO 1: Cambiar estado a APPROVED
    const { error: updateError } = await supabase
      .from('livestock_works')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: usuario
      })
      .eq('id', trabajoId);

    if (updateError) throw updateError;

    // PASO 2: Descontar stock de cada insumo
    for (const insumo of insumos || []) {
      await registrarMovimiento({
        input_id: insumo.input_id,
        type: 'exit',
        quantity: insumo.quantity_applied,
        date: trabajo.date,
        description: `Consumo en trabajo ganadero: ${trabajo.event_type}`,
        premise_id: trabajo.premise_id,
        unit_cost: insumo.cost_per_unit,
        firm_id: trabajo.firm_id
      });
    }

    // PASO 3: Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: `Trabajo ganadero APROBADO: ${trabajo.event_type}. Stock descontado.`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: { work_mode: trabajo.work_mode }
    });

    return { success: true, trabajo };
  } catch (error) {
    console.error('Error en aprobarTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// RECHAZAR TRABAJO
// =============================================

/**
 * Rechaza un trabajo (PENDING_APPROVAL → DRAFT)
 */
export async function rechazarTrabajoGanadero(trabajoId, usuario, motivo) {
  try {
    const { error } = await supabase
      .from('livestock_works')
      .update({
        status: 'DRAFT',
        cancellation_reason: motivo
      })
      .eq('id', trabajoId);

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: (await obtenerDetalleTrabajoGanadero(trabajoId)).firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: `Trabajo ganadero rechazado: ${motivo}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId
    });

    return { success: true };
  } catch (error) {
    console.error('Error en rechazarTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// CERRAR TRABAJO
// =============================================

/**
 * Cierra un trabajo (APPROVED → CLOSED - inmutable)
 */
export async function cerrarTrabajoGanadero(trabajoId, usuario) {
  try {
    const { error } = await supabase
      .from('livestock_works')
      .update({
        status: 'CLOSED'
      })
      .eq('id', trabajoId);

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: (await obtenerDetalleTrabajoGanadero(trabajoId)).firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: 'Trabajo ganadero cerrado (inmutable)',
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId
    });

    return { success: true };
  } catch (error) {
    console.error('Error en cerrarTrabajoGanadero:', error);
    throw error;
  }
}

// =============================================
// ANULAR TRABAJO
// =============================================

/**
 * Anula un trabajo (CUALQUIER ESTADO → CANCELLED)
 * Si estaba APPROVED, revierte el stock
 */
export async function anularTrabajoGanadero(trabajoId, usuario, motivo) {
  try {
    const trabajo = await obtenerDetalleTrabajoGanadero(trabajoId);

    // Si está APPROVED o CLOSED, revertir stock
    if (trabajo.status === 'APPROVED' || trabajo.status === 'CLOSED') {
      const { data: insumos } = await supabase
        .from('work_inputs')
        .select('*')
        .eq('livestock_work_id', trabajoId);

      // Revertir cada insumo
      for (const insumo of insumos || []) {
        await registrarMovimiento({
          input_id: insumo.input_id,
          type: 'entry',
          quantity: insumo.quantity_applied,
          date: new Date().toISOString(),
          description: `REVERSIÓN por anulación. Motivo: ${motivo}`,
          premise_id: trabajo.premise_id,
          firm_id: trabajo.firm_id
        });
      }
    }

    // Cambiar estado a CANCELLED
    const { error } = await supabase
      .from('livestock_works')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancelled_by: usuario,
        cancellation_reason: motivo
      })
      .eq('id', trabajoId);

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      tipo: 'trabajo_ganadero',
      descripcion: `Trabajo ganadero ANULADO: ${motivo}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: { stock_revertido: trabajo.status === 'APPROVED' || trabajo.status === 'CLOSED' }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en anularTrabajoGanadero:', error);
    throw error;
  }
}
