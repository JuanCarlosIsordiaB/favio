/**
 * ActivitiesManager.jsx
 * Gestor del catálogo maestro de actividades agrícolas y ganaderas
 */

import React, { useState, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';
import { Plus, Edit2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { toast } from 'sonner';

const ACTIVITY_TYPES = [
  { value: 'AGRICULTURAL', label: 'Agrícola', color: 'bg-green-100 text-green-800' },
  { value: 'LIVESTOCK', label: 'Ganadera', color: 'bg-blue-100 text-blue-800' },
  { value: 'BOTH', label: 'Ambas', color: 'bg-purple-100 text-purple-800' }
];

export default function ActivitiesManager({ firmId, firmName }) {
  const { activities, loading, loadActivities, createActivity, updateActivity, deactivateActivity, activateActivity } = useActivities();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    activityType: 'AGRICULTURAL',
    category: ''
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (firmId) {
      loadActivities(firmId);
    }
  }, [firmId, loadActivities]);

  const filteredActivities = activities.filter(a => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SYSTEM') return a.is_system;
    if (filterType === 'CUSTOM') return !a.is_system;
    return a.activity_type === filterType || a.activity_type === 'BOTH';
  });

  const validateForm = () => {
    const errors = {};

    if (!formData.code.trim()) {
      errors.code = 'El código es requerido';
    } else if (formData.code.length > 20) {
      errors.code = 'El código no puede exceder 20 caracteres';
    }

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.length > 255) {
      errors.name = 'El nombre no puede exceder 255 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenForm = (activity = null) => {
    if (activity) {
      if (activity.is_system) {
        toast.error('No se pueden editar actividades del sistema');
        return;
      }

      setEditingId(activity.id);
      setFormData({
        code: activity.code,
        name: activity.name,
        description: activity.description || '',
        activityType: activity.activity_type,
        category: activity.category || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        activityType: 'AGRICULTURAL',
        category: ''
      });
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    try {
      if (editingId) {
        await updateActivity(editingId, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
      } else {
        await createActivity({
          firmId,
          code: formData.code,
          name: formData.name,
          description: formData.description,
          activityType: formData.activityType,
          category: formData.category
        });
      }

      setShowForm(false);
      await loadActivities(firmId);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDeactivate = async (activityId) => {
    if (!window.confirm('¿Desactivar esta actividad?')) {
      return;
    }

    try {
      await deactivateActivity(activityId);
      await loadActivities(firmId);
    } catch (error) {
      console.error('Error deactivating activity:', error);
    }
  };

  const handleActivate = async (activityId) => {
    try {
      await activateActivity(activityId);
      await loadActivities(firmId);
    } catch (error) {
      console.error('Error activating activity:', error);
    }
  };

  const getTypeColor = (type) => {
    const typeObj = ACTIVITY_TYPES.find(t => t.value === type);
    return typeObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    const typeObj = ACTIVITY_TYPES.find(t => t.value === type);
    return typeObj?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Catálogo de Actividades</h3>
          <p className="text-sm text-slate-600">
            Tipos de operaciones agrícolas y ganaderas para {firmName}
          </p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          Nueva Actividad
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'ALL', label: 'Todas' },
          { value: 'AGRICULTURAL', label: 'Agrícolas' },
          { value: 'LIVESTOCK', label: 'Ganaderas' },
          { value: 'BOTH', label: 'Ambas' },
          { value: 'SYSTEM', label: 'Sistema' },
          { value: 'CUSTOM', label: 'Personalizadas' }
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filterType === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Cargando...</div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600 mb-2">No hay actividades en esta categoría</p>
          {filterType !== 'SYSTEM' && filterType !== 'CUSTOM' && (
            <button
              onClick={() => handleOpenForm()}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Crear nueva actividad
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Código</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tipo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Categoría</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tipo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredActivities.map(activity => (
                <tr key={activity.id} className={activity.is_active ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60'}>
                  <td className="px-6 py-3 text-sm">
                    <span className="font-mono font-semibold text-slate-700">{activity.code}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-700">{activity.name}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(activity.activity_type)}`}>
                      {getTypeLabel(activity.activity_type)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {activity.category || '—'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {activity.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        <XCircle size={14} />
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {activity.is_system ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">
                        🔒 Sistema
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        ✏️ Personalizada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {!activity.is_system && (
                        <button
                          onClick={() => handleOpenForm(activity)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar actividad"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {activity.is_active ? (
                        <button
                          onClick={() => handleDeactivate(activity.id)}
                          className={`p-1 rounded transition-colors ${
                            activity.is_system
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          disabled={activity.is_system}
                          title={activity.is_system ? 'No se puede desactivar actividad del sistema' : 'Desactivar actividad'}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(activity.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Activar actividad"
                        >
                          <CheckCircle2 size={16} />
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

      {/* Modal de Formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Actividad' : 'Nueva Actividad'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                placeholder="Ej: AGR-010"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingId}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.code ? 'border-red-500' : 'border-slate-300'
                } ${editingId ? 'bg-slate-100' : ''}`}
              />
              {formErrors.code && (
                <p className="text-red-500 text-sm mt-1">{formErrors.code}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Riego por aspersión"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.name ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción
              </label>
              <textarea
                placeholder="Descripción opcional..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Tipo (solo en creación) */}
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Actividad *
                </label>
                <select
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTIVITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Categoría
              </label>
              <input
                type="text"
                placeholder="Ej: NUTRICION, SANIDAD, MANEJO"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botones */}
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editingId ? 'Actualizar' : 'Crear'} Actividad
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
