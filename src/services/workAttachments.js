/**
 * MÓDULO 06: GESTIÓN DE ADJUNTOS EN TRABAJOS
 *
 * Maneja upload/download de fotos y documentos en trabajos agrícolas y ganaderos
 * Almacenamiento en Supabase Storage con referencia en BD
 */

import { supabase } from '../lib/supabase';

/**
 * Sube un archivo (foto/documento) a Supabase Storage
 * @param {string} workType - 'agricultural' o 'livestock'
 * @param {string} workId - ID del trabajo
 * @param {File} file - Archivo a subir
 * @returns {Promise<Object>} { success: boolean, url: string, path: string }
 */
export async function subirArchivoTrabajo(workType, workId, file) {
  try {
    if (!file) throw new Error('Archivo no válido');

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('El archivo es demasiado grande (máximo 10MB)');
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo: JPG, PNG, GIF, WEBP, PDF');
    }

    // Crear path: works/{tipo}/{workId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `works/${workType}/${workId}/${timestamp}-${sanitizedName}`;

    // Upload a Supabase Storage
    const { data, error } = await supabase.storage
      .from('work_attachments')
      .upload(path, file);

    if (error) throw error;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('work_attachments')
      .getPublicUrl(path);

    return {
      success: true,
      url: publicUrl,
      path: data.path,
      filename: sanitizedName,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw error;
  }
}

/**
 * Crea referencia de adjunto en BD
 * @param {Object} attachmentData - { workId, workType, url, path, filename, type, uploadedBy }
 * @returns {Promise<Object>} Registro creado
 */
export async function crearReferenciaAdjunto(attachmentData) {
  try {
    const { data, error } = await supabase
      .from('work_attachments')
      .insert([{
        work_id: attachmentData.workId,
        work_type: attachmentData.workType,
        filename: attachmentData.filename,
        file_path: attachmentData.path,
        file_url: attachmentData.url,
        file_type: attachmentData.type,
        file_size: attachmentData.size,
        uploaded_by: attachmentData.uploadedBy,
        uploaded_at: attachmentData.uploadedAt || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creando referencia de adjunto:', error);
    throw error;
  }
}

/**
 * Obtiene todos los adjuntos de un trabajo
 * @param {string} workId - ID del trabajo
 * @param {string} workType - 'agricultural' o 'livestock'
 * @returns {Promise<Array>} Lista de adjuntos
 */
export async function obtenerAdjuntosTrabajo(workId, workType) {
  try {
    const { data, error } = await supabase
      .from('work_attachments')
      .select('*')
      .eq('work_id', workId)
      .eq('work_type', workType)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo adjuntos:', error);
    throw error;
  }
}

/**
 * Elimina un adjunto (archivo + referencia)
 * @param {string} attachmentId - ID del adjunto en BD
 * @param {string} filePath - Path del archivo en Storage
 * @returns {Promise<Object>} { success: boolean }
 */
export async function eliminarAdjunto(attachmentId, filePath) {
  try {
    // 1. Eliminar archivo de Storage
    const { error: storageError } = await supabase.storage
      .from('work_attachments')
      .remove([filePath]);

    if (storageError) {
      console.warn('Advertencia eliminando archivo de storage:', storageError);
      // No lanzar error, continuar con BD
    }

    // 2. Eliminar referencia de BD
    const { error: dbError } = await supabase
      .from('work_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    return { success: true };
  } catch (error) {
    console.error('Error eliminando adjunto:', error);
    throw error;
  }
}

/**
 * Descarga un archivo (genera URL temporal si es privado)
 * @param {string} filePath - Path del archivo en Storage
 * @returns {Promise<string>} URL para descargar
 */
export async function descargarAdjunto(filePath) {
  try {
    // Si ya es pública, simplemente retorna la URL
    // Si es privada, crearía URL temporal de 1 hora
    const { data, error } = await supabase.storage
      .from('work_attachments')
      .createSignedUrl(filePath, 3600); // URL válida por 1 hora

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error descargando adjunto:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de adjuntos de un trabajo
 * @param {string} workId - ID del trabajo
 * @returns {Promise<Object>} { count, totalSize, byType }
 */
export async function obtenerEstadisticasAdjuntos(workId) {
  try {
    const { data, error } = await supabase
      .from('work_attachments')
      .select('file_type, file_size')
      .eq('work_id', workId);

    if (error) throw error;

    const totalSize = data.reduce((sum, a) => sum + (a.file_size || 0), 0);
    const byType = {};

    data.forEach(a => {
      const type = a.file_type?.split('/')[0] || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      count: data.length,
      totalSize,
      byType
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}
