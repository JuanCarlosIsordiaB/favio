import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Tractor, PawPrint, Calendar, MapPin, Search, Filter, X, FileText, Download, TrendingUp, ClipboardList, CheckCircle2, ArrowRight, Loader, Edit2, BarChart3, Zap } from 'lucide-react';
import AgriculturalWorkForm from './AgriculturalWorkForm';
import LivestockWorkForm from './LivestockWorkForm';
import AgriculturalProjectionForm from './AgriculturalProjectionForm';
import LivestockProjectionForm from './LivestockProjectionForm';
import WorkApprovals from './work/WorkApprovals';
import CostDashboard from './work/CostDashboard';
import ProjectionComparison from './work/ProjectionComparison';
import ActivityCalendar from './work/ActivityCalendar';
import AdvancedReports from './work/AdvancedReports';
import SimulationDashboard from './simulation/SimulationDashboard';
import { Badge } from './ui/badge';
import { convertirProyeccionAgricolaATrabajo, convertirProyeccionGanaderaATrabajo } from '../services/projectionConversion';
import { enviarTrabajoAprobacion, anularTrabajoAgricola } from '../services/agriculturalWorks';
import { exportarTrabajosAExcelXLSX, exportarCostosPorLoteXLSX, exportarComparacionProyeccionesXLSX } from '../services/workReports';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function WorkManager() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('works'); // 'works', 'projections', 'approvals', or 'simulation'
  const [activeTab, setActiveTab] = useState('agricultural'); // 'agricultural' or 'livestock'

  // Obtener selectedFirmId y selectedPremiseId del localStorage
  const selectedFirmId = localStorage.getItem('selectedFirmId');
  const selectedPremiseId = localStorage.getItem('selectedPremiseId');
  const [formState, setFormState] = useState({ isOpen: false, mode: 'create', trabajoId: null });
  const [selectedWork, setSelectedWork] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [convertingProjectId, setConvertingProjectId] = useState(null);
  const [submittingWorkId, setSubmittingWorkId] = useState(null);
  const [cancellingWorkId, setCancellingWorkId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [costCenters, setCostCenters] = useState([]);
  const [showCostCenterModal, setShowCostCenterModal] = useState(false);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showActivityCalendar, setShowActivityCalendar] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);

  // Load pending count
  useEffect(() => {
    loadPendingCount();
  }, []);

  // Load works based on viewMode
  useEffect(() => {
    if (viewMode !== 'approvals') {
      fetchWorks();
    }
  }, [activeTab, viewMode]);

  async function loadPendingCount() {
    try {
      const { data, error } = await supabase
        .from('agricultural_works')
        .select('id')
        .eq('status', 'PENDING_APPROVAL');

      if (error) throw error;
      setPendingCount(data?.length || 0);
    } catch (err) {
      console.error('Error loading pending count:', err);
    }
  }

  async function fetchWorks() {
    setLoading(true);
    try {
      let table = '';
      if (viewMode === 'works') {
        table = activeTab === 'agricultural' ? 'agricultural_works' : 'livestock_works';
      } else {
        table = activeTab === 'agricultural' ? 'proyecciones_agricolas' : 'proyecciones_ganaderas';
      }

      let query = supabase
        .from(table)
        .select(`
          *,
          firms(name),
          premises(name),
          lots(name)
        `);

      // Sort by date (field name differs)
      if (viewMode === 'works') {
        query = query.order('date', { ascending: false });
      } else {
        query = query.order('fecha_tentativa', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorks(data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredWorks = works.filter(work => {
    const searchString = searchTerm.toLowerCase();
    const firmName = work.firms?.name?.toLowerCase() || '';
    const premiseName = work.premises?.name?.toLowerCase() || '';
    const lotName = work.lots?.name?.toLowerCase() || '';
    
    let type = '';
    let detail = '';

    if (viewMode === 'works') {
      type = activeTab === 'agricultural' ? work.work_type?.toLowerCase() : work.category?.toLowerCase();
      detail = work.detail?.toLowerCase() || '';
    } else {
      type = activeTab === 'agricultural' ? work.tipo_trabajo?.toLowerCase() : work.tipo_evento?.toLowerCase();
      detail = (work.cultivo_proyectado || work.observaciones || '').toLowerCase();
    }

    return firmName.includes(searchString) || 
           premiseName.includes(searchString) || 
           lotName.includes(searchString) || 
           (type && type.includes(searchString)) ||
           detail.includes(searchString);
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-800';
      case 'COMPLETADA': return 'bg-green-100 text-green-800';
      case 'CANCELADA': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleConvertProjection = async () => {
    if (!selectedWork) return;

    setConvertingProjectId(selectedWork.id);
    try {
      if (activeTab === 'agricultural') {
        await convertirProyeccionAgricolaATrabajo(selectedWork.id, user?.id);
        toast.success('✅ Proyección convertida a trabajo agrícola. Se abrirá la vista de trabajos...');
      } else {
        await convertirProyeccionGanaderaATrabajo(selectedWork.id, user?.id);
        toast.success('✅ Proyección convertida a trabajo ganadero. Se abrirá la vista de trabajos...');
      }

      // Cerrar modal
      setSelectedWork(null);

      // El useEffect (línea 34-38) automáticamente llamará a fetchWorks()
      // cuando viewMode cambie, así que NO necesitamos setTimeout
      setViewMode('works');
    } catch (err) {
      console.error('Error converting projection:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setConvertingProjectId(null);
    }
  };

  const handleEdit = (trabajo) => {
    // Validar que solo pueda editarse trabajos en DRAFT
    if (trabajo.status !== 'DRAFT') {
      toast.error('Solo se pueden editar trabajos en estado BORRADOR');
      return;
    }

    // Abrir formulario en modo EDIT
    setFormState({
      isOpen: true,
      mode: 'edit',
      trabajoId: trabajo.id
    });

    // Cerrar modal de detalles si estaba abierto
    setSelectedWork(null);
  };

  const handleSubmitWorkForApproval = async () => {
    if (!selectedWork) return;

    // Si no tiene centro de costo, pedir que lo seleccione
    if (!selectedWork.cost_center_id) {
      // Cargar centros de costo
      if (costCenters.length === 0) {
        try {
          const { data } = await supabase
            .from('cost_centers')
            .select('*')
            .eq('firm_id', selectedWork.firm_id)
            .eq('is_active', true);
          setCostCenters(data || []);
        } catch (err) {
          toast.error('Error al cargar centros de costo: ' + err.message);
          return;
        }
      }

      // Mostrar modal para seleccionar centro de costo
      setShowCostCenterModal(true);
      return;
    }

    // Si ya tiene centro de costo, enviar directamente
    submitWorkWithCostCenter(selectedWork.cost_center_id);
  };

  const submitWorkWithCostCenter = async (costCenterId) => {
    if (!selectedWork) return;

    setSubmittingWorkId(selectedWork.id);
    try {
      // Si necesita actualizar el cost_center_id primero
      if (!selectedWork.cost_center_id && costCenterId) {
        await supabase
          .from('agricultural_works')
          .update({ cost_center_id: costCenterId })
          .eq('id', selectedWork.id);
      }

      await enviarTrabajoAprobacion(selectedWork.id, user?.id);
      toast.success('✅ Trabajo enviado a aprobación');
      loadPendingCount();
      fetchWorks();
      setSelectedWork(null);
      setShowCostCenterModal(false);
      setSelectedCostCenterId(null);
    } catch (err) {
      console.error('Error submitting work:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setSubmittingWorkId(null);
    }
  };

  const handleCancelWork = async () => {
    if (!selectedWork) return;

    if (!cancelReason.trim()) {
      toast.error('Por favor, ingresa una razón para la anulación');
      return;
    }

    setCancellingWorkId(selectedWork.id);
    try {
      await anularTrabajoAgricola(selectedWork.id, user?.id, cancelReason);
      toast.success('✅ Trabajo anulado correctamente');
      loadPendingCount();
      fetchWorks();
      setSelectedWork(null);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      console.error('Error cancelling work:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setCancellingWorkId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {viewMode === 'works' ? 'Gestión de Trabajos' : viewMode === 'projections' ? 'Gestión de Proyecciones' : 'Aprobación de Trabajos'}
          </h1>
          <p className="text-slate-500">
            {viewMode === 'works'
              ? 'Registro y control de actividades realizadas'
              : viewMode === 'projections'
              ? 'Planificación de actividades futuras'
              : 'Aprueba o rechaza trabajos pendientes'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex">
            <button
              data-id="work-manager-tab-works"
              onClick={() => setViewMode('works')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'works'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                <span>Realizados</span>
              </div>
            </button>
            <button
              data-id="work-manager-tab-projections"
              onClick={() => setViewMode('projections')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'projections'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                <span>Proyecciones</span>
              </div>
            </button>
            <button
              data-id="work-manager-tab-approvals"
              onClick={() => setViewMode('approvals')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'approvals'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Aprobaciones</span>
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-red-500 text-white">{pendingCount}</Badge>
              )}
            </button>
            <button
              data-id="work-manager-tab-simulation"
              onClick={() => setViewMode('simulation')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'simulation'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap size={16} />
              <span>Simulación</span>
            </button>
          </div>
          {viewMode !== 'approvals' && viewMode !== 'simulation' && (
            <div className="flex gap-2">
              <button
                data-id="work-manager-btn-new-work"
                onClick={() => setFormState({ isOpen: true, mode: 'create', trabajoId: null })}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus size={20} />
                <span>{viewMode === 'works' ? 'Nuevo Trabajo' : 'Nueva Proyección'}</span>
              </button>
              {viewMode === 'works' && (
                <>
                  <button
                    data-id="work-manager-btn-dashboard"
                    onClick={() => setShowDashboard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    <BarChart3 size={20} />
                    <span>Dashboard</span>
                  </button>
                  <button
                    data-id="work-manager-btn-calendar"
                    onClick={() => setShowActivityCalendar(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Calendar size={20} />
                    <span>Calendario</span>
                  </button>
                  <button
                    data-id="work-manager-btn-reports"
                    onClick={() => setShowAdvancedReports(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    <FileText size={20} />
                    <span>Reportes</span>
                  </button>
                  <button
                    data-id="work-manager-btn-export-works"
                    onClick={async () => {
                      try {
                        const premiseId = localStorage.getItem('selectedPremiseId');
                        if (!premiseId) {
                          toast.error('Selecciona un predio primero');
                          return;
                        }
                        await exportarTrabajosAExcelXLSX(premiseId);
                        toast.success('✓ Trabajos exportados a Excel');
                      } catch (err) {
                        toast.error('Error: ' + err.message);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download size={20} />
                    <span>Exportar</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - show approvals, simulation, or works/projections */}
      {viewMode === 'approvals' ? (
        <WorkApprovals
          selectedPremiseId={null}
          onAction={() => {
            loadPendingCount();
            fetchWorks();
          }}
        />
      ) : viewMode === 'simulation' ? (
        <SimulationDashboard
          selectedFirmId={selectedFirmId}
          selectedPremiseId={selectedPremiseId}
        />
      ) : (
        <>
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          data-id="work-manager-tab-agricultural"
          onClick={() => setActiveTab('agricultural')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'agricultural'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tractor size={18} />
          Agrícola
        </button>
        <button
          data-id="work-manager-tab-livestock"
          onClick={() => setActiveTab('livestock')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'livestock'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PawPrint size={18} />
          Ganadero
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            data-id="work-manager-input-search"
            type="text"
            placeholder={viewMode === 'works' ? "Buscar por lote, tipo, detalle..." : "Buscar por cultivo, evento, observaciones..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <button data-id="work-manager-btn-filter" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200">
          <Filter size={20} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 mb-2">No hay registros encontrados</p>
          <button
            onClick={() => setFormState({ isOpen: true, mode: 'create', trabajoId: null })}
            className="text-green-600 font-medium hover:underline"
          >
            Crear el primer registro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredWorks.map((work) => (
            <div
              key={work.id}
              data-id={`work-card-${work.id}`}
              onClick={() => setSelectedWork(work)}
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      activeTab === 'agricultural' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {viewMode === 'works'
                        ? (activeTab === 'agricultural' ? (work.work_type || 'Sin tipo') : (work.category || 'Sin categoría'))
                        : (activeTab === 'agricultural' ? (work.tipo_trabajo || 'Sin tipo') : (work.tipo_evento || 'Sin evento'))
                      }
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(viewMode === 'works' ? work.date : work.fecha_tentativa).toLocaleDateString()}
                    </span>
                    {viewMode === 'projections' && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(work.estado)}`}>
                        {work.estado}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-slate-900 mb-1">
                    {viewMode === 'works' ? (
                      activeTab === 'agricultural'
                        ? `${work.work_type || 'Sin tipo'} - ${work.hectares} Ha`
                        : `${work.category || 'Sin categoría'} (${work.quantity || 0}) - ${work.treatment_name || 'Sin tratamiento'}`
                    ) : (
                      activeTab === 'agricultural'
                        ? `${work.cultivo_proyectado || 'Sin cultivo'} - ${work.hectares || 0} Ha`
                        : `${work.tipo_evento || 'Sin evento'} - ${work.categoria || 'Sin categoría'} (${work.cantidad || 0})`
                    )}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {work.lots?.name || 'Sin Lote'} ({work.premises?.name})
                    </span>
                  </div>

                  {(work.detail || work.observaciones) && (
                    <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                      {work.detail || work.observaciones}
                    </p>
                  )}
                </div>

                {/* Specific Details Column */}
                <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 text-sm">
                  {viewMode === 'works' ? (
                    activeTab === 'agricultural' ? (
                      <div className="space-y-1">
                        {work.input_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Insumo:</span>
                            <span className="font-medium">{work.input_name}</span>
                          </div>
                        )}
                        {work.quantity_used > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cant. Usada:</span>
                            <span className="font-medium">{work.quantity_used} {work.unit?.split('/')[0]}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {work.treatment_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tratamiento:</span>
                            <span className="font-medium">{work.treatment_name}</span>
                          </div>
                        )}
                        {work.lot_change && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Movimiento:</span>
                            <span className="font-medium">{work.lot_change}</span>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    // Projections Details
                    activeTab === 'agricultural' ? (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Producto:</span>
                          <span className="font-medium">{work.producto}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dosis/Ha:</span>
                          <span className="font-medium">{work.dosis_ha}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total:</span>
                          <span className="font-medium">{work.total}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Evento:</span>
                          <span className="font-medium">{work.tipo_evento}</span>
                        </div>
                        {work.cantidad > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cantidad:</span>
                            <span className="font-medium">{work.cantidad}</span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 md:mt-0 md:flex-col justify-end">
                  {viewMode === 'works' && work.status === 'DRAFT' && (
                    <button
                      data-id={`work-card-${work.id}-btn-edit`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(work);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>
                  )}
                  <button
                    data-id={`work-card-${work.id}-btn-view`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWork(work);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium transition-colors"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-id="work-detail-modal" className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                Detalles {viewMode === 'works' ? 'del Trabajo' : 'de la Proyección'}
              </h3>
              <button
                data-id="work-detail-modal-btn-close"
                onClick={() => setSelectedWork(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className={`p-3 rounded-full ${activeTab === 'agricultural' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {activeTab === 'agricultural' ? <Tractor size={24} /> : <PawPrint size={24} />}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-slate-900">
                    {viewMode === 'works' 
                      ? (activeTab === 'agricultural' ? selectedWork.work_type : selectedWork.category)
                      : (activeTab === 'agricultural' ? selectedWork.tipo_trabajo : selectedWork.tipo_evento)
                    }
                  </h4>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <Calendar size={16} />
                    {new Date(viewMode === 'works' ? selectedWork.date : selectedWork.fecha_tentativa).toLocaleDateString()}
                  </p>
                  {viewMode === 'projections' && (
                    <span className={`mt-2 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(selectedWork.estado)}`}>
                      {selectedWork.estado}
                    </span>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Firma</span>
                  <p className="font-medium text-slate-900">{selectedWork.firms?.name || '-'}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Predio</span>
                  <p className="font-medium text-slate-900">{selectedWork.premises?.name || '-'}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Lote</span>
                  <p className="font-medium text-slate-900">{selectedWork.lots?.name || '-'}</p>
                </div>
              </div>

              {/* Specific Details based on Type and Mode */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Información Detallada</h4>
                
                {viewMode === 'works' ? (
                  // WORKS DETAILS (Existing logic)
                  activeTab === 'agricultural' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div><span className="text-sm text-slate-500">Tipo</span><p className="font-medium">{selectedWork.work_type}</p></div>
                      <div><span className="text-sm text-slate-500">Hectáreas</span><p className="font-medium">{selectedWork.hectares} Ha</p></div>
                      <div><span className="text-sm text-slate-500">Insumo</span><p className="font-medium">{selectedWork.input_name || '-'}</p></div>
                      <div><span className="text-sm text-slate-500">Cantidad</span><p className="font-medium">{selectedWork.quantity_used || '-'} {selectedWork.unit}</p></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div><span className="text-sm text-slate-500">Categoría</span><p className="font-medium">{selectedWork.category}</p></div>
                      <div><span className="text-sm text-slate-500">Cantidad</span><p className="font-medium">{selectedWork.quantity}</p></div>
                      <div><span className="text-sm text-slate-500">Tratamiento</span><p className="font-medium">{selectedWork.treatment_name || '-'}</p></div>
                    </div>
                  )
                ) : (
                  // PROJECTIONS DETAILS
                  activeTab === 'agricultural' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div><span className="text-sm text-slate-500">Cultivo Proyectado</span><p className="font-medium">{selectedWork.cultivo_proyectado}</p></div>
                      <div><span className="text-sm text-slate-500">Uso Suelo Actual</span><p className="font-medium">{selectedWork.uso_suelo_actual}</p></div>
                      <div><span className="text-sm text-slate-500">Producto</span><p className="font-medium">{selectedWork.producto}</p></div>
                      <div><span className="text-sm text-slate-500">Variedad</span><p className="font-medium">{selectedWork.variedad || '-'}</p></div>
                      <div><span className="text-sm text-slate-500">Dosis/Ha</span><p className="font-medium">{selectedWork.dosis_ha}</p></div>
                      <div><span className="text-sm text-slate-500">Total Calculado</span><p className="font-medium">{selectedWork.total}</p></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div><span className="text-sm text-slate-500">Tipo Evento</span><p className="font-medium">{selectedWork.tipo_evento}</p></div>
                      <div><span className="text-sm text-slate-500">Categoría</span><p className="font-medium">{selectedWork.categoria}</p></div>
                      <div><span className="text-sm text-slate-500">Cantidad</span><p className="font-medium">{selectedWork.cantidad}</p></div>
                    </div>
                  )
                )}
              </div>

              {/* Notes */}
              {(selectedWork.detail || selectedWork.observaciones) && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Notas / Observaciones</h4>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 text-sm">
                    {selectedWork.detail || selectedWork.observaciones}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              {viewMode === 'works' && selectedWork && selectedWork.status === 'DRAFT' && (
                <button
                  data-id="work-detail-modal-btn-edit"
                  onClick={() => {
                    handleEdit(selectedWork);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Edit2 size={16} />
                  Editar Trabajo
                </button>
              )}
              {viewMode === 'works' && selectedWork && selectedWork.status === 'DRAFT' && activeTab === 'agricultural' && (
                <button
                  data-id="work-detail-modal-btn-submit"
                  onClick={handleSubmitWorkForApproval}
                  disabled={submittingWorkId === selectedWork.id}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors disabled:opacity-50"
                >
                  {submittingWorkId === selectedWork.id ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Enviar a Aprobación
                    </>
                  )}
                </button>
              )}
              {viewMode === 'works' && selectedWork && selectedWork.status === 'APPROVED' && activeTab === 'agricultural' && (
                <button
                  data-id="work-detail-modal-btn-cancel"
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  <X size={16} />
                  Anular Trabajo
                </button>
              )}
              {viewMode === 'projections' && selectedWork && (selectedWork.trabajo_agricola_id || selectedWork.trabajo_ganadero_id) && (
                <button
                  data-id="work-detail-modal-btn-compare"
                  onClick={() => setShowComparison(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  <TrendingUp size={16} />
                  Comparar Plan vs Ejecutado
                </button>
              )}
              {viewMode === 'projections' && selectedWork && !selectedWork.trabajo_agricola_id && !selectedWork.trabajo_ganadero_id && (
                <button
                  data-id="work-detail-modal-btn-convert"
                  onClick={handleConvertProjection}
                  disabled={convertingProjectId === selectedWork.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                >
                  {convertingProjectId === selectedWork.id ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Convirtiendo...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={16} />
                      Convertir a Trabajo
                    </>
                  )}
                </button>
              )}
              <button
                data-id="work-detail-modal-btn-close"
                onClick={() => setSelectedWork(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Work Modal */}
      {showCancelModal && selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                Anular Trabajo
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Estás a punto de anular el trabajo "{selectedWork.work_type || 'Sin tipo'}"
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Razón de la anulación <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ingresa el motivo por el cual se anula este trabajo..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  rows="4"
                />
              </div>

              {cancelReason.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                  <strong>⚠️ Advertencia:</strong> Se revertirá el stock de los insumos utilizados y se registrará la anulación en auditoría.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                No, cancelar
              </button>
              <button
                onClick={handleCancelWork}
                disabled={cancellingWorkId === selectedWork.id || !cancelReason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {cancellingWorkId === selectedWork.id ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Anulando...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Sí, anular trabajo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Modal */}
      {formState.isOpen && (
        <div className="fixed inset-0 z-50">
          {viewMode === 'works' ? (
            activeTab === 'agricultural' ? (
              <AgriculturalWorkForm
                mode={formState.mode}
                trabajoId={formState.trabajoId}
                onClose={() => setFormState({ isOpen: false, mode: 'create', trabajoId: null })}
                onSave={() => {
                  fetchWorks();
                  setFormState({ isOpen: false, mode: 'create', trabajoId: null });
                }}
              />
            ) : (
              <LivestockWorkForm
                mode={formState.mode}
                trabajoId={formState.trabajoId}
                onClose={() => setFormState({ isOpen: false, mode: 'create', trabajoId: null })}
                onSave={() => {
                  fetchWorks();
                  setFormState({ isOpen: false, mode: 'create', trabajoId: null });
                }}
              />
            )
          ) : (
            activeTab === 'agricultural' ? (
              <AgriculturalProjectionForm
                onClose={() => setFormState({ isOpen: false, mode: 'create', trabajoId: null })}
                onSave={() => {
                  fetchWorks();
                  setFormState({ isOpen: false, mode: 'create', trabajoId: null });
                }}
              />
            ) : (
              <LivestockProjectionForm
                onClose={() => setFormState({ isOpen: false, mode: 'create', trabajoId: null })}
                onSave={() => {
                  fetchWorks();
                  setFormState({ isOpen: false, mode: 'create', trabajoId: null });
                }}
              />
            )
          )}
        </div>
      )}

      {/* Modal: Seleccionar Centro de Costo para enviar a aprobación */}
      {showCostCenterModal && selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Seleccionar Centro de Costo
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Este campo es obligatorio para enviar el trabajo a aprobación
              </p>
            </div>

            <div className="p-6 space-y-4">
              {costCenters.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p>No hay centros de costo disponibles</p>
                  <p className="text-sm">Contacta al administrador para crear centros de costo</p>
                </div>
              ) : (
                <select
                  value={selectedCostCenterId || ''}
                  onChange={(e) => setSelectedCostCenterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Seleccionar Centro de Costo --</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCostCenterModal(false);
                  setSelectedCostCenterId(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedCostCenterId) {
                    submitWorkWithCostCenter(selectedCostCenterId);
                  } else {
                    toast.error('Debes seleccionar un centro de costo');
                  }
                }}
                disabled={submittingWorkId === selectedWork.id || !selectedCostCenterId || costCenters.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingWorkId === selectedWork.id ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Enviar a Aprobación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      {showDashboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-id="cost-dashboard-modal" className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-900">Dashboard de Costos</h2>
              <button
                data-id="cost-dashboard-modal-btn-close"
                onClick={() => setShowDashboard(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            <CostDashboard
              selectedPremiseId={null}
              selectedFirmId={null}
            />
          </div>
        </div>
      )}

      {/* Projection Comparison Modal */}
      {showComparison && selectedWork && (
        <ProjectionComparison
          projectionId={selectedWork.id}
          workId={selectedWork.trabajo_agricola_id || selectedWork.trabajo_ganadero_id}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Activity Calendar Modal */}
      {showActivityCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-id="activity-calendar-modal" className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-900">Calendario de Actividades</h2>
              <button
                data-id="activity-calendar-modal-btn-close"
                onClick={() => setShowActivityCalendar(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            <ActivityCalendar
              activeTab={activeTab}
            />
          </div>
        </div>
      )}

      {/* Advanced Reports Modal */}
      {showAdvancedReports && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-id="advanced-reports-modal" className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-900">Reportes Avanzados</h2>
              <button
                data-id="advanced-reports-modal-btn-close"
                onClick={() => setShowAdvancedReports(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            <AdvancedReports
              activeTab={activeTab}
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}