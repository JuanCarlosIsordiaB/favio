import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useMachinery } from '../../hooks/useMachinery';
import ServiceOrderFormModal from '../modales/ServiceOrderFormModal';
import CompleteServiceOrderModal from '../modales/CompleteServiceOrderModal';
import { Plus, DollarSign, CheckCircle, XCircle } from 'lucide-react';

export default function ServiceOrdersView({
  firmId,
  premiseId,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterClientType, setFilterClientType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const {
    serviceOrders,
    loading,
    loadServiceOrders
  } = useMachinery(firmId);

  const filteredOrders = serviceOrders.filter(o => {
    const clientMatch = filterClientType === 'all' || o.client_type === filterClientType;
    const statusMatch = filterStatus === 'all' || o.status === filterStatus;
    return clientMatch && statusMatch;
  });

  const totalCost = filteredOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.total_cost || 0), 0);

  const totalBilling = filteredOrders
    .filter(o => o.client_type === 'external' && o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.billing_amount || 0), 0);

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      'seeding': 'Siembra',
      'spraying': 'Pulverización',
      'harvesting': 'Cosecha',
      'irrigation': 'Riego',
      'transport': 'Transporte',
      'baling': 'Enfardado',
      'hauling': 'Acarreo',
      'plowing': 'Arado',
      'fertilization': 'Fertilización'
    };
    return labels[type] || type;
  };

  const handleCompleteClick = (order) => {
    setSelectedOrder(order);
    setShowCompleteModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Costo Total</div>
              <div className="text-2xl font-bold text-red-600">
                ${totalCost.toLocaleString('es-UY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Facturación</div>
              <div className="text-2xl font-bold text-green-600">
                ${totalBilling.toLocaleString('es-UY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Órdenes Totales</div>
              <div className="text-2xl font-bold">
                {filteredOrders.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-between">
            <div className="flex gap-4">
              <select
                value={filterClientType}
                onChange={(e) => setFilterClientType(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="all">Todos los clientes</option>
                <option value="internal">Internos</option>
                <option value="external">Externos</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="scheduled">Programadas</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando órdenes...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay órdenes de servicio registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold">Maquinaria</th>
                    <th className="text-left py-3 px-4 font-semibold">Servicio</th>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-right py-3 px-4 font-semibold">Costo</th>
                    <th className="text-right py-3 px-4 font-semibold">Facturación</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {new Date(order.order_date).toLocaleDateString('es-UY')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{order.machinery?.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        {getServiceTypeLabel(order.service_type)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {order.client_type === 'internal' ? (
                            <span className="text-blue-600">
                              {order.cost_center?.name || 'Centro de costo'}
                            </span>
                          ) : (
                            <span>{order.external_client_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${parseFloat(order.total_cost || 0).toLocaleString('es-UY', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {order.client_type === 'external' ? (
                          <span className="text-green-600 font-medium">
                            ${parseFloat(order.billing_amount || 0).toLocaleString('es-UY', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCompleteClick(order)}
                              className="p-1 hover:bg-green-100 rounded text-green-600"
                              title="Completar orden"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Orden */}
      {showAddModal && (
        <ServiceOrderFormModal
          firmId={firmId}
          premiseId={premiseId}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadServiceOrders();
          }}
          currentUser={currentUser}
        />
      )}

      {/* Modal Completar Orden */}
      {showCompleteModal && selectedOrder && (
        <CompleteServiceOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedOrder(null);
          }}
          onSave={() => {
            setShowCompleteModal(false);
            setSelectedOrder(null);
            loadServiceOrders();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
