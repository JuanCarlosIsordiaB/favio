import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { Save, Loader, X, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AgriculturalProjectionForm({ onClose, onSave, initialData = {} }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data for dropdowns
  const [firms, setFirms] = useState([]);
  const [premises, setPremises] = useState([]);
  const [lots, setLots] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [formData, setFormData] = useState({
    firma_id: initialData.firma_id || '',
    predio_id: initialData.predio_id || '',
    lote_id: initialData.lote_id || '',
    fecha_tentativa: new Date().toISOString().split('T')[0],
    hectareas: '',
    uso_suelo_actual: '',
    cultivo_proyectado: '',
    tipo_trabajo: '',
    producto: '',
    variedad: '',
    dosis_ha: '',
    total: '',
    estado: 'PENDIENTE',
    // Nuevos campos de costos
    cost_center_id: '',
    campaign_id: '',
    estimated_inputs_cost: '',
    estimated_machinery_cost: '',
    estimated_labor_cost: '',
    priority: 'MEDIUM',
    responsible_person: ''
  });

  // Load initial data (firms)
  useEffect(() => {
    fetchFirms();
  }, []);

  // Load premises, cost centers and campaigns when firm changes
  useEffect(() => {
    if (formData.firma_id) {
      fetchPremises(formData.firma_id);
      fetchCostCenters(formData.firma_id);
      fetchCampaigns(formData.firma_id);
    } else {
      setPremises([]);
      setLots([]);
      setCostCenters([]);
      setCampaigns([]);
    }
  }, [formData.firma_id]);

  // Load lots when premise changes
  useEffect(() => {
    if (formData.predio_id) {
      fetchLots(formData.predio_id);
    } else {
      setLots([]);
    }
  }, [formData.predio_id]);

  // Auto-fill hectares and land use when lot is selected
  useEffect(() => {
    if (formData.lote_id) {
      const selectedLot = lots.find(l => l.id === formData.lote_id);
      if (selectedLot) {
        setFormData(prev => ({ 
          ...prev, 
          hectareas: selectedLot.area_hectares,
          uso_suelo_actual: selectedLot.current_crop || selectedLot.land_use || ''
        }));
      }
    }
  }, [formData.lote_id, lots]);

  // Auto-calculate total
  useEffect(() => {
    if (formData.hectares && formData.dosis_ha) {
      const total = parseFloat(formData.hectares) * parseFloat(formData.dosis_ha);
      setFormData(prev => ({ ...prev, total: total.toFixed(2) }));
    }
  }, [formData.hectares, formData.dosis_ha]);

  async function fetchFirms() {
    try {
      const { data } = await supabase.from('firms').select('id, name');
      setFirms(data || []);
    } catch (err) {
      console.error('Error fetching firms:', err);
    }
  }

  async function fetchPremises(firmId) {
    try {
      const { data } = await supabase.from('premises').select('id, name').eq('firm_id', firmId);
      setPremises(data || []);
    } catch (err) {
      console.error('Error fetching premises:', err);
    }
  }

  async function fetchLots(premiseId) {
    try {
      const { data } = await supabase.from('lots').select('id, name, area_hectares, current_crop, land_use').eq('premise_id', premiseId);
      setLots(data || []);
    } catch (err) {
      console.error('Error fetching lots:', err);
    }
  }

  async function fetchCostCenters(firmId) {
    try {
      const { data } = await supabase.from('cost_centers').select('id, code, name').eq('firm_id', firmId).eq('is_active', true).order('code');
      setCostCenters(data || []);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
    }
  }

  async function fetchCampaigns(firmId) {
    try {
      const { data } = await supabase.from('campaigns').select('id, name').eq('firm_id', firmId).eq('status', 'ACTIVE').order('name');
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('proyecciones_agricolas')
        .insert([{
          firm_id: formData.firma_id,
          premise_id: formData.predio_id,
          lot_id: formData.lote_id,
          fecha_tentativa: formData.fecha_tentativa,
          hectareas: formData.hectareas || 0,
          uso_suelo_actual: formData.uso_suelo_actual,
          cultivo_proyectado: formData.cultivo_proyectado,
          tipo_trabajo: formData.tipo_trabajo,
          producto: formData.producto,
          variedad: formData.variedad,
          dosis_ha: formData.dosis_ha || 0,
          total: formData.total || 0,
          estado: formData.estado,
          // Nuevos campos de costos y organización
          cost_center_id: formData.cost_center_id || null,
          campaign_id: formData.campaign_id || null,
          estimated_inputs_cost: parseFloat(formData.estimated_inputs_cost) || 0,
          estimated_machinery_cost: parseFloat(formData.estimated_machinery_cost) || 0,
          estimated_labor_cost: parseFloat(formData.estimated_labor_cost) || 0,
          priority: formData.priority,
          responsible_person: formData.responsible_person || user?.full_name || null
        }]);

      if (insertError) throw insertError;

      // Registrar auditoría para proyección agrícola
      await crearRegistro({
        firmId: formData.firma_id,
        premiseId: formData.predio_id,
        lotId: formData.lote_id,
        tipo: 'proyeccion_agricola',
        descripcion: `Proyección agrícola: ${formData.cultivo_proyectado} - ${formData.hectareas} ha`,
        moduloOrigen: 'projections',
        usuario: user?.full_name || 'sistema',
        metadata: {
          cultivo_proyectado: formData.cultivo_proyectado,
          hectareas: parseFloat(formData.hectareas || 0),
          uso_suelo_actual: formData.uso_suelo_actual,
          tipo_trabajo: formData.tipo_trabajo,
          producto: formData.producto,
          variedad: formData.variedad,
          dosis_ha: parseFloat(formData.dosis_ha || 0),
          total: parseFloat(formData.total || 0),
          estado: formData.estado
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error saving projection:', err);
      setError('Error al guardar la proyección: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Nueva Proyección Agrícola</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Location Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Firma</label>
              <select
                required
                value={formData.firma_id}
                onChange={(e) => setFormData({ ...formData, firma_id: e.target.value, predio_id: '', lote_id: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">Seleccionar Firma</option>
                {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Predio</label>
              <select
                required
                value={formData.predio_id}
                onChange={(e) => setFormData({ ...formData, predio_id: e.target.value, lote_id: '' })}
                disabled={!formData.firma_id}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">Seleccionar Predio</option>
                {premises.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lote</label>
              <select
                required
                value={formData.lote_id}
                onChange={(e) => setFormData({ ...formData, lote_id: e.target.value })}
                disabled={!formData.predio_id}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">Seleccionar Lote</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Projection Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Tentativa</label>
              <input
                type="date"
                required
                value={formData.fecha_tentativa}
                onChange={(e) => setFormData({ ...formData, fecha_tentativa: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Trabajo</label>
              <select
                required
                value={formData.tipo_trabajo}
                onChange={(e) => setFormData({ ...formData, tipo_trabajo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">Seleccionar Tipo</option>
                <option value="Siembra">Siembra</option>
                <option value="Fertilización">Fertilización</option>
                <option value="Pulverización">Pulverización</option>
                <option value="Cosecha">Cosecha</option>
                <option value="Laboreo">Laboreo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Uso de Suelo Actual</label>
              <input
                type="text"
                value={formData.uso_suelo_actual}
                onChange={(e) => setFormData({ ...formData, uso_suelo_actual: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cultivo Proyectado</label>
              <input
                type="text"
                required
                value={formData.cultivo_proyectado}
                onChange={(e) => setFormData({ ...formData, cultivo_proyectado: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
              <input
                type="text"
                required
                value={formData.producto}
                onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Variedad (Opcional)</label>
              <input
                type="text"
                value={formData.variedad}
                onChange={(e) => setFormData({ ...formData, variedad: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hectáreas</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.hectares}
                onChange={(e) => setFormData({ ...formData, hectares: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosis / Ha</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.dosis_ha}
                onChange={(e) => setFormData({ ...formData, dosis_ha: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Total Calculado <Calculator size={14} className="text-slate-400" />
              </label>
              <input
                type="number"
                step="0.01"
                readOnly
                value={formData.total}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* Cost & Organization Section */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calculator size={18} className="text-blue-600" />
              Estimación de Costos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Centro de Costo</label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Centro de Costo</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaña</label>
                <select
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Campaña (Opcional)</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
              <input
                type="text"
                placeholder={user?.full_name || 'Nombre del responsable'}
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Insumos Estimado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_inputs_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_inputs_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Maquinaria Estimado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_machinery_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_machinery_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Mano de Obra Estimado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_labor_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_labor_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-blue-100 rounded p-3 text-sm text-blue-800">
              <p className="font-medium">Costo Total Estimado: ${(
                (parseFloat(formData.estimated_inputs_cost) || 0) +
                (parseFloat(formData.estimated_machinery_cost) || 0) +
                (parseFloat(formData.estimated_labor_cost) || 0)
              ).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar Proyección
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}