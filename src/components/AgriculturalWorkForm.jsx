/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Formulario para crear/editar trabajos agrícolas
 *
 * CAMBIO CRÍTICO: Ya NO descuenta stock al guardar
 * - Guarda en estado DRAFT sin afectar inventario
 * - Stock se descuenta SOLO al aprobar trabajo
 * - Permite agregar insumos, maquinaria y mano de obra
 * - Calcula costos en tiempo real
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearTrabajoAgricola, actualizarTrabajoAgricola, obtenerDetalleTrabajoAgricola, enviarTrabajoAprobacion } from '../services/agriculturalWorks';
import { obtenerCentrosCosto, obtenerCampanas, obtenerMaquinaria } from '../services/machinery';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { Save, Loader, X, Calculator, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import WorkAttachmentUploader from './WorkAttachmentUploader';

export default function AgriculturalWorkForm({
  onClose,
  onSave,
  mode = 'create',
  trabajoId = null,
  initialData = {},
  selectedFirmId,
  selectedPremiseId
}) {
  const { user } = useAuth();
  const { activities, getAgriculturalActivities, loadActiveActivities } = useActivities();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  // Data para dropdowns
  const [firms, setFirms] = useState([]);
  const [premises, setPremises] = useState([]);
  const [lots, setLots] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [machinery, setMachinery] = useState([]);
  // ✅ REMOVIDO: const [activities, setActivities] = useState([]);
  // Usamos getAgriculturalActivities del hook directamente

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Ubicación
    firm_id: initialData.firm_id || selectedFirmId || '',
    premise_id: initialData.premise_id || selectedPremiseId || '',
    lot_id: initialData.lot_id || '',
    date: new Date().toISOString().split('T')[0],

    // Información general
    activity_id: '',
    work_type: '', // Mantener por retrocompatibilidad
    responsible_person: '',
    hectares: '',
    fuel_used: '',

    // Organización (OBLIGATORIO al enviar a aprobación)
    cost_center_id: '',
    campaign_id: '',

    // Costos adicionales
    other_costs: '',

    // Detalle
    detail: '',

    // Condiciones climáticas
    weather_conditions: ''
  });

  // Arrays dinámicos
  const [insumos, setInsumos] = useState([
    { input_id: '', dose_applied: '', quantity_applied: '', unit: '', cost_per_unit: '' }
  ]);

  const [maquinaria, setMaquinaria] = useState([
    { machinery_id: '', hours_used: '', cost_per_hour: '' }
  ]);

  const [labor, setLabor] = useState([
    { worker_name: '', hours_worked: '', cost_per_hour: '' }
  ]);

  // Cálculo de costos
  const [costBreakdown, setCostBreakdown] = useState({
    inputs: 0,
    machinery: 0,
    labor: 0,
    others: 0,
    total: 0
  });

  // =============================================
  // EFFECTS: Cargar datos
  // =============================================

  useEffect(() => {
    fetchFirms();
    fetchInputs();
  }, []);

  useEffect(() => {
    if (formData.firm_id) {
      fetchPremises(formData.firm_id);
      fetchCostCenters(formData.firm_id);
      fetchCampaigns(formData.firm_id);
      fetchMachinery(formData.firm_id);
      // Cargar actividades agrícolas dinámicas
      loadActiveActivities(formData.firm_id, 'AGRICULTURAL');
    } else {
      setPremises([]);
      setLots([]);
      // ✅ Se quitó setActivities([]) - getAgriculturalActivities se actualiza automáticamente con el hook
    }
  }, [formData.firm_id, loadActiveActivities, activities]);

  // ✅ REMOVIDO: Race condition eliminado
  // Ahora usamos getAgriculturalActivities directamente en el render (ver sección "Tipo de Trabajo")

  useEffect(() => {
    if (formData.premise_id) {
      fetchLots(formData.premise_id);
    } else {
      setLots([]);
    }
  }, [formData.premise_id]);

  // Auto-llenar hectáreas
  useEffect(() => {
    if (formData.lot_id) {
      const selectedLot = lots.find(l => l.id === formData.lot_id);
      if (selectedLot) {
        setFormData(prev => ({ ...prev, hectares: selectedLot.area_hectares }));
      }
    }
  }, [formData.lot_id, lots]);

  // Recalcular costos
  useEffect(() => {
    calculateCosts();
  }, [insumos, maquinaria, labor, formData.other_costs]);

  // Cargar datos en modo EDIT
  useEffect(() => {
    if (mode === 'edit' && trabajoId) {
      loadTrabajoData(trabajoId);
    }
  }, [mode, trabajoId]);

  // =============================================
  // CARGAR DATOS DE TRABAJO (MODO EDIT)
  // =============================================

  async function loadTrabajoData(id) {
    setLoadingData(true);
    try {
      const trabajo = await obtenerDetalleTrabajoAgricola(id);

      // Cargar formData base
      setFormData({
        firm_id: trabajo.firm_id,
        premise_id: trabajo.premise_id,
        lot_id: trabajo.lot_id,
        date: trabajo.date,
        activity_id: trabajo.activity_id || '',
        work_type: trabajo.work_type,
        hectares: trabajo.hectares || '',
        fuel_used: trabajo.fuel_used || '',
        detail: trabajo.detail || '',
        weather_conditions: trabajo.weather_conditions || '',
        responsible_person: trabajo.responsible_person || '',
        cost_center_id: trabajo.cost_center_id || '',
        campaign_id: trabajo.campaign_id || '',
        other_costs: trabajo.other_costs || ''
      });

      // Cargar insumos
      if (trabajo.insumos && trabajo.insumos.length > 0) {
        setInsumos(
          trabajo.insumos.map((i) => ({
            input_id: i.input_id,
            dose_projected: i.dose_projected || '',
            dose_applied: i.dose_applied || '',
            quantity_projected: i.quantity_projected || '',
            quantity_applied: i.quantity_applied || '',
            unit: i.unit || '',
            cost_per_unit: i.cost_per_unit || ''
          }))
        );
      }

      // Cargar maquinaria
      if (trabajo.maquinaria && trabajo.maquinaria.length > 0) {
        setMaquinaria(
          trabajo.maquinaria.map((m) => ({
            machinery_id: m.machinery_id,
            hours_used: m.hours_used || '',
            cost_per_hour: m.cost_per_hour || ''
          }))
        );
      }

      // Cargar labor
      if (trabajo.labor && trabajo.labor.length > 0) {
        setLabor(
          trabajo.labor.map((l) => ({
            worker_name: l.worker_name,
            worker_role: l.worker_role || '',
            hours_worked: l.hours_worked || '',
            cost_per_hour: l.cost_per_hour || ''
          }))
        );
      }

      // Cargar listas relacionadas
      if (trabajo.firm_id) {
        await fetchPremises(trabajo.firm_id);
        await fetchCostCenters(trabajo.firm_id);
        await fetchCampaigns(trabajo.firm_id);
        await fetchMachinery(trabajo.firm_id);
      }

      if (trabajo.premise_id) {
        await fetchLots(trabajo.premise_id);
      }
    } catch (err) {
      console.error('Error cargando trabajo:', err);
      toast.error('Error al cargar datos del trabajo');
    } finally {
      setLoadingData(false);
    }
  }

  // =============================================
  // FETCH FUNCTIONS
  // =============================================

  async function fetchFirms() {
    try {
      const { data, error, count } = await supabase
        .from('firms')
        .select('id, name', { count: 'exact' });

      if (error) {
        throw error;
      }

      console.log(`✅ fetchFirms: ${data?.length || 0} de ${count} firmas cargadas`);

      if (!data || data.length === 0) {
        toast.warning('No hay firmas disponibles. Crea una firma primero.');
        console.warn('⚠️ fetchFirms: Sin datos. Posibles causas:');
        console.warn('  - RLS bloqueando acceso');
        console.warn('  - No hay firmas en la BD');
        console.warn('  - firmId incorrecto en filtros');
      }

      setFirms(data || []);
    } catch (err) {
      console.error('❌ Error fetching firms:', err);
      toast.error(`Error al cargar firmas: ${err.message}`);
      setFirms([]);
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
      const { data } = await supabase.from('lots').select('id, name, area_hectares').eq('premise_id', premiseId);
      setLots(data || []);
    } catch (err) {
      console.error('Error fetching lots:', err);
    }
  }

  async function fetchInputs() {
    try {
      const { data } = await supabase
        .from('inputs')
        .select('id, name, unit, current_stock, cost_per_unit')
        .order('name');
      setInputs(data || []);
    } catch (err) {
      console.error('Error fetching inputs:', err);
    }
  }

  async function fetchCostCenters(firmId) {
    try {
      const data = await obtenerCentrosCosto(firmId);
      setCostCenters(data || []);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
    }
  }

  async function fetchCampaigns(firmId) {
    try {
      const data = await obtenerCampanas(firmId);
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  }

  async function fetchMachinery(firmId) {
    try {
      const data = await obtenerMaquinaria(firmId);
      setMachinery(data || []);
    } catch (err) {
      console.error('Error fetching machinery:', err);
    }
  }

  // =============================================
  // CÁLCULO DE COSTOS
  // =============================================

  function calculateCosts() {
    // Costo de insumos
    const inputsCost = insumos.reduce((sum, ins) => {
      const quantity = parseFloat(ins.quantity_applied) || 0;
      const costPerUnit = parseFloat(ins.cost_per_unit) || 0;
      return sum + (quantity * costPerUnit);
    }, 0);

    // Costo de maquinaria
    const machineryCost = maquinaria.reduce((sum, maq) => {
      const hours = parseFloat(maq.hours_used) || 0;
      const costPerHour = parseFloat(maq.cost_per_hour) || 0;
      return sum + (hours * costPerHour);
    }, 0);

    // Costo de mano de obra
    const laborCost = labor.reduce((sum, lab) => {
      const hours = parseFloat(lab.hours_worked) || 0;
      const costPerHour = parseFloat(lab.cost_per_hour) || 0;
      return sum + (hours * costPerHour);
    }, 0);

    const othersCost = parseFloat(formData.other_costs) || 0;
    const total = inputsCost + machineryCost + laborCost + othersCost;

    setCostBreakdown({
      inputs: inputsCost,
      machinery: machineryCost,
      labor: laborCost,
      others: othersCost,
      total: total
    });
  }

  // =============================================
  // AGREGAR/QUITAR FILAS
  // =============================================

  const addInsumo = () => {
    setInsumos([...insumos, { input_id: '', dose_applied: '', quantity_applied: '', unit: '', cost_per_unit: '' }]);
  };

  const removeInsumo = (idx) => {
    setInsumos(insumos.filter((_, i) => i !== idx));
  };

  const updateInsumo = (idx, field, value) => {
    const newInsumos = [...insumos];
    newInsumos[idx][field] = value;

    // Auto-llenar costo si se selecciona insumo
    if (field === 'input_id' && value) {
      const selectedInput = inputs.find(i => i.id === value);
      if (selectedInput) {
        newInsumos[idx].cost_per_unit = selectedInput.cost_per_unit || 0;
        newInsumos[idx].unit = selectedInput.unit;
      }
    }

    setInsumos(newInsumos);
  };

  const addMaquinaria = () => {
    setMaquinaria([...maquinaria, { machinery_id: '', hours_used: '', cost_per_hour: '' }]);
  };

  const removeMaquinaria = (idx) => {
    setMaquinaria(maquinaria.filter((_, i) => i !== idx));
  };

  const updateMaquinaria = (idx, field, value) => {
    const newMaquinaria = [...maquinaria];
    newMaquinaria[idx][field] = value;

    // Auto-llenar costo si se selecciona maquinaria
    if (field === 'machinery_id' && value) {
      const selectedMachinery = machinery.find(m => m.id === value);
      if (selectedMachinery) {
        newMaquinaria[idx].cost_per_hour = selectedMachinery.cost_per_hour || 0;
      }
    }

    setMaquinaria(newMaquinaria);
  };

  const addLabor = () => {
    setLabor([...labor, { worker_name: '', hours_worked: '', cost_per_hour: '' }]);
  };

  const removeLabor = (idx) => {
    setLabor(labor.filter((_, i) => i !== idx));
  };

  const updateLabor = (idx, field, value) => {
    const newLabor = [...labor];
    newLabor[idx][field] = value;
    setLabor(newLabor);
  };

  // =============================================
  // SUBMIT HANDLERS
  // =============================================

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validar campos obligatorios
      if (!formData.firm_id || !formData.premise_id || !formData.lot_id || !formData.activity_id) {
        toast.error('Completa los campos obligatorios: Firma, Predio, Lote y Tipo de Trabajo');
        return;
      }

      if (mode === 'edit') {
        // Actualizar trabajo existente
        await actualizarTrabajoAgricola(trabajoId, {
          firm_id: formData.firm_id,
          premise_id: formData.premise_id,
          lot_id: formData.lot_id,
          date: formData.date,
          activity_id: formData.activity_id,
          hectares: parseFloat(formData.hectares) || 0,
          fuel_used: parseFloat(formData.fuel_used) || 0,
          detail: formData.detail,
          others: '',
          weather_conditions: formData.weather_conditions || null,
          responsible_person: formData.responsible_person || null,
          cost_center_id: formData.cost_center_id || null,
          campaign_id: formData.campaign_id || null,
          other_costs: parseFloat(formData.other_costs) || 0,
          insumos: insumos.filter(i => i.input_id),
          maquinaria: maquinaria.filter(m => m.machinery_id),
          labor: labor.filter(l => l.worker_name),
          usuario: user?.id
        });
        toast.success('✓ Trabajo actualizado correctamente');
      } else {
        // Crear nuevo trabajo en DRAFT (NO descuenta stock)
        const trabajo = await crearTrabajoAgricola({
          firm_id: formData.firm_id,
          premise_id: formData.premise_id,
          lot_id: formData.lot_id,
          date: formData.date,
          activity_id: formData.activity_id,
          hectares: parseFloat(formData.hectares) || 0,
          fuel_used: parseFloat(formData.fuel_used) || 0,
          detail: formData.detail,
          notes: formData.notes,
          weather_conditions: formData.weather_conditions || null,
          responsible_person: formData.responsible_person || null,
          cost_center_id: formData.cost_center_id || null,
          campaign_id: formData.campaign_id || null,
          other_costs: parseFloat(formData.other_costs) || 0,
          insumos: insumos.filter(i => i.input_id),
          maquinaria: maquinaria.filter(m => m.machinery_id),
          labor: labor.filter(l => l.worker_name),
          usuario: user?.id
        });
        toast.success('✓ Trabajo guardado como BORRADOR');
      }

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      const msg = err.message || 'Error desconocido';
      setError(msg);
      toast.error(msg);
      console.error('Error en handleSaveDraft:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validaciones
      if (!formData.firm_id || !formData.premise_id || !formData.lot_id || !formData.work_type) {
        toast.error('Completa los campos obligatorios');
        return;
      }

      if (!formData.cost_center_id) {
        toast.error('Centro de costo es obligatorio para enviar a aprobación');
        return;
      }

      const insumosValidos = insumos.filter(i => i.input_id);
      if (insumosValidos.length === 0) {
        toast.error('Debes agregar al menos un insumo');
        return;
      }

      // Guardar en DRAFT primero
      const trabajo = await crearTrabajoAgricola({
        firm_id: formData.firm_id,
        premise_id: formData.premise_id,
        lot_id: formData.lot_id,
        date: formData.date,
        activity_id: formData.activity_id,
        work_type: formData.work_type,
        hectares: parseFloat(formData.hectares) || 0,
        fuel_used: parseFloat(formData.fuel_used) || 0,
        detail: formData.detail,
        notes: formData.notes,
        weather_conditions: formData.weather_conditions || null,
        responsible_person: formData.responsible_person || null,
        cost_center_id: formData.cost_center_id,
        campaign_id: formData.campaign_id || null,
        other_costs: parseFloat(formData.other_costs) || 0,
        insumos: insumosValidos,
        maquinaria: maquinaria.filter(m => m.machinery_id),
        labor: labor.filter(l => l.worker_name),
        usuario: user?.id
      });

      // Enviar a aprobación
      await enviarTrabajoAprobacion(trabajo.id, user?.id);

      toast.success('✓ Trabajo enviado a aprobación');
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      const msg = err.message || 'Error desconocido';
      setError(msg);
      toast.error(msg);
      console.error('Error en handleSubmitForApproval:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-lg">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'edit' ? 'Editar Trabajo Agrícola' : 'Nuevo Trabajo Agrícola'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Loading Spinner (EDIT mode) */}
        {loadingData && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
              <Loader className="animate-spin text-slate-400" size={32} />
              <p className="text-slate-600">Cargando datos del trabajo...</p>
            </div>
          </div>
        )}

        {/* Form */}
        {!loadingData && (
          <form className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

          {/* ============= SECCIÓN 1: UBICACIÓN ============= */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Firma *</label>
                <select
                  data-id="work-form-select-firm"
                  required
                  value={formData.firm_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firm_id: e.target.value,
                      premise_id: '',
                      lot_id: ''
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Firma</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Predio *</label>
                <select
                  data-id="work-form-select-premise"
                  required
                  value={formData.premise_id}
                  onChange={(e) =>
                    setFormData({ ...formData, premise_id: e.target.value, lot_id: '' })
                  }
                  disabled={!formData.firm_id}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">Seleccionar Predio</option>
                  {premises.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lote *</label>
                <select
                  data-id="work-form-select-lot"
                  required
                  value={formData.lot_id}
                  onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                  disabled={!formData.premise_id}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">Seleccionar Lote</option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.area_hectares} ha)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ============= SECCIÓN 2: INFORMACIÓN GENERAL ============= */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                <input
                  data-id="work-form-input-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Trabajo *</label>
                <select
                  data-id="work-form-select-work-type"
                  required
                  value={formData.activity_id}
                  onChange={(e) => {
                    const selectedActivity = getAgriculturalActivities.find(a => a.id === e.target.value);
                    setFormData({
                      ...formData,
                      activity_id: e.target.value,
                      work_type: selectedActivity ? selectedActivity.name : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar</option>
                  {getAgriculturalActivities.map(activity => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name} {activity.category && `(${activity.category})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hectáreas *</label>
                <input
                  data-id="work-form-input-hectares"
                  type="number"
                  step="0.01"
                  required
                  value={formData.hectares}
                  onChange={(e) => setFormData({ ...formData, hectares: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Combustible (L)</label>
                <input
                  data-id="work-form-input-fuel"
                  type="number"
                  step="0.01"
                  value={formData.fuel_used}
                  onChange={(e) => setFormData({ ...formData, fuel_used: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                <input
                  data-id="work-form-input-responsible"
                  type="text"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Nombre del responsable"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Centro de Costo <span className="text-red-500">*</span> (obligatorio para aprobar)
                </label>
                <select
                  data-id="work-form-select-cost-center"
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Centro de Costo</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaña (opcional)</label>
                <select
                  data-id="work-form-select-campaign"
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Campaña</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ============= SECCIÓN 3: INSUMOS ============= */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Insumos Consumidos</h3>
              <button
                type="button"
                onClick={addInsumo}
                data-id="work-form-btn-add-insumo"
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>

            <div className="space-y-2">
              {insumos.map((ins, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Insumo</label>
                    <select
                      data-id={`work-form-insumo-${idx}-select`}
                      value={ins.input_id}
                      onChange={(e) => updateInsumo(idx, 'input_id', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    >
                      <option value="">Seleccionar</option>
                      {inputs.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Dosis</label>
                    <input
                      data-id={`work-form-insumo-${idx}-dose`}
                      type="number"
                      step="0.01"
                      value={ins.dose_applied}
                      onChange={(e) => updateInsumo(idx, 'dose_applied', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
                    <input
                      data-id={`work-form-insumo-${idx}-quantity`}
                      type="number"
                      step="0.01"
                      value={ins.quantity_applied}
                      onChange={(e) => updateInsumo(idx, 'quantity_applied', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unidad</label>
                    <input
                      data-id={`work-form-insumo-${idx}-unit`}
                      type="text"
                      value={ins.unit}
                      onChange={(e) => updateInsumo(idx, 'unit', e.target.value)}
                      placeholder="kg"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Costo/Unidad</label>
                    <input
                      data-id={`work-form-insumo-${idx}-cost`}
                      type="number"
                      step="0.01"
                      value={ins.cost_per_unit}
                      onChange={(e) => updateInsumo(idx, 'cost_per_unit', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
                      placeholder="0.00"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeInsumo(idx)}
                    data-id={`work-form-insumo-${idx}-btn-remove`}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ============= SECCIÓN 4: MAQUINARIA ============= */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Maquinaria Utilizada</h3>
              <button
                type="button"
                onClick={addMaquinaria}
                data-id="work-form-btn-add-maquinaria"
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>

            <div className="space-y-2">
              {maquinaria.map((maq, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Maquinaria</label>
                    <select
                      data-id={`work-form-maquinaria-${idx}-select`}
                      value={maq.machinery_id}
                      onChange={(e) => updateMaquinaria(idx, 'machinery_id', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    >
                      <option value="">Seleccionar</option>
                      {machinery.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} - {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Horas</label>
                    <input
                      data-id={`work-form-maquinaria-${idx}-hours`}
                      type="number"
                      step="0.01"
                      value={maq.hours_used}
                      onChange={(e) => updateMaquinaria(idx, 'hours_used', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Costo/Hora</label>
                    <input
                      data-id={`work-form-maquinaria-${idx}-cost`}
                      type="number"
                      step="0.01"
                      value={maq.cost_per_hour}
                      onChange={(e) => updateMaquinaria(idx, 'cost_per_hour', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subtotal</label>
                    <div className="px-2 py-2 bg-slate-50 rounded text-sm font-medium">
                      ${((parseFloat(maq.hours_used) || 0) * (parseFloat(maq.cost_per_hour) || 0)).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMaquinaria(idx)}
                    data-id={`work-form-maquinaria-${idx}-btn-remove`}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ============= SECCIÓN 5: MANO DE OBRA ============= */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Mano de Obra</h3>
              <button
                type="button"
                onClick={addLabor}
                data-id="work-form-btn-add-labor"
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>

            <div className="space-y-2">
              {labor.map((lab, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Trabajador</label>
                    <input
                      data-id={`work-form-labor-${idx}-name`}
                      type="text"
                      value={lab.worker_name}
                      onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                      placeholder="Nombre"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Horas</label>
                    <input
                      data-id={`work-form-labor-${idx}-hours`}
                      type="number"
                      step="0.01"
                      value={lab.hours_worked}
                      onChange={(e) => updateLabor(idx, 'hours_worked', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Costo/Hora</label>
                    <input
                      data-id={`work-form-labor-${idx}-cost`}
                      type="number"
                      step="0.01"
                      value={lab.cost_per_hour}
                      onChange={(e) => updateLabor(idx, 'cost_per_hour', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subtotal</label>
                    <div className="px-2 py-2 bg-slate-50 rounded text-sm font-medium">
                      ${((parseFloat(lab.hours_worked) || 0) * (parseFloat(lab.cost_per_hour) || 0)).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLabor(idx)}
                    data-id={`work-form-labor-${idx}-btn-remove`}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ============= SECCIÓN 6: OTROS COSTOS Y DETALLES ============= */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Otros Costos y Detalles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Otros Costos</label>
                <input
                  data-id="work-form-input-other-costs"
                  type="number"
                  step="0.01"
                  value={formData.other_costs}
                  onChange={(e) => setFormData({ ...formData, other_costs: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Detalle</label>
                <textarea
                  data-id="work-form-textarea-detail"
                  rows="2"
                  value={formData.detail}
                  onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                  placeholder="Observaciones, detalles..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones Climáticas *</label>
                <select
                  data-id="work-form-select-weather"
                  required
                  value={formData.weather_conditions}
                  onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">-- Selecciona condición --</option>
                  <option value="SOLEADO">Soleado</option>
                  <option value="NUBLADO">Nublado</option>
                  <option value="LLUVIA">Lluvia</option>
                  <option value="LLUVIA_LEVE">Lluvia Leve</option>
                  <option value="VIENTO">Viento</option>
                  <option value="GRANIZO">Granizo</option>
                  <option value="NIEVE">Nieve</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
          </div>

          {/* ============= SECCIÓN 6.5: ADJUNTOS ============= */}
          {formData.firm_id && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Adjuntos (Fotos/Documentos)</h3>
              <WorkAttachmentUploader
                workId={trabajoId}
                workType="agricultural"
                isReadOnly={false}
              />
            </div>
          )}

          {/* ============= SECCIÓN 7: RESUMEN DE COSTOS ============= */}
          <div className="border-t border-slate-200 pt-6 bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calculator size={18} /> Resumen de Costos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-600">Insumos</p>
                <p className="text-lg font-bold text-green-600">${costBreakdown.inputs.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Maquinaria</p>
                <p className="text-lg font-bold text-blue-600">${costBreakdown.machinery.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Mano de Obra</p>
                <p className="text-lg font-bold text-purple-600">${costBreakdown.labor.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Otros</p>
                <p className="text-lg font-bold text-yellow-600">${costBreakdown.others.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">TOTAL</p>
                <p className="text-lg font-bold text-slate-900">${costBreakdown.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
          </form>
        )}

        {/* Footer con botones */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            data-id="work-form-btn-cancel"
            disabled={loading}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            data-id="work-form-btn-save-draft"
            disabled={loading || loadingData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
            {mode === 'edit' ? 'Actualizar' : 'Guardar Borrador'}
          </button>

          {mode === 'create' && (
            <button
              type="button"
              onClick={handleSubmitForApproval}
              data-id="work-form-btn-submit"
              disabled={loading || loadingData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar y Enviar a Aprobación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
