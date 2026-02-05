import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, CloudRain, Eye, Loader, Save, X, BarChart3, Lock, Clock, AlertTriangle } from 'lucide-react';
import RecordDetailModal from '../RecordDetailModal';
import RainfallCharts from '../graficos/RainfallCharts';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { canDeleteMonitoringRecord, getDeleteRestrictionMessage, formatTimeRemaining, getTimeRemainingForEdit } from '../../lib/permissions';
import { useMonitoringTriggers } from '../../hooks/useMonitoringTriggers';

export default function RainfallManager({ firmId, premiseId }) {
  const { user } = useAuth();
  const { triggerNuevaLluvia } = useMonitoringTriggers(firmId, premiseId);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null);

  // DEBUG: Verificar que premiseId es válido
  useEffect(() => {
    if (premiseId) {
      console.log('🔍 RainfallManager received premiseId:', premiseId);
      // Validar que es un UUID válido (debe tener 36 caracteres incluyendo guiones)
      if (typeof premiseId === 'string' && premiseId.length === 36) {
        console.log('✅ PremiseId looks valid');
      } else {
        console.error('❌ WARNING: PremiseId might be invalid:', { premiseId, type: typeof premiseId, length: premiseId?.length });
      }
    } else {
      console.error('❌ CRITICAL: PremiseId is missing!');
    }
  }, [premiseId]);
  
  // Función para obtener fecha local en formato YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    fecha: getLocalDate(),
    mm: ''
  });
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState(null);

  // Cargar campaña activa del predio
  useEffect(() => {
    if (premiseId) {
      fetchActiveCampaign();
    }
  }, [premiseId]);

  useEffect(() => {
    if (firmId) fetchRecords();
  }, [firmId, premiseId]);

  const fetchActiveCampaign = async () => {
    try {
      // Las campañas están asociadas a firm_id, no premise_id
      // Obtener el firmId desde localStorage (está disponible en App.jsx)
      const firmIdStr = localStorage.getItem('selectedFirmData');
      if (!firmIdStr) {
        console.warn('⚠️ No firm selected, cannot fetch active campaign');
        return;
      }

      let firmData;
      try {
        firmData = JSON.parse(firmIdStr);
      } catch (parseError) {
        console.error('⚠️ Failed to parse selectedFirmData from localStorage:', parseError);
        return;
      }

      const firmId = firmData?.id;

      if (!firmId) {
        console.warn('⚠️ Invalid firmId from localStorage');
        return;
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, start_date, end_date, status')
        .eq('firm_id', firmId)
        .eq('status', 'ACTIVE')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando campaña activa:', error);
      }

      setActiveCampaign(data || null);
    } catch (error) {
      console.error('Error cargando campaña activa:', error);
    }
  };

  const handleViewDetails = (record) => {
    setSelectedRecordForDetail({
      originalData: record,
      sourceTable: 'lluvias',
      type: 'Lluvia',
      color: 'bg-cyan-100 text-cyan-600',
      title: `${record.mm} mm`,
      Icon: CloudRain
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Asumimos formato YYYY-MM-DD que viene de la BD
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      console.log('Fetching rainfall records for firm:', firmId);
      
      let query = supabase
        .from('lluvias')
        .select('id, firm_id, premise_id, fecha, mm, usuario, created_at')
        .eq('firm_id', firmId)
        .order('fecha', { ascending: false });

      if (premiseId) {
        query = query.eq('premise_id', premiseId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error fetching rainfall:', error);
        throw error;
      }
      
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching rainfall records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      console.log('🔍 DEBUG - Saving rainfall record:', {
        formData,
        firmId,
        premiseId,
        userFullName: user?.full_name
      });

      if (!premiseId) {
        console.error('❌ ERROR: premiseId is missing!');
        alert('Error: Predio no seleccionado. Por favor selecciona un predio antes de continuar.');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('lluvias').insert([{
        firm_id: firmId,
        premise_id: premiseId,
        fecha: formData.fecha,
        mm: parseFloat(formData.mm),
        usuario: user?.full_name || 'sistema'
      }]);

      if (error) throw error;

      // Registrar auditoría para lluvia
      await crearRegistro({
        firmId: firmId,
        premiseId: premiseId,
        lotId: null,
        tipo: 'lluvia',
        descripcion: `Registro de lluvia: ${formData.mm} mm`,
        moduloOrigen: 'rainfall_manager',
        usuario: user?.full_name || 'sistema',
        metadata: {
          mm: parseFloat(formData.mm),
          fecha: formData.fecha
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      // Ejecutar trigger de integración (verificar impacto en proyecciones)
      triggerNuevaLluvia(parseFloat(formData.mm)).catch(err =>
        console.warn('Error ejecutando trigger de integración:', err)
      );

      setShowForm(false);
      setFormData({ fecha: getLocalDate(), mm: '' });
      fetchRecords();
    } catch (error) {
      console.error('Error saving rainfall record:', error);
      alert('Error al guardar el registro: ' + (error.message || error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Fetch record to get details for audit and permission check
      const record = records.find(r => r.id === id);

      if (!record) {
        alert('Registro no encontrado');
        return;
      }

      // Verificar permisos
      const userData = { name: user?.name || 'Anonymous' };
      const canDelete = canDeleteMonitoringRecord(userData, record);

      if (!canDelete) {
        const restrictionMessage = getDeleteRestrictionMessage(userData, record);
        alert(`No puedes eliminar este registro:\n\n${restrictionMessage}`);
        return;
      }

      if (!confirm('¿Está seguro de eliminar este registro?')) return;

      const { error } = await supabase.from('lluvias').delete().eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de lluvia
      if (record) {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: null,
          tipo: 'lluvia',
          descripcion: `Registro de lluvia eliminado: ${record.mm} mm`,
          moduloOrigen: 'rainfall_manager',
          usuario: user?.full_name || 'sistema',
          metadata: {
            mm: parseFloat(record.mm),
            fecha: record.fecha,
            deleted: true
          }
        }).catch(err => console.warn('Error registrando en auditoría:', err));
      }

      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-700">Registro de Lluvias</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCharts(!showCharts)}
            variant={showCharts ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <BarChart3 size={16} />
            {showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}
          </Button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nueva Lluvia
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Milímetros (mm)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.mm}
                onChange={(e) => setFormData({ ...formData, mm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Indicador de campaña activa */}
          {activeCampaign ? (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Calendar size={16} />
              <span>Este registro se asociará a: <strong>{activeCampaign.name}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertTriangle size={16} />
              <span>No hay campaña activa. El registro se guardará sin asociación a campaña.</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={submitting}
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Milímetros</th>
              <th className="px-4 py-3">Campaña</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                <div className="flex justify-center items-center gap-2">
                  <Loader className="animate-spin" size={20} />
                  Cargando...
                </div>
              </td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No hay registros de lluvias</td></tr>
            ) : (
              records.map((record) => {
                const userData = { name: user?.name || 'Anonymous' };
                const canDelete = canDeleteMonitoringRecord(userData, record);
                const timeRemaining = getTimeRemainingForEdit(record);
                const restrictionMessage = getDeleteRestrictionMessage(userData, record);

                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {formatDate(record.fecha)}
                      {!canDelete && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                          <Lock size={12} />
                          Protegido
                        </span>
                      )}
                      {canDelete && timeRemaining > 0 && timeRemaining < 6 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-orange-600">
                          <Clock size={12} />
                          {formatTimeRemaining(timeRemaining)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {record.mm} mm
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {record.campaigns?.name || (
                        <span className="text-slate-400 italic">Sin campaña</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className={`transition-colors ${
                            canDelete
                              ? 'text-red-400 hover:text-red-600'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                          title={canDelete ? 'Eliminar' : restrictionMessage}
                          disabled={!canDelete}
                        >
                          {canDelete ? <Trash2 size={16} /> : <Lock size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRecordForDetail && (
        <RecordDetailModal
          record={selectedRecordForDetail}
          onClose={() => setSelectedRecordForDetail(null)}
        />
      )}

      {/* Sección de Gráficos */}
      {showCharts && premiseId && (
        <div className="mt-6">
          <RainfallCharts premiseId={premiseId} />
        </div>
      )}
    </div>
  );
}