/**
 * WorkAttachmentUploader Component
 * Allows uploading and managing attachments (photos/documents) for works
 * Reutilizable para formularios de trabajos agrícolas y ganaderos
 */

import React, { useState, useEffect } from 'react';
import { FileUp, Trash2, Image, File, Loader, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { subirArchivoTrabajo, obtenerAdjuntosTrabajo, eliminarAdjunto, crearReferenciaAdjunto } from '../services/workAttachments';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function WorkAttachmentUploader({ workId, workType, isReadOnly = false }) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Cargar adjuntos al montar o cambiar workId
  useEffect(() => {
    if (workId && workType) {
      loadAttachments();
    }
  }, [workId, workType]);

  async function loadAttachments() {
    setLoading(true);
    try {
      const data = await obtenerAdjuntosTrabajo(workId, workType);
      setAttachments(data || []);
    } catch (error) {
      console.error('Error cargando adjuntos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Subir archivo
        const uploadResult = await subirArchivoTrabajo(workType, workId, file);

        // Crear referencia en BD
        await crearReferenciaAdjunto({
          workId,
          workType,
          filename: uploadResult.filename,
          path: uploadResult.path,
          url: uploadResult.url,
          type: uploadResult.type,
          size: uploadResult.size,
          uploadedBy: user?.id,
          uploadedAt: uploadResult.uploadedAt
        });

        toast.success(`✓ ${file.name} subido correctamente`);
      }

      // Recargar adjuntos
      await loadAttachments();
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      toast.error('Error al subir archivo: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId, filePath) {
    if (!window.confirm('¿Eliminar este adjunto?')) return;

    try {
      await eliminarAdjunto(attachmentId, filePath);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast.success('✓ Adjunto eliminado');
    } catch (error) {
      console.error('Error eliminando adjunto:', error);
      toast.error('Error al eliminar: ' + error.message);
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    return <File size={16} className="text-gray-500" />;
  }

  if (!workId || !workType) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 text-sm">
        Guarda el trabajo primero para agregar adjuntos
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!isReadOnly && (
        <div
          data-id="work-attachment-dropzone"
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-green-500 bg-green-50'
              : 'border-slate-300 bg-slate-50 hover:border-green-400'
          }`}
        >
          <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
          <p className="text-sm font-medium text-slate-700">
            Arrastra archivos aquí o
          </p>
          <label className="inline-block mt-2">
            <span className="text-sm text-green-600 hover:text-green-700 cursor-pointer font-medium">
              selecciona desde tu computadora
            </span>
            <input
              type="file"
              data-id="work-attachment-input"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-500 mt-2">
            Max 10MB · JPG, PNG, GIF, WEBP, PDF
          </p>

          {uploading && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm text-slate-600">Subiendo...</span>
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      <div data-id="work-attachments-list">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader size={20} className="animate-spin" />
            <span className="text-slate-600">Cargando adjuntos...</span>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <File size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin adjuntos aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Adjuntos ({attachments.length})
            </h4>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                data-id={`work-attachment-${attachment.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(attachment.file_type)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(attachment.file_size)} · {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-600 hover:text-blue-600 transition-colors"
                    title="Descargar"
                  >
                    <Download size={16} />
                  </a>

                  {!isReadOnly && (
                    <button
                      data-id={`work-attachment-delete-${attachment.id}`}
                      onClick={() => handleDelete(attachment.id, attachment.file_path)}
                      className="p-1.5 text-slate-600 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Los adjuntos se guardan cuando apruebes el trabajo. Sirven para auditoría y trazabilidad.
        </p>
      </div>
    </div>
  );
}
