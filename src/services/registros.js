import { supabase } from '../lib/supabase'

/**
 * Crea un nuevo registro en la tabla de auditoría
 * @param {Object} params
 * @param {string} params.firmId - ID de la firma
 * @param {string} params.premiseId - ID del predio (opcional)
 * @param {string} params.lotId - ID del lote (opcional)
 * @param {string} params.tipo - Tipo: 'gasto', 'ingreso', 'stock', 'trabajo_agricola', 'trabajo_ganadero', 'lluvia', 'monitoreo'
 * @param {string} params.descripcion - Descripción de la operación (requerido)
 * @param {string} params.moduloOrigen - Módulo que generó el registro (e.g., 'alertas_recordatorios')
 * @param {string} params.usuario - Usuario que realizó la operación
 * @param {Date} params.fecha - Fecha de la operación
 * @param {Object} params.referencia - ID o referencia de la entidad relacionada (opcional)
 * @param {Object} params.metadata - Datos adicionales (JSON)
 * @returns {Promise<Object>} Registro creado
 */
export async function crearRegistro({
  firmId,
  premiseId = null,
  lotId = null,
  tipo,
  descripcion,
  moduloOrigen,
  usuario = 'sistema',
  fecha = new Date(),
  referencia = null,
  metadata = {}
}) {
  try {
    if (!firmId || !tipo || !descripcion) {
      throw new Error('firmId, tipo y descripcion son requeridos')
    }

    const { data, error } = await supabase.from('audit').insert([
      {
        firm_id: firmId,
        premise_id: premiseId,
        lot_id: lotId,
        tipo,
        descripcion,
        modulo_origen: moduloOrigen,
        usuario,
        fecha,
        referencia,
        metadata: Object.keys(metadata).length > 0 ? metadata : {}
      }
    ])

    if (error) {
      console.error('Error al crear registro:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error en crearRegistro:', error)
    throw error
  }
}

/**
 * Obtiene registros con filtros y paginación
 * @param {Object} params
 * @param {string} params.firmId - ID de la firma (requerido)
 * @param {string} params.premiseId - ID del predio (opcional)
 * @param {string} params.tipo - Filtro por tipo
 * @param {string} params.fecha - Filtro por fecha (ISO string)
 * @param {string} params.busqueda - Búsqueda en descripción
 * @param {number} params.page - Número de página (default 1)
 * @param {number} params.limit - Registros por página (default 10)
 * @returns {Promise<Object>} { data: registros, count: total, totalPages: páginas }
 */
export async function obtenerRegistros({
  firmId,
  premiseId = null,
  tipo = null,
  usuario = null,
  fecha = null,
  busqueda = null,
  page = 1,
  limit = 10
}) {
  try {
    if (!firmId) throw new Error('firmId es requerido')

    let query = supabase
      .from('audit')
      .select('*', { count: 'exact' })
      .eq('firm_id', firmId)

    // Filtro por predio si existe
    if (premiseId) {
      query = query.or(
        `premise_id.eq.${premiseId},premise_id.is.null`
      )
    }

    // Filtros opcionales
    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo)
    }

    if (usuario && usuario !== 'todos') {
      query = query.eq('usuario', usuario)
    }

    if (fecha) {
      query = query.gte('fecha', fecha)
        .lt('fecha', new Date(new Date(fecha).getTime() + 86400000).toISOString())
    }

    if (busqueda && busqueda.trim()) {
      query = query.or(`descripcion.ilike.%${busqueda}%,referencia.ilike.%${busqueda}%,lote.ilike.%${busqueda}%`)
    }

    // Ordenar por fecha descendente y aplicar paginación
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await query
      .order('fecha', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error al obtener registros:', error)
      throw error
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return {
      data: data || [],
      count: count || 0,
      totalPages,
      currentPage: page
    }
  } catch (error) {
    console.error('Error en obtenerRegistros:', error)
    throw error
  }
}

/**
 * Obtiene usuarios únicos de registros para una firma
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio (opcional)
 * @returns {Promise<Array>} Lista de usuarios únicos ordenados alfabéticamente
 */
export async function obtenerUsuarios(firmId, premiseId = null) {
  try {
    if (!firmId) throw new Error('firmId es requerido')

    let query = supabase
      .from('audit')
      .select('usuario')
      .eq('firm_id', firmId)
      .not('usuario', 'is', null)

    if (premiseId) {
      query = query.or(
        `premise_id.eq.${premiseId},premise_id.is.null`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener usuarios:', error)
      throw error
    }

    // Extraer usuarios únicos y ordenar alfabéticamente
    const usuariosUnicos = [...new Set(data.map(reg => reg.usuario))].filter(Boolean).sort()
    return usuariosUnicos
  } catch (error) {
    console.error('Error en obtenerUsuarios:', error)
    throw error
  }
}
