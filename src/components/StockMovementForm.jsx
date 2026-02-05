import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { X, Save, Loader, ArrowUpRight, ArrowDownLeft, History, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function StockMovementForm({ input, firmId, onClose, onSave }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    input_id: input ? input.id : '',
    type: 'exit', // default to exit as it's most common
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    unit_cost: input ? input.cost_per_unit : 0,
    lot_id: '',
    destination_input_id: ''
  });
  
  const [inputs, setInputs] = useState([]);
  const [lots, setLots] = useState([]);
  const [depotInputs, setDepotInputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [firmId]);

  useEffect(() => {
    if (input) {
      setFormData(prev => ({
        ...prev,
        input_id: input.id,
        unit_cost: input.cost_per_unit
      }));
    }
  }, [input]);

  async function fetchData() {
    try {
      // Fetch inputs if not provided
      if (!input) {
        const { data: inputsData } = await supabase
          .from('inputs')
          .select('id, name, unit, cost_per_unit, depot_id, is_depot')
          .eq('firm_id', firmId)
          .order('name');
        setInputs(inputsData || []);
      }

      // Fetch lots for destination
      const { data: lotsData } = await supabase
        .from('lots')
        .select('id, name')
        .eq('firm_id', firmId)
        .order('name');
      setLots(lotsData || []);

      // Fetch inputs that are depots (for transfer destination)
      const { data: depotInputsData } = await supabase
        .from('inputs')
        .select('id, name, unit')
        .eq('firm_id', firmId)
        .eq('is_depot', true)
        .order('name');
      setDepotInputs(depotInputsData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current input FIRST to calculate things correctly
      const { data: currentInput, error: fetchError } = await supabase
        .from('inputs')
        .select('*')
        .eq('id', formData.input_id)
        .single();
        
      if (fetchError) throw fetchError;

      let quantityToRecord = parseFloat(formData.quantity);
      let newStock = currentInput.current_stock;
      let newCost = currentInput.cost_per_unit;

      // Calculate new values based on type
      if (formData.type === 'entry') {
        newStock += quantityToRecord;
        if (newStock > 0) {
          newCost = ((currentInput.current_stock * currentInput.cost_per_unit) + (quantityToRecord * parseFloat(formData.unit_cost))) / newStock;
        }
      } else if (formData.type === 'exit') {
        newStock -= quantityToRecord;
      } else if (formData.type === 'adjustment') {
        // For adjustment, user enters the REAL FINAL STOCK
        // We record the difference
        quantityToRecord = parseFloat(formData.quantity) - currentInput.current_stock;
        newStock = parseFloat(formData.quantity);
      } else if (formData.type === 'transfer') {
        newStock -= quantityToRecord;
      }

      // 2. Create movement record for SOURCE
      const { data: movement, error: moveError } = await supabase
        .from('input_movements')
        .insert([{
          input_id: formData.input_id,
          type: formData.type,
          quantity: quantityToRecord, // Use the calculated difference for adjustments
          date: formData.date,
          description: formData.description,
          unit_cost: formData.type === 'entry' ? parseFloat(formData.unit_cost) : null,
          lot_id: formData.type === 'exit' && formData.lot_id ? formData.lot_id : null,
          destination_input_id: formData.type === 'transfer' ? formData.destination_input_id : null
        }])
        .select()
        .single();

      if (moveError) throw moveError;

      // Handle DESTINATION for transfer
      if (formData.type === 'transfer' && formData.destination_input_id) {
          const { data: destInput, error: destError } = await supabase
            .from('inputs')
            .select('*')
            .eq('id', formData.destination_input_id)
            .single();
            
          if (destError) throw destError;
          
          // Update destination stock
          await supabase.from('inputs').update({
            current_stock: destInput.current_stock + parseFloat(formData.quantity) // Here we use the original quantity entered
          }).eq('id', destInput.id);
          
          // Log entry movement for destination
          await supabase.from('input_movements').insert([{
            input_id: destInput.id,
            type: 'entry',
            quantity: parseFloat(formData.quantity),
            date: formData.date,
            description: `Transferencia desde ${currentInput.name} (Origen)`,
            unit_cost: currentInput.cost_per_unit
          }]);
      }

      // 3. Update SOURCE input
      const { error: updateError } = await supabase
        .from('inputs')
        .update({ 
          current_stock: newStock,
          cost_per_unit: newCost
        })
        .eq('id', formData.input_id);

      if (updateError) throw updateError;

      // Registrar auditoría para movimiento de stock
      const movementTypeLabel = {
        'entry': 'Ingreso',
        'exit': 'Salida',
        'transfer': 'Movimiento',
        'adjustment': 'Ajuste'
      }[formData.type] || formData.type;

      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: formData.type === 'exit' && formData.lot_id ? formData.lot_id : null,
        tipo: 'stock',
        descripcion: `Movimiento de stock (${movementTypeLabel}): ${currentInput.name} - ${Math.abs(quantityToRecord)} ${currentInput.unit}`,
        moduloOrigen: 'stock_movement',
        usuario: user?.full_name || 'sistema',
        metadata: {
          input_name: currentInput.name,
          movement_type: formData.type,
          quantity: quantityToRecord,
          unit: currentInput.unit,
          new_stock: newStock,
          description: formData.description,
          destination_input_id: formData.type === 'transfer' ? formData.destination_input_id : null
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving movement:', err);
      setError('Error al registrar el movimiento. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedInputObj = input || inputs.find(i => i.id === formData.input_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Registrar Movimiento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {!input && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Insumo</label>
              <select
                required
                value={formData.input_id}
                onChange={(e) => setFormData({...formData, input_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">Seleccionar insumo...</option>
                {inputs.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
            </div>
          )}

          {selectedInputObj && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
              <p className="text-sm font-medium text-slate-900">{selectedInputObj.name}</p>
              <p className="text-xs text-slate-500">Stock Actual: {selectedInputObj.current_stock || 0} {selectedInputObj.unit}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimiento</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'entry'})}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                  formData.type === 'entry' 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowDownLeft size={20} className="mb-1" />
                <span className="text-[10px] font-medium">Ingreso</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'exit'})}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                  formData.type === 'exit' 
                    ? 'bg-red-50 border-red-500 text-red-700' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowUpRight size={20} className="mb-1" />
                <span className="text-[10px] font-medium">Salida</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'transfer'})}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                  formData.type === 'transfer' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowRightLeft size={20} className="mb-1" />
                <span className="text-[10px] font-medium">Movimiento</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'adjustment'})}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                  formData.type === 'adjustment' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <History size={20} className="mb-1" />
                <span className="text-[10px] font-medium">Ajuste</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {formData.type === 'adjustment' ? 'Nuevo Stock Real' : 'Cantidad'} {selectedInputObj ? `(${selectedInputObj.unit})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          {formData.type === 'entry' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Actualizará el costo promedio del insumo.</p>
            </div>
          )}

          {formData.type === 'exit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destino (Lote)</label>
              <select
                value={formData.lot_id}
                onChange={(e) => setFormData({...formData, lot_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">General / Sin lote específico</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>{lot.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Depósito Destino (Insumo)</label>
              <select
                required
                value={formData.destination_input_id}
                onChange={(e) => setFormData({...formData, destination_input_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">Seleccionar depósito destino...</option>
                {depotInputs
                  .filter(d => d.id !== formData.input_id) // Exclude current input
                  .map(depot => (
                    <option key={depot.id} value={depot.id}>{depot.name} ({depot.unit})</option>
                  ))
                }
              </select>
              {depotInputs.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No hay otros insumos marcados como "Depósito". Edita un insumo y marca la opción "Funciona como depósito" para que aparezca aquí.
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                El stock se descontará del origen y se sumará al destino seleccionado.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Máquina / Tarea</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
              placeholder={formData.type === 'entry' ? 'Ej: Compra Factura A-123' : 'Ej: Aplicación pre-siembra'}
            ></textarea>
          </div>
        </form>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}