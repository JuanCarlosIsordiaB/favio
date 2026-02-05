import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useFinancialAccounts } from '../../hooks/useFinancialAccounts';
import { Badge } from '../ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Modal para visualizar movimientos (transacciones) de una cuenta financiera
 * @component
 */
export function FinancialAccountMovementsModal({ isOpen, account, onClose }) {
  const { loadMovements } = useFinancialAccounts();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  /**
   * Cargar movimientos cuando se abre el modal
   */
  useEffect(() => {
    if (isOpen && account?.id) {
      loadMovementsData();
    }
  }, [isOpen, account?.id]);

  const loadMovementsData = async () => {
    setLoading(true);
    try {
      const data = await loadMovements(account.id, dateFrom, dateTo);
      setMovements(data || []);
    } catch (err) {
      // Error ya fue manejado por el hook
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener label de método de pago
   */
  const getPaymentMethodLabel = (method) => {
    const labels = {
      'CASH': 'Efectivo',
      'BANK_TRANSFER': 'Transferencia Bancaria',
      'CHECK': 'Cheque',
      'CREDIT_CARD': 'Tarjeta de Crédito',
      'DEBIT_CARD': 'Tarjeta de Débito'
    };
    return labels[method] || method;
  };

  /**
   * Calcular totales
   */
  const totals = movements.reduce((acc, mov) => ({
    totalAmount: acc.totalAmount + (mov.amount_paid || 0),
    totalMovements: acc.totalMovements + 1
  }), { totalAmount: 0, totalMovements: 0 });

  if (!isOpen || !account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Movimientos - {account.name}
            <Badge variant="outline">{account.currency}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros de fecha */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Desde</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button
              onClick={loadMovementsData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Cargando...' : 'Filtrar'}
            </Button>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
            <div>
              <p className="text-sm text-gray-600">Total Movimientos</p>
              <p className="text-2xl font-bold">{totals.totalMovements}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Monto Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {account.currency} {totals.totalAmount.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tabla de movimientos */}
          <div className="border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Cargando movimientos...
              </div>
            ) : movements.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay movimientos para el período seleccionado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Balance Antes</TableHead>
                    <TableHead className="text-right">Balance Después</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    const isDebit = (movement.balance_before || 0) > (movement.balance_after || 0);
                    return (
                      <TableRow key={movement.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {new Date(movement.payment_date).toLocaleDateString('es-UY')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isDebit ? (
                              <>
                                <ArrowUp size={16} className="text-red-500" />
                                <span className="text-red-600">Salida</span>
                              </>
                            ) : (
                              <>
                                <ArrowDown size={16} className="text-green-500" />
                                <span className="text-green-600">Entrada</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getPaymentMethodLabel(movement.payment_method)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {movement.reference_number || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          {isDebit ? '-' : '+'}{account.currency} {(movement.amount_paid || 0).toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {account.currency} {(movement.balance_before || 0).toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {account.currency} {(movement.balance_after || 0).toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
