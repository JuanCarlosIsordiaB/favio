/**
 * Servicios para gestionar adjuntos en remitos
 * GAP 1: Adjuntar fotos/documentos
 */

import { supabase } from '../lib/supabase';

/**
 * Subir archivo a Supabase Storage y crear registro
 */
export async function subirAdjuntoRemito(remittanceId, firmId, file, description = null, uploadedBy = null) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');
    if (!file) throw new Error('Archivo es requerido');

    // Validar tamaño (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('El archivo excede 10MB');
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `remittance_${remittanceId}_${timestamp}_${file.name}`;
    const filePath = `remittances/${firmId}/${remittanceId}/${fileName}`;

    // 1. Subir archivo a Storage
    const { error: storageError } = await supabase.storage
      .from('remittances')
      .upload(filePath, file);

    if (storageError) throw storageError;

    // 2. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('remittances')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData?.publicUrl;
    if (!fileUrl) throw new Error('No se pudo generar URL del archivo');

    // 3. Crear registro en BD
    const { data, error } = await supabase
      .from('remittance_attachments')
      .insert([{
        firm_id: firmId,
        remittance_id: remittanceId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: fileUrl,
        description: description || null,
        uploaded_by: uploadedBy || null
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
      fileUrl: fileUrl
    };
  } catch (error) {
    console.error('Error en subirAdjuntoRemito:', error);
    throw error;
  }
}

/**
 * Obtener todos los adjuntos de un remito
 */
export async function obtenerAdjuntosRemito(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('remittance_attachments')
      .select('*')
      .eq('remittance_id', remittanceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error('Error en obtenerAdjuntosRemito:', error);
    throw error;
  }
}

/**
 * Eliminar adjunto
 */
export async function eliminarAdjuntoRemito(attachmentId, filePath) {
  try {
    if (!attachmentId) throw new Error('attachmentId es requerido');

    // 1. Eliminar de Storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('remittances')
        .remove([filePath]);

      if (storageError) console.warn('Error eliminando archivo de storage:', storageError);
    }

    // 2. Eliminar registro de BD
    const { error } = await supabase
      .from('remittance_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en eliminarAdjuntoRemito:', error);
    throw error;
  }
}

/**
 * Actualizar descripción de adjunto
 */
export async function actualizarDescripcionAdjunto(attachmentId, description) {
  try {
    if (!attachmentId) throw new Error('attachmentId es requerido');

    const { data, error } = await supabase
      .from('remittance_attachments')
      .update({ description })
      .eq('id', attachmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en actualizarDescripcionAdjunto:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de adjuntos
 */
export async function obtenerEstadisticasAdjuntos(remittanceId) {
  try {
    if (!remittanceId) throw new Error('remittanceId es requerido');

    const { data, error } = await supabase
      .from('remittance_attachments')
      .select('file_size, file_type')
      .eq('remittance_id', remittanceId);

    if (error) throw error;

    const stats = {
      total_files: data?.length || 0,
      total_size: (data || []).reduce((sum, f) => sum + (f.file_size || 0), 0),
      by_type: {}
    };

    // Agrupar por tipo
    (data || []).forEach(file => {
      const type = file.file_type || 'unknown';
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error en obtenerEstadisticasAdjuntos:', error);
    throw error;
  }
}
