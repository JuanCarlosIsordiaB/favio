/**
 * InputsManager.jsx
 * Componente principal para gestión de insumos y stock
 * Integra: useInputs + useInputMovements
 * Maneja: Inventario General, Por Depósito, Historial de Movimientos
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
  Search,
  TrendingDown,
  Package,
  Warehouse,
  History,
  ChevronDown,
  X,
  Save,
  Loader,
  AlertTriangle
} from 'lucide-react';
import { useInputs } from '../hooks/useInputs';
import { useInputMovements } from '../hooks/useInputMovements';
import { useAuth } from '../contexts/AuthContext';
import { crearRegistro } from '../services/registros';
import { usePermissions } from './guards/PermissionGuard';
import { OPERATIONAL_PERMISSIONS } from '../lib/permissions';
import { obtenerLotesPorPredio } from '../services/lotes';
import {
  obtenerCategorias,
  obtenerUnidades,
  determinarEstadoAlerta,
  obtenerColorEstado,
  formatearCantidad,
  formatearPrecio
} from '../lib/validations/inputValidations';
import {
  verificarAlertasInsumo,
  obtenerAlertasVencimiento,
  obtenerAlertasStockMinimo,
  obtenerAlertasActivas,
  resolverAlerta,
  cancelarAlerta
} from '../services/inputAlerts';
import InventoryView from './vistas/InventoryView';
import ByDepotView from './vistas/ByDepotView';
import MovementsView from './vistas/MovementsView';
import InputFormModal from './modales/InputFormModal';
import MovementFormModal from './modales/MovementFormModal';
import { ChartsPanel } from './graficos/StockCharts';
import { AlertsPanel, AlertBadge, AlertsOverlay } from './alertas/AlertsPanel';

export default function InputsManager({
  selectedFirmId,
  selectedPremiseId,
  onSelectPremise
}) {
  const { user } = useAuth();
  const { insumos, loading: loadingInputs, loadInputs, addInput, updateInput, deleteInput, getDepots } = useInputs();
  const { movimientos, loading: loadingMovements, loadMovementsFirma, registerMovement } = useInputMovements();
  const { canDelete } = usePermissions({ canDelete: OPERATIONAL_PERMISSIONS.DELETE });

  // ===== ESTADO DE VISTAS =====
  const [currentView, setCurrentView] = useState('inventory'); // inventory | byDepot | movements
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [depots, setDepots] = useState([]);
  const [lotes, setLotes] = useState([]);

  // ===== ESTADO DE FILTROS =====
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDepot, setFilterDepot] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // ===== ESTADO DE MODALES =====
  const [isCreatingInput, setIsCreatingInput] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [isRegisteringMovement, setIsRegisteringMovement] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | charts | alerts

  // ===== ESTADO DE FORMULARIO =====
  const [editingInput, setEditingInput] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    depot_id: '',
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

  // ===== EFECTOS =====
  useEffect(() => {
    if (selectedFirmId) {
      loadInputs(selectedFirmId);
      loadStatistics(selectedFirmId);
    }
  }, [selectedFirmId, loadInputs]);

  // Cargar depósitos (lotes con is_depot=true) cuando se selecciona un predio
  useEffect(() => {
    const loadDepotsFromLotes = async () => {
      if (selectedPremiseId) {
        try {
          const { data: lotesData } = await obtenerLotesPorPredio(selectedPremiseId);
          // Guardar todos los lotes para el selector en movimientos
          setLotes(lotesData || []);
          // Filtrar solo los lotes que son depósitos
          const depotsLotes = (lotesData || []).filter(lote => lote.is_depot === true);
          setDepots(depotsLotes);
        } catch (err) {
          console.error('Error cargando depósitos:', err);
          setLotes([]);
          setDepots([]);
        }
      }
    };
    loadDepotsFromLotes();
  }, [selectedPremiseId]);

  useEffect(() => {
    if (currentView === 'movements' && selectedFirmId) {
      loadMovementsFirma(selectedFirmId, {
        desde: dateRange.from,
        hasta: dateRange.to
      });
    }
  }, [currentView, dateRange, selectedFirmId, loadMovementsFirma]);

  // Recalcular alertas cuando cambian los insumos
  useEffect(() => {
    if (insumos.length > 0 && selectedFirmId) {
      loadAlertsForInputs();
    } else {
      setAlerts([]);
    }
  }, [insumos, selectedFirmId]);

  // ===== FUNCIONES DE CARGA =====
  /**
   * Carga y actualiza alertas para insumos
   * 1. Intenta crear alertas en BD (verificarAlertasInsumo)
   * 2. Carga alertas desde BD filtrando por tipo de insumo
   * 3. Fallback a cálculo local si hay error
   */
  async function loadAlertsForInputs() {
    try {
      console.log('📊 Cargando alertas de insumos...');

      // PASO 1: Verificar y crear alertas para cada insumo en BD
      for (const insumo of insumos) {
        try {
          await verificarAlertasInsumo(insumo.id, selectedFirmId, insumo);
        } catch (err) {
          console.warn(`⚠️ No se pudo verificar alertas para ${insumo.name}:`, err.message);
          // Continuar con los siguientes
        }
      }

      // PASO 2: Cargar alertas desde BD (solo las de vencimiento y stock)
      const [ventasData, stockData] = await Promise.all([
        obtenerAlertasVencimiento(selectedFirmId),
        obtenerAlertasStockMinimo(selectedFirmId)
      ]);

      const alertasVencimiento = ventasData.data || [];
      const alertasStock = stockData.data || [];

      // PASO 3: Transformar alertas de BD al formato esperado
      const todasLasAlertas = [...alertasVencimiento, ...alertasStock].map(alerta => ({
        id: alerta.id,
        tipo: alerta.regla_aplicada === 'STOCK_MINIMO' ? 'stock_minimo' :
              alerta.regla_aplicada === 'VENCIMIENTO_VENCIDO' ? 'vencimiento_vencido' :
              'vencimiento_proximo',
        descripcion: alerta.description || alerta.title,
        fecha_creacion: alerta.created_at || alerta.alert_date,
        metadata: alerta.metadata || {}
      }));

      console.log(`✅ ${todasLasAlertas.length} alertas de insumos cargadas desde BD`);
      setAlerts(todasLasAlertas);
    } catch (err) {
      console.error('❌ Error cargando alertas desde BD, usando cálculo local:', err);
      // Fallback: calcular alertas localmente
      calculateAlertsFromInputs();
    }
  }

  /**
   * Fallback: Calcula alertas desde insumos (sin guardar en BD)
   */
  function calculateAlertsFromInputs() {
    const calculatedAlerts = [];
    const today = new Date();

    console.log('📊 Calculando alertas localmente...', {
      totalInsumos: insumos.length,
      fechaHoy: today.toISOString().split('T')[0]
    });

    insumos.forEach((insumo) => {
      // ALERTA 1: Vencimiento vencido
      if (insumo.expiration_date) {
        const expirationDate = new Date(insumo.expiration_date);
        if (expirationDate < today) {
          const diasVencido = Math.ceil((today - expirationDate) / (1000 * 60 * 60 * 24));
          calculatedAlerts.push({
            id: `vencido-${insumo.id}`,
            tipo: 'vencimiento_vencido',
            descripcion: `"${insumo.name}" vencido hace ${diasVencido} día${diasVencido > 1 ? 's' : ''}`,
            fecha_creacion: new Date().toISOString(),
            metadata: { dias_restantes: -diasVencido }
          });
        }
      }

      // ALERTA 2: Próximo a vencer (30 días)
      if (insumo.expiration_date) {
        const expirationDate = new Date(insumo.expiration_date);
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration > 0 && daysUntilExpiration <= 30) {
          calculatedAlerts.push({
            id: `proximo-${insumo.id}`,
            tipo: 'vencimiento_proximo',
            descripcion: `"${insumo.name}" vence en ${daysUntilExpiration} día${daysUntilExpiration > 1 ? 's' : ''}`,
            fecha_creacion: new Date().toISOString(),
            metadata: { dias_restantes: daysUntilExpiration }
          });
        }
      }

      // ALERTA 3: Stock bajo
      if (insumo.min_stock_alert && insumo.current_stock < insumo.min_stock_alert) {
        calculatedAlerts.push({
          id: `bajo-${insumo.id}`,
          tipo: 'stock_minimo',
          descripcion: `"${insumo.name}" tiene stock bajo (${insumo.current_stock} < ${insumo.min_stock_alert})`,
          fecha_creacion: new Date().toISOString(),
          metadata: { stock_actual: insumo.current_stock, stock_minimo: insumo.min_stock_alert }
        });
      }
    });

    console.log(`✅ ${calculatedAlerts.length} alertas calculadas localmente`);
    setAlerts(calculatedAlerts);
  }


  async function loadStatistics(firmId) {
    try {
      if (insumos.length > 0) {
        const totalInsumos = insumos.length;
        const insumosActivos = insumos.filter(i => i.current_stock > 0).length;
        const proximosAvencer = insumos.filter(i => {
          if (!i.expiration_date) return false;
          const dias = Math.ceil((new Date(i.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
          return dias > 0 && dias <= 30;
        }).length;
        const conStockBajo = insumos.filter(i =>
          i.min_stock_alert > 0 && i.current_stock <= i.min_stock_alert
        ).length;

        setStatistics({
          totalInsumos,
          insumosActivos,
          proximosAvencer,
          conStockBajo,
          sinStock: insumos.filter(i => i.current_stock === 0).length
        });
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }

  // ===== HANDLERS DE INSUMO =====
  function handleNewInput() {
    setFormData({
      name: '',
      category: '',
      unit: '',
      depot_id: '',
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
    setEditingInput(null);
    setIsCreatingInput(true);
  }

  function handleEditInput(insumo) {
    setEditingInput(insumo);
    setFormData({
      name: insumo.name || '',
      category: insumo.category || '',
      unit: insumo.unit || '',
      depot_id: insumo.depot_id || '',
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
    setIsEditingInput(true);
  }

  async function handleSaveInput(data) {
    // Usar data pasada o formData del estado
    const dataToSave = data || formData;

    // Validaciones
    if (!dataToSave.name.trim()) {
      toast.error('El nombre del insumo es requerido');
      return;
    }
    if (!dataToSave.category) {
      toast.error('La categoría es requerida');
      return;
    }
    if (!dataToSave.unit) {
      toast.error('La unidad es requerida');
      return;
    }

    try {
      if (isEditingInput) {
        await updateInput(editingInput.id, dataToSave);
        // Auditoría
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: selectedPremiseId,
          insumoId: editingInput.id,
          tipo: 'insumo_actualizado',
          descripcion: `Insumo "${dataToSave.name}" actualizado`,
          moduloOrigen: 'insumos',
          usuario: user?.full_name || 'sistema',
          referencia: editingInput.id,
          metadata: dataToSave
        });
        toast.success('Insumo actualizado');
      } else {
        // Extraer stock inicial si existe
        const initialStock = dataToSave.initial_stock ? parseFloat(dataToSave.initial_stock) : 0;

        // Crear insumo (sin contar el stock inicial, que viene del movimiento)
        const insumoDataToCreate = { ...dataToSave };
        delete insumoDataToCreate.initial_stock; // No guardar initial_stock en la tabla inputs

        const nuevoInsumo = await addInput({
          firm_id: selectedFirmId,
          ...insumoDataToCreate,
          min_stock_alert: insumoDataToCreate.min_stock_alert ? parseFloat(insumoDataToCreate.min_stock_alert) : 0,
          cost_per_unit: insumoDataToCreate.cost_per_unit ? parseFloat(insumoDataToCreate.cost_per_unit) : null,
          current_stock: 0
        });

        // Auditoría de creación de insumo
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: selectedPremiseId,
          insumoId: nuevoInsumo.id,
          tipo: 'insumo_creado',
          descripcion: `Insumo "${insumoDataToCreate.name}" creado`,
          moduloOrigen: 'insumos',
          usuario: user?.full_name || 'sistema',
          referencia: nuevoInsumo.id,
          metadata: insumoDataToCreate
        });

        // Si hay stock inicial, registrar movimiento de entrada automático
        if (initialStock > 0) {
          try {
            const movimientoInicial = await registerMovement({
              input_id: nuevoInsumo.id,
              type: 'entry',
              quantity: initialStock,
              description: 'Stock inicial ingresado',
              firm_id: selectedFirmId,
              premise_id: selectedPremiseId,
              date: new Date().toISOString(),
              unit_cost: insumoDataToCreate.cost_per_unit ? parseFloat(insumoDataToCreate.cost_per_unit) : null
            });

            // Auditoría de movimiento inicial
            await crearRegistro({
              firmId: selectedFirmId,
              premiseId: selectedPremiseId,
              insumoId: nuevoInsumo.id,
              tipo: 'movimiento_entry',
              descripcion: `Stock inicial: ${initialStock} ${insumoDataToCreate.unit} ingresados`,
              moduloOrigen: 'insumos',
              usuario: user?.full_name || 'sistema',
              referencia: movimientoInicial.id,
              metadata: { quantity: initialStock, unit: insumoDataToCreate.unit }
            });
          } catch (errMovement) {
            console.error('Error registrando stock inicial:', errMovement);
            toast.warning('Insumo creado pero hubo error al registrar stock inicial');
          }
        }

        toast.success(`Insumo "${insumoDataToCreate.name}" creado${initialStock > 0 ? ' con stock inicial' : ''}`);
      }

      resetForm();
    } catch (error) {
      toast.error(error.message || 'Error al guardar insumo');
    }
  }

  // ===== HANDLERS DE MOVIMIENTO =====
  async function handleRegisterMovement(movementData) {
    try {
      // Agregar IDs de firma, predio y usuario
      const movimientoConContexto = {
        ...movementData,
        firm_id: selectedFirmId,
        premise_id: selectedPremiseId,
        created_by: user?.full_name || 'sistema'
      };

      // Para transferencias: calcular destination_input_id
      if (movementData.type === 'transfer' && movementData.destination_depot_id) {
        // Buscar el input (insumo) en el depósito destino por nombre
        const origenInput = insumos.find(i => i.id === movementData.input_id);
        if (origenInput) {
          const destinationInputId = insumos.find(
            inp => inp.name === origenInput.name &&
                   inp.lot_id === movementData.destination_depot_id
          )?.id;

          if (destinationInputId) {
            movimientoConContexto.destination_input_id = destinationInputId;
          }
        }
        // Si no existe el insumo en destino, el backend lo creará automáticamente
      }

      // Registrar movimiento
      const nuevoMovimiento = await registerMovement(movimientoConContexto);

      // Auditoría
      await crearRegistro({
        firmId: selectedFirmId,
        premiseId: selectedPremiseId,
        insumoId: movementData.input_id,
        tipo: 'movimiento_registrado',
        descripcion: `Movimiento ${movementData.type} de ${movementData.quantity} unidades${movementData.document_reference ? ` (Doc: ${movementData.document_reference})` : ''}`,
        moduloOrigen: 'insumos',
        usuario: user?.full_name || 'sistema',
        referencia: nuevoMovimiento.id,
        metadata: movimientoConContexto
      });

      // Recargar movimientos
      await loadMovementsFirma(selectedFirmId, {
        desde: dateRange.from,
        hasta: dateRange.to
      });

      // Para transferencias, recargar insumos para ver el nuevo insumo creado en destino
      if (movementData.type === 'transfer') {
        await loadInputs(selectedFirmId);
      }

      // NOTA: No recargar alertas aquí
      // El useEffect en línea 146 ya lo hará automáticamente cuando insumos/movimientos cambien
      // Evitar llamadas duplicadas que crean alertas duplicadas

      // Cerrar modal
      setIsRegisteringMovement(false);
      resetForm();

      toast.success('Movimiento registrado exitosamente');
    } catch (error) {
      toast.error(error.message || 'Error al registrar movimiento');
    }
  }

  // ===== HANDLERS DE ALERTAS =====
  async function handleResolveAlert(alertId) {
    try {
      await resolverAlerta(alertId);

      // Remover de UI
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      // Auditoría
      await crearRegistro({
        firmId: selectedFirmId,
        premiseId: selectedPremiseId,
        tipo: 'alerta_resuelta',
        descripcion: `Alerta resuelta: ${alertId}`,
        moduloOrigen: 'insumos',
        usuario: user?.full_name || 'sistema',
        referencia: alertId
      });

      toast.success('Alerta marcada como resuelta');
    } catch (error) {
      toast.error(error.message || 'Error al resolver alerta');
    }
  }

  async function handleDeleteAlert(alertId) {
    try {
      await cancelarAlerta(alertId);

      // Remover de UI
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      // Auditoría
      await crearRegistro({
        firmId: selectedFirmId,
        premiseId: selectedPremiseId,
        tipo: 'alerta_eliminada',
        descripcion: `Alerta eliminada: ${alertId}`,
        moduloOrigen: 'insumos',
        usuario: user?.full_name || 'sistema',
        referencia: alertId
      });

      toast.success('Alerta eliminada');
    } catch (error) {
      toast.error(error.message || 'Error al eliminar alerta');
    }
  }

  async function handleDeleteInput() {
    if (!editingInput) return;

    try {
      setIsDeleting(true);
      await deleteInput(editingInput.id);

      // Auditoría
      await crearRegistro({
        firmId: selectedFirmId,
        premiseId: selectedPremiseId,
        insumoId: editingInput.id,
        tipo: 'insumo_eliminado',
        descripcion: `Insumo "${editingInput.name}" eliminado`,
        moduloOrigen: 'insumos',
        usuario: user?.full_name || 'sistema',
        referencia: editingInput.id,
        metadata: { nombre: editingInput.name }
      });

      toast.success('Insumo eliminado');
      resetForm();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar insumo');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function resetForm() {
    setIsCreatingInput(false);
    setIsEditingInput(false);
    setIsRegisteringMovement(false);
    setEditingInput(null);
    setShowDeleteConfirm(false);
    setFormData({
      name: '',
      category: '',
      unit: '',
      depot_id: '',
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
  }

  // ===== FUNCIONES DE FILTRADO =====
  const filteredInsumos = insumos.filter(insumo => {
    const matchSearch = !searchTerm || insumo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || insumo.category === filterCategory;
    const matchDepot = !filterDepot || insumo.depot_id === filterDepot;
    return matchSearch && matchCategory && matchDepot;
  });

  // ===== RENDERIZADO =====
  if (!selectedFirmId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-12 h-12 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Selecciona una Firma</h3>
              <p className="text-amber-800 text-sm">Debes seleccionar una firma para gestionar insumos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-16 py-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Insumos y Stock</h2>
          <p className="text-slate-500">Administra insumos, existencias y movimientos</p>
        </div>

        {!isCreatingInput && !isEditingInput && !isRegisteringMovement && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsRegisteringMovement(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar Movimiento
            </button>
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 bg-slate-300 text-slate-500 rounded-lg cursor-not-allowed"
              title="Los insumos SOLO se crean desde remitos. Usa el módulo de Remitos para crear nuevos insumos y mantener trazabilidad documental."
            >
              <Plus className="w-4 h-4" /> Nuevo Insumo
            </button>
          </div>
        )}
      </div>

      {/* ALERTAS BANNER */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition"
          onClick={() => setShowAlerts(true)}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
              </h4>
              <ul className="text-sm text-red-800 space-y-1">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <li key={idx}>• {alert.descripcion}</li>
                ))}
                {alerts.length > 3 && <li className="text-red-700 font-medium">+ {alerts.length - 3} más</li>}
              </ul>
              <p className="text-xs text-red-600 mt-2 font-medium">Haz click para ver detalles</p>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD DE MÉTRICAS */}
      {statistics && !isCreatingInput && !isEditingInput && !isRegisteringMovement && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Insumos</p>
            <p className="text-2xl font-black text-slate-700 mt-2">{statistics.totalInsumos}</p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
            <p className="text-xs font-bold text-emerald-600 uppercase">Con Stock</p>
            <p className="text-2xl font-black text-emerald-700 mt-2">{statistics.insumosActivos}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200">
            <p className="text-xs font-bold text-yellow-700 uppercase">Próximo a Vencer</p>
            <p className="text-2xl font-black text-yellow-700 mt-2">{statistics.proximosAvencer}</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl shadow-sm border border-orange-200">
            <p className="text-xs font-bold text-orange-700 uppercase">Stock Bajo</p>
            <p className="text-2xl font-black text-orange-700 mt-2">{statistics.conStockBajo}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
            <p className="text-xs font-bold text-red-700 uppercase">Sin Stock</p>
            <p className="text-2xl font-black text-red-700 mt-2">{statistics.sinStock}</p>
          </div>
        </div>
      )}

      {/* TABS DE NAVEGACIÓN */}
      {!isCreatingInput && !isEditingInput && !isRegisteringMovement && (
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => { setCurrentView('inventory'); setActiveTab('dashboard'); }}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              currentView === 'inventory' && activeTab === 'dashboard'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Inventario General
          </button>
          <button
            onClick={() => { setCurrentView('byDepot'); setActiveTab('dashboard'); }}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              currentView === 'byDepot' && activeTab === 'dashboard'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-4 h-4 inline mr-2" />
            Por Depósito
          </button>
          <button
            onClick={() => { setCurrentView('movements'); setActiveTab('dashboard'); }}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              currentView === 'movements' && activeTab === 'dashboard'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Historial
          </button>

          <div className="ml-4 border-l border-slate-200"></div>

          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'charts'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Gráficos
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap flex items-center ${
              activeTab === 'alerts'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔔 Alertas
            <AlertBadge count={alerts.length} className="ml-2" />
          </button>
        </div>
      )}

      {/* MODALES DE FORMULARIOS */}
      <InputFormModal
        isOpen={isCreatingInput || isEditingInput}
        isEditing={isEditingInput}
        insumo={editingInput}
        depots={depots}
        onSubmit={async (data) => {
          setFormData(data);
          await handleSaveInput(data);
        }}
        onCancel={resetForm}
        onDelete={() => setShowDeleteConfirm(true)}
        canDelete={canDelete}
        isLoading={loadingInputs}
        isDeleting={isDeleting}
        showDeleteConfirm={showDeleteConfirm}
        onConfirmDelete={handleDeleteInput}
        onCancelDelete={() => setShowDeleteConfirm(false)}
      />

      <MovementFormModal
        isOpen={isRegisteringMovement}
        inputs={insumos}
        depots={depots}
        lotes={lotes}
        onSubmit={handleRegisterMovement}
        onCancel={resetForm}
        isLoading={loadingMovements}
      />

      {/* CONTENIDO: VISTA INVENTORY */}
      {currentView === 'inventory' && !isCreatingInput && !isEditingInput && !isRegisteringMovement && activeTab === 'dashboard' && (
        <InventoryView
          insumos={insumos}
          categories={obtenerCategorias()}
          depots={depots}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterCategory={filterCategory}
          onFilterCategoryChange={setFilterCategory}
          filterDepot={filterDepot}
          onFilterDepotChange={setFilterDepot}
          onEditInput={handleEditInput}
          loading={loadingInputs}
        />
      )}

      {/* CONTENIDO: VISTA POR DEPÓSITO */}
      {currentView === 'byDepot' && !isCreatingInput && !isEditingInput && !isRegisteringMovement && activeTab === 'dashboard' && (
        <ByDepotView
          insumos={insumos}
          depots={depots}
          onEditInput={handleEditInput}
          loading={loadingInputs}
        />
      )}

      {/* CONTENIDO: VISTA HISTORIAL */}
      {currentView === 'movements' && !isCreatingInput && !isEditingInput && !isRegisteringMovement && activeTab === 'dashboard' && (
        <MovementsView
          movimientos={movimientos}
          insumos={insumos}
          depots={depots}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          loading={loadingMovements}
        />
      )}

      {/* CONTENIDO: GRÁFICOS */}
      {activeTab === 'charts' && !isCreatingInput && !isEditingInput && !isRegisteringMovement && (
        <ChartsPanel
          insumos={insumos}
          depots={depots}
          movimientos={movimientos}
          alerts={alerts}
        />
      )}

      {/* CONTENIDO: ALERTAS */}
      {activeTab === 'alerts' && !isCreatingInput && !isEditingInput && !isRegisteringMovement && (
        <AlertsPanel
          alerts={alerts}
          insumos={insumos}
          onResolveAlert={handleResolveAlert}
          onDeleteAlert={handleDeleteAlert}
          loading={false}
        />
      )}

      {/* MODAL FLOTANTE DE ALERTAS */}
      <AlertsOverlay
        alerts={alerts}
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
      />
    </div>
  );
}
