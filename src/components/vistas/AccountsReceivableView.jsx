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
import { useIncome } from '../../hooks/useIncome';
import { Badge } from '../ui/badge';
import { AlertCircle, Eye, CheckCircle2, Download, DollarSign } from 'lucide-react';
import { exportCuentasPorCobrarPDF, downloadCuentasAsCSV } from '../../services/pdfExport';
import { PartialCollectionModal } from '../modales/PartialCollectionModal';

/**
 * Vista de cuentas por cobrar (ingresos con saldo pendiente)
 * @component
 */
export function AccountsReceivableView({ firmId }) {
  const { loadAccountsReceivable, loading, error, collectPartially } = useIncome();

  const [accountsReceivable, setAccountsReceivable] = useState([]);
  const [selectedForCollection, setSelectedForCollection] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [clients, setClients] = useState([]);
  const [isPartialCollectionModalOpen, setIsPartialCollectionModalOpen] = useState(false);
  const [selectedIncomeForPartialCollection, setSelectedIncomeForPartialCollection] = useState(null);

  /**
   * Cargar cuentas por cobrar al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadAccountsReceivableData();
    }
  }, [firmId]);

  /**
   * Actualizar lista de clientes cuando cambian las cuentas por cobrar
   */
  useEffect(() => {
    const uniqueClients = [...new Set(accountsReceivable.map(a => a.client_name))].sort();
    setClients(uniqueClients);
  }, [accountsReceivable]);

  const loadAccountsReceivableData = async () => {
    try {
      const data = await loadAccountsReceivable(firmId, {});
      setAccountsReceivable(data || []);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  /**
   * Calcular estado de cobranza
   */
  const getCollectionStatus = (income) => {
    if (!income.due_date) return 'sin-vencimiento';

    const today = new Date();
    const dueDate = new Date(income.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'soon';
    if (daysUntilDue <= 15) return 'medium';
    return 'normal';
  };

  /**
   * Obtener color de estado
   */
  const getStatusColor = (status) => {
    switch (status) {
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
   * Obtener etiqueta de estado
   */
  const getStatusLabel = (status) => {
    switch (status) {
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
  const filteredData = accountsReceivable.filter(income => {
    const status = getCollectionStatus(income);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      `${income.invoice_series || ''}-${income.invoice_number || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (income.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = filterClient === '' || income.client_name === filterClient;

    return matchesStatus && matchesSearch && matchesClient;
  });

  /**
   * Manejar selección de ingresos
   */
  const handleToggleIncome = (incomeId) => {
    setSelectedForCollection(prev => ({
      ...prev,
      [incomeId]: !prev[incomeId]
    }));
  };

  /**
   * Seleccionar todas las cuentas filtradas
   */
  const handleSelectAll = () => {
    const newSelected = {};
    filteredData.forEach(income => {
      newSelected[income.id] = true;
    });
    setSelectedForCollection(newSelected);
  };

  /**
   * Deseleccionar todas
   */
  const handleDeselectAll = () => {
    setSelectedForCollection({});
  };

  /**
   * Abrir modal de cobro parcial
   */
  const handleOpenPartialCollectionModal = (income) => {
    setSelectedIncomeForPartialCollection(income);
    setIsPartialCollectionModalOpen(true);
  };

  /**
   * Manejar cobro parcial
   */
  const handlePartialCollection = async (collectionData) => {
    try {
      await collectPartially(
        collectionData.income_id,
        collectionData.collection_amount,
        collectionData.payment_method,
        collectionData.reference_number,
        collectionData.account_id,
        collectionData.notes,
        'usuario' // userId - obtener del contexto en una versión real
      );

      // Recargar datos
      const data = await loadAccountsReceivable(firmId, {});
      setAccountsReceivable(data || []);

      // Cerrar modal
      setIsPartialCollectionModalOpen(false);
      setSelectedIncomeForPartialCollection(null);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const selectedCount = Object.values(selectedForCollection).filter(Boolean).length;
  const totalAmount = Object.entries(selectedForCollection)
    .filter(([_, isSelected]) => isSelected)
    .reduce((sum, [incomeId, _]) => {
      const income = accountsReceivable.find(i => i.id === incomeId);
      return sum + (income?.balance || 0);
    }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cuentas por Cobrar</h2>
        <div className="flex items-center gap-4">
          {selectedCount > 0 && (
            <span className="text-sm font-semibold text-gray-600">
              {selectedCount} ingreso(s) seleccionado(s) • {accountsReceivable[0]?.currency} {totalAmount.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
            </span>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                downloadCuentasAsCSV(filteredData, `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.csv`);
              }}
              disabled={loading || filteredData.length === 0}
              variant="outline"
              size="sm"
              data-testid="btn-export-csv-receivable"
            >
              <Download size={16} className="mr-2" />
              Descargar CSV
            </Button>
            <Button
              onClick={() => {
                exportCuentasPorCobrarPDF(filteredData);
              }}
              disabled={loading || filteredData.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
              data-testid="btn-export-pdf-receivable"
            >
              <Download size={16} className="mr-2" />
              Imprimir PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-4 gap-3">
        <Input
          placeholder="Buscar por Nº Comprobante o Cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-receivable"
        />

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Estado de Cobranza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="soon">Próximos 7 días</SelectItem>
            <SelectItem value="medium">Próximos 15 días</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client} value={client}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <span className="font-semibold">{selectedCount} ingreso(s) seleccionado(s)</span>
            <span className="text-xl font-bold text-blue-600">
              {accountsReceivable[0]?.currency || 'UYU'} {totalAmount.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table data-testid="receivable-table">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedCount === filteredData.length && filteredData.length > 0}
                  onCheckedChange={selectedCount > 0 ? handleDeselectAll : handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nº Comprobante</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="text-right">Monto Total</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="10" className="text-center py-8 text-gray-500">
                  Cargando cuentas por cobrar...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan="10" className="text-center py-8 text-gray-500">
                  No hay cuentas por cobrar
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(income => {
                const status = getCollectionStatus(income);
                const daysUntilDue = Math.ceil(
                  (new Date(income.due_date || new Date()) - new Date()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <TableRow key={income.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedForCollection[income.id] || false}
                        onCheckedChange={() => handleToggleIncome(income.id)}
                        data-testid={`checkbox-select-${income.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(status)}>
                        {getStatusLabel(status)}
                        {daysUntilDue !== 0 && ` (${Math.abs(daysUntilDue)}d)`}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{income.client_name}</TableCell>
                    <TableCell>{income.invoice_series}-{income.invoice_number}</TableCell>
                    <TableCell>{income.invoice_date}</TableCell>
                    <TableCell className="text-sm">{income.category}</TableCell>
                    <TableCell>
                      {income.due_date ? (
                        <span className={daysUntilDue < 0 ? 'text-red-600 font-semibold' : ''}>
                          {income.due_date}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {income.currency} {income.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {income.currency} {income.total_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" title="Ver detalle" data-testid={`btn-view-${income.id}`}>
                          <Eye size={16} />
                        </button>
                        {['CONFIRMED', 'COLLECTED_PARTIAL'].includes(income.status) && income.balance > 0 && (
                          <button
                            onClick={() => handleOpenPartialCollectionModal(income)}
                            className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-50"
                            title="Registrar cobro parcial"
                            data-testid={`btn-partial-collection-${income.id}`}
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        {['CONFIRMED', 'COLLECTED_PARTIAL'].includes(income.status) && (
                          <button className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50" title="Marcar como cobrado" data-testid={`btn-mark-collected-${income.id}`}>
                            <CheckCircle2 size={16} />
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

      {/* Partial Collection Modal */}
      <PartialCollectionModal
        isOpen={isPartialCollectionModalOpen}
        income={selectedIncomeForPartialCollection}
        onSubmit={handlePartialCollection}
        onCancel={() => {
          setIsPartialCollectionModalOpen(false);
          setSelectedIncomeForPartialCollection(null);
        }}
      />
    </div>
  );
}
