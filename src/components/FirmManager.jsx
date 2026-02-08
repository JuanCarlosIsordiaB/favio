import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Building2, Plus, MapPin, Check, Loader, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { crearRegistro } from '../services/registros';
import { deleteFirmWithCleanup, checkFirmDependencies } from '../services/firmDeletion';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './guards/PermissionGuard';
import { STRUCTURE_PERMISSIONS } from '../lib/permissions';

export default function FirmManager({ onSelectFirm, selectedFirmId }) {
  const { user } = useAuth();
  const { canDelete } = usePermissions({ canDelete: STRUCTURE_PERMISSIONS.DELETE });
  const [firms, setFirms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    rut: '',
    currency: 'UYU',
    management_currency: 'UYU',
    taxpayer_profile: 'PERSONA_FISICA',
    business_units: []
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [deleteBlockers, setDeleteBlockers] = useState([]);
  const [forceDelete, setForceDelete] = useState(false);

  // FIX #6: Validar formato RUT
  function validarRUT(rut) {
    if (!rut) return true; // RUT es opcional
    // Formato: XX.XXX.XXX-K o XXXXXXXX-K o sin guion/puntos
    const rutRegex = /^[\d.]*\d-?[0-9kK]$/;
    return rutRegex.test(rut.replace(/\./g, ''));
  }

  // FIX #8: Validar nombres únicos
  async function validarNombreUnico(nombre, excludeId = null) {
    const existing = firms.find(f =>
      f.name.toLowerCase() === nombre.toLowerCase() &&
      (!excludeId || f.id !== excludeId)
    );
    return !existing;
  }

  // FIX #9: Validar RUT único
  async function validarRUTUnico(rut, excludeId = null) {
    if (!rut) return true; // RUT es opcional, no validar si está vacío
    const existing = firms.find(f =>
      f.rut && f.rut.toLowerCase() === rut.toLowerCase() &&
      (!excludeId || f.id !== excludeId)
    );
    return !existing;
  }

  useEffect(() => {
    fetchFirms();
  }, []);

  async function fetchFirms() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFirms(data);
      
      // Auto-select if only one exists and none selected
      if (data.length === 1 && !selectedFirmId && onSelectFirm) {
        onSelectFirm(data[0]);
      }
    } catch (error) {
      console.error('Error fetching firms:', error);
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

    // FIX #6: Validar RUT
    if (formData.rut && !validarRUT(formData.rut)) {
      setFormErrors({ rut: 'RUT inválido. Formato: XX.XXX.XXX-K' });
      toast.error('RUT inválido. Formato: XX.XXX.XXX-K');
      return;
    }

    // FIX #8: Validar nombre único
    const nombreUnico = await validarNombreUnico(formData.name, editingId);
    if (!nombreUnico) {
      setFormErrors({ name: 'Ya existe una firma con este nombre' });
      toast.error('Ya existe una firma con este nombre');
      return;
    }

    // FIX #9: Validar RUT único
    const rutUnico = await validarRUTUnico(formData.rut, editingId);
    if (!rutUnico) {
      setFormErrors({ rut: 'Ya existe una firma con este RUT' });
      toast.error('Ya existe una firma con este RUT');
      return;
    }

    try {
      setIsSubmitting(true);

      let data, error;
      const isCreating = !editingId;

      if (editingId) {
        // Update existing firm
        const result = await supabase
          .from('firms')
          .update({
            name: formData.name,
            location: formData.location,
            rut: formData.rut,
            currency: formData.currency,
            management_currency: formData.management_currency,
            taxpayer_profile: formData.taxpayer_profile,
            business_units: formData.business_units
          })
          .eq('id', editingId)
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setFirms(firms.map(f => f.id === editingId ? data : f));
        }
      } else {
        // Create new firm
        const result = await supabase
          .from('firms')
          .insert([{
            name: formData.name,
            location: formData.location,
            rut: formData.rut,
            currency: formData.currency,
            management_currency: formData.management_currency,
            taxpayer_profile: formData.taxpayer_profile,
            business_units: formData.business_units,
            owner_id: user.id
          }])
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) {
          setFirms([data, ...firms]);
        }
      }

      if (error) throw error;

      // FIX #3: Registrar en auditoría
      try {
        await crearRegistro({
          firmId: data.id,
          premiseId: null,
          lotId: null,
          tipo: isCreating ? 'firma_creada' : 'firma_actualizada',
          descripcion: isCreating
            ? `Firma "${formData.name}" creada`
            : `Firma "${formData.name}" actualizada`,
          moduloOrigen: 'firmas',
          usuario: user?.full_name || 'sistema',
          referencia: data.id,
          metadata: {
            nombre: formData.name,
            ubicacion: formData.location,
            rut: formData.rut
          }
        });
      } catch (auditError) {
        console.warn('Error registrando en auditoría:', auditError);
        // No bloqueamos la operación si falla la auditoría
      }

      // FIX #1: Mostrar toast de éxito
      toast.success(
        isCreating
          ? `Firma "${formData.name}" creada exitosamente`
          : `Firma "${formData.name}" actualizada exitosamente`
      );

      setShowForm(false);
      setFormData({
        name: '',
        location: '',
        rut: '',
        currency: 'UYU',
        management_currency: 'UYU',
        taxpayer_profile: 'PERSONA_FISICA',
        business_units: []
      });
      setFormErrors({});
      setEditingId(null);

      // If we just edited or created the selected firm, update the selection
      if (editingId === selectedFirmId || (!editingId && onSelectFirm)) {
        if (onSelectFirm) onSelectFirm(data);
      }
    } catch (error) {
      console.error('Error saving firm:', error);
      toast.error('Error al guardar la firma');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;

    try {
      setIsSubmitting(true);

      // FIX #10: Usar enfoque arquitectónico para eliminación de firma
      // Esto investiga todas las dependencias, limpia las auto-creadas,
      // y solo elimina si no hay datos user-created (o si se fuerza la eliminación)
      const result = await deleteFirmWithCleanup({
        firmId: editingId,
        firmName: formData.name,
        userId: user?.id || 'sistema',
        forceDelete: forceDelete
      });

      if (!result.success) {
        // Error al eliminar
          toast.error(result.message || 'Error al eliminar la firma');
        setShowDeleteConfirm(false);
        setIsSubmitting(false);
        return;
      }

      // Éxito
      let successMessage = result.message;
      if (result.cascadeDeleted && Object.keys(result.cascadeDeleted).length > 0) {
        const deletedItems = Object.entries(result.cascadeDeleted)
          .filter(([_, count]) => count > 0)
          .map(([key, count]) => {
            const labels = {
              lots: 'lotes',
              premises: 'predios',
              expenses: 'gastos',
              income: 'ingresos',
              works: 'trabajos'
            };
            return `${count} ${labels[key] || key}`;
          });
        successMessage = `Firma eliminada. También se eliminaron: ${deletedItems.join(', ')}`;
      }
      
      toast.success(successMessage);

      setFirms(firms.filter(f => f.id !== editingId));

      if (selectedFirmId === editingId && onSelectFirm) {
        onSelectFirm(null);
      }

      setShowDeleteConfirm(false);
      setShowForm(false);
      setFormData({
        name: '',
        location: '',
        rut: '',
        currency: 'UYU',
        management_currency: 'UYU',
        taxpayer_profile: 'PERSONA_FISICA',
        business_units: []
      });
      setEditingId(null);
      setDeleteBlockers([]);
      setForceDelete(false);
    } catch (error) {
      console.error('Error deleting firm:', error);
      toast.error('Error inesperado al eliminar la firma');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(firm, e) {
    e.stopPropagation();
    setFormData({
      name: firm.name,
      location: firm.location || '',
      rut: firm.rut || '',
      currency: firm.currency || 'UYU',
      management_currency: firm.management_currency || 'UYU',
      taxpayer_profile: firm.taxpayer_profile || 'PERSONA_FISICA',
      business_units: firm.business_units || []
    });
    setEditingId(firm.id);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setFormData({
      name: '',
      location: '',
      rut: '',
      currency: 'UYU',
      management_currency: 'UYU',
      taxpayer_profile: 'PERSONA_FISICA',
      business_units: []
    });
    setEditingId(null);
    setShowDeleteConfirm(false);
  }

  return (
    <div className="py-6 px-16 max-w-8xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Firmas</h2>
          <p className="text-slate-500">Gestiona tus empresas y establecimientos</p>
        </div>
        <button
          data-id="btn-new-firm"
          onClick={() => {
            setFormData({
              name: '',
              location: '',
              rut: '',
              currency: 'UYU',
              management_currency: 'UYU',
              taxpayer_profile: 'PERSONA_FISICA',
              business_units: []
            });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Nueva Firma
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center rounded-xl p-6">
              <div className="bg-white border border-red-200 shadow-lg rounded-xl p-6 max-w-lg w-full">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">
                  ¿Estás seguro de eliminar esta firma?
                </h3>
                
                {deleteBlockers.length > 0 ? (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-amber-900 mb-2">
                        ⚠️ Esta firma contiene datos que deben eliminarse primero:
                      </p>
                      <ul className="text-sm text-amber-800 space-y-1 text-left">
                        {deleteBlockers.map((blocker, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                            {blocker.description} ({blocker.count})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mb-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceDelete}
                          onChange={(e) => setForceDelete(e.target.checked)}
                          className="mt-1 w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold text-red-600">Eliminar todo en cascada:</span> 
                          {' '}Eliminar la firma junto con todos los datos relacionados listados arriba. 
                          <span className="block mt-1 text-red-600 font-semibold">
                            Esta acción es irreversible.
                          </span>
                        </span>
                      </label>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-600 mb-6 text-center">
                  Esta acción eliminará la firma y todos sus datos asociados. <br/>
                  <span className="font-semibold text-red-600">Esta acción no tiene vuelta atrás.</span>
                </p>
                )}
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setForceDelete(false);
                      setDeleteBlockers([]);
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting || (deleteBlockers.length > 0 && !forceDelete)}
                    className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      deleteBlockers.length > 0 && !forceDelete
                        ? 'bg-slate-300 text-slate-500'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isSubmitting ? 'Eliminando...' : (deleteBlockers.length > 0 ? 'Eliminar Todo' : 'Sí, Eliminar')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingId ? 'Editar Firma' : 'Registrar Nueva Firma'}</h3>
            {editingId && (
              <button
                type="button"
                onClick={async () => {
                  // Verificar dependencias antes de mostrar el modal
                  try {
                    const deps = await checkFirmDependencies(editingId);
                    const blockers = Object.entries(deps)
                      .filter(([key, dep]) => !dep.canDelete && dep.count > 0)
                      .map(([key, dep]) => ({
                        table: key,
                        count: dep.count,
                        description: dep.description
                      }));
                    
                    setDeleteBlockers(blockers);
                    setForceDelete(false);
                    setShowDeleteConfirm(true);
                  } catch (error) {
                    console.error('Error verificando dependencias:', error);
                    setDeleteBlockers([]);
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={!canDelete}
                title={!canDelete ? 'No tienes permiso para eliminar firmas' : 'Eliminar esta firma'}
                className={`flex items-center gap-2 text-sm font-medium p-2 rounded-lg transition-colors ${
                  canDelete
                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    : 'text-slate-300 cursor-not-allowed opacity-50'
                }`}
              >
                <Trash2 size={16} />
                Eliminar Firma
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Firma</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. Estancia La Tranquera"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUT (Opcional)</label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. 219999990019"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. Tacuarembó, Uruguay"
                />
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
                {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar Firma' : 'Guardar Firma')}
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
          {firms.map((firm) => (
            <div
              key={firm.id}
              data-id={`firm-${firm.name}`}
              data-testid={`firm-card-${firm.name}`}
              onClick={() => onSelectFirm && onSelectFirm(firm)}
              className={`cursor-pointer p-5 rounded-xl border transition-all ${
                selectedFirmId === firm.id
                  ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                  : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedFirmId === firm.id ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate" title={firm.name}>{firm.name}</h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm text-slate-500 truncate">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{firm.location || 'Sin ubicación'}</span>
                      </div>
                      {firm.rut && (
                        <div className="text-xs text-slate-400 truncate">
                          RUT: {firm.rut}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEdit(firm, e)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  {selectedFirmId === firm.id && (
                    <div className="bg-green-600 text-white p-1 rounded-full">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {firms.length === 0 && !showForm && (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tienes firmas registradas</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-green-600 font-medium hover:underline"
              >
                Crear tu primera firma
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}