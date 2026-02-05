/**
 * InputFormModal.jsx
 * Modal para crear/editar insumos
 * Componente reutilizable que puede ser llamado desde InputsManager
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader, AlertTriangle, Trash2 } from 'lucide-react';
import {
  validarInsumo,
  obtenerCategorias,
  obtenerUnidades
} from '../../lib/validations/inputValidations';

export default function InputFormModal({
  isOpen,
  isEditing = false,
  insumo = null,
  onSubmit,
  onCancel,
  onDelete = null,
  canDelete = true,
  isLoading = false,
  isDeleting = false,
  showDeleteConfirm = false,
  onConfirmDelete,
  onCancelDelete,
  depots = [],  // Lotes con is_depot=true
  initialData = null  // Datos iniciales para nuevo insumo (desde remito)
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    depot_id: '',
    initial_stock: '',
    min_stock_alert: '',
    cost_per_unit: '',
    brand: '',
    laboratory: '',
    variety: '',
    drug: '',
    batch_number: '',
    expiration_date: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos del insumo cuando se abre en modo edición o con initialData
  useEffect(() => {
    if (isOpen && isEditing && insumo) {
      setFormData({
        name: insumo.name || '',
        category: insumo.category || '',
        unit: insumo.unit || '',
        depot_id: insumo.depot_id || '',
        initial_stock: '',
        min_stock_alert: insumo.min_stock_alert || '',
        cost_per_unit: insumo.cost_per_unit || '',
        brand: insumo.brand || '',
        laboratory: insumo.laboratory || '',
        variety: insumo.variety || '',
        drug: insumo.drug || '',
        batch_number: insumo.batch_number || '',
        expiration_date: insumo.expiration_date || '',
        entry_date: insumo.entry_date || new Date().toISOString().split('T')[0],
        description: insumo.description || ''
      });
      setErrors({});
    } else if (isOpen && !isEditing) {
      // Limpiar formulario para crear nuevo, o usar initialData si se proporciona
      setFormData({
        name: initialData?.name || '',
        category: initialData?.category || '',
        unit: initialData?.unit || '',
        depot_id: initialData?.depot_id || '',
        initial_stock: initialData?.initial_stock || '',
        min_stock_alert: '',
        cost_per_unit: '',
        brand: '',
        laboratory: '',
        variety: '',
        drug: '',
        batch_number: '',
        expiration_date: '',
        entry_date: new Date().toISOString().split('T')[0],
        description: initialData?.description || ''
      });
      setErrors({});
    }
  }, [isOpen, isEditing, insumo, initialData]);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    // Validar datos básicos
    const validacion = validarInsumo(formData);
    if (!validacion.valido) {
      setErrors(validacion.errores);
      toast.error('Completa los campos requeridos');
      return;
    }

    // Validación crítica: depot_id es OBLIGATORIO
    if (!formData.depot_id || formData.depot_id.trim() === '') {
      setErrors(prev => ({ ...prev, depot_id: 'Debes seleccionar un depósito/ubicación' }));
      toast.error('Debes seleccionar un depósito/ubicación para el insumo');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast.error(error.message || 'Error al guardar insumo');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 z-10 flex items-center justify-center rounded-xl p-6">
            <div className="bg-white border border-red-200 shadow-lg rounded-xl p-6 max-w-md w-full text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar insumo?</h3>
              <p className="text-slate-600 mb-6">
                El insumo "{formData.name}" se eliminará permanentemente.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onCancelDelete}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? 'Editar Insumo' : 'Nuevo Insumo'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEditing ? 'Modifica la información del insumo' : 'Crea un nuevo insumo en el sistema'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1"
            disabled={isSubmitting || isDeleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fila 1: Nombre y Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nombre Comercial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                data-testid="input-name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="Ej: Fertilizante NPK 10-10-10"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                data-testid="input-category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                  errors.category ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="">Seleccionar categoría...</option>
                {obtenerCategorias().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>
          </div>

          {/* Fila 2: Unidad y Depósito */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Unidad de Medida <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                data-testid="input-unit"
                value={formData.unit}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                  errors.unit ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="">Seleccionar unidad...</option>
                {obtenerUnidades().map(u => (
                  <option key={u.valor} value={u.valor}>{u.etiqueta}</option>
                ))}
              </select>
              {errors.unit && (
                <p className="text-red-500 text-xs mt-1">{errors.unit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Depósito/Ubicación <span className="text-red-500">*</span>
              </label>
              <select
                name="depot_id"
                data-testid="input-depot"
                value={formData.depot_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                  errors.depot_id ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                disabled={isSubmitting || depots.length === 0}
              >
                <option value="">Seleccionar depósito...</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>{depot.name}</option>
                ))}
              </select>
              {errors.depot_id && (
                <p className="text-red-500 text-xs mt-1">{errors.depot_id}</p>
              )}
              {depots.length === 0 && (
                <p className="text-yellow-600 text-xs mt-1">⚠️ No hay depósitos disponibles. Crea lotes con activando la opcion de deposito primero.</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Ubicación física donde se almacena el insumo</p>
            </div>
          </div>

          {/* Fila 3: Stock Inicial y Stock Mínimo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Stock Inicial {!isEditing && <span className="text-blue-500 text-xs font-normal">(Opcional)</span>}
              </label>
              <input
                type="number"
                name="initial_stock"
                value={formData.initial_stock}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                  errors.initial_stock ? 'border-red-500 bg-red-50' : ''
                }`}
                placeholder="Ej: 100"
                disabled={isSubmitting || isEditing}
              />
              {errors.initial_stock && (
                <p className="text-red-500 text-xs mt-1">{errors.initial_stock}</p>
              )}
              {!isEditing && (
                <p className="text-xs text-slate-500 mt-1">Cantidad inicial que se registrará como entrada</p>
              )}
              {isEditing && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No se puede cambiar (usa movimientos para ajustar stock)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Alerta Stock Mínimo
              </label>
              <input
                type="number"
                name="min_stock_alert"
                value={formData.min_stock_alert}
                onChange={handleInputChange}
                step="0.01"
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                  errors.min_stock_alert ? 'border-red-500 bg-red-50' : ''
                }`}
                placeholder="Ej: 10"
                disabled={isSubmitting}
              />
              {errors.min_stock_alert && (
                <p className="text-red-500 text-xs mt-1">{errors.min_stock_alert}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Se generará alerta cuando stock sea menor o igual</p>
            </div>
          </div>

          {/* Fila 3: Costo y Marca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Costo por Unidad
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                step="0.01"
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                  errors.cost_per_unit ? 'border-red-500 bg-red-50' : ''
                }`}
                placeholder="Ej: 150.50"
                disabled={isSubmitting}
              />
              {errors.cost_per_unit && (
                <p className="text-red-500 text-xs mt-1">{errors.cost_per_unit}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Para valuación de stock</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Marca/Laboratorio
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="Ej: Syngenta"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Sección Técnica */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Información Técnica (Opcional)</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Variedad</label>
                <input
                  type="text"
                  name="variety"
                  value={formData.variety}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: Urea 46%"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Droga/Principio Activo</label>
                <input
                  type="text"
                  name="drug"
                  value={formData.drug}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: Glifosato"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Lote</label>
                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: 2026001"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Vencimiento</label>
                <input
                  type="date"
                  name="expiration_date"
                  value={formData.expiration_date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm ${
                    errors.expiration_date ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.expiration_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiration_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Ingreso</label>
                <input
                  type="date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm ${
                    errors.entry_date ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.entry_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.entry_date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descripción/Notas
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              placeholder="Información adicional sobre el insumo..."
              rows="3"
              disabled={isSubmitting}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-between pt-6 border-t border-slate-200">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSubmitting || isDeleting || !canDelete}
                  title={!canDelete ? 'No tienes permiso para eliminar insumos' : 'Eliminar este insumo'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    canDelete
                      ? 'text-red-600 hover:bg-red-50 disabled:opacity-50'
                      : 'text-slate-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isDeleting}
                className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 font-medium"
              >
                Cancelar
              </button>

              <button
                type="submit"
                data-testid="input-form-submit"
                disabled={isSubmitting || isDeleting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Actualizar' : 'Guardar'} Insumo
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
