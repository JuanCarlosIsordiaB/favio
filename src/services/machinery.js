/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Servicios para Maquinaria, Centros de Costo y Campañas
 */

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

// =============================================
// MAQUINARIA
// =============================================

/**
 * Obtiene toda la maquinaria de una firma
 */
export async function obtenerMaquinaria(firmId) {
  try {
    const { data, error } = await supabase
      .from('machinery')
      .select('*')
      .eq('firm_id', firmId)
      .eq('status', 'ACTIVE')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerMaquinaria:', error);
    throw error;
  }
}

/**
 * Crea una nueva maquinaria
 */
export async function crearMaquinaria(maquinariaData) {
  try {
    if (!maquinariaData.firm_id || !maquinariaData.code || !maquinariaData.name) {
      throw new Error('Firma, Código y Nombre son obligatorios');
    }

    const { data, error } = await supabase
      .from('machinery')
      .insert([
        {
          firm_id: maquinariaData.firm_id,
          code: maquinariaData.code,
          name: maquinariaData.name,
          type: maquinariaData.type || null,
          brand: maquinariaData.brand || null,
          model: maquinariaData.model || null,
          year: maquinariaData.year || null,
          cost_per_hour: maquinariaData.cost_per_hour || 0,
          fuel_consumption_per_hour: maquinariaData.fuel_consumption_per_hour || null,
          notes: maquinariaData.notes || null,
          status: 'ACTIVE'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: maquinariaData.firm_id,
      tipo: 'maquinaria_creada',
      descripcion: `Maquinaria creada: ${data.name} (${data.code})`,
      moduloOrigen: 'work_manager',
      usuario: maquinariaData.currentUser || 'sistema',
      referencia: data.id,
      metadata: { code: data.code, cost_per_hour: data.cost_per_hour }
    });

    return data;
  } catch (error) {
    console.error('Error en crearMaquinaria:', error);
    throw error;
  }
}

/**
 * Actualiza una maquinaria existente
 */
export async function actualizarMaquinaria(id, updates) {
  try {
    // Filtrar solo campos válidos de la tabla machinery
    // Convertir números explícitamente
    const validFields = {
      name: updates.name,
      code: updates.code,
      type: updates.type,
      brand: updates.brand,
      model: updates.model,
      year: updates.year,
      cost_per_hour: updates.cost_per_hour !== undefined ? parseFloat(updates.cost_per_hour) : undefined,
      fuel_consumption_per_hour: updates.fuel_consumption_per_hour !== undefined ? parseFloat(updates.fuel_consumption_per_hour) : undefined,
      notes: updates.notes,
      status: updates.status,
      horometer_hours: updates.horometer_hours !== undefined ? parseFloat(updates.horometer_hours) : undefined,
      total_hectares: updates.total_hectares !== undefined ? parseFloat(updates.total_hectares) : undefined,
      purchase_date: updates.purchase_date,
      purchase_value: updates.purchase_value !== undefined ? parseFloat(updates.purchase_value) : undefined,
      license_plate: updates.license_plate,
      insurance_policy: updates.insurance_policy,
      insurance_expiry: updates.insurance_expiry
    };

    // Eliminar campos undefined
    Object.keys(validFields).forEach(key =>
      validFields[key] === undefined && delete validFields[key]
    );

    console.log('Actualizando maquinaria con campos:', validFields);

    const { data, error } = await supabase
      .from('machinery')
      .update({
        ...validFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('Maquinaria actualizada con éxito:', data);

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: 'maquinaria_actualizada',
      descripcion: `Maquinaria actualizada: ${data.name} (${data.code})`,
      moduloOrigen: 'work_manager',
      usuario: updates.currentUser || 'sistema',
      referencia: data.id,
      metadata: { code: data.code, horometer_hours: data.horometer_hours, total_hectares: data.total_hectares }
    });

    return data;
  } catch (error) {
    console.error('Error en actualizarMaquinaria:', error);
    throw error;
  }
}

// =============================================
// CENTROS DE COSTO
// =============================================

/**
 * Obtiene todos los centros de costo de una firma
 */
export async function obtenerCentrosCosto(firmId) {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('code');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerCentrosCosto:', error);
    throw error;
  }
}

/**
 * Crea un nuevo centro de costo
 */
export async function crearCentroCosto(centroCostoData) {
  try {
    if (!centroCostoData.firm_id || !centroCostoData.code || !centroCostoData.name) {
      throw new Error('Firma, Código y Nombre son obligatorios');
    }

    const { data, error } = await supabase
      .from('cost_centers')
      .insert([
        {
          firm_id: centroCostoData.firm_id,
          code: centroCostoData.code,
          name: centroCostoData.name,
          description: centroCostoData.description || null,
          parent_id: centroCostoData.parent_id || null,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: centroCostoData.firm_id,
      tipo: 'centro_costo_creado',
      descripcion: `Centro de costo creado: ${data.name} (${data.code})`,
      moduloOrigen: 'work_manager',
      usuario: centroCostoData.currentUser || 'sistema',
      referencia: data.id,
      metadata: { code: data.code }
    });

    return data;
  } catch (error) {
    console.error('Error en crearCentroCosto:', error);
    throw error;
  }
}

/**
 * Actualiza un centro de costo existente
 */
export async function actualizarCentroCosto(id, updates) {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarCentroCosto:', error);
    throw error;
  }
}

// =============================================
// CAMPAÑAS
// =============================================

/**
 * Obtiene todas las campañas de una firma
 */
export async function obtenerCampanas(firmId) {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('firm_id', firmId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerCampanas:', error);
    throw error;
  }
}

/**
 * Obtiene campañas activas de una firma
 */
export async function obtenerCampanasActivas(firmId) {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('firm_id', firmId)
      .eq('status', 'ACTIVE')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerCampanasActivas:', error);
    throw error;
  }
}

/**
 * Crea una nueva campaña
 */
export async function crearCampana(campanaData) {
  try {
    if (!campanaData.firm_id || !campanaData.name || !campanaData.start_date) {
      throw new Error('Firma, Nombre y Fecha de inicio son obligatorios');
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          firm_id: campanaData.firm_id,
          name: campanaData.name,
          description: campanaData.description || null,
          start_date: campanaData.start_date,
          end_date: campanaData.end_date || null,
          status: 'ACTIVE'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: campanaData.firm_id,
      tipo: 'campana_creada',
      descripcion: `Campaña creada: ${data.name}`,
      moduloOrigen: 'work_manager',
      usuario: campanaData.currentUser || 'sistema',
      referencia: data.id,
      metadata: { start_date: data.start_date }
    });

    return data;
  } catch (error) {
    console.error('Error en crearCampana:', error);
    throw error;
  }
}

/**
 * Actualiza una campaña existente
 */
export async function actualizarCampana(id, updates) {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarCampana:', error);
    throw error;
  }
}

/**
 * Cierra una campaña
 */
export async function cerrarCampana(id, usuario) {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'CLOSED',
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await crearRegistro({
      firmId: data.firm_id,
      tipo: 'campana_cerrada',
      descripcion: `Campaña cerrada: ${data.name}`,
      moduloOrigen: 'work_manager',
      usuario,
      referencia: data.id
    });

    return data;
  } catch (error) {
    console.error('Error en cerrarCampana:', error);
    throw error;
  }
}
