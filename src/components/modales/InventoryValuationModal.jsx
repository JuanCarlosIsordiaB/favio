import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle } from 'lucide-react';
import {
  VALUATION_METHODS,
  valorizarInventarioGanadero,
  valorizarInventarioAgricola,
  getLastValuation
} from '../../services/inventoryValuationService';
import { useAuth } from '../../contexts/AuthContext';

export default function InventoryValuationModal({ isOpen, gestion, premiseId, onClose, onSuccess }) {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState('weighted_avg');
  const [livestockData, setLivestockData] = useState(null);
  const [inputsData, setInputsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [pricingSource, setPricingSource] = useState('market');

  useEffect(() => {
    if (isOpen && premiseId && gestion) {
      loadInventoryData();
    }
  }, [isOpen, premiseId, gestion]);

  async function loadInventoryData() {
    try {
      setIsLoading(true);

      // Load livestock inventory
      const { data: animals } = await supabase
        .from('animals')
        .select('*, herd_events(*)')
        .eq('premise_id', premiseId)
        .eq('status', 'ACTIVE');

      if (animals) {
        const grouped = {};
        animals.forEach((animal) => {
          const category = animal.category || 'Sin categoría';
          if (!grouped[category]) {
            grouped[category] = { cabezas: 0, total_kg: 0, animals: [] };
          }
          grouped[category].cabezas += 1;
          grouped[category].animals.push(animal);

          // Get latest weight or use initial weight
          const lastWeight = animal.herd_events?.[0]?.weight_kg || animal.initial_weight || 0;
          grouped[category].total_kg += lastWeight;
        });

        setLivestockData(grouped);
      }

      // Load inputs inventory
      const { data: inputs } = await supabase
        .from('inputs')
        .select('*')
        .eq('premise_id', premiseId)
        .gt('current_stock', 0);

      if (inputs) {
        const grouped = {};
        inputs.forEach((input) => {
          const category = input.category || 'Sin categoría';
          if (!grouped[category]) {
            grouped[category] = { items: [], total_value: 0 };
          }
          grouped[category].items.push(input);
          grouped[category].total_value += (input.current_stock * (input.unit_cost || 0));
        });

        setInputsData(grouped);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Error cargando datos de inventario');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      setIsSubmitting(true);

      // Save livestock valuation
      if (livestockData && Object.keys(livestockData).length > 0) {
        await valorizarInventarioGanadero(premiseId, new Date().toISOString().split('T')[0], {
          gestion_id: gestion?.id,
          method: selectedMethod,
          notes,
          created_by: user?.full_name || 'sistema'
        });
      }

      // Save inputs valuation
      if (inputsData && Object.keys(inputsData).length > 0) {
        await valorizarInventarioAgricola(premiseId, new Date().toISOString().split('T')[0], {
          gestion_id: gestion?.id,
          method: selectedMethod,
          notes,
          created_by: user?.full_name || 'sistema'
        });
      }

      toast.success('Valorización de inventario guardada');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving valuation:', error);
      toast.error('Error guardando valorización');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const totalLivestockKg = livestockData
    ? Object.values(livestockData).reduce((sum, cat) => sum + cat.total_kg, 0)
    : 0;

  const totalInputsValue = inputsData
    ? Object.values(inputsData).reduce((sum, cat) => sum + cat.total_value, 0)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Valorización de Inventario Final</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader size={20} className="animate-spin text-blue-600" />
            <p className="text-slate-600">Cargando datos de inventario...</p>
          </div>
        ) : (
          <>
            {/* Valuation method selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-800 mb-3">
                Método de Valorización *
              </label>
              <div data-id="inventory-valuation-select-method" className="grid grid-cols-2 gap-3">
                {Object.entries(VALUATION_METHODS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      value={key}
                      checked={selectedMethod === key}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="font-medium text-slate-900">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Livestock preview */}
            {livestockData && Object.keys(livestockData).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Inventario Ganadero</h3>
                <div data-id="inventory-valuation-livestock-preview" className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Categoría</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Cabezas</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Total kg</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">kg/Cabeza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border border-slate-200">
                      {Object.entries(livestockData).map(([category, data]) => (
                        <tr key={category} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{category}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{data.cabezas}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{data.total_kg.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {(data.total_kg / data.cabezas).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold">
                        <td className="px-4 py-2 text-slate-900">TOTAL</td>
                        <td className="px-4 py-2 text-right text-slate-900">
                          {Object.values(livestockData).reduce((sum, cat) => sum + cat.cabezas, 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-green-700">{totalLivestockKg.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          {(totalLivestockKg / Object.values(livestockData).reduce((sum, cat) => sum + cat.cabezas, 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inputs preview */}
            {inputsData && Object.keys(inputsData).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Inventario Agrícola (Insumos)</h3>
                <div data-id="inventory-valuation-inputs-preview" className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Categoría</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Ítems</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Valor Total ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border border-slate-200">
                      {Object.entries(inputsData).map(([category, data]) => (
                        <tr key={category} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{category}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{data.items.length}</td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            ${data.total_value.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold">
                        <td className="px-4 py-2 text-slate-900">TOTAL</td>
                        <td className="px-4 py-2 text-right text-slate-900">
                          {Object.values(inputsData).reduce((sum, cat) => sum + cat.items.length, 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-green-700">
                          ${totalInputsValue.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!livestockData && !inputsData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle size={20} className="text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  No hay datos de inventario disponibles para este predio.
                </p>
              </div>
            )}

            {/* Pricing source */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Fuente de Precios
              </label>
              <select
                value={pricingSource}
                onChange={(e) => setPricingSource(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              >
                <option value="market">Precio de Mercado</option>
                <option value="catalog">Catálogo</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Notas de Valorización
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Documenta cualquier observación sobre la valorización..."
                rows="3"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
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
                data-id="inventory-valuation-btn-save"
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting || (!livestockData && !inputsData)}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Valorización'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
