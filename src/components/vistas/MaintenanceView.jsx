import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useMaintenance } from '../../hooks/useMaintenance';
import MaintenanceFormModal from '../modales/MaintenanceFormModal';
import { Plus, AlertCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function MaintenanceView({
  firmId,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [overdueCount, setOverdueCount] = useState(0);

  const {
    maintenances,
    loading,
    loadMaintenances,
    getOverdueMaintenances
  } = useMaintenance(firmId);

  useEffect(() => {
    if (firmId) {
      loadMaintenances();
      loadOverdue();
    }
  }, [firmId]);

  const loadOverdue = async () => {
    const overdue = await getOverdueMaintenances();
    setOverdueCount(overdue?.length || 0);
  };

  const filteredMaintenances = maintenances.filter(m => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') {
      return m.scheduled_date && new Date(m.scheduled_date) < new Date() && m.status !== 'completed';
    }
    return m.status === filterStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getMaintenanceTypeLabel = (type) => {
    const labels = {
      'preventive': 'Preventivo',
      'corrective': 'Correctivo',
      'inspection': 'Inspección',
      'calibration': 'Calibración'
    };
    return labels[type] || type;
  };

  const getDaysOverdue = (scheduledDate) => {
    if (!scheduledDate) return null;
    const scheduled = new Date(scheduledDate);
    const today = new Date();
    const daysOverdue = Math.floor((today - scheduled) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0 ? daysOverdue : null;
  };

  const handleEdit = (id) => {
    setEditingId(id);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este mantenimiento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('machinery_maintenance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Mantenimiento eliminado correctamente');
      loadMaintenances();
      loadOverdue();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800">
              {overdueCount} mantenimiento(s) vencido(s) requiere(n) atención
            </span>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="overdue">Vencidos</option>
              <option value="scheduled">Programados</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completados</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Mantenimiento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando mantenimientos...
            </div>
          ) : filteredMaintenances.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay mantenimientos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Maquinaria</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Descripción</th>
                    <th className="text-left py-3 px-4 font-semibold">Fechas</th>
                    <th className="text-right py-3 px-4 font-semibold">Costo</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenances.map(maintenance => {
                    const daysOverdue = getDaysOverdue(maintenance.scheduled_date);

                    return (
                      <tr key={maintenance.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{maintenance.machinery?.name}</p>
                          <p className="text-xs text-muted-foreground">{maintenance.machinery?.type}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {getMaintenanceTypeLabel(maintenance.maintenance_type)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="line-clamp-2">{maintenance.description}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs space-y-1">
                            {maintenance.scheduled_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Prog: {new Date(maintenance.scheduled_date).toLocaleDateString('es-UY')}
                                </span>
                                {daysOverdue && (
                                  <span className="text-red-600 font-semibold">
                                    ({daysOverdue}d vencido)
                                  </span>
                                )}
                              </div>
                            )}
                            {maintenance.completion_date && (
                              <div>
                                Fin: {new Date(maintenance.completion_date).toLocaleDateString('es-UY')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-xs">
                            <p className="text-muted-foreground">
                              M.O: ${parseFloat(maintenance.labor_cost || 0).toLocaleString('es-UY')}
                            </p>
                            <p className="text-muted-foreground">
                              Rep: ${parseFloat(maintenance.parts_cost || 0).toLocaleString('es-UY')}
                            </p>
                            <p className="font-semibold text-gray-900">
                              Total: ${parseFloat(maintenance.total_cost || 0).toLocaleString('es-UY')}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(maintenance.status)}`}>
                            {maintenance.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(maintenance.id)}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(maintenance.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {(showAddModal || editingId) && (
        <MaintenanceFormModal
          firmId={firmId}
          maintenanceId={editingId}
          onClose={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingId(null);
            loadMaintenances();
            loadOverdue();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
