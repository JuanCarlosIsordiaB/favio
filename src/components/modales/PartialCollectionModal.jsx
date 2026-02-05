import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal para registrar cobro parcial de un ingreso
 * @component
 */
export function PartialCollectionModal({ isOpen, income, onSubmit, onCancel }) {
  const [collectionAmount, setCollectionAmount] = useState(income?.balance?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !income) return null;

  const amount = parseFloat(collectionAmount) || 0;
  const newBalance = income.balance - amount;
  const isFullPayment = newBalance <= 0;

  /**
   * Validar el monto ingresado
   */
  const validateAmount = () => {
    if (!collectionAmount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return false;
    }

    if (amount > income.balance) {
      toast.error(`El monto no puede exceder el saldo pendiente (${income.currency} ${income.balance.toLocaleString('es-UY')})`);
      return false;
    }

    if (!paymentMethod) {
      toast.error('Selecciona un método de pago');
      return false;
    }

    return true;
  };

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async () => {
    if (!validateAmount()) return;

    setLoading(true);
    try {
      await onSubmit({
        income_id: income.id,
        collection_amount: amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        account_id: accountId || null,
        notes: notes || null,
        new_balance: newBalance,
        new_status: isFullPayment ? 'COLLECTED' : 'COLLECTED_PARTIAL'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Cobro Parcial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del ingreso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Comprobante</p>
            <p className="font-semibold">{income.invoice_series}-{income.invoice_number}</p>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs text-gray-600">Cliente</p>
                <p className="font-medium text-sm">{income.client_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Saldo Pendiente</p>
                <p className="font-semibold text-sm text-red-600">
                  {income.currency} {income.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Monto a cobrar */}
          <div>
            <Label htmlFor="amount">Monto a Cobrar *</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">{income.currency}</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max={income.balance}
                disabled={loading}
                className="flex-1"
                data-testid="input-amount"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Máximo disponible: {income.currency} {income.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Validación visual */}
          {amount > 0 && (
            <div className={`p-3 rounded-lg border ${
              isFullPayment
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className={isFullPayment ? 'text-green-600' : 'text-yellow-600'} />
                <div className="text-sm">
                  <p className="font-semibold">Nuevo Balance</p>
                  <p className={isFullPayment ? 'text-green-700' : 'text-yellow-700'}>
                    {income.currency} {newBalance.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </p>
                  {isFullPayment && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Se marcará como cobrado completamente
                    </p>
                  )}
                  {!isFullPayment && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠ Se marcará como cobrado parcialmente
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Método de pago */}
          <div>
            <Label htmlFor="payment-method">Método de Pago *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
              <SelectTrigger id="payment-method" data-testid="select-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Efectivo</SelectItem>
                <SelectItem value="BANK_TRANSFER">Transferencia Bancaria</SelectItem>
                <SelectItem value="CHECK">Cheque</SelectItem>
                <SelectItem value="DEBIT_CARD">Tarjeta de Débito</SelectItem>
                <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nº Referencia */}
          <div>
            <Label htmlFor="reference">Nº de Referencia (opcional)</Label>
            <Input
              id="reference"
              placeholder="Ej: Nº de transferencia, cheque, etc."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={loading}
              data-testid="input-reference"
            />
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <textarea
              id="notes"
              placeholder="Agregar observaciones sobre el cobro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            data-testid="btn-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !collectionAmount || amount <= 0}
            className="bg-green-600 hover:bg-green-700"
            data-testid="btn-save"
          >
            {loading ? 'Guardando...' : 'Registrar Cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
