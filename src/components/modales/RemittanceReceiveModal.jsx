/**
 * RemittanceReceiveModal.jsx
 * Modal para procesar la recepción de un remito
 *
 * Permite:
 * - Ingresar cantidades recibidas
 * - Marcar condición (bueno, dañado, parcial)
 * - Capturar número de lote
 * - Capturar fecha de vencimiento
 * - Vincular a insumos
 * - Confirmar recepción
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { validarRecepcion } from '../../lib/validations/remittanceValidations';

export default function RemittanceReceiveModal({
  isOpen,
  remittance,
  onClose,
  onSubmit,
  isLoading = false
}) {
  const [itemsData, setItemsData] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && remittance?.items) {
      setItemsData(remittance.items.map(item => ({
        ...item,
        quantity_received: item.quantity_received || 0,
        condition: item.condition || 'good',
        batch_number: item.batch_number || '',
        batch_expiry_date: item.batch_expiry_date || ''
      })));
      setErrors({});
    }
  }, [isOpen, remittance]);

  const handleItemChange = (itemId, field, value) => {
    setItemsData(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));

    // Limpiar error
    if (errors[itemId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // Validar
    const validacion = validarRecepcion(itemsData);
    if (!validacion.valido) {
      setErrors(validacion.errores);
      toast.error('Completa las cantidades recibidas correctamente');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(remittance.id, itemsData);
      onClose();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !remittance) return null;

  const totalOrdered = itemsData.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
  const totalReceived = itemsData.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
  const percentage = totalOrdered > 0 ? ((totalReceived / totalOrdered) * 100).toFixed(1) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibir Remito</DialogTitle>
          <DialogDescription>
            {remittance.remittance_number} - {remittance.supplier_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Total Ordenado</div>
                <div className="text-2xl font-bold mt-1">{totalOrdered}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Total Recibido</div>
                <div className="text-2xl font-bold mt-1">{totalReceived}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">% Recepción</div>
                <div className={`text-2xl font-bold mt-1 ${percentage === 100 ? 'text-green-600' : percentage < 100 ? 'text-orange-600' : 'text-red-600'}`}>
                  {percentage}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de ítems */}
          <div className="border rounded-lg overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Ordenado</TableHead>
                  <TableHead className="text-right">Recibido *</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsData.map(item => (
                  <TableRow key={item.id} className={errors[item.id] ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium text-xs whitespace-nowrap">{item.item_description}</TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">{item.quantity_ordered} {item.unit}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity_received}
                        onChange={(e) => handleItemChange(item.id, 'quantity_received', parseFloat(e.target.value) || 0)}
                        className={`w-20 text-right text-xs ${errors[item.id] ? 'border-red-500' : ''}`}
                      />
                      {errors[item.id] && (
                        <p className="text-xs text-red-500 mt-1">{errors[item.id]}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={item.condition} onValueChange={(value) => handleItemChange(item.id, 'condition', value)}>
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Bueno</SelectItem>
                          <SelectItem value="damaged">Dañado</SelectItem>
                          <SelectItem value="partial">Parcial</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Ej: L-001"
                        value={item.batch_number}
                        onChange={(e) => handleItemChange(item.id, 'batch_number', e.target.value)}
                        className="w-20 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.batch_expiry_date}
                        onChange={(e) => handleItemChange(item.id, 'batch_expiry_date', e.target.value)}
                        className="w-28 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Nota importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Importante:</strong> Al confirmar esta recepción, se actualizará automáticamente el stock de los insumos vinculados.
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting || isLoading}
            >
              {submitting || isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Recepción
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
