import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { Map, Plus, MapPin, Check, Loader, AlertCircle, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './guards/PermissionGuard';
import { STRUCTURE_PERMISSIONS } from '../lib/permissions';

export default function PremiseManager({ selectedFirmId, onSelectPremise, selectedPremiseId }) {
  const { user } = useAuth();
  const { canDelete } = usePermissions({ canDelete: STRUCTURE_PERMISSIONS.DELETE });
  const [premises, setPremises] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    total_area: '',
    dicose_number: '',
    coneat_index: '',
    padrones: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // FIX #7: Validar superficie > 0
  function validarSuperficie(valor) {
    if (!valor) return false;
    const num = parseFloat(valor);
    return !isNaN(num) && num > 0;
  }

  // FIX #8: Validar nombres únicos
  async function validarNombreUnico(nombre, excludeId = null) {
    const existing = premises.find(p =>
      p.name.toLowerCase() === nombre.toLowerCase() &&
      (!excludeId || p.id !== excludeId)
    );
    return !existing;
  }

  useEffect(() => {
    if (selectedFirmId) {
      fetchPremises();
    } else {
      setPremises([]);
    }
  }, [selectedFirmId]);

  async function fetchPremises() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('premises')
        .select('*')
        .eq('firm_id', selectedFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPremises(data);
      
      // Auto-select if only one exists and none selected
      if (data.length === 1 && !selectedPremiseId && onSelectPremise) {
        onSelectPremise(data[0]);
      }
    } catch (error) {
      console.error('Error fetching premises:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErrors({});

    // Validar nombre
    if (!formData.name?.trim()) {
      setFormErrors({ name: 'Nombre es requerido' });
      toast.error('Nombre es requerido');
      return;
    }

    // FIX #7: Validar superficie > 0
    if (!validarSuperficie(formData.total_area)) {
      setFormErrors({ total_area: 'Superficie debe ser mayor a 0' });
      toast.error('Superficie debe ser mayor a 0');
      return;
    }

    // FIX #8: Validar nombre único
    const nombreUnico = await validarNombreUnico(formData.name, editingId);
    if (!nombreUnico) {
      setFormErrors({ name: 'Ya existe un predio con este nombre en esta firma' });
      toast.error('Ya existe un predio con este nombre en esta firma');
      return;
    }

    if (!selectedFirmId) {
      toast.error('Debes seleccionar una firma');
      return;
    }

    try {
      setIsSubmitting(true);
      let data, error;
      const isCreating = !editingId;

      // Procesar padrones (convertir de string a array)
      const padronesArray = formData.padrones
        ? formData.padrones.split(',').map(p => p.trim()).filter(p => p)
        : [];

      if (editingId) {
        // Update existing premise
        const result = await supabase
          .from('premises')
          .update({
            name: formData.name,
            location: formData.location,
            total_area: parseFloat(formData.total_area),
            dicose_number: formData.dicose_number || null,
            coneat_index: formData.coneat_index ? parseFloat(formData.coneat_index) : null,
            padrones: padronesArray.length > 0 ? padronesArray : null
          })
          .eq('id', editingId)
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setPremises(premises.map(p => p.id === editingId ? data : p));
        }
      } else {
        // Create new premise
        const result = await supabase
          .from('premises')
          .insert([{
            name: formData.name,
            location: formData.location,
            total_area: parseFloat(formData.total_area),
            firm_id: selectedFirmId,
            dicose_number: formData.dicose_number || null,
            coneat_index: formData.coneat_index ? parseFloat(formData.coneat_index) : null,
            padrones: padronesArray.length > 0 ? padronesArray : null
          }])
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setPremises([data, ...premises]);
        }
      }

      if (error) throw error;

      // FIX #3: Auditoría
      try {
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: data.id,
          lotId: null,
          tipo: isCreating ? 'predio_creado' : 'predio_actualizado',
          descripcion: `Predio "${formData.name}" ${isCreating ? 'creado' : 'actualizado'}`,
          moduloOrigen: 'predios',
          usuario: user?.full_name || 'sistema',
          referencia: data.id,
          metadata: {
            nombre: formData.name,
            ubicacion: formData.location,
            superficie: formData.total_area
          }
        });
      } catch (auditError) {
        console.error('Error registering audit log:', auditError);
      }

      // FIX #1: Toast de éxito
      toast.success(
        isCreating
          ? `Predio "${formData.name}" creado exitosamente`
          : `Predio "${formData.name}" actualizado exitosamente`
      );

      setShowForm(false);
      setFormData({ name: '', location: '', total_area: '' });
      setFormErrors({});
      setEditingId(null);

      // If we just edited or created the selected premise, update the selection
      if (editingId === selectedPremiseId || (!editingId && onSelectPremise)) {
        if (onSelectPremise) onSelectPremise(data);
      }
    } catch (error) {
      console.error('Error saving premise:', error);
      toast.error('Error al guardar el predio');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;

    try {
      setIsSubmitting(true);

      // FIX #5: Verificar si el predio tiene lotes asociados
      const { data: lots, error: lotsError } = await supabase
        .from('lots')
        .select('id, name')
        .eq('premise_id', editingId)
        .limit(1);

      if (lotsError) throw lotsError;

      if (lots && lots.length > 0) {
        toast.error(
          `No puedes eliminar este predio porque tiene ${lots.length} lote(s) asociado(s). Primero elimina los lotes.`
        );
        setShowDeleteConfirm(false);
        setIsSubmitting(false);
        return;
      }

      // Si no hay lotes, proceder a eliminar
      const premiseNameToDelete = premises.find(p => p.id === editingId)?.name || 'Predio';

      const { error } = await supabase
        .from('premises')
        .delete()
        .eq('id', editingId);

      if (error) throw error;

      // FIX #3: Auditoría
      try {
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: editingId,
          lotId: null,
          tipo: 'predio_eliminado',
          descripcion: `Predio "${premiseNameToDelete}" eliminado`,
          moduloOrigen: 'predios',
          usuario: user?.full_name || 'sistema',
          referencia: editingId,
          metadata: {
            nombre: premiseNameToDelete,
            ubicacion: premises.find(p => p.id === editingId)?.location || '',
            superficie: premises.find(p => p.id === editingId)?.total_area || 0
          }
        });
      } catch (auditError) {
        console.error('Error registering audit log:', auditError);
      }

      // FIX #1: Toast de éxito
      toast.success(`Predio eliminado exitosamente`);

      setPremises(premises.filter(p => p.id !== editingId));

      if (selectedPremiseId === editingId && onSelectPremise) {
        onSelectPremise(null);
      }

      setShowDeleteConfirm(false);
      setShowForm(false);
      setFormData({ name: '', location: '', total_area: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error deleting premise:', error);
      toast.error('Error al eliminar el predio. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(premise, e) {
    e.stopPropagation();
    setFormData({
      name: premise.name,
      location: premise.location || '',
      total_area: premise.total_area || '',
      dicose_number: premise.dicose_number || '',
      coneat_index: premise.coneat_index || '',
      padrones: (premise.padrones && Array.isArray(premise.padrones))
        ? premise.padrones.join(', ')
        : ''
    });
    setEditingId(premise.id);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setFormData({
      name: '',
      location: '',
      total_area: '',
      dicose_number: '',
      coneat_index: '',
      padrones: ''
    });
    setEditingId(null);
    setShowDeleteConfirm(false);
  }

  if (!selectedFirmId) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Selecciona una Firma</h2>
        <p className="text-slate-500">Debes seleccionar una firma antes de gestionar sus predios.</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-16 max-w-8xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Predios</h2>
          <p className="text-slate-500">Gestiona los predios de la firma seleccionada</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              name: '',
              location: '',
              total_area: '',
              dicose_number: '',
              coneat_index: '',
              padrones: ''
            });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Predio
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center rounded-xl p-6">
              <div className="bg-white border border-red-200 shadow-lg rounded-xl p-6 max-w-md w-full text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">¿Estás seguro de eliminar este predio?</h3>
                <p className="text-slate-600 mb-6">
                  Esta acción eliminará el predio y todos sus lotes asociados. <br/>
                  <span className="font-semibold text-red-600">Esta acción no tiene vuelta atrás.</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    {isSubmitting ? 'Eliminando...' : 'Sí, Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingId ? 'Editar Predio' : 'Registrar Nuevo Predio'}</h3>
            {editingId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!canDelete}
                title={!canDelete ? 'No tienes permiso para eliminar predios' : 'Eliminar este predio'}
                className={`flex items-center gap-2 text-sm font-medium p-2 rounded-lg transition-colors ${
                  canDelete
                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    : 'text-slate-300 cursor-not-allowed opacity-50'
                }`}
              >
                <Trash2 size={16} />
                Eliminar Predio
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Predio</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. Predio Principal"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación / Sector</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. Sector Norte"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Superficie Total (ha)</label>
                <input
                  type="number"
                  value={formData.total_area}
                  onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              {/* Campos nuevos - Módulo 13 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número DICOSE (Opcional)</label>
                <input
                  type="text"
                  value={formData.dicose_number}
                  onChange={(e) => setFormData({ ...formData, dicose_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. 123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Índice CONEAT (0-300, Opcional)</label>
                <input
                  type="number"
                  value={formData.coneat_index}
                  onChange={(e) => setFormData({ ...formData, coneat_index: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  max="300"
                  step="0.1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Padrones Catastrales (Opcional, separados por coma)</label>
                <input
                  type="text"
                  value={formData.padrones}
                  onChange={(e) => setFormData({ ...formData, padrones: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. 12345, 12346, 12347"
                />
                <p className="text-xs text-slate-500 mt-1">Ingresa los números de padrón separados por coma</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar Predio' : 'Guardar Predio')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {premises.map((premise) => (
            <div
              key={premise.id}
              data-id={`premise-${premise.name}`}
              data-testid={`premise-card-${premise.name}`}
              onClick={() => onSelectPremise && onSelectPremise(premise)}
              className={`cursor-pointer p-5 rounded-xl border transition-all ${
                selectedPremiseId === premise.id
                  ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                  : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedPremiseId === premise.id ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Map size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{premise.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin size={14} />
                      <span>{premise.location || 'Sin ubicación'}</span>
                    </div>
                    {premise.total_area > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{premise.total_area} ha</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEdit(premise, e)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  {selectedPremiseId === premise.id && (
                    <div className="bg-green-600 text-white p-1 rounded-full">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {premises.length === 0 && !showForm && (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay predios registrados para esta firma</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-green-600 font-medium hover:underline"
              >
                Crear primer predio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}