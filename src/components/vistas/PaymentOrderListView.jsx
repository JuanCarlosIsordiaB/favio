import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { usePaymentOrders } from "../../hooks/usePaymentOrders";
import { Badge } from "../ui/badge";
import {
  AlertCircle,
  Eye,
  Plus,
  CheckCircle2,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const statusBadgeColors = {
  DRAFT: "bg-gray-200 text-gray-800",
  PENDING_APPROVAL: "bg-yellow-200 text-yellow-800",
  APPROVED: "bg-blue-200 text-blue-800",
  EXECUTED: "bg-green-700 text-white",
  REJECTED: "bg-red-200 text-red-800",
  CANCELLED: "bg-gray-500 text-white",
};

const statusLabels = {
  DRAFT: "Borrador",
  PENDING_APPROVAL: "Pendiente de Aprobación",
  APPROVED: "Pendiente de Pago",
  EXECUTED: "Pagada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

/**
 * Vista de lista de órdenes de pago
 * @component
 */
export function PaymentOrderListView({
  firmId,
  onAdd = () => {},
  onExecuteOrder = () => {},
}) {
  const { user } = useAuth();
  const {
    orders,
    loading,
    error,
    loadOrders,
    approveOrder,
    rejectOrder,
    executeOrder,
    cancelOrder,
  } = usePaymentOrders();

  const [filters, setFilters] = useState({
    status: "",
    searchTerm: "",
    dateFrom: "",
    dateTo: "",
  });

  const statuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "EXECUTED",
    "REJECTED",
    "CANCELLED",
  ];

  /**
   * Cargar órdenes al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadOrders(firmId, buildFilters());
    }
  }, [firmId]);

  /**
   * Construir objeto de filtros para la API
   */
  const buildFilters = () => {
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.dateFrom && filters.dateTo) {
      apiFilters.dateFrom = filters.dateFrom;
      apiFilters.dateTo = filters.dateTo;
    }
    return apiFilters;
  };

  /**
   * Filtrar por búsqueda local
   */
  const filteredOrders = orders.filter((order) => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      (order.order_number || "").toLowerCase().includes(searchLower) ||
      (order.beneficiary_name || "").toLowerCase().includes(searchLower)
    );
  });

  const handleApprove = async (order) => {
    if (!window.confirm(`¿Aprobar orden de pago #${order.order_number}?`)) {
      return;
    }

    try {
      await approveOrder(order.id, user.id);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleReject = async (order) => {
    const reason = prompt(
      `¿Motivo del rechazo de orden #${order.order_number}?`,
    );
    if (!reason) return;

    try {
      await rejectOrder(order.id, user.id, reason);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleExecute = async (order) => {
    if (
      !window.confirm(
        `¿Ejecutar orden de pago #${order.order_number}?\n\nEsta acción es irreversible.`,
      )
    ) {
      return;
    }

    try {
      await executeOrder(order.id, user.id);
      onExecuteOrder?.();
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const handleCancel = async (order) => {
    const reason = prompt(
      `¿Motivo de cancelación de orden #${order.order_number}?`,
    );
    if (!reason) return;

    try {
      await cancelOrder(order.id, user.id, reason);
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
      if (newFilters.dateFrom && newFilters.dateTo) {
        apiFilters.dateFrom = newFilters.dateFrom;
        apiFilters.dateTo = newFilters.dateTo;
      }
      loadOrders(firmId, apiFilters);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Órdenes de Pago</h2>
        <Button onClick={() => onAdd?.()} disabled={loading}>
          <Plus size={18} className="mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-4 gap-3">
        <Input
          placeholder="Buscar por Nº Orden o Beneficiario..."
          value={filters.searchTerm}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
          }
        />

        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            handleFilterChange("status", value === "all" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
          placeholder="Desde"
        />

        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => handleFilterChange("dateTo", e.target.value)}
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
              <TableHead>Nº Orden</TableHead>
              <TableHead>Fecha Orden</TableHead>
              <TableHead>Fecha Planificada</TableHead>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead>OC</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Cuenta Origen</TableHead>
              <TableHead>Fecha Pago</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan="12"
                  className="text-center py-8 text-gray-500"
                >
                  Cargando órdenes de pago...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan="12"
                  className="text-center py-8 text-gray-500"
                >
                  No hay órdenes de pago registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Badge className={statusBadgeColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    #{order.order_number}
                  </TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{order.planned_payment_date || "-"}</TableCell>
                  <TableCell>{order.beneficiary_name}</TableCell>
                  <TableCell>
                    {order.payment_method === "transfer" && "Transferencia"}
                    {order.payment_method === "check" && "Cheque"}
                    {order.payment_method === "cash" && "Efectivo"}
                    {order.payment_method === "credit_card" &&
                      "Tarjeta de Crédito"}
                    {order.payment_method === "debit_card" &&
                      "Tarjeta de Débito"}
                  </TableCell>
                  <TableCell>
                    {order.purchase_order?.order_number || "-"}
                  </TableCell>
                  <TableCell>
                    {order.expense
                      ? `${order.expense.invoice_series}-${order.expense.invoice_number}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {order.currency}{" "}
                    {order.amount?.toLocaleString("es-UY", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>{order.account_id ? "Asignada" : "-"}</TableCell>
                  <TableCell>{order.payment_date || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>

                      {order.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            onClick={() => handleApprove(order)}
                            title="Aprobar"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            onClick={() => handleReject(order)}
                            title="Rechazar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}

                      {order.status === "APPROVED" && (
                        <button
                          className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50"
                          onClick={() => handleExecute(order)}
                          title="Ejecutar"
                        >
                          <PlayCircle size={16} />
                        </button>
                      )}

                      {!["EXECUTED", "REJECTED", "CANCELLED"].includes(
                        order.status,
                      ) && (
                        <button
                          className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-50"
                          onClick={() => handleCancel(order)}
                          title="Cancelar"
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
    </div>
  );
}
