import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { useExpenses } from '../../hooks/useExpenses';
import { Badge } from '../ui/badge';
import { AlertCircle, Eye, Plus, CreditCard, Download, Calendar, FileText } from 'lucide-react';
import { exportCuentasPorPagarPDF, downloadCuentasAsCSV } from '../../services/pdfExport';
import { supabase } from '../../lib/supabase';

/**
 * Vista de cuentas por pagar (facturas con saldo pendiente)
 * @component
 */
export function AccountsPayableView({ firmId, onCreatePaymentOrder = () => {} }) {
  const { loadAccountsPayable, loading, error } = useExpenses();

  const [accountsPayable, setAccountsPayable] = useState([]);
  const [selectedForPayment, setSelectedForPayment] = useState({});
  const [filterUrgency, setFilterUrgency] = useState('all'); // all, overdue, soon, normal
  const [filterType, setFilterType] = useState('all'); // all, manual, auto (programadas)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterCostCenter, setFilterCostCenter] = useState('');

  const [providers, setProviders] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  /**
   * Cargar cuentas por pagar al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadAccountsPayableData();
    }
  }, [firmId]);

  /**
   * Cargar centros de costo cuando cambia la firma
   */
  useEffect(() => {
    if (firmId) {
      loadCostCenters();
    }
  }, [firmId]);

  const loadCostCenters = async () => {
    try {
      const { data } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('firm_id', firmId)
        .eq('is_active', true)
        .order('name');

      if (data) setCostCenters(data);
    } catch (err) {
      console.error('Error cargando centros de costo:', err);
    }
  };

  /**
   * Actualizar lista de proveedores cuando cambian las cuentas por pagar
   */
  useEffect(() => {
    const uniqueProviders = [...new Set(accountsPayable.map(a => a.provider_name))].sort();
    setProviders(uniqueProviders);
  }, [accountsPayable]);

  const loadAccountsPayableData = async () => {
    try {
      const data = await loadAccountsPayable(firmId, {});
      setAccountsPayable(data || []);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  /**
   * Calcular urgencia de una factura
   */
  const getUrgency = (expense) => {
    if (!expense.due_date) return 'sin-vencimiento';

    const today = new Date();
    const dueDate = new Date(expense.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'soon';
    if (daysUntilDue <= 15) return 'medium';
    return 'normal';
  };

  /**
   * Obtener color de urgencia
   */
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'soon':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  /**
   * Obtener etiqueta de urgencia
   */
  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return 'Vencida';
      case 'soon':
        return 'Próxima 7 días';
      case 'medium':
        return 'Próxima 15 días';
      default:
        return 'Normal';
    }
  };

  /**
   * Filtrar datos
   */
  const filteredData = accountsPayable.filter(expense => {
    const urgency = getUrgency(expense);
    const matchesUrgency = filterUrgency === 'all' || urgency === filterUrgency;
    const matchesSearch = searchTerm === '' ||
      `${expense.invoice_series}-${expense.invoice_number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.provider_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = filterProvider === '' || expense.provider_name === filterProvider;
    const matchesCostCenter = filterCostCenter === '' || expense.cost_center_id === filterCostCenter;
    // Filtro por tipo: manual vs programadas (auto-generadas)
    const matchesType = filterType === 'all' ||
      (filterType === 'manual' && !expense.is_auto_generated) ||
      (filterType === 'auto' && expense.is_auto_generated);

    return matchesUrgency && matchesSearch && matchesProvider && matchesCostCenter && matchesType;
  });

  /**
   * Manejar selección de facturas
   */
  const handleToggleExpense = (expenseId) => {
    setSelectedForPayment(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  /**
   * Seleccionar todas las facturas filtradas
   */
  const handleSelectAll = () => {
    const newSelected = {};
    filteredData.forEach(expense => {
      newSelected[expense.id] = true;
    });
    setSelectedForPayment(newSelected);
  };

  /**
   * Deseleccionar todas
   */
  const handleDeselectAll = () => {
    setSelectedForPayment({});
  };

  /**
   * Preparar órdenes de pago para las seleccionadas
   */
  const handleCreatePaymentOrder = () => {
    const selected = Object.entries(selectedForPayment)
      .filter(([_, isSelected]) => isSelected)
      .map(([expenseId, _]) => accountsPayable.find(e => e.id === expenseId))
      .filter(Boolean);

    if (selected.length === 0) {
      alert('Debes seleccionar al menos una factura');
      return;
    }

    onCreatePaymentOrder(selected);
  };

  const selectedCount = Object.values(selectedForPayment).filter(Boolean).length;
  const totalAmount = Object.entries(selectedForPayment)
    .filter(([_, isSelected]) => isSelected)
    .reduce((sum, [expenseId, _]) => {
      const expense = accountsPayable.find(e => e.id === expenseId);
      return sum + (expense?.balance || 0);
    }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cuentas por Pagar</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              downloadCuentasAsCSV(filteredData, `cuentas_por_pagar_${new Date().toISOString().split('T')[0]}.csv`);
            }}
            disabled={loading || filteredData.length === 0}
            variant="outline"
            data-testid="btn-export-csv-payable"
          >
            <Download size={18} className="mr-2" />
            Descargar CSV
          </Button>
          <Button
            onClick={() => {
              exportCuentasPorPagarPDF(filteredData);
            }}
            disabled={loading || filteredData.length === 0}
            className="bg-green-600 hover:bg-green-700"
            data-testid="btn-export-pdf-payable"
          >
            <Download size={18} className="mr-2" />
            Imprimir PDF
          </Button>
          <Button
            onClick={handleCreatePaymentOrder}
            disabled={loading || selectedCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="btn-create-order"
          >
            <CreditCard size={18} className="mr-2" />
            Crear Orden de Pago ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border space-y-3">
        <div className="grid grid-cols-5 gap-3">
          <Input
            placeholder="Buscar por Nº Factura o Proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-payable"
          />

          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger>
              <SelectValue placeholder="Urgencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="soon">Próximos 7 días</SelectItem>
              <SelectItem value="medium">Próximos 15 días</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de Factura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Facturas</SelectItem>
              <SelectItem value="manual">Solo Manuales</SelectItem>
              <SelectItem value="auto">Solo Programadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              {providers.map(provider => (
                <SelectItem key={provider} value={provider}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
            <SelectTrigger>
              <SelectValue placeholder="Centro de Costo" />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFilterUrgency('all');
              setFilterType('all');
              setFilterProvider('');
              setFilterCostCenter('');
              setSearchTerm('');
            }}
            disabled={loading}
          >
            Limpiar Filtros
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSelectAll}
            disabled={loading}
            className="flex-1"
          >
            Seleccionar Todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeselectAll}
            disabled={loading}
            className="flex-1"
          >
            Deseleccionar
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Resumen */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{selectedCount} factura(s) seleccionada(s)</span>
            <span className="text-xl font-bold text-blue-600">
              UYU {totalAmount.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table data-testid="payable-table">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedCount === filteredData.length && filteredData.length > 0}
                  onCheckedChange={selectedCount > 0 ? handleDeselectAll : handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Urgencia</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Nº Factura</TableHead>
              <TableHead>Fecha Registro</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="text-right">Monto Factura</TableHead>
              <TableHead>Centro de Costo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="10" className="text-center py-8 text-gray-500">
                  Cargando cuentas por pagar...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan="10" className="text-center py-8 text-gray-500">
                  No hay cuentas por pagar
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(expense => {
                const urgency = getUrgency(expense);
                const daysUntilDue = Math.ceil(
                  (new Date(expense.due_date) - new Date()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <TableRow key={expense.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedForPayment[expense.id] || false}
                        onCheckedChange={() => handleToggleExpense(expense.id)}
                        data-testid={`checkbox-select-${expense.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getUrgencyColor(urgency)}>
                          {getUrgencyLabel(urgency)}
                          {daysUntilDue !== 0 && ` (${Math.abs(daysUntilDue)}d)`}
                        </Badge>
                        {expense.is_auto_generated && (
                          <>
                            <Badge className="inline-flex items-center gap-1 bg-blue-100 text-blue-700">
                              <Calendar size={12} />
                              Cuota {expense.installment_number}/{expense.total_installments}
                            </Badge>
                            {expense.purchase_order_id && (
                              <Badge className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs">
                                ✓ Auto-sincronizada
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{expense.provider_name}</TableCell>
                    <TableCell>{expense.invoice_series}-{expense.invoice_number}</TableCell>
                    <TableCell>{new Date(expense.date).toLocaleDateString('es-UY')}</TableCell>
                    <TableCell>
                      {expense.due_date ? (
                        <span className={daysUntilDue < 0 ? 'text-red-600 font-semibold' : ''}>
                          {expense.due_date}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {expense.currency} {expense.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {expense.currency} {expense.total_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">-</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" data-testid={`btn-pay-${expense.id}`}>
                          <Eye size={16} />
                        </button>
                        {expense.is_auto_generated && expense.purchase_order_id && (
                          <button
                            className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 flex items-center gap-1"
                            title="Ver orden de compra origen"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
