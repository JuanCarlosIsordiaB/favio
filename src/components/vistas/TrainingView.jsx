import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useTraining } from '../../hooks/useTraining';
import TrainingFormModal from '../modales/TrainingFormModal';
import { Plus, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function TrainingView({ firmId, currentUser }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const {
    trainings,
    loading,
    loadTrainings,
    getExpiredTrainings,
    getExpiringTrainings
  } = useTraining(firmId);

  const [expiredCount, setExpiredCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    if (firmId) {
      loadTrainings();
      loadAlerts();
    }
  }, [firmId]);

  const loadAlerts = async () => {
    const expired = await getExpiredTrainings();
    const expiring = await getExpiringTrainings();
    setExpiredCount(expired?.length || 0);
    setExpiringCount(expiring?.length || 0);
  };

  const filteredTrainings = trainings.filter(t => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'expired') {
      return t.status === 'completed' && new Date(t.expiration_date) < new Date();
    }
    if (filterStatus === 'expiring') {
      const daysLeft = Math.ceil((new Date(t.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
      return t.status === 'completed' && daysLeft > 0 && daysLeft <= 30;
    }
    return t.status === filterStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      'planned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'expired': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="space-y-2">
          {expiredCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-800">
                  {expiredCount} capacitación(es) vencida(s) requiere(n) renovación
                </span>
              </CardContent>
            </Card>
          )}

          {expiringCount > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <span className="text-yellow-800">
                  {expiringCount} capacitación(es) próxima(s) a vencer (30 días)
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="planned">Planificadas</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completadas</option>
                <option value="expired">Vencidas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Capacitación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando capacitaciones...
            </div>
          ) : filteredTrainings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay capacitaciones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Capacitación</th>
                    <th className="text-left py-3 px-4 font-semibold">Personal</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Inicio</th>
                    <th className="text-left py-3 px-4 font-semibold">Vencimiento</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map(training => {
                    const isExpired = training.expiration_date &&
                      new Date(training.expiration_date) < new Date();
                    const daysLeft = training.expiration_date ?
                      Math.ceil((new Date(training.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <tr key={training.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{training.training_name}</p>
                            <p className="text-sm text-muted-foreground">{training.provider}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {training.personnel?.full_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm capitalize">
                          {training.training_type?.replace('_', ' ') || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {training.start_date ? new Date(training.start_date).toLocaleDateString('es-UY') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {training.expiration_date ? (
                            <div className="flex items-center gap-1">
                              <span>{new Date(training.expiration_date).toLocaleDateString('es-UY')}</span>
                              {isExpired && (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                              {!isExpired && daysLeft <= 30 && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                                  {daysLeft}d
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(training.status)}`}>
                            {training.status.replace('_', ' ')}
                          </span>
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
        <TrainingFormModal
          firmId={firmId}
          trainingId={editingId}
          onClose={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingId(null);
            loadTrainings();
            loadAlerts();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
