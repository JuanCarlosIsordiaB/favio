import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Upload, Download, Trash2, FileIcon, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { subirAdjuntoRemito, obtenerAdjuntosRemito, eliminarAdjuntoRemito } from '../../services/remittanceAttachments';

export default function RemittanceAttachmentsModal({ isOpen, remittance, onClose, firmId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Cargar adjuntos al abrir
  useEffect(() => {
    if (isOpen && remittance?.id) {
      loadAttachments();
    }
  }, [isOpen, remittance?.id]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const { data } = await obtenerAdjuntosRemito(remittance.id);
      setAttachments(data || []);
    } catch (error) {
      toast.error('Error cargando adjuntos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de drag & drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data, error } = await subirAdjuntoRemito(
          remittance.id,
          firmId,
          file,
          `Adjunto ${attachments.length + i + 1}`
        );

        if (error) throw error;
      }
      toast.success(`${files.length} archivo(s) subido(s) exitosamente`);
      await loadAttachments();
    } catch (error) {
      toast.error('Error subiendo archivos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId, filePath) => {
    if (!confirm('¿Eliminar este adjunto?')) return;

    try {
      await eliminarAdjuntoRemito(attachmentId, filePath);
      toast.success('Adjunto eliminado');
      await loadAttachments();
    } catch (error) {
      toast.error('Error eliminando adjunto: ' + error.message);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen || !remittance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjuntos - Remito {remittance.remittance_number}</DialogTitle>
          <DialogDescription>
            Gestiona fotos y documentos asociados a este remito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Zona de Carga */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agregar Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                <p className="text-sm text-slate-600 mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-500">
                  Máximo 10MB por archivo. Soportados: fotos, PDF, documentos
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  disabled={uploading}
                  className="hidden"
                  id="file-input"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <label htmlFor="file-input">
                  <Button
                    as="span"
                    variant="outline"
                    className="mt-3"
                    disabled={uploading}
                  >
                    {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Adjuntos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Archivos ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Cargando...</p>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No hay archivos adjuntos
                </p>
              ) : (
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getFileIcon(attachment.file_type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(attachment.file_size)}
                            {attachment.description && ` • ${attachment.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(attachment.id, attachment.file_url)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
