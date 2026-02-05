import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

const STATUS_COLORS = {
  PENDING: '#fbbf24',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#10b981',
  APPROVED: '#06b6d4',
  REJECTED: '#ef4444'
};

/**
 * WorkReport
 * Reporte de trabajos agrícolas y ganaderos con costos
 */

export default function WorkReport({ premiseId, periodo }) {
  const [data, setData] = useState(null);
  const [works, setWorks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, agricultural, livestock
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo, filterType, filterStatus]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener trabajos agrícolas
      const { data: agriWorks } = await supabase
        .from('agricultural_works')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end);

      // Obtener trabajos ganaderos
      const { data: livestockWorks } = await supabase
        .from('livestock_works')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end);

      const allWorks = [
        ...(agriWorks || []).map(w => ({ ...w, type: 'agricultural' })),
        ...(livestockWorks || []).map(w => ({ ...w, type: 'livestock' }))
      ];

      // Calcular estadísticas por estado
      const byStatus = {};
      let totalCost = 0;
      let approvedCount = 0;
      let approvedCost = 0;

      allWorks.forEach(work => {
        const status = work.status || 'PENDING';
        if (!byStatus[status]) {
          byStatus[status] = { status, count: 0, cost: 0 };
        }
        byStatus[status].count++;
        byStatus[status].cost += work.estimated_cost || 0;
        totalCost += work.estimated_cost || 0;

        if (status === 'APPROVED') {
          approvedCount++;
          approvedCost += work.estimated_cost || 0;
        }
      });

      // Calcular por tipo
      const byType = {
        agricultural: agriWorks?.length || 0,
        livestock: livestockWorks?.length || 0
      };

      // Filtrar
      let filtered = allWorks;
      if (filterType !== 'all') {
        filtered = filtered.filter(w => w.type === filterType);
      }
      if (filterStatus !== 'all') {
        filtered = filtered.filter(w => (w.status || 'PENDING') === filterStatus);
      }

      setData({
        totalWorks: allWorks.length,
        totalCost,
        approvedCount,
        approvedCost,
        byStatus: Object.values(byStatus),
        byType
      });

      setWorks(filtered);
    } catch (err) {
      console.error('Error loading work data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando datos de trabajos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Error cargando reporte</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos de trabajos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-work-title" className="text-2xl font-bold text-slate-800 mb-2">
          Reporte de Trabajos
        </h2>
        <p className="text-slate-600">Análisis de trabajos agrícolas y ganaderos con costos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Total de Trabajos</p>
          <p data-id="report-work-total-count" className="text-2xl font-bold text-blue-900">
            {data.totalWorks}
          </p>
          <p className="text-xs text-blue-600 mt-1">registrados</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Trabajos Aprobados</p>
          <p data-id="report-work-approved-count" className="text-2xl font-bold text-green-900">
            {data.approvedCount}
          </p>
          <p className="text-xs text-green-600 mt-1">aprobados</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Costo Total Estimado</p>
          <p data-id="report-work-total-cost" className="text-2xl font-bold text-purple-900">
            ${data.totalCost.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-purple-600 mt-1">todos los trabajos</p>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <p className="text-sm font-medium text-cyan-600 mb-1">Costo Aprobado</p>
          <p className="text-2xl font-bold text-cyan-900">
            ${data.approvedCost.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-cyan-600 mt-1">aprobados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de trabajo:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            data-id="report-work-filter-type"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los tipos</option>
            <option value="agricultural">Solo Agrícolas</option>
            <option value="livestock">Solo Ganaderos</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            data-id="report-work-filter-status"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="COMPLETED">Completados</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        {/* Por Estado */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Distribución por Estado</h3>
          </div>

          <div data-id="report-work-status-chart" className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por Costo por Estado */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Costo Total por Estado</h3>
          </div>

          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="status"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                />
                <Bar dataKey="cost" fill="#3b82f6" name="Costo ($)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Trabajos */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Detalle de Trabajos</h3>
        </div>

        <div data-id="report-work-detail-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Descripción</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Tipo</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Costo Estimado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {works.length > 0 ? works.map((work, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {work.description || work.name || 'Sin descripción'}
                  </td>
                  <td className="px-6 py-3 text-slate-600 capitalize">
                    {work.type === 'agricultural' ? 'Agrícola' : 'Ganadero'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[work.status || 'PENDING'] }}
                    >
                      {work.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    ${(work.estimated_cost || 0).toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">
                    {new Date(work.date).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No hay trabajos con estos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Período:</strong> {periodo?.start} a {periodo?.end}
        </p>
        <p className="mt-1">
          <strong>Generado:</strong> {new Date().toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  );
}
