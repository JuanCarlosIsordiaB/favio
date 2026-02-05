import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { crearTrabajoGanadero, actualizarTrabajoGanadero, obtenerDetalleTrabajoGanadero, enviarTrabajoAprobacion, anularTrabajoGanadero } from '../services/livestockWorks';
import AnimalIndividualSelector from './livestock/AnimalIndividualSelector';
import { Save, Loader, X, AlertCircle, Beaker, Zap, Users, Check, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { toast } from 'sonner';
import WorkAttachmentUploader from './WorkAttachmentUploader';

export default function LivestockWorkForm({
  onClose,
  onSave,
  mode = 'create',
  trabajoId = null,
  initialData = {}
}) {
  const { user } = useAuth();
  const { getLivestockActivities, loadActiveActivities, loading: loadingActivities } = useActivities();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [workMode, setWorkMode] = useState('GROUP'); // 'GROUP' o 'INDIVIDUAL'
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [workStatus, setWorkStatus] = useState(null); // DRAFT, PENDING_APPROVAL, APPROVED, CANCELLED
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingWorkId, setCancellingWorkId] = useState(null);

  // Data for dropdowns
  const [firms, setFirms] = useState([]);
  const [premises, setPremises] = useState([]);
  const [herds, setHerds] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [machinery, setMachinery] = useState([]);
  // ✅ REMOVIDO: const [activities, setActivities] = useState([]);
  // Usamos getLivestockActivities del hook directamente

  const [formData, setFormData] = useState({
    // Información básica
    firm_id: initialData.firm_id || '',
    premise_id: initialData.premise_id || '',
    herd_id: initialData.herd_id || '',
    date: new Date().toISOString().split('T')[0],
    activity_id: '',
    event_type: '', // Mantener por retrocompatibilidad
    detail: '',

    // Organización (OBLIGATORIO para enviar a aprobación)
    cost_center_id: '',
    campaign_id: '',
    responsible_person: '',

    // Modo grupal
    quantity: '',

    // Modo individual
    selected_animals: [],
    animal_details: {},

    // Insumos
    insumos: [],

    // Maquinaria
    maquinaria: [],

    // Mano de obra
    labor: [],

    // Otros costos
    other_costs: '',

    // Condiciones climáticas
    weather_conditions: ''
  });

  // Load initial data
  useEffect(() => {
    fetchFirms();
  }, []);

  // Load premises and related data when firm changes
  useEffect(() => {
    if (formData.firm_id) {
      fetchPremises(formData.firm_id);
      fetchCostCenters(formData.firm_id);
      fetchCampaigns(formData.firm_id);
      fetchInputs(formData.firm_id);
      fetchMachinery(formData.firm_id);
      // Cargar actividades ganaderas dinámicas
      console.log('🔄 Cargando actividades para firma:', formData.firm_id);
      loadActiveActivities(formData.firm_id, 'LIVESTOCK');
      setActivitiesLoaded(false);
    } else {
      setPremises([]);
      setHerds([]);
      setCostCenters([]);
      setCampaigns([]);
      setInputs([]);
      setMachinery([]);
      setActivitiesLoaded(false);
    }
  }, [formData.firm_id, loadActiveActivities]);

  // ✅ Monitor when activities finish loading
  useEffect(() => {
    if (!loadingActivities && formData.firm_id) {
      console.log('✅ Actividades cargadas:', getLivestockActivities.length);
      setActivitiesLoaded(true);
    }
  }, [loadingActivities, formData.firm_id, getLivestockActivities]);

  // Load herds when premise changes
  useEffect(() => {
    if (formData.premise_id) {
      fetchHerds(formData.premise_id);
    } else {
      setHerds([]);
    }
  }, [formData.premise_id]);

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
      const trabajo = await obtenerDetalleTrabajoGanadero(id);

      // Cargar formData base
      setFormData({
        firm_id: trabajo.firm_id,
        premise_id: trabajo.premise_id,
        herd_id: trabajo.herd_id,
        date: trabajo.date,
        activity_id: trabajo.activity_id || '',
        event_type: trabajo.event_type,
        detail: trabajo.detail || '',
        cost_center_id: trabajo.cost_center_id || '',
        campaign_id: trabajo.campaign_id || '',
        responsible_person: trabajo.responsible_person || '',
        quantity: trabajo.quantity || '',
        selected_animals: trabajo.animal_details?.map((d) => d.animal_id) || [],
        animal_details: trabajo.animal_details
          ? Object.fromEntries(
              trabajo.animal_details.map((d) => [
                d.animal_id,
                {
                  applied: d.applied,
                  dose_applied: d.dose_applied,
                  weight_at_work: d.weight_at_work,
                  notes: d.notes
                }
              ])
            )
          : {},
        insumos: trabajo.insumos || [],
        maquinaria: trabajo.maquinaria || [],
        labor: trabajo.labor || [],
        other_costs: trabajo.other_costs || ''
      });

      // Establecer workMode y status
      setWorkMode(trabajo.work_mode || 'GROUP');
      setWorkStatus(trabajo.status);

      // Cargar listas relacionadas
      if (trabajo.firm_id) {
        await fetchPremises(trabajo.firm_id);
        await fetchCostCenters(trabajo.firm_id);
        await fetchCampaigns(trabajo.firm_id);
        await fetchInputs(trabajo.firm_id);
        await fetchMachinery(trabajo.firm_id);
      }

      if (trabajo.premise_id) {
        await fetchHerds(trabajo.premise_id);
      }
    } catch (err) {
      console.error('Error cargando trabajo ganadero:', err);
      toast.error('Error al cargar datos del trabajo');
    } finally {
      setLoadingData(false);
    }
  }

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

  async function fetchHerds(premiseId) {
    try {
      const { data } = await supabase.from('herds').select('id, name').eq('premise_id', premiseId);
      setHerds(data || []);
    } catch (err) {
      console.error('Error fetching herds:', err);
    }
  }

  async function fetchCostCenters(firmId) {
    try {
      const { data } = await supabase.from('cost_centers').select('id, code, name').eq('firm_id', firmId).eq('is_active', true);
      setCostCenters(data || []);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
    }
  }

  async function fetchCampaigns(firmId) {
    try {
      const { data } = await supabase.from('campaigns').select('id, name').eq('firm_id', firmId).eq('status', 'ACTIVE');
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  }

  async function fetchInputs(firmId) {
    try {
      const { data } = await supabase.from('inputs').select('id, name, unit').eq('firm_id', firmId).eq('status', 'ACTIVE');
      setInputs(data || []);
    } catch (err) {
      console.error('Error fetching inputs:', err);
    }
  }

  async function fetchMachinery(firmId) {
    try {
      const { data } = await supabase.from('machinery').select('id, name, cost_per_hour').eq('firm_id', firmId).eq('status', 'ACTIVE');
      setMachinery(data || []);
    } catch (err) {
      console.error('Error fetching machinery:', err);
    }
  }

  // Agregar insumo vacío
  const addInsumo = () => {
    setFormData(prev => ({
      ...prev,
      insumos: [...prev.insumos, {
        input_id: '',
        quantity_applied: '',
        unit: 'kg',
        cost_per_unit: ''
      }]
    }));
  };

  // Actualizar insumo
  const updateInsumo = (idx, field, value) => {
    const newInsumos = [...formData.insumos];
    newInsumos[idx][field] = value;
    setFormData(prev => ({ ...prev, insumos: newInsumos }));
  };

  // Eliminar insumo
  const removeInsumo = (idx) => {
    setFormData(prev => ({
      ...prev,
      insumos: prev.insumos.filter((_, i) => i !== idx)
    }));
  };

  // Agregar maquinaria
  const addMaquinaria = () => {
    setFormData(prev => ({
      ...prev,
      maquinaria: [...prev.maquinaria, {
        machinery_id: '',
        hours_used: '',
        cost_per_hour: ''
      }]
    }));
  };

  // Actualizar maquinaria
  const updateMaquinaria = (idx, field, value) => {
    const newMaquinaria = [...formData.maquinaria];
    newMaquinaria[idx][field] = value;
    setFormData(prev => ({ ...prev, maquinaria: newMaquinaria }));
  };

  // Eliminar maquinaria
  const removeMaquinaria = (idx) => {
    setFormData(prev => ({
      ...prev,
      maquinaria: prev.maquinaria.filter((_, i) => i !== idx)
    }));
  };

  // Agregar labor
  const addLabor = () => {
    setFormData(prev => ({
      ...prev,
      labor: [...prev.labor, {
        worker_name: '',
        hours_worked: '',
        cost_per_hour: ''
      }]
    }));
  };

  // Actualizar labor
  const updateLabor = (idx, field, value) => {
    const newLabor = [...formData.labor];
    newLabor[idx][field] = value;
    setFormData(prev => ({ ...prev, labor: newLabor }));
  };

  // Eliminar labor
  const removeLabor = (idx) => {
    setFormData(prev => ({
      ...prev,
      labor: prev.labor.filter((_, i) => i !== idx)
    }));
  };

  // Guardar como BORRADOR (sin enviar a aprobación)
  const handleSaveDraft = async () => {
    if (!formData.firm_id || !formData.premise_id || !formData.herd_id || !formData.activity_id) {
      toast.error('Firma, Predio, Rodeo y Tipo de Evento son obligatorios');
      return;
    }

    if (workMode === 'INDIVIDUAL' && formData.selected_animals.length === 0) {
      toast.error('Debes seleccionar al menos un animal en modo INDIVIDUAL');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'edit') {
        // Actualizar trabajo existente
        await actualizarTrabajoGanadero(trabajoId, {
          firm_id: formData.firm_id,
          premise_id: formData.premise_id,
          herd_id: formData.herd_id,
          activity_id: formData.activity_id,
          date: formData.date,
          work_mode: workMode,
          quantity: workMode === 'GROUP' ? (formData.quantity || 0) : formData.selected_animals.length,
          detail: formData.detail,
          cost_center_id: formData.cost_center_id || null,
          campaign_id: formData.campaign_id || null,
          responsible_person: formData.responsible_person || null,
          other_costs: formData.other_costs || 0,
          weather_conditions: formData.weather_conditions || null,
          insumos: formData.insumos.filter(i => i.input_id),
          maquinaria: formData.maquinaria.filter(m => m.machinery_id),
          labor: formData.labor.filter(l => l.worker_name),
          selected_animals: workMode === 'INDIVIDUAL' ? formData.selected_animals : [],
          animal_details: workMode === 'INDIVIDUAL' ? formData.animal_details : {},
          usuario: user?.id
        });
        toast.success('✅ Trabajo ganadero actualizado correctamente');
      } else {
        // Crear nuevo trabajo
        await crearTrabajoGanadero({
          firm_id: formData.firm_id,
          premise_id: formData.premise_id,
          herd_id: formData.herd_id,
          activity_id: formData.activity_id,
          date: formData.date,
          work_mode: workMode,
          quantity: workMode === 'GROUP' ? (formData.quantity || 0) : formData.selected_animals.length,
          detail: formData.detail,
          cost_center_id: formData.cost_center_id || null,
          campaign_id: formData.campaign_id || null,
          responsible_person: formData.responsible_person || null,
          other_costs: formData.other_costs || 0,
          weather_conditions: formData.weather_conditions || null,
          insumos: formData.insumos.filter(i => i.input_id),
          maquinaria: formData.maquinaria.filter(m => m.machinery_id),
          labor: formData.labor.filter(l => l.worker_name),
          animal_details: workMode === 'INDIVIDUAL' ? formData.animal_details : undefined,
          usuario: user?.id
        });
        toast.success('✅ Trabajo guardado como BORRADOR');
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Error saving work:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guardar y Enviar a Aprobación
  const handleSubmitForApproval = async () => {
    if (!formData.firm_id || !formData.premise_id || !formData.herd_id || !formData.activity_id) {
      toast.error('Firma, Predio, Rodeo y Tipo de Evento son obligatorios');
      return;
    }

    if (!formData.cost_center_id) {
      toast.error('Centro de costo es obligatorio para enviar a aprobación');
      return;
    }

    if (workMode === 'INDIVIDUAL' && formData.selected_animals.length === 0) {
      toast.error('Debes seleccionar al menos un animal en modo INDIVIDUAL');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear trabajo en DRAFT
      const trabajo = await crearTrabajoGanadero({
        firm_id: formData.firm_id,
        premise_id: formData.premise_id,
        herd_id: formData.herd_id,
        event_type: formData.event_type,
        date: formData.date,
        work_mode: workMode,
        quantity: workMode === 'GROUP' ? (formData.quantity || 0) : formData.selected_animals.length,
        detail: formData.detail,
        cost_center_id: formData.cost_center_id,
        campaign_id: formData.campaign_id || null,
        responsible_person: formData.responsible_person || null,
        other_costs: formData.other_costs || 0,
        insumos: formData.insumos.filter(i => i.input_id),
        maquinaria: formData.maquinaria.filter(m => m.machinery_id),
        labor: formData.labor.filter(l => l.worker_name),
        animal_details: workMode === 'INDIVIDUAL' ? formData.animal_details : undefined,
        usuario: user?.id
      });

      // 2. Enviar a aprobación
      await enviarTrabajoAprobacion(trabajo.id, user?.id);

      toast.success('✅ Trabajo enviado a aprobación');
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Error submitting work:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Anular trabajo ganadero
  const handleCancelWork = async () => {
    if (!trabajoId) return;
    if (!cancelReason.trim()) {
      toast.error('Por favor, ingresa una razón para la anulación');
      return;
    }
    setCancellingWorkId(trabajoId);
    try {
      await anularTrabajoGanadero(trabajoId, user?.id, cancelReason);
      toast.success('✅ Trabajo anulado correctamente');
      if (onSave) onSave();
      setShowCancelModal(false);
      setCancelReason('');
      onClose();
    } catch (err) {
      console.error('Error cancelling work:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setCancellingWorkId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'edit' ? 'Editar Trabajo Ganadero' : 'Nuevo Trabajo Ganadero'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Loading Spinner (EDIT mode) */}
        {loadingData && (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader className="animate-spin text-slate-400" size={32} />
              <p className="text-slate-600">Cargando datos del trabajo...</p>
            </div>
          </div>
        )}

        {!loadingData && (
          <form className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Sección 1: Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Firma</label>
                <select
                  data-id="livestock-form-select-firm"
                  required
                  value={formData.firm_id}
                  onChange={(e) => setFormData({ ...formData, firm_id: e.target.value, premise_id: '', herd_id: '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Firma</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Predio</label>
                <select
                  data-id="livestock-form-select-premise"
                  required
                  value={formData.premise_id}
                  onChange={(e) => setFormData({ ...formData, premise_id: e.target.value, herd_id: '' })}
                  disabled={!formData.firm_id}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">Seleccionar Predio</option>
                  {premises.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rodeo</label>
                <select
                  data-id="livestock-form-select-herd"
                  required
                  value={formData.herd_id}
                  onChange={(e) => setFormData({ ...formData, herd_id: e.target.value })}
                  disabled={!formData.premise_id}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value="">Seleccionar Rodeo</option>
                  {herds.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del Trabajo</label>
                <input
                  data-id="livestock-form-input-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Evento
                  {loadingActivities && <span className="text-xs text-blue-600 ml-2">(Cargando...)</span>}
                </label>
                <select
                  data-id="livestock-form-select-event-type"
                  required
                  disabled={loadingActivities || getLivestockActivities.length === 0}
                  value={formData.activity_id}
                  onChange={(e) => setFormData({ ...formData, activity_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg outline-none bg-white ${
                    loadingActivities || getLivestockActivities.length === 0
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 focus:ring-2 focus:ring-green-500'
                  }`}
                >
                  <option value="">
                    {loadingActivities
                      ? 'Cargando actividades...'
                      : getLivestockActivities.length === 0
                        ? 'No hay actividades disponibles'
                        : 'Seleccionar...'}
                  </option>
                  {getLivestockActivities.map(activity => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name} {activity.category && `(${activity.category})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                <input
                  data-id="livestock-form-input-responsible"
                  type="text"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Nombre del responsable"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Centro de Costo (OBLIGATORIO) */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">Centro de Costo Obligatorio</p>
                <p className="text-xs text-yellow-700">Requerido para enviar a aprobación</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Centro de Costo *</label>
                <select
                  data-id="livestock-form-select-cost-center"
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Centro...</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaña (Opcional)</label>
                <select
                  data-id="livestock-form-select-campaign"
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Seleccionar Campaña...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Sección 3: Modo Grupal vs Individual */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Modo de Aplicación</h3>
            <div className="flex gap-3">
              <button
                type="button"
                data-id="livestock-form-btn-group"
                onClick={() => setWorkMode('GROUP')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                  workMode === 'GROUP'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                <Users size={18} />
                Grupal (Rodeo Completo)
              </button>
              <button
                type="button"
                data-id="livestock-form-btn-individual"
                onClick={() => setWorkMode('INDIVIDUAL')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                  workMode === 'INDIVIDUAL'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                <Check size={18} />
                Individual (Por Animal)
              </button>
            </div>

            {/* Cantidad (Modo Grupal) */}
            {workMode === 'GROUP' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad de Animales</label>
                <input
                  data-id="livestock-form-input-quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Ej: 50"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            )}

            {/* Selector de Animales (Modo Individual) */}
            {workMode === 'INDIVIDUAL' && formData.herd_id && (
              <AnimalIndividualSelector
                herdId={formData.herd_id}
                selectedAnimals={formData.selected_animals}
                onSelectionChange={(animals) => setFormData({ ...formData, selected_animals: animals })}
                onDetailsChange={(details) => setFormData({ ...formData, animal_details: details })}
              />
            )}
          </div>

          {/* Sección 4: Insumos */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Beaker size={16} /> Insumos Utilizados
              </h3>
              <button
                type="button"
                onClick={addInsumo}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                + Agregar
              </button>
            </div>
            {formData.insumos.map((insumo, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
                <select
                  value={insumo.input_id}
                  onChange={(e) => updateInsumo(idx, 'input_id', e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {inputs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={insumo.quantity_applied}
                  onChange={(e) => updateInsumo(idx, 'quantity_applied', e.target.value)}
                  placeholder="Qty"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <input
                  type="text"
                  value={insumo.unit}
                  onChange={(e) => updateInsumo(idx, 'unit', e.target.value)}
                  placeholder="Unidad"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={insumo.cost_per_unit}
                  onChange={(e) => updateInsumo(idx, 'cost_per_unit', e.target.value)}
                  placeholder="$/Unidad"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeInsumo(idx)}
                  className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {/* Sección 5: Maquinaria */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Zap size={16} /> Maquinaria Utilizada
              </h3>
              <button
                type="button"
                onClick={addMaquinaria}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                + Agregar
              </button>
            </div>
            {formData.maquinaria.map((maq, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                <select
                  value={maq.machinery_id}
                  onChange={(e) => updateMaquinaria(idx, 'machinery_id', e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {machinery.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input
                  type="number"
                  step="0.1"
                  value={maq.hours_used}
                  onChange={(e) => updateMaquinaria(idx, 'hours_used', e.target.value)}
                  placeholder="Horas"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={maq.cost_per_hour}
                  onChange={(e) => updateMaquinaria(idx, 'cost_per_hour', e.target.value)}
                  placeholder="$/Hora"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeMaquinaria(idx)}
                  className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {/* Sección 6: Mano de Obra */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Mano de Obra</h3>
              <button
                type="button"
                onClick={addLabor}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                + Agregar
              </button>
            </div>
            {formData.labor.map((lab, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={lab.worker_name}
                  onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                  placeholder="Nombre"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  value={lab.hours_worked}
                  onChange={(e) => updateLabor(idx, 'hours_worked', e.target.value)}
                  placeholder="Horas"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={lab.cost_per_hour}
                  onChange={(e) => updateLabor(idx, 'cost_per_hour', e.target.value)}
                  placeholder="$/Hora"
                  className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLabor(idx)}
                  className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {/* Sección 7: Otros Costos y Notas */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Otros Costos ($)</label>
              <input
                data-id="livestock-form-input-other-costs"
                type="number"
                step="0.01"
                value={formData.other_costs}
                onChange={(e) => setFormData({ ...formData, other_costs: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Detalle / Notas</label>
              <textarea
                data-id="livestock-form-textarea-detail"
                rows="2"
                value={formData.detail}
                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                placeholder="Observaciones adicionales..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones Climáticas *</label>
              <select
                data-id="livestock-form-select-weather"
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

          {/* Adjuntos */}
          {formData.firm_id && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Adjuntos (Fotos/Documentos)</h3>
              <WorkAttachmentUploader
                workId={trabajoId}
                workType="livestock"
                isReadOnly={false}
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              data-id="livestock-form-btn-cancel"
              onClick={onClose}
              disabled={loading || loadingData}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-id="livestock-form-btn-save-draft"
              onClick={handleSaveDraft}
              disabled={loading || loadingData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              {mode === 'edit' ? 'Actualizar' : 'Guardar Borrador'}
            </button>
            {mode === 'create' && (
              <button
                type="button"
                data-id="livestock-form-btn-submit"
                onClick={handleSubmitForApproval}
                disabled={loading || loadingData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                Enviar a Aprobación
              </button>
            )}
            {workStatus === 'APPROVED' && mode === 'edit' && (
              <button
                type="button"
                data-id="livestock-form-btn-cancel-work"
                onClick={() => setShowCancelModal(true)}
                disabled={loading || loadingData}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                <X size={18} />
                Anular Trabajo
              </button>
            )}
          </div>
          </form>
        )}

        {/* Modal de Confirmación de Anulación */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Confirmar Anulación</h3>
              <p className="text-sm text-slate-600 mb-4">
                ¿Estás seguro de que deseas anular este trabajo ganadero? Esta acción revertirá el stock si aplica.
              </p>
              <textarea
                data-id="livestock-cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ingresa la razón de la anulación (obligatorio)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  data-id="livestock-cancel-modal-btn-cancel"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  disabled={cancellingWorkId}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-id="livestock-cancel-modal-btn-confirm"
                  onClick={handleCancelWork}
                  disabled={cancellingWorkId || !cancelReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                >
                  {cancellingWorkId ? <Loader size={18} className="animate-spin" /> : <X size={18} />}
                  Sí, anular trabajo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}