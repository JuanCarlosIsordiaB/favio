import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, FlaskConical, Loader, BarChart3, Lock, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SoilCharts from '../graficos/SoilCharts';
import { canDeleteMonitoringRecord, getDeleteRestrictionMessage, formatTimeRemaining, getTimeRemainingForEdit } from '../../lib/permissions';

// Utility function defined outside component to avoid ReferenceError
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SoilAnalysis({ firmId, premiseId }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [formData, setFormData] = useState({
    lote_id: '',
    fecha: getLocalDate(),
    parametro: 'P',
    resultado: '',
    objetivo: '',
    deficit: '',
    fuente_recomendada: '',
    kg_ha: '',
    redondeo: '',
    hectareas: '',
    kg_total: '',
    aplicado: false
  });

  const [submitting, setSubmitting] = useState(false);

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
        .select('id, name')
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
        .from('analisis_suelo')
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
      console.error('Error fetching soil analysis records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from('analisis_suelo').insert([{
        firm_id: firmId,
        premise_id: premiseId,
        lot_id: formData.lote_id || null,
        fecha: formData.fecha,
        parametro: formData.parametro,
        resultado: formData.resultado || null,
        objetivo: formData.objetivo || null,
        deficit: formData.deficit || null,
        fuente_recomendada: formData.fuente_recomendada || null,
        kg_ha: formData.kg_ha ? parseFloat(formData.kg_ha) : null,
        redondeo: formData.redondeo ? parseFloat(formData.redondeo) : null,
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
        kg_total: formData.kg_total ? parseFloat(formData.kg_total) : null,
        aplicado: formData.aplicado,
        usuario: user?.full_name || 'sistema'
      }]);

      if (error) throw error;

      // Registrar auditoría para análisis de suelo
      await crearRegistro({
        firmId: firmId,
        premiseId: premiseId,
        lotId: formData.lote_id || null,
        tipo: 'monitoreo',
        descripcion: `Análisis de suelo: Parámetro ${formData.parametro} - Resultado: ${formData.resultado}`,
        moduloOrigen: 'soil_analysis',
        usuario: user?.full_name || 'sistema',
        metadata: {
          parametro: formData.parametro,
          resultado: parseFloat(formData.resultado || 0),
          objetivo: formData.objetivo,
          deficit: formData.deficit,
          kg_ha: formData.kg_ha ? parseFloat(formData.kg_ha) : null,
          hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
          kg_total: formData.kg_total ? parseFloat(formData.kg_total) : null
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      setShowForm(false);
      setFormData({
        lote_id: '',
        fecha: getLocalDate(),
        parametro: 'P',
        resultado: '',
        objetivo: '',
        deficit: '',
        fuente_recomendada: '',
        kg_ha: '',
        redondeo: '',
        hectareas: '',
        kg_total: '',
        aplicado: false
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

      const { error } = await supabase.from('analisis_suelo').delete().eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de análisis
      if (record) {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: record.lote_id || null,
          tipo: 'monitoreo',
          descripcion: `Análisis de suelo eliminado: Parámetro ${record.parametro}`,
          moduloOrigen: 'soil_analysis',
          usuario: user?.full_name || 'sistema',
          metadata: {
            parametro: record.parametro,
            resultado: record.resultado,
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
        <h3 className="text-lg font-semibold text-slate-700">Análisis de Suelo</h3>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setActiveTab('form');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Análisis
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            Formulario y Registros
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Gráficos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6 mt-6">

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Parámetro</label>
              <select
                value={formData.parametro}
                onChange={(e) => setFormData({ ...formData, parametro: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="P">Fósforo (P)</option>
                <option value="K">Potasio (K)</option>
                <option value="MO">Materia Orgánica (MO)</option>
                <option value="pH">pH</option>
                <option value="N">Nitrógeno (N)</option>
                <option value="S">Azufre (S)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resultado</label>
              <input
                type="text"
                value={formData.resultado}
                onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Valor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo</label>
              <input
                type="text"
                value={formData.objetivo}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Valor objetivo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Déficit</label>
              <input
                type="text"
                value={formData.deficit}
                onChange={(e) => setFormData({ ...formData, deficit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Déficit calculado"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuente Recomendada</label>
              <input
                type="text"
                value={formData.fuente_recomendada}
                onChange={(e) => setFormData({ ...formData, fuente_recomendada: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Fertilizante"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kg/Ha</label>
              <input
                type="number"
                step="0.1"
                value={formData.kg_ha}
                onChange={(e) => setFormData({ ...formData, kg_ha: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kg Total</label>
              <input
                type="number"
                step="0.1"
                value={formData.kg_total}
                onChange={(e) => setFormData({ ...formData, kg_total: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="aplicado"
              checked={formData.aplicado}
              onChange={(e) => setFormData({ ...formData, aplicado: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="aplicado" className="text-sm font-medium text-slate-700">Ya aplicado</label>
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
              <th className="px-4 py-3">Parámetro</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Recomendación</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No hay registros</td></tr>
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
                    <td className="px-4 py-3 font-medium">
                      {record.parametro}
                    </td>
                    <td className="px-4 py-3">
                      {record.resultado}
                    </td>
                    <td className="px-4 py-3">
                      {record.fuente_recomendada ? `${record.fuente_recomendada} (${record.kg_ha} kg/ha)` : '-'}
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
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <SoilCharts premiseId={premiseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}