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
import { useExpenses } from '../../hooks/useExpenses';
import { useAuth } from '../../contexts/AuthContext';
import { ExpenseFormModal } from '../modales/ExpenseFormModal';
import { ExpenseCancelModal } from '../modales/ExpenseCancelModal';
import { Badge } from '../ui/badge';
import { AlertCircle, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';

const statusBadgeColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  REGISTERED: 'bg-blue-200 text-blue-800',
  APPROVED: 'bg-green-200 text-green-800',
  PAID_PARTIAL: 'bg-yellow-200 text-yellow-800',
  PAID: 'bg-green-700 text-white',
  CANCELLED: 'bg-red-200 text-red-800'
};

// Etiquetas estándar para el filtro (sin considerar payment_terms)
const statusLabels = {
  DRAFT: 'Borrador',
  REGISTERED: 'Registrada',
  APPROVED: 'Crédito',
  PAID_PARTIAL: 'Pagada Parcial',
  PAID: 'Contado',
  CANCELLED: 'Anulada'
};

// Función para obtener la etiqueta del estado considerando payment_terms
const getStatusLabel = (expense) => {
  // Si es contado y está pagada, mostrar "Contado"
  if (expense.status === 'PAID' && expense.payment_terms === 'contado') {
    return 'Contado';
  }
  // Si es aprobada y no es contado, mostrar "Crédito"
  if (expense.status === 'APPROVED' && expense.payment_terms !== 'contado') {
    return 'Crédito';
  }
  // Para otros casos, usar las etiquetas estándar
  return statusLabels[expense.status] || expense.status;
};

/**
 * Vista de lista de facturas de compra
 * @component
 */
export function ExpenseListView({ firmId, onAdd = () => {}, onSelectForPayment = () => {} }) {
  const { user } = useAuth();
  const { expenses, loading, error, loadExpenses, addExpense, updateExpense, approveExpense, cancelExpense } = useExpenses();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para el modal de anulación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [expenseToCCancel, setExpenseToCCancel] = useState(null);
  const [isCancellingExpense, setIsCancellingExpense] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });

  const categories = ['Insumos', 'Servicios', 'Mantenimiento', 'Impuestos', 'Otros gastos'];
  const statuses = ['DRAFT', 'REGISTERED', 'APPROVED', 'PAID_PARTIAL', 'PAID', 'CANCELLED'];

  /**
   * Cargar facturas al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadExpenses(firmId, buildFilters());
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
  const filteredExpenses = expenses.filter(expense => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      `${expense.invoice_series}-${expense.invoice_number}`.toLowerCase().includes(searchLower) ||
      (expense.provider_name || '').toLowerCase().includes(searchLower)
    );
  });

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setIsEditing(true);
    } else {
      setEditingExpense(null);
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setIsEditing(false);
  };

  const handleSubmitModal = async (formData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && editingExpense) {
        await updateExpense(editingExpense.id, formData);
      } else {
        await addExpense({ ...formData, firm_id: firmId });
      }
      handleCloseModal();
      onAdd?.();
    } catch (err) {
      // Error ya fue manejado por el hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (expense) => {
    if (!window.confirm(`¿Aprobar factura ${expense.invoice_series}-${expense.invoice_number}?`)) {
      return;
    }

    // Validar autenticación
    if (!user?.id) {
      toast.error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      await approveExpense(expense.id, user.id);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  /**
   * Abrir modal para anular factura
   */
  const handleOpenCancelModal = (expense) => {
    setExpenseToCCancel(expense);
    setShowCancelModal(true);
  };

  /**
   * Confirmar anulación desde el modal
   */
  const handleConfirmCancelExpense = async (reason) => {
    if (!expenseToCCancel) return;

    // Validar autenticación
    if (!user?.id) {
      toast.error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    setIsCancellingExpense(true);
    try {
      await cancelExpense(expenseToCCancel.id, user.id, reason);
      setShowCancelModal(false);
      setExpenseToCCancel(null);
    } catch (err) {
      // Error ya fue manejado por el hook
    } finally {
      setIsCancellingExpense(false);
    }
  };

  /**
   * Cerrar modal de anulación
   */
  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setExpenseToCCancel(null);
    setIsCancellingExpense(false);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    // Recargar con nuevos filtros
    if (firmId) {
      const apiFilters = {};
      if (newFilters.status) apiFilters.status = newFilters.status;
      if (newFilters.category) apiFilters.category = newFilters.category;
      if (newFilters.dateFrom && newFilters.dateTo) {
        apiFilters.dateFrom = newFilters.dateFrom;
        apiFilters.dateTo = newFilters.dateTo;
      }
      loadExpenses(firmId, apiFilters);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Facturas de Compra</h2>
        <Button onClick={() => handleOpenModal()} disabled={loading}>
          <Plus size={18} className="mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-5 gap-3">
        <Input
          placeholder="Buscar por Nº Factura o Proveedor..."
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
              <TableHead>Nº Factura</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-8 text-gray-500">
                  Cargando facturas...
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-8 text-gray-500">
                  No hay facturas registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map(expense => (
                <TableRow key={expense.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Badge className={statusBadgeColors[expense.status]}>
                      {getStatusLabel(expense)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {expense.invoice_series}-{expense.invoice_number}
                  </TableCell>
                  <TableCell>{expense.provider_name}</TableCell>
                  <TableCell>{expense.invoice_date}</TableCell>
                  <TableCell>
                    {expense.due_date ? (
                      <span>{expense.due_date}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {expense.currency} {expense.total_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {expense.currency} {expense.paid_amount?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={expense.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {expense.currency} {expense.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
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

                      {['REGISTERED'].includes(expense.status) && (
                        <button
                          className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                          onClick={() => handleOpenModal(expense)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {['REGISTERED'].includes(expense.status) && (
                        <button
                          className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          onClick={() => handleApprove(expense)}
                          title="Aprobar"
                        >
                          ✓
                        </button>
                      )}

                      {!['PAID', 'CANCELLED'].includes(expense.status) && (
                        <button
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          onClick={() => handleOpenCancelModal(expense)}
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

      {/* Modal de Creación/Edición */}
      <ExpenseFormModal
        isOpen={showModal}
        isEditing={isEditing}
        expense={editingExpense}
        firmId={firmId}
        onSubmit={handleSubmitModal}
        onCancel={handleCloseModal}
        isLoading={isSubmitting}
      />

      {/* Modal de Anulación */}
      <ExpenseCancelModal
        isOpen={showCancelModal}
        expense={expenseToCCancel}
        onConfirm={handleConfirmCancelExpense}
        onCancel={handleCloseCancelModal}
        isLoading={isCancellingExpense}
      />
    </div>
  );
}
