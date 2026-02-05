import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, MapPin, FileText, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';
import { useAuth } from '../../contexts/AuthContext';

// Utility function defined outside component to avoid ReferenceError
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AgriculturalMonitoring({ firmId, premiseId }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    lote_id: '',
    fecha: getLocalDate(),
    comentarios: ''
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
        .from('monitoreo_agricola')
        .select(`
          *,
          lots (name)
        `)
        .eq('firm_id', firmId)
        .order('fecha', { ascending: false });

      if (premiseId) {
        query = query.eq('premise_id', premiseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching agricultural monitoring records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from('monitoreo_agricola').insert([{
        firm_id: firmId,
        premise_id: premiseId,
        lot_id: formData.lote_id || null,
        fecha: formData.fecha,
        comentarios: formData.comentarios || null,
        usuario: user?.full_name || 'sistema'
      }]);

      if (error) throw error;

      // Registrar auditoría para monitoreo agrícola
      await crearRegistro({
        firmId: firmId,
        premiseId: premiseId,
        lotId: formData.lote_id || null,
        tipo: 'monitoreo',
        descripcion: `Monitoreo agrícola registrado`,
        moduloOrigen: 'agricultural_monitoring',
        usuario: user?.full_name || 'sistema',
        metadata: {
          comentarios: formData.comentarios,
          fecha: formData.fecha
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      setShowForm(false);
      setFormData({
        lote_id: '',
        fecha: getLocalDate(),
        comentarios: ''
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
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      // Fetch record to get details for audit
      const record = records.find(r => r.id === id);

      const { error } = await supabase.from('monitoreo_agricola').delete().eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de monitoreo
      if (record) {
        await crearRegistro({
          firmId: firmId,
          premiseId: premiseId,
          lotId: record.lote_id || null,
          tipo: 'monitoreo',
          descripcion: `Monitoreo agrícola eliminado`,
          moduloOrigen: 'agricultural_monitoring',
          usuario: user?.full_name || 'sistema',
          metadata: {
            comentarios: record.comentarios,
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
        <h3 className="text-lg font-semibold text-slate-700">Monitoreo Agrícola</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Monitoreo
        </button>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
              <textarea
                rows="3"
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Observaciones del cultivo, estado fenológico, plagas, etc."
              ></textarea>
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
              <th className="px-4 py-3">Comentarios</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No hay registros</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {formatDate(record.fecha)}
                  </td>
                  <td className="px-4 py-3">
                    {record.lots?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-md truncate">
                    {record.comentarios}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}