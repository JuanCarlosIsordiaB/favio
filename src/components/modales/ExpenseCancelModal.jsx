import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

/**
 * Modal para anular una factura de compra
 * @component
 */
export function ExpenseCancelModal({
  isOpen = false,
  expense = null,
  onConfirm = () => {},
  onCancel = () => {},
  isLoading = false
}) {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  const commonReasons = [
    'Error de carga',
    'Cambio de proveedor',
    'Factura duplicada',
    'Cancelación del pedido',
    'Otro'
  ];

  const handleConfirm = () => {
    const newErrors = {};

    if (!reason?.trim()) {
      newErrors.reason = 'Debe especificar un motivo de anulación';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm(reason);
      handleClose();
    }
  };

  const handleClose = () => {
    setReason('');
    setErrors({});
    onCancel();
  };

  const handleSelectReason = (selectedReason) => {
    setReason(selectedReason);
    if (errors.reason) {
      setErrors(prev => ({ ...prev, reason: '' }));
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anular Factura</DialogTitle>
          <DialogDescription>
            Estás a punto de anular la factura {expense.invoice_series}-{expense.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la factura */}
          <div className="bg-gray-50 p-3 rounded border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Proveedor:</span>
                <p className="font-medium">{expense.provider_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <p className="font-medium">
                  {expense.currency} {expense.total_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Razones predefinidas */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Motivo (Selecciona o describe)</Label>
            <div className="space-y-2 mb-3">
              {commonReasons.map(r => (
                <button
                  key={r}
                  onClick={() => handleSelectReason(r)}
                  className={`w-full text-left px-3 py-2 rounded border transition ${
                    reason === r
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de texto para detalle */}
          <div>
            <Label htmlFor="reason_detail" className="text-sm">Detalle adicional (opcional)</Label>
            <Textarea
              id="reason_detail"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) {
                  setErrors(prev => ({ ...prev, reason: '' }));
                }
              }}
              placeholder="Explica con más detalle el motivo de la anulación..."
              rows={4}
              disabled={isLoading}
              className="text-sm"
            />
            {errors.reason && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                <AlertCircle size={14} />
                {errors.reason}
              </div>
            )}
          </div>

          {/* Advertencia */}
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            <p className="font-semibold mb-1">⚠️ Acción irreversible</p>
            <p>La anulación se registrará en auditoría y no se puede deshacer.</p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Anulando...' : 'Anular Factura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
