import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import MachineryFormModal from '../modales/MachineryFormModal';
import { Search, Plus, AlertCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MachineryListView({
  firmId,
  machinery = [],
  loading,
  onRefresh,
  onCheckAlerts,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMachinery = machinery.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code?.includes(searchTerm)
  );

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'MAINTENANCE': 'bg-yellow-100 text-yellow-800',
      'INACTIVE': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!firmId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Selecciona una empresa para ver la maquinaria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, tipo o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Maquinaria
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Mostrando {filteredMachinery.length} de {machinery.length} máquinas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando maquinaria...
            </div>
          ) : filteredMachinery.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm
                ? 'No se encontraron máquinas con ese criterio'
                : 'No hay maquinaria registrada'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Máquina</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Horómetro</th>
                    <th className="text-left py-3 px-4 font-semibold">Próximo Mant.</th>
                    <th className="text-left py-3 px-4 font-semibold">Seguro</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachinery.map(m => {
                    const hasMaintenanceAlert = m.next_maintenance_date &&
                      new Date(m.next_maintenance_date) < new Date();
                    const hasInsuranceAlert = m.insurance_expiry &&
                      new Date(m.insurance_expiry) < new Date();

                    return (
                      <tr key={m.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-sm text-muted-foreground">{m.code || 'Sin código'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          {m.type}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="font-medium">{parseFloat(m.horometer_hours || 0).toFixed(1)} h</p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(m.total_hectares || 0).toFixed(1)} ha
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {m.next_maintenance_date && (
                              <>
                                <span className="text-sm">
                                  {new Date(m.next_maintenance_date).toLocaleDateString('es-UY')}
                                </span>
                                {hasMaintenanceAlert && (
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                )}
                              </>
                            )}
                            {!m.next_maintenance_date && (
                              <span className="text-xs text-muted-foreground">Sin datos</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {m.insurance_expiry && (
                              <>
                                <span className="text-sm">
                                  {new Date(m.insurance_expiry).toLocaleDateString('es-UY')}
                                </span>
                                {hasInsuranceAlert && (
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                )}
                              </>
                            )}
                            {!m.insurance_expiry && (
                              <span className="text-xs text-muted-foreground">Sin datos</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(m.status)}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setEditingId(m.id)}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar maquinaria "${m.name}"?`)) {
                                  toast.info('Función de eliminación pendiente');
                                }
                              }}
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
        <MachineryFormModal
          firmId={firmId}
          machineryId={editingId}
          onClose={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingId(null);
            onRefresh?.();
            onCheckAlerts?.();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
