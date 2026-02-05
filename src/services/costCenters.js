/**
 * costCenters.js
 *
 * Servicio para gestión de centros de costo
 * Incluye: CRUD, validaciones, estructura jerárquica
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// OBTENER TODOS LOS CENTROS DE COSTO DE UNA FIRMA
// ============================================================================
/**
 * Lista centros de costo con estructura jerárquica
 *
 * @param {string} firmId - ID de la firma
 * @returns {Object} { success: boolean, data: costCenters[], error: errorObj }
 */
export async function getCostCenters(firmId) {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) throw error;

    // Organizar en estructura jerárquica
    const organized = organizeHierarchy(data || []);

    return {
      success: true,
      data: organized
    };
  } catch (error) {
    console.error('Error getting cost centers:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener centros de costo',
      details: error
    };
  }
}

// ============================================================================
// CREAR CENTRO DE COSTO
// ============================================================================
/**
 * Crea un nuevo centro de costo
 *
 * @param {Object} costCenterData - { firmId, code, name, description, parentId }
 * @returns {Object} { success: boolean, data: newCostCenter, error: errorObj }
 */
export async function createCostCenter(costCenterData) {
  try {
    const { firmId, code, name, description, parentId } = costCenterData;

    // Validar datos requeridos
    if (!firmId || !code || !name) {
      throw new Error('Firma, código y nombre son requeridos');
    }

    // Validar código único por firma
    const { data: existing } = await supabase
      .from('cost_centers')
      .select('id')
      .eq('firm_id', firmId)
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      throw new Error(`El código "${code}" ya existe en esta firma`);
    }

    // Si hay parentId, validar que exista y pertenezca a la misma firma
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('id', parentId)
        .eq('firm_id', firmId)
        .single();

      if (parentError || !parent) {
        throw new Error('Centro de costo padre no encontrado');
      }
    }

    // Crear centro de costo
    const { data: newCenter, error } = await supabase
      .from('cost_centers')
      .insert({
        firm_id: firmId,
        code: code.toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        parent_id: parentId || null,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: newCenter,
      message: 'Centro de costo creado'
    };
  } catch (error) {
    console.error('Error creating cost center:', error);
    return {
      success: false,
      error: error.message || 'Error al crear centro de costo',
      details: error
    };
  }
}

// ============================================================================
// ACTUALIZAR CENTRO DE COSTO
// ============================================================================
/**
 * Actualiza un centro de costo existente
 *
 * @param {string} costCenterId - ID del centro de costo
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function updateCostCenter(costCenterId, updates) {
  try {
    if (!costCenterId) {
      throw new Error('ID del centro de costo es requerido');
    }

    // Si está actualizando código, validar unicidad
    if (updates.code) {
      const { data: costCenter } = await supabase
        .from('cost_centers')
        .select('firm_id')
        .eq('id', costCenterId)
        .single();

      if (costCenter) {
        const { data: existing } = await supabase
          .from('cost_centers')
          .select('id')
          .eq('firm_id', costCenter.firm_id)
          .eq('code', updates.code.toUpperCase())
          .neq('id', costCenterId)
          .single();

        if (existing) {
          throw new Error(`El código "${updates.code}" ya existe`);
        }
      }

      updates.code = updates.code.toUpperCase();
    }

    // Normalizar strings
    if (updates.name) updates.name = updates.name.trim();
    if (updates.description) updates.description = updates.description.trim();

    const { error } = await supabase
      .from('cost_centers')
      .update(updates)
      .eq('id', costCenterId);

    if (error) throw error;

    return {
      success: true,
      message: 'Centro de costo actualizado'
    };
  } catch (error) {
    console.error('Error updating cost center:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar centro de costo',
      details: error
    };
  }
}

// ============================================================================
// DESACTIVAR CENTRO DE COSTO (Soft delete)
// ============================================================================
/**
 * Desactiva un centro de costo (no lo elimina)
 *
 * @param {string} costCenterId - ID del centro de costo
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function deactivateCostCenter(costCenterId) {
  try {
    if (!costCenterId) {
      throw new Error('ID del centro de costo es requerido');
    }

    // Desactivar el centro
    const { error: updateError } = await supabase
      .from('cost_centers')
      .update({ is_active: false })
      .eq('id', costCenterId);

    if (updateError) throw updateError;

    // Desactivar también todos los hijos (si existen)
    await supabase
      .from('cost_centers')
      .update({ is_active: false })
      .eq('parent_id', costCenterId);

    return {
      success: true,
      message: 'Centro de costo desactivado'
    };
  } catch (error) {
    console.error('Error deactivating cost center:', error);
    return {
      success: false,
      error: error.message || 'Error al desactivar centro de costo',
      details: error
    };
  }
}

// ============================================================================
// ACTIVAR CENTRO DE COSTO
// ============================================================================
/**
 * Activa un centro de costo desactivado
 *
 * @param {string} costCenterId - ID del centro de costo
 * @returns {Object} { success: boolean, error: errorObj }
 */
export async function activateCostCenter(costCenterId) {
  try {
    if (!costCenterId) {
      throw new Error('ID del centro de costo es requerido');
    }

    const { error } = await supabase
      .from('cost_centers')
      .update({ is_active: true })
      .eq('id', costCenterId);

    if (error) throw error;

    return {
      success: true,
      message: 'Centro de costo activado'
    };
  } catch (error) {
    console.error('Error activating cost center:', error);
    return {
      success: false,
      error: error.message || 'Error al activar centro de costo',
      details: error
    };
  }
}

// ============================================================================
// OBTENER CENTRO DE COSTO POR ID
// ============================================================================
/**
 * Obtiene un centro de costo específico
 *
 * @param {string} costCenterId - ID del centro de costo
 * @returns {Object} { success: boolean, data: costCenter, error: errorObj }
 */
export async function getCostCenterById(costCenterId) {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(`
        *,
        parent:parent_id (
          id,
          code,
          name
        )
      `)
      .eq('id', costCenterId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error getting cost center:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener centro de costo',
      details: error
    };
  }
}

// ============================================================================
// UTILIDAD: Organizar en estructura jerárquica
// ============================================================================
/**
 * Organiza centros de costo en árbol jerárquico
 *
 * @param {Array} flatList - Lista plana de centros de costo
 * @returns {Array} Estructura jerárquica
 */
function organizeHierarchy(flatList) {
  const map = new Map();
  const roots = [];

  // Crear mapa de IDs
  flatList.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Construir árbol
  flatList.forEach(item => {
    if (item.parent_id) {
      const parent = map.get(item.parent_id);
      if (parent) {
        parent.children.push(map.get(item.id));
      } else {
        // Si el padre no existe, tratar como raíz
        roots.push(map.get(item.id));
      }
    } else {
      roots.push(map.get(item.id));
    }
  });

  return roots;
}

// ============================================================================
// OBTENER OPCIONES DE PADRE (para selects)
// ============================================================================
/**
 * Obtiene centros de costo que pueden ser padres (excluyendo el nodo actual)
 *
 * @param {string} firmId - ID de la firma
 * @param {string} excludeId - ID a excluir (para no permitir auto-referencia)
 * @returns {Object} { success: boolean, data: parentOptions[], error: errorObj }
 */
export async function getParentOptions(firmId, excludeId = null) {
  try {
    let query = supabase
      .from('cost_centers')
      .select('id, code, name, parent_id')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error getting parent options:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener opciones de padre',
      details: error
    };
  }
}
