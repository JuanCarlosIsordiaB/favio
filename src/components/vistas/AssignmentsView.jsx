import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAssignments } from '../../hooks/useAssignments';
import AssignmentFormModal from '../modales/AssignmentFormModal';
import { Plus, Briefcase, AlertCircle } from 'lucide-react';

export default function AssignmentsView({ firmId, premiseId, currentUser }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const {
    assignments,
    loading,
    loadAssignments,
    completeAssignment
  } = useAssignments(firmId);

  useEffect(() => {
    if (firmId) {
      loadAssignments();
    }
  }, [firmId]);

  const filteredAssignments = assignments.filter(a => {
    if (filterType === 'all') return true;
    return a.assignment_type === filterType;
  });

  const activeAssignments = filteredAssignments.filter(a => a.status !== 'completed');
  const completedAssignments = filteredAssignments.filter(a => a.status === 'completed');

  const getTypeLabel = (type) => {
    const labels = {
      'work': 'Trabajo',
      'project': 'Proyecto',
      'machinery': 'Maquinaria',
      'supervision': 'Supervisión',
      'other': 'Otro'
    };
    return labels[type] || type;
  };

  const renderAssignmentTable = (items, title) => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">
          Sin {title.toLowerCase()}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-semibold">Personal</th>
                <th className="text-left py-2 px-4 font-semibold">Tipo</th>
                <th className="text-left py-2 px-4 font-semibold">Referencia</th>
                <th className="text-left py-2 px-4 font-semibold">Período</th>
                <th className="text-left py-2 px-4 font-semibold">Horas</th>
                <th className="text-center py-2 px-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(assignment => (
                <tr key={assignment.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-medium">{assignment.personnel?.full_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {getTypeLabel(assignment.assignment_type)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {assignment.agricultural_work_id && 'Trabajo Agrícola'}
                    {assignment.livestock_work_id && 'Trabajo Ganadero'}
                    {assignment.machinery_id && (
                      <span>
                        {assignment.machinery?.name}
                        {assignment.machinery?.code && ` (${assignment.machinery.code})`}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {assignment.start_date && (
                      <>
                        {new Date(assignment.start_date).toLocaleDateString('es-UY')}
                        {assignment.end_date && ` - ${new Date(assignment.end_date).toLocaleDateString('es-UY')}`}
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {assignment.hours_assigned ? `${parseFloat(assignment.hours_assigned).toFixed(1)}h` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      {assignment.status !== 'completed' && (
                        <button
                          onClick={() => {
                            if (confirm('¿Marcar como completada?')) {
                              completeAssignment(assignment.id, currentUser);
                            }
                          }}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
                        >
                          Completar
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
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {activeAssignments.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="text-blue-800">
              {activeAssignments.length} asignación(es) activa(s) pendiente(s) de completar
            </span>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">Todos los tipos</option>
              <option value="work">Trabajo</option>
              <option value="machinery">Maquinaria</option>
              <option value="project">Proyecto</option>
              <option value="supervision">Supervisión</option>
            </select>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Asignación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tablas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando asignaciones...
            </div>
          ) : (
            <div className="space-y-8">
              {renderAssignmentTable(activeAssignments, 'Asignaciones Activas')}
              {completedAssignments.length > 0 && (
                <>
                  <hr />
                  {renderAssignmentTable(completedAssignments, 'Asignaciones Completadas')}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showAddModal && (
        <AssignmentFormModal
          firmId={firmId}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadAssignments();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
