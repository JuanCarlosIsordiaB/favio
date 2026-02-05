import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { cerrarGestion } from '../../services/gestionesService';
import { VALUATION_METHODS } from '../../services/inventoryValuationService';
import { useAuth } from '../../contexts/AuthContext';

export default function GestionCloseModal({ isOpen, gestion, premiseId, onClose, onSuccess }) {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState('weighted_avg');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen && gestion) {
      validatePreClose();
    }
  }, [isOpen, gestion]);

  async function validatePreClose() {
    if (!gestion) return;

    try {
      setIsValidating(true);
      setValidationErrors([]);
      const errors = [];

      // Check agricultural works
      const { data: agricWorks } = await supabase
        .from('agricultural_works')
        .select('id, work_type, status')
        .eq('campaign_id', gestion.id)
        .not('status', 'in', '(APPROVED,CLOSED,CANCELLED)');

      if (agricWorks && agricWorks.length > 0) {
        errors.push(`Hay ${agricWorks.length} trabajo(s) agrícola(s) sin aprobar`);
      }

      // Check livestock works
      const { data: livestockWorks } = await supabase
        .from('livestock_works')
        .select('id, work_type, status')
        .eq('campaign_id', gestion.id)
        .not('status', 'in', '(APPROVED,CLOSED,CANCELLED)');

      if (livestockWorks && livestockWorks.length > 0) {
        errors.push(`Hay ${livestockWorks.length} trabajo(s) ganadero(s) sin aprobar`);
      }

      setValidationErrors(errors);
    } catch (error) {
      console.error('Error validating pre-close:', error);
      toast.error('Error validando gestión');
    } finally {
      setIsValidating(false);
    }
  }

  async function handleClose() {
    if (validationErrors.length > 0) {
      toast.error('Debes resolver todos los errores de validación antes de cerrar');
      return;
    }

    try {
      setIsSubmitting(true);

      // Call gestionesService to close gestion
      await cerrarGestion(gestion.id, {
        notes: notes,
        valorizationMethod: selectedMethod,
        userId: user?.id
      });

      toast.success('Gestión cerrada exitosamente');
      setNotes('');
      onSuccess?.();
    } catch (error) {
      console.error('Error closing gestion:', error);
      toast.error(error.message || 'Error al cerrar la gestión');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle size={24} className="text-orange-600" />
          <h2 className="text-2xl font-bold text-slate-800">Cerrar Gestión</h2>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-800">
            <strong>Advertencia:</strong> Esta acción es irreversible. La gestión se bloqueará y no podrá ser editada.
            Se registrará una valorización de inventario final.
          </p>
        </div>

        {/* Validation status */}
        {isValidating ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader size={20} className="animate-spin text-blue-600" />
            <p className="text-slate-600">Validando gestión...</p>
          </div>
        ) : (
          <>
            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div data-id="gestion-close-validation-errors" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">Errores de validación:</h3>
                    <ul className="space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx} className="text-sm text-red-800">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {validationErrors.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-sm text-green-800">
                  ✓ Todos los trabajos están aprobados. Puedes proceder con el cierre.
                </p>
              </div>
            )}

            {/* Valuation method selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-800 mb-3">
                Método de Valorización de Inventario Final *
              </label>
              <div data-id="gestion-close-select-valuation-method" className="space-y-2">
                {Object.entries(VALUATION_METHODS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      value={key}
                      checked={selectedMethod === key}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="w-4 h-4 text-green-600"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">
                        {key === 'weighted_avg' && 'Promedio ponderado de costos históricos'}
                        {key === 'historical' && 'Costo histórico registrado'}
                        {key === 'market' && 'Precio de mercado actual'}
                        {key === 'mixed' && 'Combinación de métodos'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Notas del Cierre
              </label>
              <textarea
                data-id="gestion-close-input-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Documenta cualquier observación importante para el cierre..."
                rows="4"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                data-id="gestion-close-btn-confirm"
                onClick={handleClose}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors ${
                  validationErrors.length > 0 || isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                disabled={validationErrors.length > 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  'Confirmar Cierre'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
