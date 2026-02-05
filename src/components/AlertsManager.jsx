import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import {
  ejecutarVerificacionesAutomaticas,
  buscarAlertasPorTitulo
} from '../services/alertas';
import { Bell, Plus, Calendar, AlertTriangle, CheckCircle, CheckCircle2, Clock, Trash2, Edit2, X, Eye, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Badge } from './ui/badge';

/**
 * COMPONENTE UNIFICADO: AlertsManager
 *
 * Acepta dos formas de props:
 * 1. Props simples: firmId, premiseId (compatibilidad con App.jsx)
 * 2. Props contexto: contexto { firmaSeleccionada, predioSeleccionado }
 *
 * Incluye TODOS los features de AlertasRecordatorios + AlertsManager original
 */
export default function AlertsManager(props) {
  // ============================================================================
  // NORMALIZACION DE PROPS - Soportar ambas interfaces
  // ============================================================================
  const firmId = props.firmId || props.contexto?.firmaSeleccionada?.id;
  const premiseId = props.premiseId || props.contexto?.predioSeleccionado?.id;
  const contexto = props.contexto || {
    firmaSeleccionada: { id: firmId },
    predioSeleccionado: premiseId ? { id: premiseId } : null
  };

  // ============================================================================
  // STATE
  // ============================================================================
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [alertToView, setAlertToView] = useState(null);

  // Filtros y búsqueda
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [searchTitulo, setSearchTitulo] = useState('');
  const [verificandoAlertas, setVerificandoAlertas] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    alert_type: 'reminder',
    alert_date: '',
    priority: 'medium',
    status: 'pending'
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (firmId) {
      fetchAlerts();
    }
  }, [firmId, premiseId]);

  // ============================================================================
  // FUNCIONES PRINCIPALES
  // ============================================================================

  /**
   * Cargar alertas: Incluye tanto alertas del predio como alertas automáticas (sin predio)
   * FIX: Hacer dos queries para incluir alertas con premise_id = NULL
   */
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let data, error;

      if (premiseId) {
        // Query 1: Alertas del predio seleccionado
        const { data: alertasDelPredio } = await supabase
          .from('alerts')
          .select('*')
          .eq('firm_id', firmId)
          .eq('premise_id', premiseId);

        // Query 2: Alertas sin predio (null) - alertas automáticas de firma
        const { data: alertasAutomaticas } = await supabase
          .from('alerts')
          .select('*')
          .eq('firm_id', firmId)
          .is('premise_id', null);

        // Combinar y ordenar por fecha (descendente)
        const combined = [...(alertasDelPredio || []), ...(alertasAutomaticas || [])];
        data = combined.sort((a, b) => new Date(b.alert_date) - new Date(a.alert_date));
      } else {
        // Sin predio seleccionado, mostrar solo alertas automáticas (sin predio)
        const result = await supabase
          .from('alerts')
          .select('*')
          .eq('firm_id', firmId)
          .is('premise_id', null)
          .order('alert_date', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Error al cargar alertas y recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.alert_date) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    if (!firmId) {
      toast.error('Debe seleccionar una firma primero');
      return;
    }

    try {
      const alertData = {
        ...formData,
        firm_id: firmId,
        premise_id: premiseId || null,
        status: formData.status || 'pending',
        origen: 'manual'
      };

      if (editingAlert) {
        const { error } = await supabase
          .from('alerts')
          .update(alertData)
          .eq('id', editingAlert.id);
        if (error) throw error;
        toast.success('Alerta actualizada exitosamente');

        // Auditoría
        try {
          await crearRegistro({
            firmId: firmId,
            premiseId: premiseId || null,
            tipo: 'monitoreo',
            descripcion: `Alerta "${formData.title}" actualizada`,
            moduloOrigen: 'alertas_recordatorios',
            usuario: 'usuario',
            referencia: editingAlert.id,
            metadata: {
              accion: 'UPDATE',
              titulo: formData.title,
              tipo: formData.alert_type
            }
          });
        } catch (e) {
          console.error('Error registrando operación:', e);
        }
      } else {
        const { error } = await supabase
          .from('alerts')
          .insert([alertData]);
        if (error) throw error;
        const tipoLabel = formData.alert_type === 'alert' ? 'Alerta' :
                         formData.alert_type === 'warning' ? 'Advertencia' : 'Recordatorio';
        toast.success(`${tipoLabel} creado exitosamente`);

        // Auditoría
        try {
          await crearRegistro({
            firmId: firmId,
            premiseId: premiseId || null,
            tipo: 'monitoreo',
            descripcion: `${tipoLabel} "${formData.title}" creado`,
            moduloOrigen: 'alertas_recordatorios',
            usuario: 'usuario',
            metadata: {
              accion: 'INSERT',
              titulo: formData.title,
              tipo: formData.alert_type
            }
          });
        } catch (e) {
          console.error('Error registrando operación:', e);
        }
      }

      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast.error('Error al guardar alerta/recordatorio');
    }
  };

  const handleStatusChange = async (alert, newStatus) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: newStatus })
        .eq('id', alert.id);
      if (error) throw error;
      const statusLabel = newStatus === 'completed' ? 'completado' : newStatus === 'pending' ? 'pendiente' : newStatus;
      toast.success(`Alerta marcada como ${statusLabel}`);

      // Auditoría
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: alert.premise_id || null,
          tipo: 'monitoreo',
          descripcion: `Alerta "${alert.title}" marcada como ${statusLabel}`,
          moduloOrigen: 'alertas_recordatorios',
          usuario: 'usuario',
          referencia: alert.id,
          metadata: {
            accion: 'UPDATE_STATUS',
            titulo: alert.title,
            estadoAnterior: alert.status,
            estadoNuevo: newStatus
          }
        });
      } catch (e) {
        console.error('Error registrando operación:', e);
      }

      fetchAlerts();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      description: alert.description || '',
      alert_type: alert.alert_type,
      alert_date: alert.alert_date,
      priority: alert.priority,
      status: alert.status
    });
    setShowForm(true);
  };

  const handleDeleteClick = (alert) => {
    setAlertToDelete(alert);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!alertToDelete) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertToDelete.id);
      if (error) throw error;
      toast.success('Alerta eliminada exitosamente');

      // Auditoría
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: alertToDelete.premise_id || null,
          tipo: 'monitoreo',
          descripcion: `Alerta "${alertToDelete.title}" eliminada`,
          moduloOrigen: 'alertas_recordatorios',
          usuario: 'usuario',
          referencia: alertToDelete.id,
          metadata: {
            accion: 'DELETE',
            titulo: alertToDelete.title
          }
        });
      } catch (e) {
        console.error('Error registrando operación:', e);
      }

      setShowDeleteModal(false);
      setAlertToDelete(null);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Error al eliminar alerta/recordatorio');
    }
  };

  const handleViewAlert = (alert) => {
    setAlertToView(alert);
    setShowViewModal(true);
  };

  const handleVerificarAlertas = async () => {
    if (!firmId) return;

    setVerificandoAlertas(true);

    try {
      const resultado = await ejecutarVerificacionesAutomaticas(
        firmId,
        premiseId || null,
        {
          diasMedicionVencida: 14,
          diasDepositoSinControl: 21,
          umbralNDVI: 0.4,
          limpiarResueltas: true,
        }
      );

      if (resultado.totalAlertas > 0) {
        toast.success(`Verificación completada: ${resultado.totalAlertas} alerta(s) generada(s)`);
      } else {
        toast.info('Verificación completada: No hay alertas nuevas');
      }

      fetchAlerts();
    } catch (error) {
      console.error('Error verificando alertas:', error);
      toast.error('Error al verificar alertas automáticas: ' + error.message);
    } finally {
      setVerificandoAlertas(false);
    }
  };

  const handleBuscar = async (titulo) => {
    setSearchTitulo(titulo);

    if (titulo.trim() === '') {
      fetchAlerts();
      return;
    }

    try {
      const resultados = await buscarAlertasPorTitulo(firmId, titulo);
      setAlerts(resultados);
    } catch (error) {
      console.error('Error buscando alertas:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      alert_type: 'reminder',
      alert_date: '',
      priority: 'medium',
      status: 'pending'
    });
    setEditingAlert(null);
    setShowForm(false);
  };

  // ============================================================================
  // UTILIDADES DE COLOR
  // ============================================================================
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'ALTA';
      case 'medium': return 'MEDIA';
      case 'low': return 'BAJA';
      default: return priority;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'alert': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reminder': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'reminder': return 'Recordatorio';
      case 'alert': return 'Alerta';
      case 'warning': return 'Advertencia';
      default: return type;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  // ============================================================================
  // FILTRADO Y ESTADÍSTICAS
  // ============================================================================
  const alertasFiltradas = alerts.filter(alerta => {
    if (filtroTipo !== 'todos' && alerta.alert_type !== filtroTipo) return false;
    if (filtroEstado !== 'todos' && alerta.status !== filtroEstado) return false;
    return true;
  });

  const alertasPendientes = alerts.filter(a => a.status === 'pending').length;
  const alertasCompletadas = alerts.filter(a => a.status === 'completed').length;
  const alertasAltaPrioridad = alerts.filter(a => a.priority === 'high' && a.status === 'pending').length;

  // ============================================================================
  // RENDER - Mostrar validación si no hay firma
  // ============================================================================
  if (!firmId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-yellow-800">Seleccione una Firma</p>
            <p className="text-sm text-yellow-600 mt-1">
              Debe seleccionar una firma para gestionar alertas y recordatorios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - PÁGINA PRINCIPAL
  // ============================================================================
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 flex-wrap">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Alertas y Recordatorios</h2>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                <span>Pendientes:</span>
                <span className="font-bold text-slate-900">{alertasPendientes}</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                <span>Completadas:</span>
                <span className="font-bold text-slate-900">{alertasCompletadas}</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                <span>Alta Prioridad:</span>
                <span className="font-bold text-slate-900">{alertasAltaPrioridad}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Buscar..."
              value={searchTitulo}
              onChange={(e) => handleBuscar(e.target.value)}
              className="w-48"
            />
            <Button
              onClick={handleVerificarAlertas}
              disabled={verificandoAlertas}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${verificandoAlertas ? 'animate-spin' : ''}`} />
              {verificandoAlertas ? 'Verificando...' : 'Verificar'}
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Plus size={16} />
              Nuevo
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex gap-3 px-6 py-3 bg-white border-b border-slate-200 flex-wrap items-center">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Filtros</span>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 font-medium cursor-pointer transition-all hover:border-slate-400 hover:shadow-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 appearance-none bg-no-repeat"
            style={{
              backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <option value="todos">Tipo: Todos</option>
            <option value="alert">Alert</option>
            <option value="warning">Warning</option>
            <option value="reminder">Reminder</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 font-medium cursor-pointer transition-all hover:border-slate-400 hover:shadow-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 appearance-none bg-no-repeat"
            style={{
              backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <option value="todos">Estado: Todos</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-4 text-slate-600 text-sm">Cargando alertas...</p>
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-medium text-slate-900">No hay alertas registradas</h3>
            <p className="text-sm text-slate-600 mt-1">Comience creando una nueva alerta o recordatorio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase text-slate-600">Título</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase text-slate-600">Prioridad</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase text-slate-600">Fecha</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltradas.map((alert) => (
                  <tr key={alert.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${alert.status === 'completed' ? 'opacity-65' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={alert.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}>
                        {alert.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPriorityColor(alert.priority)}>
                        {getPriorityLabel(alert.priority)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-slate-50">{getTypeLabel(alert.alert_type)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(alert.status)}>
                        {alert.status === 'completed' ? 'Completada' : alert.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatFecha(alert.alert_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        {alert.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(alert, 'completed')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Marcar completado"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(alert)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Editar"
                        >
                          ✏
                        </button>
                        <button
                          onClick={() => handleDeleteClick(alert)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAlert ? 'Editar' : 'Nueva'} Alerta/Recordatorio
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.alert_type}
                    onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="reminder">Recordatorio</option>
                    <option value="alert">Alerta</option>
                    <option value="warning">Advertencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioridad *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej: Revisar sistema de riego"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.alert_date}
                    onChange={(e) => setFormData({ ...formData, alert_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {editingAlert ? 'Actualizar' : 'Crear'} Alerta
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && alertToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Confirmar eliminación</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAlertToDelete(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                ¿Está seguro que desea eliminar esta alerta/recordatorio?
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">{alertToDelete.title}</p>
                {alertToDelete.description && (
                  <p className="text-sm text-slate-600 mt-1">{alertToDelete.description}</p>
                )}
              </div>
              <p className="text-sm text-slate-500">Esta acción no se puede deshacer.</p>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAlertToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && alertToView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                Detalles de {getTypeLabel(alertToView.alert_type)}
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setAlertToView(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Título</h3>
                <p className="text-lg font-medium text-slate-900">{alertToView.title}</p>
              </div>

              {alertToView.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Descripción</h3>
                  <p className="text-slate-700">{alertToView.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Tipo</h3>
                  <Badge className={getTypeColor(alertToView.alert_type)}>
                    {getTypeLabel(alertToView.alert_type)}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Prioridad</h3>
                  <Badge className={getPriorityColor(alertToView.priority)}>
                    {getPriorityLabel(alertToView.priority)}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Estado</h3>
                  <Badge className={getStatusColor(alertToView.status)}>
                    {alertToView.status === 'completed' ? 'Completado' : alertToView.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Fecha</h3>
                  <p className="text-slate-700">{formatFecha(alertToView.alert_date)}</p>
                </div>
              </div>

              {alertToView.origen === 'automatica' && (
                <div className="pt-4 border-t border-slate-200">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                    Generada automáticamente
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  handleEdit(alertToView);
                  setShowViewModal(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setAlertToView(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
