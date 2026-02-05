/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Servicios CRUD para trabajos agrícolas con sistema de estados
 * Integra con insumos, maquinaria, costos y aprobaciones
 *
 * CRÍTICO: El descuento de stock SOLO ocurre en estado APROBADO
 */

import { supabase } from '../lib/supabase';
import { registrarMovimiento, validarDisponibilidad } from './inputMovements';
import { crearRegistro } from './registros';

/**
 * Obtiene trabajos agrícolas con filtros y joins
 * @param {Object} filtros - { firmId, premiseId, lotId, status, desde, hasta }
 * @returns {Promise<Object>} { data: trabajos[], count: number }
 */
export async function obtenerTrabajosAgricolas(filtros = {}) {
  try {
    let query = supabase
      .from('agricultural_works')
      .select(
        `
        *,
        firms(name),
        premises(name),
        lots(name, area_hectares),
        cost_centers(code, name),
        campaigns(name)
      `,
        { count: 'exact' }
      );

    if (filtros.firmId) query = query.eq('firm_id', filtros.firmId);
    if (filtros.premiseId) query = query.eq('premise_id', filtros.premiseId);
    if (filtros.lotId) query = query.eq('lot_id', filtros.lotId);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.desde) query = query.gte('date', filtros.desde);
    if (filtros.hasta) query = query.lte('date', filtros.hasta);

    const { data, count, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('Error en obtenerTrabajosAgricolas:', error);
    throw error;
  }
}

/**
 * Obtiene detalle completo de un trabajo agrícola
 * Incluye insumos, maquinaria y mano de obra
 */
export async function obtenerDetalleTrabajoAgricola(trabajoId) {
  try {
    // Trabajo base
    const { data: trabajo, error: errorTrabajo } = await supabase
      .from('agricultural_works')
      .select(
        `
        *,
        firms(name),
        premises(name),
        lots(name, area_hectares),
        cost_centers(code, name),
        campaigns(name)
      `
      )
      .eq('id', trabajoId)
      .single();

    if (errorTrabajo) throw errorTrabajo;

    // Insumos
    const { data: insumos } = await supabase
      .from('work_inputs')
      .select(
        `
        *,
        inputs(name, unit, category, current_stock, cost_per_unit)
      `
      )
      .eq('agricultural_work_id', trabajoId);

    // Maquinaria
    const { data: maquinaria } = await supabase
      .from('work_machinery')
      .select(
        `
        *,
        machinery(code, name, type, cost_per_hour)
      `
      )
      .eq('agricultural_work_id', trabajoId);

    // Mano de obra
    const { data: labor } = await supabase
      .from('work_labor')
      .select('*')
      .eq('agricultural_work_id', trabajoId);

    return {
      ...trabajo,
      insumos: insumos || [],
      maquinaria: maquinaria || [],
      labor: labor || []
    };
  } catch (error) {
    console.error('Error en obtenerDetalleTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Crea un trabajo agrícola en estado DRAFT
 * NO descuenta stock hasta aprobar
 * CRÍTICO: Siempre inicia en estado DRAFT
 */
export async function crearTrabajoAgricola(trabajoData) {
  try {
    // Validar campos obligatorios
    if (!trabajoData.firm_id || !trabajoData.premise_id || !trabajoData.lot_id) {
      throw new Error('Firma, Predio y Lote son obligatorios');
    }

    if (!trabajoData.date || !trabajoData.activity_id) {
      throw new Error('Fecha y Tipo de trabajo son obligatorios');
    }

    // Insertar trabajo base (siempre inicia en DRAFT)
    const { data: trabajo, error: errorTrabajo } = await supabase
      .from('agricultural_works')
      .insert([
        {
          firm_id: trabajoData.firm_id,
          premise_id: trabajoData.premise_id,
          lot_id: trabajoData.lot_id,
          date: trabajoData.date,
          activity_id: trabajoData.activity_id,
          work_type: trabajoData.work_type, // Mantener por retrocompatibilidad
          hectares: trabajoData.hectares || 0,
          fuel_used: trabajoData.fuel_used || 0,
          detail: trabajoData.detail || '',
          others: trabajoData.others || '',
          cost_center_id: trabajoData.cost_center_id || null,
          campaign_id: trabajoData.campaign_id || null,
          responsible_person: trabajoData.responsible_person || null,
          other_costs: trabajoData.other_costs || 0,
          metadata: trabajoData.metadata || null,
          status: 'DRAFT',
          submitted_by: trabajoData.currentUser || 'sistema',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (errorTrabajo) throw errorTrabajo;

    // Insertar insumos (si hay)
    if (trabajoData.insumos && trabajoData.insumos.length > 0) {
      const insumosData = trabajoData.insumos.map((ins) => ({
        agricultural_work_id: trabajo.id,
        input_id: ins.input_id,
        dose_projected: ins.dose_projected || null,
        dose_applied: ins.dose_applied || ins.dose_projected || 0,
        unit: ins.unit || 'kg',
        quantity_projected: ins.quantity_projected || null,
        quantity_applied: ins.quantity_applied || ins.quantity_projected || 0,
        cost_per_unit: ins.cost_per_unit || 0,
        notes: ins.notes || null
      }));

      const { error: errorInsumos } = await supabase
        .from('work_inputs')
        .insert(insumosData);

      if (errorInsumos) {
        console.error('Error insertando insumos:', errorInsumos);
        // No romper la operación si falla insertar insumos
      }
    }

    // Insertar maquinaria (si hay)
    if (trabajoData.maquinaria && trabajoData.maquinaria.length > 0) {
      const maquinariaData = trabajoData.maquinaria.map((maq) => ({
        agricultural_work_id: trabajo.id,
        machinery_id: maq.machinery_id,
        hours_used: maq.hours_used || 0,
        cost_per_hour: maq.cost_per_hour || 0,
        fuel_used: maq.fuel_used || null,
        notes: maq.notes || null
      }));

      const { error: errorMaquinaria } = await supabase
        .from('work_machinery')
        .insert(maquinariaData);

      if (errorMaquinaria) {
        console.error('Error insertando maquinaria:', errorMaquinaria);
      }
    }

    // Insertar mano de obra (si hay)
    if (trabajoData.labor && trabajoData.labor.length > 0) {
      const laborData = trabajoData.labor.map((lab) => ({
        agricultural_work_id: trabajo.id,
        worker_name: lab.worker_name,
        worker_role: lab.worker_role || null,
        hours_worked: lab.hours_worked || 0,
        cost_per_hour: lab.cost_per_hour || 0,
        notes: lab.notes || null
      }));

      const { error: errorLabor } = await supabase
        .from('work_labor')
        .insert(laborData);

      if (errorLabor) {
        console.error('Error insertando mano de obra:', errorLabor);
      }
    }

    // Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_creado',
      descripcion: `Trabajo agrícola creado: ${trabajo.work_type} en estado BORRADOR`,
      moduloOrigen: 'work_manager',
      usuario: trabajoData.currentUser || 'sistema',
      referencia: trabajo.id,
      metadata: {
        status: 'DRAFT',
        work_type: trabajo.work_type,
        hectares: trabajo.hectares
      }
    });

    return trabajo;
  } catch (error) {
    console.error('Error en crearTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Actualiza un trabajo agrícola existente
 * Solo se pueden actualizar trabajos en estado DRAFT
 * CRÍTICO: Patrón DELETE + INSERT para insumos, maquinaria y labor
 */
export async function actualizarTrabajoAgricola(trabajoId, trabajoData) {
  try {
    // 1. Validar que el trabajo existe y está en DRAFT
    const { data: trabajo, error: fetchError } = await supabase
      .from('agricultural_works')
      .select('status, firm_id, premise_id, lot_id')
      .eq('id', trabajoId)
      .single();

    if (fetchError) throw fetchError;
    if (!trabajo) throw new Error('Trabajo no encontrado');

    if (trabajo.status !== 'DRAFT') {
      throw new Error('Solo se pueden editar trabajos en estado BORRADOR');
    }

    // 2. Actualizar trabajo base
    const { data: updatedWork, error: updateError } = await supabase
      .from('agricultural_works')
      .update({
        lot_id: trabajoData.lot_id,
        date: trabajoData.date,
        activity_id: trabajoData.activity_id,
        work_type: trabajoData.work_type, // Mantener por retrocompatibilidad
        hectares: trabajoData.hectares || 0,
        fuel_used: trabajoData.fuel_used || 0,
        detail: trabajoData.detail || '',
        others: trabajoData.others || '',
        responsible_person: trabajoData.responsible_person || null,
        cost_center_id: trabajoData.cost_center_id || null,
        campaign_id: trabajoData.campaign_id || null,
        other_costs: trabajoData.other_costs || 0,
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
      .eq('agricultural_work_id', trabajoId);

    if (deleteInsumosError) throw deleteInsumosError;

    if (trabajoData.insumos && trabajoData.insumos.length > 0) {
      const insumosData = trabajoData.insumos
        .filter((i) => i.input_id)
        .map((i) => ({
          agricultural_work_id: trabajoId,
          input_id: i.input_id,
          dose_projected: i.dose_projected || null,
          dose_applied: i.dose_applied || i.dose_projected || 0,
          unit: i.unit || 'kg',
          quantity_projected: i.quantity_projected || null,
          quantity_applied: i.quantity_applied || i.quantity_projected || 0,
          cost_per_unit: parseFloat(i.cost_per_unit) || 0,
          notes: i.notes || null
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
      .eq('agricultural_work_id', trabajoId);

    if (deleteMaquinariaError) throw deleteMaquinariaError;

    if (trabajoData.maquinaria && trabajoData.maquinaria.length > 0) {
      const maquinariaData = trabajoData.maquinaria
        .filter((m) => m.machinery_id)
        .map((m) => ({
          agricultural_work_id: trabajoId,
          machinery_id: m.machinery_id,
          hours_used: parseFloat(m.hours_used) || 0,
          cost_per_hour: parseFloat(m.cost_per_hour) || 0,
          fuel_used: m.fuel_used || null,
          notes: m.notes || null
        }));

      if (maquinariaData.length > 0) {
        const { error: insertMaquinariaError } = await supabase
          .from('work_machinery')
          .insert(maquinariaData);

        if (insertMaquinariaError) throw insertMaquinariaError;
      }
    }

    // 5. Actualizar mano de obra (DELETE + INSERT)
    const { error: deleteLaborError } = await supabase
      .from('work_labor')
      .delete()
      .eq('agricultural_work_id', trabajoId);

    if (deleteLaborError) throw deleteLaborError;

    if (trabajoData.labor && trabajoData.labor.length > 0) {
      const laborData = trabajoData.labor
        .filter((l) => l.worker_name)
        .map((l) => ({
          agricultural_work_id: trabajoId,
          worker_name: l.worker_name,
          worker_role: l.worker_role || null,
          hours_worked: parseFloat(l.hours_worked) || 0,
          cost_per_hour: parseFloat(l.cost_per_hour) || 0,
          notes: l.notes || null
        }));

      if (laborData.length > 0) {
        const { error: insertLaborError } = await supabase
          .from('work_labor')
          .insert(laborData);

        if (insertLaborError) throw insertLaborError;
      }
    }

    // 6. Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_actualizado',
      descripcion: `Trabajo agrícola actualizado: ${trabajoData.work_type}`,
      moduloOrigen: 'work_manager',
      usuario: trabajoData.currentUser || 'sistema',
      referencia: trabajoId,
      metadata: {
        accion: 'UPDATE',
        work_type: trabajoData.work_type,
        hectares: trabajoData.hectares,
        insumos_count: trabajoData.insumos?.length || 0,
        maquinaria_count: trabajoData.maquinaria?.length || 0,
        labor_count: trabajoData.labor?.length || 0
      }
    });

    return { success: true, trabajo: updatedWork };
  } catch (error) {
    console.error('Error en actualizarTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Envía trabajo a aprobación
 * Cambia estado DRAFT → PENDING_APPROVAL
 * Valida que tenga centro de costo
 */
export async function enviarTrabajoAprobacion(trabajoId, usuario) {
  try {
    // Obtener trabajo
    const { data: trabajo } = await supabase
      .from('agricultural_works')
      .select('*, work_inputs(*)')
      .eq('id', trabajoId)
      .single();

    if (!trabajo) throw new Error('Trabajo no encontrado');
    if (trabajo.status !== 'DRAFT') {
      throw new Error(
        `No se puede enviar a aprobación desde estado ${trabajo.status}`
      );
    }

    // Validar centro de costo
    if (!trabajo.cost_center_id) {
      throw new Error('Centro de costo es obligatorio para enviar a aprobación');
    }

    // Validar que tenga al menos un insumo o actividad
    if (!trabajo.work_inputs || trabajo.work_inputs.length === 0) {
      throw new Error('El trabajo debe tener al menos un insumo registrado');
    }

    // Cambiar estado
    const { error } = await supabase
      .from('agricultural_works')
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
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_pendiente',
      descripcion: `Trabajo enviado a aprobación: ${trabajo.work_type}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: { status: 'PENDING_APPROVAL' }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en enviarTrabajoAprobacion:', error);
    throw error;
  }
}

/**
 * Aprueba un trabajo agrícola
 * PENDING_APPROVAL → APPROVED
 * DESCUENTA STOCK AUTOMÁTICAMENTE - FUNCIÓN CRÍTICA
 */
export async function aprobarTrabajoAgricola(trabajoId, usuario) {
  try {
    // Obtener trabajo completo
    const trabajo = await obtenerDetalleTrabajoAgricola(trabajoId);

    if (!trabajo) throw new Error('Trabajo no encontrado');
    if (trabajo.status !== 'PENDING_APPROVAL') {
      throw new Error(`No se puede aprobar desde estado ${trabajo.status}`);
    }

    // VALIDACIÓN 1: Centro de costo obligatorio
    if (!trabajo.cost_center_id) {
      throw new Error('Centro de costo es obligatorio para aprobar');
    }

    // VALIDACIÓN 2: Verificar stock disponible de TODOS los insumos
    for (const insumo of trabajo.insumos) {
      const disponibilidad = await validarDisponibilidad(
        insumo.input_id,
        insumo.quantity_applied
      );

      if (!disponibilidad.disponible) {
        throw new Error(
          `Stock insuficiente de ${insumo.inputs.name}. ` +
            `Disponible: ${disponibilidad.actual} ${insumo.inputs.unit}. ` +
            `Requerido: ${insumo.quantity_applied} ${insumo.unit}`
        );
      }
    }

    // PASO 1: Cambiar estado a APPROVED
    const { error: errorUpdate } = await supabase
      .from('agricultural_works')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: usuario
      })
      .eq('id', trabajoId);

    if (errorUpdate) throw errorUpdate;

    // PASO 2: Descontar stock de cada insumo
    const movimientosIds = [];
    for (const insumo of trabajo.insumos) {
      try {
        const movimiento = await registrarMovimiento({
          input_id: insumo.input_id,
          type: 'exit',
          quantity: insumo.quantity_applied,
          date: trabajo.date,
          description: `Consumo en trabajo agrícola: ${trabajo.work_type} - Lote: ${trabajo.lots.name}`,
          lot_id: trabajo.lot_id,
          unit_cost: insumo.cost_per_unit,
          firm_id: trabajo.firm_id,
          premise_id: trabajo.premise_id
        });

        movimientosIds.push(movimiento.id);
      } catch (errMov) {
        console.error(`Error descountando insumo ${insumo.input_id}:`, errMov);
        throw new Error(`Error al descontar insumo ${insumo.inputs.name}: ${errMov.message}`);
      }
    }

    // PASO 3: Auditoría
    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_aprobado',
      descripcion: `Trabajo APROBADO: ${trabajo.work_type}. Stock descontado automáticamente de ${trabajo.insumos.length} insumo(s).`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: {
        status: 'APPROVED',
        total_cost: trabajo.total_cost,
        insumos_count: trabajo.insumos.length,
        movimientos_stock: movimientosIds
      }
    });

    return { success: true, trabajo };
  } catch (error) {
    console.error('Error en aprobarTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Rechaza un trabajo agrícola
 * PENDING_APPROVAL → DRAFT (permite corregir y reenviar)
 */
export async function rechazarTrabajoAgricola(trabajoId, usuario, motivo) {
  try {
    const { data: trabajo } = await supabase
      .from('agricultural_works')
      .select('*')
      .eq('id', trabajoId)
      .single();

    if (!trabajo) throw new Error('Trabajo no encontrado');
    if (trabajo.status !== 'PENDING_APPROVAL') {
      throw new Error('Solo se pueden rechazar trabajos pendientes de aprobación');
    }

    const { error } = await supabase
      .from('agricultural_works')
      .update({
        status: 'DRAFT',
        cancellation_reason: motivo,
        updated_at: new Date().toISOString()
      })
      .eq('id', trabajoId);

    if (error) throw error;

    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_rechazado',
      descripcion: `Trabajo RECHAZADO: ${trabajo.work_type}. Motivo: ${motivo}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: { status: 'DRAFT', motivo }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en rechazarTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Cierra un trabajo aprobado
 * APPROVED → CLOSED (inmutable)
 */
export async function cerrarTrabajoAgricola(trabajoId, usuario) {
  try {
    const { data: trabajo } = await supabase
      .from('agricultural_works')
      .select('*')
      .eq('id', trabajoId)
      .single();

    if (!trabajo) throw new Error('Trabajo no encontrado');
    if (trabajo.status !== 'APPROVED') {
      throw new Error('Solo se pueden cerrar trabajos aprobados');
    }

    const { error } = await supabase
      .from('agricultural_works')
      .update({
        status: 'CLOSED',
        updated_at: new Date().toISOString()
      })
      .eq('id', trabajoId);

    if (error) throw error;

    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_cerrado',
      descripcion: `Trabajo CERRADO: ${trabajo.work_type}. Ahora es inmutable.`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: { status: 'CLOSED' }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en cerrarTrabajoAgricola:', error);
    throw error;
  }
}

/**
 * Anula un trabajo (con reversión de stock si fue aprobado)
 * CUALQUIER ESTADO → CANCELLED
 * Si estaba APROBADO: revierte automáticamente el stock
 */
export async function anularTrabajoAgricola(trabajoId, usuario, motivo) {
  try {
    const trabajo = await obtenerDetalleTrabajoAgricola(trabajoId);

    if (!trabajo) throw new Error('Trabajo no encontrado');
    if (trabajo.status === 'CANCELLED') {
      throw new Error('El trabajo ya está anulado');
    }

    let stockRevertido = false;

    // Si está APPROVED o CLOSED, revertir stock automáticamente
    if (
      trabajo.status === 'APPROVED' ||
      trabajo.status === 'CLOSED'
    ) {
      for (const insumo of trabajo.insumos) {
        try {
          await registrarMovimiento({
            input_id: insumo.input_id,
            type: 'entry', // REVERSIÓN
            quantity: insumo.quantity_applied,
            date: new Date().toISOString(),
            description: `REVERSIÓN por anulación de trabajo: ${trabajo.work_type}. Motivo: ${motivo}`,
            lot_id: trabajo.lot_id,
            unit_cost: insumo.cost_per_unit,
            firm_id: trabajo.firm_id,
            premise_id: trabajo.premise_id
          });
        } catch (errRev) {
          console.error(
            `Error revirtiendo insumo ${insumo.input_id}:`,
            errRev
          );
          throw new Error(
            `Error al revertir stock de ${insumo.inputs.name}: ${errRev.message}`
          );
        }
      }
      stockRevertido = true;
    }

    const { error } = await supabase
      .from('agricultural_works')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancelled_by: usuario,
        cancellation_reason: motivo,
        updated_at: new Date().toISOString()
      })
      .eq('id', trabajoId);

    if (error) throw error;

    await crearRegistro({
      firmId: trabajo.firm_id,
      premiseId: trabajo.premise_id,
      lotId: trabajo.lot_id,
      tipo: 'trabajo_agricola_anulado',
      descripcion: `Trabajo ANULADO: ${trabajo.work_type}. Motivo: ${motivo}${
        stockRevertido ? '. Stock revertido.' : ''
      }`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: trabajoId,
      metadata: {
        status: 'CANCELLED',
        motivo,
        stock_revertido: stockRevertido,
        insumos_revertidos: stockRevertido ? trabajo.insumos.length : 0
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error en anularTrabajoAgricola:', error);
    throw error;
  }
}

