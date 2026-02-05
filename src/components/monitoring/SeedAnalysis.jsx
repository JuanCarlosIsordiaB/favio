import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Microscope, Loader, BarChart3, Lock, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SeedComparisonChart from '../graficos/SeedComparisonChart';
import { canDeleteMonitoringRecord, getDeleteRestrictionMessage, formatTimeRemaining, getTimeRemainingForEdit } from '../../lib/permissions';

// Utility function defined outside component to avoid ReferenceError
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SeedAnalysis({ firmId, premiseId }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [seedVarieties, setSeedVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [formData, setFormData] = useState({
    seed_variety_id: '',
    fecha: getLocalDate(),
    humedad: '',
    tetrazolio: '',
    no_viables: '',
    primer_conteo: '',
    germinacion: '',
    pureza: '',
    observaciones: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [isNewSeedVariety, setIsNewSeedVariety] = useState(false);
  const [newSeedVarietyName, setNewSeedVarietyName] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (firmId) {
      fetchRecords();
      fetchSeedVarieties();
    }
  }, [firmId, premiseId]);

  const fetchSeedVarieties = async () => {
    try {
      const { data, error } = await supabase
        .from('seed_varieties')
        .select('id, name')
        .eq('firm_id', firmId)
        .order('name');
      
      if (error) {
        // If table doesn't exist, we might get an error. Handle gracefully.
        console.error('Error fetching seed varieties:', error);
        return;
      }
      setSeedVarieties(data || []);
    } catch (error) {
      console.error('Error fetching seed varieties:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('analisis_semillas')
        .select(`
          *,
          seed_varieties (name)
        `)
        .eq('firm_id', firmId) // Changed from firma_id to firm_id to match new schema
        .order('created_at', { ascending: false });
      
      if (premiseId) {
        query = query.eq('premise_id', premiseId); // Changed from predio_id to premise_id
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching seed analysis records:', error);
        throw error;
      }
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching seed analysis records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      let currentSeedVarietyId = formData.seed_variety_id;

      // Handle new seed variety creation
      if (isNewSeedVariety && newSeedVarietyName) {
        const { data: newVariety, error: newVarietyError } = await supabase
          .from('seed_varieties')
          .insert([{ name: newSeedVarietyName, firm_id: firmId }])
          .select('id')
          .single();

        if (newVarietyError) throw newVarietyError;
        currentSeedVarietyId = newVariety.id;
      }

      // Prepare data for insertion
      const dataToInsert = {
        firm_id: firmId,
        premise_id: premiseId,
        seed_variety_id: currentSeedVarietyId || null,
        fecha: formData.fecha,
        humedad: formData.humedad ? parseFloat(formData.humedad) : null,
        tetrazolio: formData.tetrazolio ? parseFloat(formData.tetrazolio) : null,
        no_viables: formData.no_viables ? parseFloat(formData.no_viables) : null,
        primer_conteo: formData.primer_conteo ? parseFloat(formData.primer_conteo) : null,
        germinacion: formData.germinacion ? parseFloat(formData.germinacion) : null,
        pureza: formData.pureza ? parseFloat(formData.pureza) : null,
        observaciones: formData.observaciones || null,
        usuario: user?.full_name || 'sistema'
      };

      // Insert with new schema
      const { error } = await supabase.from('analisis_semillas').insert([dataToInsert]);

      if (error) throw error;

      // Registrar auditoría para análisis de semillas
      await crearRegistro({
        firmId: firmId,
        premiseId: premiseId,
        lotId: currentSeedVarietyId || null,
        tipo: 'monitoreo',
        descripcion: `Análisis de semillas registrado - Germinación: ${formData.germinacion}%`,
        moduloOrigen: 'seed_analysis',
        usuario: user?.full_name || 'sistema',
        metadata: {
          humedad: formData.humedad ? parseFloat(formData.humedad) : null,
          tetrazolio: formData.tetrazolio ? parseFloat(formData.tetrazolio) : null,
          germinacion: formData.germinacion ? parseFloat(formData.germinacion) : null,
          pureza: formData.pureza ? parseFloat(formData.pureza) : null,
          observaciones: formData.observaciones
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      setShowForm(false);
      setFormData({
        seed_variety_id: '',
        fecha: getLocalDate(),
        humedad: '',
        tetrazolio: '',
        no_viables: '',
        primer_conteo: '',
        germinacion: '',
        pureza: '',
        observaciones: ''
      });
      setIsNewSeedVariety(false);
      setNewSeedVarietyName('');
      fetchRecords();
      fetchSeedVarieties(); 
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

      const { error } = await supabase.from('analisis_semillas').delete().eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de análisis
      if (record) {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: record.seed_variety_id || null,
          tipo: 'monitoreo',
          descripcion: `Análisis de semillas eliminado - Germinación: ${record.germinacion}%`,
          moduloOrigen: 'seed_analysis',
          usuario: user?.full_name || 'sistema',
          metadata: {
            humedad: record.humedad,
            germinacion: record.germinacion,
            pureza: record.pureza,
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
        <h3 className="text-lg font-semibold text-slate-700">Análisis de Semillas</h3>
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
            <Microscope className="w-4 h-4" />
            Formulario y Registros
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Comparar Variedades
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Semilla/Variedad</label>
              <select
                value={isNewSeedVariety ? 'new' : formData.seed_variety_id}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setIsNewSeedVariety(true);
                    setFormData({ ...formData, seed_variety_id: '' });
                  } else {
                    setIsNewSeedVariety(false);
                    setFormData({ ...formData, seed_variety_id: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar Semilla/Variedad</option>
                {seedVarieties.map(variety => (
                  <option key={variety.id} value={variety.id}>{variety.name}</option>
                ))}
                <option value="new">+ Nueva Semilla/Variedad</option>
              </select>
              {isNewSeedVariety && (
                <input
                  type="text"
                  value={newSeedVarietyName}
                  onChange={(e) => setNewSeedVarietyName(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nombre de la nueva variedad"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Humedad (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.humedad}
                onChange={(e) => setFormData({ ...formData, humedad: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tetrazolio (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.tetrazolio}
                onChange={(e) => setFormData({ ...formData, tetrazolio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">No Viables (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.no_viables}
                onChange={(e) => setFormData({ ...formData, no_viables: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primer Conteo (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.primer_conteo}
                onChange={(e) => setFormData({ ...formData, primer_conteo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Germinación (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.germinacion}
                onChange={(e) => setFormData({ ...formData, germinacion: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pureza (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.pureza}
                onChange={(e) => setFormData({ ...formData, pureza: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea
              rows="2"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Notas adicionales..."
            ></textarea>
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
              <th className="px-4 py-3">Semilla/Variedad</th>
              <th className="px-4 py-3">Resultados</th>
              <th className="px-4 py-3">Observaciones</th>
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
                      {record.seed_varieties?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {record.humedad && <span>Humedad: {record.humedad}%</span>}
                        {record.tetrazolio && <span>Tetrazolio: {record.tetrazolio}%</span>}
                        {record.germinacion && <span>Germinación: {record.germinacion}%</span>}
                        {record.pureza && <span>Pureza: {record.pureza}%</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {record.observaciones}
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

        <TabsContent value="comparison" className="mt-6">
          <SeedComparisonChart firmId={firmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}