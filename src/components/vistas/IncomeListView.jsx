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
import { useIncome } from '../../hooks/useIncome';
import { useAuth } from '../../contexts/AuthContext';
import { IncomeFormModal } from '../modales/IncomeFormModal';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { AlertCircle, Edit, Trash2, Eye, Plus, CheckCircle2 } from 'lucide-react';

const statusBadgeColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  CONFIRMED: 'bg-blue-200 text-blue-800',
  COLLECTED_PARTIAL: 'bg-yellow-200 text-yellow-800',
  COLLECTED: 'bg-green-700 text-white',
  CANCELLED: 'bg-red-200 text-red-800'
};

const statusLabels = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  COLLECTED_PARTIAL: 'Cobrado Parcial',
  COLLECTED: 'Cobrado',
  CANCELLED: 'Anulado'
};

/**
 * Vista de lista de ingresos
 * @component
 */
export function IncomeListView({ firmId, onAdd = () => {} }) {
  const { user } = useAuth();
  const { incomes, loading, error, loadIncomes, addIncome, updateIncome, confirmIncome, collectIncome, cancelIncome } = useIncome();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });

  const categories = ['Venta de ganado', 'Venta de granos', 'Servicios', 'Otros ingresos'];
  const statuses = ['DRAFT', 'CONFIRMED', 'COLLECTED_PARTIAL', 'COLLECTED', 'CANCELLED'];

  /**
   * Cargar ingresos al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadIncomes(firmId, buildFilters());
    }
  }, [firmId]);

  /**
   * Construir objeto de filtros para la API
   */
  const buildFilters = () => {
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.category) apiFilters.category = filters.category;
    if (filters.dateFrom && filters.dateTo) {
      apiFilters.dateFrom = filters.dateFrom;
      apiFilters.dateTo = filters.dateTo;
    }
    return apiFilters;
  };

  /**
   * Filtrar por búsqueda local
   */
  const filteredIncomes = incomes.filter(income => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      `${income.invoice_series || ''}-${income.invoice_number || ''}`.toLowerCase().includes(searchLower) ||
      (income.client_name || '').toLowerCase().includes(searchLower)
    );
  });

  const handleOpenModal = (income = null) => {
    if (income) {
      setEditingIncome(income);
      setIsEditing(true);
    } else {
      setEditingIncome(null);
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncome(null);
    setIsEditing(false);
  };

  const handleSubmitModal = async (formData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && editingIncome) {
        await updateIncome(editingIncome.id, formData);
      } else {
        await addIncome({ ...formData, firm_id: firmId });
      }
      handleCloseModal();
      onAdd?.();
    } catch (err) {
      // Error ya fue manejado por el hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (income) => {
    if (!window.confirm(`¿Confirmar ingreso de ${income.client_name}?`)) {
      return;
    }

    // Validar autenticación
    if (!user?.id) {
      toast.error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      await confirmIncome(income.id, user.id);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleCollect = async (income) => {
    // Validar autenticación
    if (!user?.id) {
      toast.error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    // En una implementación real, esto abriría un modal para registrar detalles de cobro
    const paymentMethod = prompt(`Método de pago para ${income.client_name}:`);
    if (!paymentMethod) return;

    try {
      const reference = prompt('Referencia del pago (cheque, transferencia, etc):') || '';
      await collectIncome(income.id, user.id, paymentMethod, reference);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleCancel = async (income) => {
    // Validar autenticación
    if (!user?.id) {
      toast.error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    const reason = prompt(`¿Motivo de anulación del ingreso de ${income.client_name}?`);
    if (!reason) return;

    try {
      await cancelIncome(income.id, user.id, reason);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    if (firmId) {
      const apiFilters = {};
      if (newFilters.status) apiFilters.status = newFilters.status;
      if (newFilters.category) apiFilters.category = newFilters.category;
      if (newFilters.dateFrom && newFilters.dateTo) {
        apiFilters.dateFrom = newFilters.dateFrom;
        apiFilters.dateTo = newFilters.dateTo;
      }
      loadIncomes(firmId, apiFilters);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ingresos Financieros</h2>
        <Button onClick={() => handleOpenModal()} disabled={loading}>
          <Plus size={18} className="mr-2" />
          Nuevo Ingreso
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-5 gap-3">
        <Input
          placeholder="Buscar por Nº Comprobante o Cliente..."
          value={filters.searchTerm}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
        />

        <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          placeholder="Desde"
        />

        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          placeholder="Hasta"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Estado</TableHead>
              <TableHead>Nº Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-8 text-gray-500">
                  Cargando ingresos...
                </TableCell>
              </TableRow>
            ) : filteredIncomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-8 text-gray-500">
                  No hay ingresos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredIncomes.map(income => (
                <TableRow key={income.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Badge className={statusBadgeColors[income.status]}>
                      {statusLabels[income.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {income.invoice_series}-{income.invoice_number}
                  </TableCell>
                  <TableCell>{income.client_name}</TableCell>
                  <TableCell>{income.invoice_date}</TableCell>
                  <TableCell>{income.category}</TableCell>
                  <TableCell className="text-right">
                    {income.currency} {income.total_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {income.currency} {income.collected_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={income.balance > 0 ? 'text-orange-600' : 'text-green-600'}>
                      {income.currency} {income.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>

                      {['DRAFT'].includes(income.status) && (
                        <button
                          className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                          onClick={() => handleOpenModal(income)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {income.status === 'DRAFT' && (
                        <button
                          className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          onClick={() => handleConfirm(income)}
                          title="Confirmar"
                        >
                          ✓
                        </button>
                      )}

                      {['CONFIRMED', 'COLLECTED_PARTIAL'].includes(income.status) && (
                        <button
                          className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50"
                          onClick={() => handleCollect(income)}
                          title="Cobrar"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}

                      {!['COLLECTED', 'CANCELLED'].includes(income.status) && (
                        <button
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          onClick={() => handleCancel(income)}
                          title="Anular"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <IncomeFormModal
        isOpen={showModal}
        isEditing={isEditing}
        income={editingIncome}
        firmId={firmId}
        onSubmit={handleSubmitModal}
        onCancel={handleCloseModal}
        isLoading={isSubmitting}
      />
    </div>
  );
}
