import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Ruler, Loader, BarChart3, Lock, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import PastureCharts from '../graficos/PastureCharts';
import { canDeleteMonitoringRecord, getDeleteRestrictionMessage, formatTimeRemaining, getTimeRemainingForEdit } from '../../lib/permissions';

// Utility function defined outside component to avoid ReferenceError
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function LivestockMonitoring({ firmId, premiseId }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedLotForCharts, setSelectedLotForCharts] = useState('');
  const [formData, setFormData] = useState({
    lote_id: '',
    fecha: getLocalDate(),
    hectareas: '',
    cultivo_lugar1: '',
    cultivo_lugar2: '',
    cultivo_lugar3: '',
    altura_lugar1_cm: '',
    altura_lugar2_cm: '',
    altura_lugar3_cm: '',
    remanente_objetivo_cm: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Función para formatear fecha evitando problemas de zona horaria
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (firmId) {
      fetchRecords();
      if (premiseId) fetchLots();
    }
  }, [firmId, premiseId]);

  const fetchLots = async () => {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select('id, name, remnant_height')
        .eq('premise_id', premiseId);
      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error('Error fetching lots:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('monitoreo_pasturas')
        .select(`
          *,
          lots (name)
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      if (premiseId) {
        query = query.eq('premise_id', premiseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching livestock monitoring records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      // Check for remnant height alert
      if (formData.lote_id) {
        const selectedLot = lots.find(l => l.id === formData.lote_id);
        if (selectedLot && selectedLot.remnant_height) {
          const h1 = parseFloat(formData.altura_lugar1_cm) || 0;
          const h2 = parseFloat(formData.altura_lugar2_cm) || 0;
          const h3 = parseFloat(formData.altura_lugar3_cm) || 0;
          
          // Calculate average of non-zero heights
          const heights = [h1, h2, h3].filter(h => h > 0);
          if (heights.length > 0) {
            const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
            const remnantHeight = parseFloat(selectedLot.remnant_height);
            
            // Alert if average height is close to or below remnant height (within 2cm)
            if (avgHeight <= remnantHeight + 2) {
              alert(`⚠️ ALERTA: La altura promedio (${avgHeight.toFixed(1)} cm) está próxima o por debajo de la altura de remanente configurada para este lote (${remnantHeight} cm).`);
            }
          }
        }
      }

      const { error } = await supabase.from('monitoreo_pasturas').insert([{
        firm_id: firmId,
        premise_id: premiseId,
        lot_id: formData.lote_id || null,
        fecha: formData.fecha,
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
        cultivo_lugar1: formData.cultivo_lugar1 || null,
        cultivo_lugar2: formData.cultivo_lugar2 || null,
        cultivo_lugar3: formData.cultivo_lugar3 || null,
        altura_lugar1_cm: formData.altura_lugar1_cm ? parseFloat(formData.altura_lugar1_cm) : null,
        altura_lugar2_cm: formData.altura_lugar2_cm ? parseFloat(formData.altura_lugar2_cm) : null,
        altura_lugar3_cm: formData.altura_lugar3_cm ? parseFloat(formData.altura_lugar3_cm) : null,
        remanente_objetivo_cm: formData.remanente_objetivo_cm ? parseFloat(formData.remanente_objetivo_cm) : null,
        usuario: user?.full_name || 'sistema'
      }]);

      if (error) throw error;

      // Registrar auditoría para monitoreo ganadero
      await crearRegistro({
        firmId: firmId,
        premiseId: premiseId,
        lotId: formData.lote_id || null,
        tipo: 'monitoreo',
        descripcion: `Monitoreo ganadero registrado - Alturas: ${formData.altura_lugar1_cm || '-'}, ${formData.altura_lugar2_cm || '-'}, ${formData.altura_lugar3_cm || '-'} cm`,
        moduloOrigen: 'livestock_monitoring',
        usuario: user?.full_name || 'sistema',
        metadata: {
          hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
          altura_lugar1_cm: formData.altura_lugar1_cm ? parseFloat(formData.altura_lugar1_cm) : null,
          altura_lugar2_cm: formData.altura_lugar2_cm ? parseFloat(formData.altura_lugar2_cm) : null,
          altura_lugar3_cm: formData.altura_lugar3_cm ? parseFloat(formData.altura_lugar3_cm) : null,
          remanente_objetivo_cm: formData.remanente_objetivo_cm ? parseFloat(formData.remanente_objetivo_cm) : null
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      setShowForm(false);
      setFormData({
        lote_id: '',
        fecha: getLocalDate(),
        hectareas: '',
        cultivo_lugar1: '',
        cultivo_lugar2: '',
        cultivo_lugar3: '',
        altura_lugar1_cm: '',
        altura_lugar2_cm: '',
        altura_lugar3_cm: '',
        remanente_objetivo_cm: ''
      });
      fetchRecords();
    } catch (error) {
      console.error('Error saving record:', error);
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
      const userForPermission = { name: user?.full_name };
      const canDelete = canDeleteMonitoringRecord(userForPermission, record);

      if (!canDelete) {
        const restrictionMessage = getDeleteRestrictionMessage(userForPermission, record);
        alert(`No puedes eliminar este registro:\n\n${restrictionMessage}`);
        return;
      }

      if (!confirm('¿Está seguro de eliminar este registro?')) return;

      const { error } = await supabase.from('monitoreo_pasturas').delete().eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de monitoreo ganadero
      if (record) {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: record.lote_id || null,
          tipo: 'monitoreo',
          descripcion: `Monitoreo ganadero eliminado`,
          moduloOrigen: 'livestock_monitoring',
          usuario: user?.full_name || 'sistema',
          metadata: {
            hectareas: record.hectareas,
            altura_lugar1_cm: record.altura_lugar1_cm,
            altura_lugar2_cm: record.altura_lugar2_cm,
            altura_lugar3_cm: record.altura_lugar3_cm,
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
        <h3 className="text-lg font-semibold text-slate-700">Monitoreo Ganadero (Pasturas)</h3>
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
            Nuevo Monitoreo
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Lote</label>
              <select
                value={formData.lote_id}
                onChange={(e) => setFormData({ ...formData, lote_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar Lote (Opcional)</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>{lot.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hectáreas</label>
              <input
                type="number"
                step="0.01"
                value={formData.hectareas}
                onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Lugar 1</label>
              <input
                type="text"
                value={formData.cultivo_lugar1}
                onChange={(e) => setFormData({ ...formData, cultivo_lugar1: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 text-sm"
                placeholder="Cultivo"
              />
              <input
                type="number"
                step="0.1"
                value={formData.altura_lugar1_cm}
                onChange={(e) => setFormData({ ...formData, altura_lugar1_cm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Altura (cm)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Lugar 2</label>
              <input
                type="text"
                value={formData.cultivo_lugar2}
                onChange={(e) => setFormData({ ...formData, cultivo_lugar2: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 text-sm"
                placeholder="Cultivo"
              />
              <input
                type="number"
                step="0.1"
                value={formData.altura_lugar2_cm}
                onChange={(e) => setFormData({ ...formData, altura_lugar2_cm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Altura (cm)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Lugar 3</label>
              <input
                type="text"
                value={formData.cultivo_lugar3}
                onChange={(e) => setFormData({ ...formData, cultivo_lugar3: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 text-sm"
                placeholder="Cultivo"
              />
              <input
                type="number"
                step="0.1"
                value={formData.altura_lugar3_cm}
                onChange={(e) => setFormData({ ...formData, altura_lugar3_cm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Altura (cm)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remanente Objetivo (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.remanente_objetivo_cm}
                onChange={(e) => setFormData({ ...formData, remanente_objetivo_cm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? <Loader className="animate-spin" size={16} /> : null}
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Alturas (cm)</th>
              <th className="px-4 py-3">Remanente Obj.</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No hay registros</td></tr>
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
                    <td className="px-4 py-3">
                      {record.lots?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 text-xs">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">L1: {record.altura_lugar1_cm || '-'}</span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">L2: {record.altura_lugar2_cm || '-'}</span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">L3: {record.altura_lugar3_cm || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {record.remanente_objetivo_cm ? `${record.remanente_objetivo_cm} cm` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sección de Gráficos */}
      {showCharts && (
        <div className="mt-6 space-y-4">
          {lots.length > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Seleccionar lote para análisis:
                </label>
                <Select value={selectedLotForCharts} onValueChange={setSelectedLotForCharts}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Seleccionar lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map(lot => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedLotForCharts && (
                <PastureCharts
                  loteId={selectedLotForCharts}
                  loteName={lots.find(l => l.id === selectedLotForCharts)?.name}
                />
              )}
            </>
          ) : (
            <div className="bg-slate-50 p-8 rounded-lg text-center text-slate-500">
              <p>No hay lotes disponibles. Crea lotes para ver análisis de pasturas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}