import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Download, FileText, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { exportarRemitoPDF } from '../../services/remittanceExports';
import RemittanceAttachmentsModal from './RemittanceAttachmentsModal';

export default function RemittanceDetailModal({ isOpen, remittance, onClose, onReceive, firm }) {
  const [showAttachments, setShowAttachments] = useState(false);

  if (!isOpen || !remittance) return null;

  const handleExportPDF = async () => {
    try {
      exportarRemitoPDF(remittance, firm);
      toast.success('PDF descargado exitosamente');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error descargando PDF: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'in_transit': 'bg-blue-100 text-blue-800',
      'received': 'bg-green-100 text-green-800',
      'partially_received': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'in_transit': 'En Tránsito',
      'received': 'Recibido',
      'partially_received': 'Parcialmente Recibido',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Remito {remittance.remittance_number}</DialogTitle>
              <DialogDescription>{remittance.supplier_name}</DialogDescription>
            </div>
            <Badge className={getStatusColor(remittance.status)}>
              {getStatusLabel(remittance.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Información General */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Fecha:</span>
                <p className="font-medium">{remittance.remittance_date}</p>
              </div>
              <div>
                <span className="text-slate-600">Proveedor RUT:</span>
                <p className="font-medium">{remittance.supplier_rut || '-'}</p>
              </div>
              <div>
                <span className="text-slate-600">Predio:</span>
                <p className="font-medium">{remittance.premise?.name || '-'}</p>
              </div>
              <div>
                <span className="text-slate-600">Depósito:</span>
                <p className="font-medium">{remittance.depot?.name || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">Recibido por:</span>
                <p className="font-medium">{remittance.received_by || '-'}</p>
              </div>
              {remittance.received_date && (
                <div className="col-span-2">
                  <span className="text-slate-600">Fecha de Recepción:</span>
                  <p className="font-medium">{remittance.received_date}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ítems */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ítems ({remittance.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Insumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remittance.items?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.item_description}</TableCell>
                        <TableCell className="text-right">{item.quantity_received || item.quantity_ordered}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.input?.name ? '✓' : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {remittance.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{remittance.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Botones */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <div className="flex gap-3">
              <Button
                onClick={handleExportPDF}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button
                onClick={() => setShowAttachments(true)}
                variant="outline"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Adjuntos
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {remittance.status === 'in_transit' && onReceive && (
                <Button
                  onClick={() => onReceive(remittance.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Procesar Recepción
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Modal de Adjuntos */}
      <RemittanceAttachmentsModal
        isOpen={showAttachments}
        remittance={remittance}
        onClose={() => setShowAttachments(false)}
        firmId={firm?.id}
      />
    </Dialog>
  );
}
