/**
 * CostCenterManager.jsx
 *
 * Gestor de centros de costo con estructura jerárquica
 * Solo accesible para administradores
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deactivateCostCenter,
  activateCostCenter,
  getParentOptions
} from '../services/costCenters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

export default function CostCenterManager({ firmId, firmName }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'administrador';

  // Estado
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    parentId: null
  });
  const [formError, setFormError] = useState('');

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!firmId) return;

    setLoading(true);
    setError('');

    try {
      const result = await getCostCenters(firmId);
      if (result.success) {
        setCostCenters(result.data);
      } else {
        setError(result.error);
      }

      // Cargar opciones de padre
      const parentResult = await getParentOptions(firmId, editingId);
      if (parentResult.success) {
        setParentOptions(parentResult.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar centros de costo');
    } finally {
      setLoading(false);
    }
  }, [firmId, editingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle de expandir/contraer
  const toggleExpanded = (id) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Abrir modal para crear
  const handleCreate = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', description: '', parentId: null });
    setFormError('');
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (costCenter) => {
    setEditingId(costCenter.id);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || '',
      parentId: costCenter.parent_id || null
    });
    setFormError('');
    setShowModal(true);
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code.trim()) {
      setFormError('El código es requerido');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }

    setSubmitting(true);

    try {
      let result;
      if (editingId) {
        result = await updateCostCenter(editingId, {
          code: formData.code,
          name: formData.name,
          description: formData.description,
          parent_id: formData.parentId
        });
      } else {
        result = await createCostCenter({
          firmId,
          code: formData.code,
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId
        });
      }

      if (result.success) {
        toast.success(result.message);
        setShowModal(false);
        loadData();
      } else {
        setFormError(result.error);
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      setFormError('Error inesperado');
      toast.error('Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  // Desactivar
  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar este centro de costo? Se desactivarán también sus subcategorías.')) {
      return;
    }

    try {
      const result = await deactivateCostCenter(id);
      if (result.success) {
        toast.success('Centro de costo desactivado');
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al desactivar');
    }
  };

  // Activar
  const handleActivate = async (id) => {
    try {
      const result = await activateCostCenter(id);
      if (result.success) {
        toast.success('Centro de costo activado');
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al activar');
    }
  };

  // Renderizar fila con expansión
  const renderCostCenterRow = (costCenter, level = 0) => {
    const hasChildren = costCenter.children && costCenter.children.length > 0;
    const isExpanded = expandedIds.has(costCenter.id);

    return (
      <React.Fragment key={costCenter.id}>
        <tr className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
          <td className="px-6 py-4">
            <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(costCenter.id)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-slate-600" />
                  ) : (
                    <ChevronRight size={18} className="text-slate-600" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}
              <code className="font-mono font-semibold text-slate-900">
                {costCenter.code}
              </code>
            </div>
          </td>
          <td className="px-6 py-4 text-slate-900">{costCenter.name}</td>
          <td className="px-6 py-4 text-sm text-slate-600">
            {costCenter.description || '—'}
          </td>
          <td className="px-6 py-4 text-center">
            {costCenter.is_active ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                ✓ Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                ✗ Inactivo
              </span>
            )}
          </td>
          {isAdmin && (
            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
              <button
                onClick={() => handleEdit(costCenter)}
                title="Editar"
                className="p-2 hover:bg-blue-100 rounded transition-colors text-blue-600"
              >
                <Edit2 size={16} />
              </button>
              {costCenter.is_active ? (
                <button
                  onClick={() => handleDeactivate(costCenter.id)}
                  title="Desactivar"
                  className="p-2 hover:bg-yellow-100 rounded transition-colors text-yellow-600"
                >
                  <CheckCircle2 size={16} />
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(costCenter.id)}
                  title="Activar"
                  className="p-2 hover:bg-green-100 rounded transition-colors text-green-600"
                >
                  <XCircle size={16} />
                </button>
              )}
            </td>
          )}
        </tr>

        {/* Renderizar hijos si está expandido */}
        {isExpanded && hasChildren && (
          costCenter.children.map(child => renderCostCenterRow(child, level + 1))
        )}
      </React.Fragment>
    );
  };

  if (loading && costCenters.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Cargando centros de costo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Centros de Costo</h2>
          <p className="text-sm text-slate-600 mt-1">{firmName}</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium
                     rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nuevo Centro
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {costCenters.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No hay centros de costo. {isAdmin && 'Crea uno para comenzar.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Código</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Nombre</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Descripción</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-900">Estado</th>
                  {isAdmin && <th className="px-6 py-3 text-right font-semibold text-slate-900">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {costCenters.map(cc => renderCostCenterRow(cc))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Nota:</strong> Los centros de costo se pueden organizar jerárquicamente. Desactivar un centro desactiva también sus subcategorías.
        </p>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{formError}</p>
              </div>
            )}

            {/* Código */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Código *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={submitting}
                placeholder="CC-001"
                maxLength="20"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         disabled:opacity-50 font-mono"
              />
              <p className="text-xs text-slate-500">Máx 20 caracteres, único por firma</p>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={submitting}
                placeholder="Gastos de operación"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         disabled:opacity-50"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={submitting}
                placeholder="Descripción opcional"
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         disabled:opacity-50 resize-none"
              />
            </div>

            {/* Centro Padre */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Centro Padre (Opcional)
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                disabled={submitting}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500
                         disabled:opacity-50"
              >
                <option value="">Sin padre (Nivel raíz)</option>
                {parentOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    [{option.code}] {option.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Para crear subcategorías</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium
                         rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
