/**
 * Servicios CRUD para lotes en Supabase (Versión Sincronizada con SCHEMA.sql)
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene todos los lotes de un predio
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} { data: Lote[], count: number }
 */
export async function obtenerLotesPorPredio(premiseId) {
  try {
    if (!premiseId) throw new Error('premiseId es requerido');

    const { data, count, error } = await supabase
      .from('lots')
      .select('*', { count: 'exact' })
      .eq('premise_id', premiseId)
      .eq('status', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener lotes:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error('Error en obtenerLotesPorPredio:', error);
    throw error;
  }
}

/**
 * Obtiene todos los lotes de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Lote[], count: number }
 */
export async function obtenerLotesPorFirma(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, count, error } = await supabase
      .from('lots')
      .select('*', { count: 'exact' })
      .eq('firm_id', firmId)
      .eq('status', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener lotes:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error('Error en obtenerLotesPorFirma:', error);
    throw error;
  }
}

/**
 * Obtiene un lote específico por ID
 * @param {string} lotId - ID del lote
 * @returns {Promise<Object>} Datos del lote
 */
export async function obtenerLote(lotId) {
  try {
    if (!lotId) throw new Error('lotId es requerido');

    const { data, error } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    if (error) {
      console.error('Error al obtener lote:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en obtenerLote:', error);
    throw error;
  }
}

/**
 * Crea un nuevo lote
 * @param {Object} lotData - Datos del lote
 * @returns {Promise<Object>} Lote creado
 */
export async function crearLote(lotData) {
  try {
    // Validaciones mínimas según SCHEMA.sql
    if (!lotData.firm_id) throw new Error('firm_id es requerido');
    if (!lotData.premise_id) throw new Error('premise_id es requerido');
    if (!lotData.name) throw new Error('name es requerido');

    const { data, error } = await supabase
      .from('lots')
      .insert([
        {
          ...lotData,
          status: true, // Aseguramos que nazca activo
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear lote:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en crearLote:', error);
    throw error;
  }
}

/**
 * Actualiza un lote existente
 * @param {string} lotId - ID del lote
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>} Lote actualizado
 */
export async function actualizarLote(lotId, updateData) {
  try {
    if (!lotId) throw new Error('lotId es requerido');

    const { data, error } = await supabase
      .from('lots')
      .update(updateData)
      .eq('id', lotId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar lote:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en actualizarLote:', error);
    throw error;
  }
}

/**
 * Elimina un lote (soft delete - marca como inactivo)
 * @param {string} lotId - ID del lote
 */
export async function eliminarLote(lotId) {
  try {
    if (!lotId) throw new Error('lotId es requerido');

    const { error } = await supabase
      .from('lots')
      .update({ status: false })
      .eq('id', lotId);

    if (error) {
      console.error('Error al eliminar lote:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error en eliminarLote:', error);
    throw error;
  }
}

/**
 * Sube una nota de audio al storage de Supabase
 */
export async function uploadAudioNote(blob, lotName) {
  try {
    const fileName = `${Date.now()}_${lotName.replace(/\s+/g, '_')}.webm`;
    const filePath = `audio_notes/${fileName}`;

    const { data, error } = await supabase.storage
      .from('lot-documents')
      .upload(filePath, blob);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('lot-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error subiendo audio:', error);
    throw error;
  }
}

/**
 * Busca lotes por nombre
 */
export async function buscarLotes(premiseId, busqueda) {
  try {
    if (!premiseId) throw new Error('premiseId es requerido');
    
    let query = supabase
      .from('lots')
      .select('*', { count: 'exact' })
      .eq('premise_id', premiseId)
      .eq('status', true);

    if (busqueda) {
      query = query.ilike('name', `%${busqueda}%`);
    }

    const { data, count, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('Error en buscarLotes:', error);
    throw error;
  }
}

/**
 * Sube un documento (PUMRS) al storage de Supabase
 */
export async function uploadLotDocument(file, lotName) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${lotName.replace(/\s+/g, '_')}.${fileExt}`;
    const filePath = `pumrs/${fileName}`;

    const { data, error } = await supabase.storage
      .from('lot-documents')
      .upload(filePath, file);

    if (error) throw error;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('lot-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error subiendo documento:', error);
    throw error;
  }
}