import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Loader } from 'lucide-react';
import { crearAjusteCierre } from '../../services/gestionesService';
import { useAuth } from '../../contexts/AuthContext';

const ADJUSTMENT_TYPES = {
  INVENTORY: 'Ajuste de Inventario',
  EXPENSE: 'Ajuste de Gasto',
  INCOME: 'Ajuste de Ingreso',
  CLASSIFICATION: 'Reclasificación',
  OTHER: 'Otro'
};

export default function AjusteCierreModal({ isOpen, gestion, onClose, onSuccess }) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('INVENTORY');
  const [motivo, setMotivo] = useState('');
  const [oldValue, setOldValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  function handleReset() {
    setSelectedType('INVENTORY');
    setMotivo('');
    setOldValue('');
    setNewValue('');
    setFormErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErrors({});

    // Validations
    if (!motivo?.trim()) {
      setFormErrors({ motivo: 'Motivo es requerido' });
      toast.error('Motivo es requerido');
      return;
    }

    if (motivo.trim().length < 10) {
      setFormErrors({ motivo: 'El motivo debe tener al menos 10 caracteres' });
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    if (!oldValue && oldValue !== 0) {
      setFormErrors({ oldValue: 'Valor anterior es requerido' });
      toast.error('Valor anterior es requerido');
      return;
    }

    if (!newValue && newValue !== 0) {
      setFormErrors({ newValue: 'Valor nuevo es requerido' });
      toast.error('Valor nuevo es requerido');
      return;
    }

    try {
      setIsSubmitting(true);

      const difference = parseFloat(newValue) - parseFloat(oldValue);

      await crearAjusteCierre(gestion.id, {
        adjustment_type: selectedType,
        description: motivo,
        old_value: parseFloat(oldValue),
        new_value: parseFloat(newValue),
        difference: difference,
        created_by: user?.full_name || 'sistema'
      });

      toast.success('Ajuste de cierre creado exitosamente');
      handleReset();
      onClose?.();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast.error(error.message || 'Error al crear el ajuste');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const difference = (parseFloat(newValue) || 0) - (parseFloat(oldValue) || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Crear Ajuste de Cierre</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment type */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Tipo de Ajuste *
            </label>
            <select
              data-id="ajuste-cierre-select-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              disabled={isSubmitting}
            >
              {Object.entries(ADJUSTMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Type description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Tipo seleccionado:</strong> {ADJUSTMENT_TYPES[selectedType]}
            <p className="mt-1 text-xs">
              {selectedType === 'INVENTORY' && 'Ajusta valores de inventario inicial o final'}
              {selectedType === 'EXPENSE' && 'Registra gastos omitidos o corrige montos'}
              {selectedType === 'INCOME' && 'Registra ingresos omitidos o corrige montos'}
              {selectedType === 'CLASSIFICATION' && 'Reclasifica gastos o ingresos entre categorías'}
              {selectedType === 'OTHER' && 'Otro tipo de ajuste'}
            </p>
          </div>

          {/* Motivo (mandatory) */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Motivo del Ajuste * (mínimo 10 caracteres)
            </label>
            <textarea
              data-id="ajuste-cierre-textarea-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe con detalle por qué se necesita este ajuste..."
              rows="4"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                formErrors.motivo ? 'border-red-500' : 'border-slate-300'
              }`}
              disabled={isSubmitting}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-slate-500">
                {motivo.length} caracteres
              </p>
              {formErrors.motivo && (
                <p className="text-red-500 text-xs">{formErrors.motivo}</p>
              )}
            </div>
          </div>

          {/* Values section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Valores del Ajuste</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Old value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Anterior ($) *
                </label>
                <input
                  data-id="ajuste-cierre-input-old-value"
                  type="number"
                  step="0.01"
                  value={oldValue}
                  onChange={(e) => setOldValue(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                    formErrors.oldValue ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.oldValue && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.oldValue}</p>
                )}
              </div>

              {/* New value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Nuevo ($) *
                </label>
                <input
                  data-id="ajuste-cierre-input-new-value"
                  type="number"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                    formErrors.newValue ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isSubmitting}
                />
                {formErrors.newValue && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.newValue}</p>
                )}
              </div>
            </div>

            {/* Difference display */}
            {(oldValue || newValue) && (
              <div className={`p-3 rounded-lg ${difference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm font-medium text-slate-800">
                  Diferencia Calculada:
                  <span className={`ml-2 font-bold ${difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${difference.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {difference > 0 && 'El ajuste aumentará el valor'}
                  {difference < 0 && 'El ajuste disminuirá el valor'}
                  {difference === 0 && 'No hay cambio de valor'}
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>Nota importante:</strong> Este ajuste será registrado en auditoría con tu usuario. Asegúrate de documentar adecuadamente el motivo.
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose?.();
              }}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              data-id="ajuste-cierre-btn-submit"
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting || !selectedType || !motivo.trim() || !oldValue || !newValue}
            >
              {isSubmitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Ajuste'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
