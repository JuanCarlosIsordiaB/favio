import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Plus, Calendar, Lock, Unlock, Edit2, Trash2, ChevronDown, AlertTriangle, Check } from 'lucide-react';
import { crearRegistro } from '../services/registros';
import { useAuth } from '../contexts/AuthContext';
import GestionCloseModal from './modales/GestionCloseModal';
import InventoryValuationModal from './modales/InventoryValuationModal';
import AjusteCierreModal from './modales/AjusteCierreModal';

export default function GestionesManager({ firmId, premiseId }) {
  const { user } = useAuth();
  const [gestiones, setGestiones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Modal states
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedGestion, setSelectedGestion] = useState(null);

  useEffect(() => {
    if (firmId && premiseId) {
      loadGestiones();
    }
  }, [firmId, premiseId]);

  async function loadGestiones() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('firm_id', firmId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setGestiones(data || []);
    } catch (error) {
      console.error('Error loading gestiones:', error);
      toast.error('Error al cargar gestiones');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErrors({});

    // Validations
    if (!formData.name?.trim()) {
      setFormErrors({ name: 'Nombre es requerido' });
      toast.error('Nombre es requerido');
      return;
    }

    if (!formData.start_date) {
      setFormErrors({ start_date: 'Fecha de inicio es requerida' });
      toast.error('Fecha de inicio es requerida');
      return;
    }

    if (!formData.end_date) {
      setFormErrors({ end_date: 'Fecha de fin es requerida' });
      toast.error('Fecha de fin es requerida');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setFormErrors({ end_date: 'La fecha de fin debe ser posterior a la de inicio' });
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    // Check if there's already an open gestion (only for create, not edit)
    if (!editingId) {
      const { data: openGestions } = await supabase
        .from('campaigns')
        .select('id')
        .eq('firm_id', firmId)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (openGestions && openGestions.length > 0) {
        toast.error('Ya existe una gestión abierta. Ciérrala primero.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const isCreating = !editingId;

      let data, error;

      if (editingId) {
        // Check if gestion is locked - cannot edit closed/locked gestiones
        const { data: gestion } = await supabase
          .from('campaigns')
          .select('is_locked')
          .eq('id', editingId)
          .single();

        if (gestion?.is_locked) {
          toast.error('No puedes editar una gestión cerrada y bloqueada');
          return;
        }

        const result = await supabase
          .from('campaigns')
          .update({
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date
          })
          .eq('id', editingId)
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setGestiones(gestiones.map(g => g.id === editingId ? data : g));
        }
      } else {
        // Create new gestion
        const result = await supabase
          .from('campaigns')
          .insert([{
            firm_id: firmId,
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: 'ACTIVE'
          }])
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setGestiones([data, ...gestiones]);
        }
      }

      if (error) throw error;

      // Register in audit
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: null,
          tipo: isCreating ? 'gestion_creada' : 'gestion_actualizada',
          descripcion: isCreating
            ? `Gestión "${formData.name}" creada (${formData.start_date} - ${formData.end_date})`
            : `Gestión "${formData.name}" actualizada`,
          moduloOrigen: 'gestiones',
          usuario: user?.full_name || 'sistema',
          referencia: data.id,
          metadata: {
            nombre: formData.name,
            fecha_inicio: formData.start_date,
            fecha_fin: formData.end_date
          }
        });
      } catch (auditError) {
        console.warn('Error registrando en auditoría:', auditError);
      }

      toast.success(
        isCreating
          ? `Gestión "${formData.name}" creada exitosamente`
          : `Gestión "${formData.name}" actualizada exitosamente`
      );

      setShowForm(false);
      setFormData({ name: '', start_date: '', end_date: '' });
      setFormErrors({});
      setEditingId(null);
    } catch (error) {
      console.error('Error saving gestion:', error);
      toast.error('Error al guardar la gestión');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;

    try {
      setIsSubmitting(true);

      // Check if gestion is locked
      const { data: gestion } = await supabase
        .from('campaigns')
        .select('is_locked')
        .eq('id', editingId)
        .single();

      if (gestion?.is_locked) {
        toast.error('No puedes eliminar una gestión cerrada y bloqueada');
        setShowDeleteConfirm(false);
        setIsSubmitting(false);
        return;
      }

      // Delete
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', editingId);

      if (error) throw error;

      // Register in audit
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: null,
          tipo: 'gestion_eliminada',
          descripcion: `Gestión "${formData.name}" eliminada`,
          moduloOrigen: 'gestiones',
          usuario: user?.full_name || 'sistema',
          referencia: editingId,
          metadata: {
            nombre: formData.name
          }
        });
      } catch (auditError) {
        console.warn('Error registrando eliminación en auditoría:', auditError);
      }

      toast.success('Gestión eliminada exitosamente');

      setGestiones(gestiones.filter(g => g.id !== editingId));
      setShowDeleteConfirm(false);
      setShowForm(false);
      setFormData({ name: '', start_date: '', end_date: '', notes: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error deleting gestion:', error);
      toast.error('Error al eliminar la gestión');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(gestion, e) {
    e.stopPropagation();
    setFormData({
      name: gestion.name,
      start_date: gestion.start_date,
      end_date: gestion.end_date,
      notes: gestion.notes || ''
    });
    setEditingId(gestion.id);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setFormData({ name: '', start_date: '', end_date: '', notes: '' });
    setEditingId(null);
    setShowDeleteConfirm(false);
  }

  const handleOpenCloseModal = (gestion, e) => {
    e.stopPropagation();
    setSelectedGestion(gestion);
    setShowCloseModal(true);
  };

  const handleOpenValuationModal = (gestion, e) => {
    e.stopPropagation();
    setSelectedGestion(gestion);
    setShowValuationModal(true);
  };

  const handleOpenAjusteModal = (gestion, e) => {
    e.stopPropagation();
    setSelectedGestion(gestion);
    setShowAjusteModal(true);
  };

  const getStatusBadge = (status, isLocked) => {
    if (status === 'ACTIVE') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">ACTIVA</span>;
    }
    if (status === 'CLOSED' && isLocked) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
          <Lock size={12} />
          CERRADA
        </span>
      );
    }
    return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="py-6 px-16 max-w-8xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Cargando gestiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-16 max-w-8xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestiones (Períodos)</h2>
          <p className="text-slate-500">Gestiona los períodos de producción y cierre de gestiones</p>
        </div>
        <button
          data-id="gestiones-btn-create"
          onClick={() => {
            setFormData({ name: '', start_date: '', end_date: '' });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Nueva Gestión
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            {editingId ? 'Editar Gestión' : 'Nueva Gestión'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  data-id="input-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Gestión 2025/2026"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                    formErrors.name ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Inicio *</label>
                <input
                  data-id="input-start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                    formErrors.start_date ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.start_date && <p className="text-red-500 text-xs mt-1">{formErrors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Fin *</label>
                <input
                  data-id="input-end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                    formErrors.end_date ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.end_date && <p className="text-red-500 text-xs mt-1">{formErrors.end_date}</p>}
              </div>
            </div>


            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-id="gestiones-form-submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Eliminar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-600" />
              <h3 className="text-lg font-semibold text-slate-800">Confirmar eliminación</h3>
            </div>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de que deseas eliminar la gestión "{formData.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gestiones table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {gestiones.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Calendar size={32} className="mx-auto mb-2 text-slate-400" />
            <p>No hay gestiones creadas. Crea una para empezar.</p>
          </div>
        ) : (
          <table data-id="gestiones-list-table" className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Período</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gestiones.map((gestion) => (
                <tr key={gestion.id} data-id={`gestiones-row-${gestion.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{gestion.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(gestion.start_date)} - {formatDate(gestion.end_date)}
                  </td>
                  <td className="px-6 py-4">
                    <div data-id={`gestiones-status-${gestion.id}`}>
                      {getStatusBadge(gestion.status, gestion.is_locked)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {gestion.status === 'ACTIVE' && (
                        <>
                          <button
                            data-id={`gestiones-btn-edit-${gestion.id}`}
                            onClick={(e) => handleEdit(gestion, e)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            data-id={`gestiones-btn-close-${gestion.id}`}
                            onClick={(e) => handleOpenCloseModal(gestion, e)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Cerrar"
                          >
                            <Lock size={16} />
                          </button>
                        </>
                      )}
                      {gestion.status === 'CLOSED' && gestion.is_locked && (
                        <button
                          data-id={`gestiones-btn-ajuste-${gestion.id}`}
                          onClick={(e) => handleOpenAjusteModal(gestion, e)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Crear ajuste"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {selectedGestion && (
        <>
          <GestionCloseModal
            isOpen={showCloseModal}
            gestion={selectedGestion}
            premiseId={premiseId}
            onClose={() => {
              setShowCloseModal(false);
              setSelectedGestion(null);
            }}
            onSuccess={() => {
              setShowCloseModal(false);
              setSelectedGestion(null);
              loadGestiones();
            }}
          />
          <InventoryValuationModal
            isOpen={showValuationModal}
            gestion={selectedGestion}
            premiseId={premiseId}
            onClose={() => {
              setShowValuationModal(false);
              setSelectedGestion(null);
            }}
            onSuccess={() => {
              setShowValuationModal(false);
              setSelectedGestion(null);
            }}
          />
          <AjusteCierreModal
            isOpen={showAjusteModal}
            gestion={selectedGestion}
            onClose={() => {
              setShowAjusteModal(false);
              setSelectedGestion(null);
            }}
            onSuccess={() => {
              setShowAjusteModal(false);
              setSelectedGestion(null);
              loadGestiones();
            }}
          />
        </>
      )}
    </div>
  );
}
