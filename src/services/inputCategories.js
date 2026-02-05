/**
 * Servicios para gestión de categorías de insumos
 * Sincronizado con tabla: input_categories
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene categorías disponibles (globales + de la firma)
 * @param {string} firmId - ID de la firma (opcional)
 * @returns {Promise<Object>} { data: Categoria[], count: number }
 */
export async function obtenerCategorias(firmId = null) {
  try {
    let query = supabase
      .from('input_categories')
      .select('*', { count: 'exact' });

    // Obtener categorías globales + de la firma
    if (firmId) {
      query = query
        .or(`firm_id.is.null,firm_id.eq.${firmId}`)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
    } else {
      // Solo categorías globales
      query = query
        .is('firm_id', null)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Error en obtenerCategorias:', error);
    throw error;
  }
}

/**
 * Crea una nueva categoría para una firma
 * @param {string} firmId - ID de la firma
 * @param {string} nombre - Nombre de la categoría
 * @returns {Promise<Object>} Categoría creada
 */
export async function crearCategoria(firmId, nombre) {
  try {
    if (!firmId) throw new Error('firmId es requerido');
    if (!nombre || !nombre.trim()) throw new Error('nombre es requerido');

    const { data, error } = await supabase
      .from('input_categories')
      .insert([
        {
          firm_id: firmId,
          name: nombre.trim(),
          is_default: false
        }
      ])
      .select()
      .single();

    if (error) {
      // Manejar constraint de unicidad
      if (error.code === '23505') {
        throw new Error(`La categoría "${nombre}" ya existe para esta firma`);
      }
      console.error('Error al crear categoría:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en crearCategoria:', error);
    throw error;
  }
}

/**
 * Actualiza una categoría
 * @param {string} categoriaId - ID de la categoría
 * @param {Object} updates - Campos a actualizar { name }
 * @returns {Promise<Object>} Categoría actualizada
 */
export async function actualizarCategoria(categoriaId, updates) {
  try {
    if (!categoriaId) throw new Error('categoriaId es requerido');

    const { data, error } = await supabase
      .from('input_categories')
      .update(updates)
      .eq('id', categoriaId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar categoría:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en actualizarCategoria:', error);
    throw error;
  }
}

/**
 * Elimina una categoría (solo si no tiene insumos asociados)
 * @param {string} categoriaId - ID de la categoría
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export async function eliminarCategoria(categoriaId) {
  try {
    if (!categoriaId) throw new Error('categoriaId es requerido');

    // Verificar que no tiene insumos
    const { data: insumosCount, error: errCount } = await supabase
      .from('inputs')
      .select('id', { count: 'exact' })
      .eq('category', categoriaId);

    if (errCount) throw errCount;

    if (insumosCount && insumosCount.length > 0) {
      throw new Error('No se puede eliminar una categoría que tiene insumos asociados');
    }

    const { error } = await supabase
      .from('input_categories')
      .delete()
      .eq('id', categoriaId);

    if (error) {
      console.error('Error al eliminar categoría:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error en eliminarCategoria:', error);
    throw error;
  }
}

/**
 * Obtiene lista de nombres de categorías (para dropdown)
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Array>} Array de nombres de categoría
 */
export async function obtenerNombresCategorias(firmId = null) {
  try {
    const { data } = await obtenerCategorias(firmId);
    return data.map(cat => cat.name).sort();
  } catch (error) {
    console.error('Error en obtenerNombresCategorias:', error);
    // Fallback a categorías por defecto
    return [
      'Fertilizantes',
      'Fitosanitarios',
      'Semillas',
      'Medicamentos veterinarios',
      'Combustibles',
      'Repuestos',
      'Otros'
    ];
  }
}
