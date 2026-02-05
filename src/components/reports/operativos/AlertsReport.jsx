import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

const PRIORITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626'
};

/**
 * AlertsReport
 * Reporte de alertas y recordatorios con priorización
 */

export default function AlertsReport({ premiseId, periodo }) {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, resolved

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo, filterStatus]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener alertas del período
      const { data: allAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('created_at', periodo.start)
        .lte('created_at', periodo.end);

      // Contar por prioridad
      const byPriority = {};
      let totalAlerts = 0;
      let pendingAlerts = 0;
      let resolvedAlerts = 0;
      let criticalCount = 0;

      (allAlerts || []).forEach(alert => {
        const priority = alert.priority || 'MEDIUM';
        if (!byPriority[priority]) {
          byPriority[priority] = { priority, count: 0, isResolved: 0, isPending: 0 };
        }
        byPriority[priority].count++;

        const isResolved = alert.resolved_at ? true : false;
        if (isResolved) {
          byPriority[priority].isResolved++;
          resolvedAlerts++;
        } else {
          byPriority[priority].isPending++;
          pendingAlerts++;
        }

        totalAlerts++;

        if (priority === 'CRITICAL' && !isResolved) {
          criticalCount++;
        }
      });

      // Contar por tipo/categoría
      const byCategory = {};
      (allAlerts || []).forEach(alert => {
        const category = alert.category || 'General';
        if (!byCategory[category]) {
          byCategory[category] = { category, count: 0 };
        }
        byCategory[category].count++;
      });

      // Filtrar
      let filtered = allAlerts || [];
      if (filterStatus === 'pending') {
        filtered = filtered.filter(a => !a.resolved_at);
      } else if (filterStatus === 'resolved') {
        filtered = filtered.filter(a => a.resolved_at);
      }

      // Ordenar por prioridad y fecha
      filtered.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const aPriority = priorityOrder[a.priority || 'MEDIUM'] || 999;
        const bPriority = priorityOrder[b.priority || 'MEDIUM'] || 999;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setData({
        totalAlerts,
        pendingAlerts,
        resolvedAlerts,
        criticalCount,
        byPriority: Object.values(byPriority),
        byCategory: Object.values(byCategory)
      });

      setAlerts(filtered);
    } catch (err) {
      console.error('Error loading alerts data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando alertas...</p>
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
        <p className="text-sm text-yellow-800">No hay alertas disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-alerts-title" className="text-2xl font-bold text-slate-800 mb-2">
          Reporte de Alertas
        </h2>
        <p className="text-slate-600">Monitoreo de alertas y recordatorios con priorización</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Total Alertas</p>
          <p data-id="report-alerts-total" className="text-2xl font-bold text-blue-900">
            {data.totalAlerts}
          </p>
          <p className="text-xs text-blue-600 mt-1">en el período</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-600 mb-1">Pendientes</p>
          <p data-id="report-alerts-pending" className="text-2xl font-bold text-yellow-900">
            {data.pendingAlerts}
          </p>
          <p className="text-xs text-yellow-600 mt-1">por resolver</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Resueltas</p>
          <p data-id="report-alerts-resolved" className="text-2xl font-bold text-green-900">
            {data.resolvedAlerts}
          </p>
          <p className="text-xs text-green-600 mt-1">completadas</p>
        </div>

        <div className={`rounded-lg p-4 ${data.criticalCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
          <p className={`text-sm font-medium mb-1 ${data.criticalCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
            Críticas Pendientes
          </p>
          <p className={`text-2xl font-bold ${data.criticalCount > 0 ? 'text-red-900' : 'text-slate-900'}`}>
            {data.criticalCount}
          </p>
          <p className={`text-xs mt-1 ${data.criticalCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
            requieren atención
          </p>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filtrar por estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            data-id="report-alerts-filter"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltas</option>
          </select>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        {/* Por Prioridad */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Distribución por Prioridad</h3>
          </div>

          <div data-id="report-alerts-priority-chart" className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority, count }) => `${priority}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.byPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por Categoría */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Alertas por Categoría</h3>
          </div>

          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="category"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Cantidad" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Alertas */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Listado de Alertas</h3>
        </div>

        <div data-id="report-alerts-detail-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Descripción</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Prioridad</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {alerts.length > 0 ? alerts.map((alert, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {alert.description || alert.message || 'Sin descripción'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: PRIORITY_COLORS[alert.priority] || PRIORITY_COLORS.MEDIUM }}
                    >
                      {alert.priority || 'MEDIUM'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {alert.category || 'General'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {alert.resolved_at ? (
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-xs">Resuelta</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-yellow-600">
                        <Clock size={16} />
                        <span className="text-xs">Pendiente</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">
                    {new Date(alert.created_at).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No hay alertas con estos filtros
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
