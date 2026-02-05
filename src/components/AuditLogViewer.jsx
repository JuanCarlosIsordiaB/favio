/**
 * AuditLogViewer.jsx
 *
 * Visor de logs de auditoría con filtros, búsqueda, paginación y estadísticas
 */

import React, { useState, useEffect } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  User,
  FileText,
  Filter,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const MODULE_COLORS = {
  'firmas': 'bg-blue-100 text-blue-800',
  'predios': 'bg-green-100 text-green-800',
  'insumos': 'bg-orange-100 text-orange-800',
  'trabajos': 'bg-purple-100 text-purple-800',
  'finanzas': 'bg-yellow-100 text-yellow-800',
  'usuarios': 'bg-red-100 text-red-800',
  'ganaderia': 'bg-indigo-100 text-indigo-800'
};

const EVENT_COLORS = {
  'creado': 'bg-green-100 text-green-800',
  'actualizado': 'bg-blue-100 text-blue-800',
  'eliminado': 'bg-red-100 text-red-800',
  'accedido': 'bg-gray-100 text-gray-800'
};

export default function AuditLogViewer({ firmId, firmName }) {
  const { logs, total, loading, error, loadLogs, loadEventTypes, loadModules, loadUsers, exportToCSV, getStatistics } =
    useAuditLogs();

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    tipo: '',
    modulo: '',
    usuario: '',
    limit: 50,
    offset: 0
  });

  const [eventTypes, setEventTypes] = useState([]);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);

  // Cargar filtros al montar
  useEffect(() => {
    if (firmId) {
      loadEventTypes(firmId).then(setEventTypes);
      loadModules(firmId).then(setModules);
      loadUsers(firmId).then(setUsers);
    }
  }, [firmId, loadEventTypes, loadModules, loadUsers]);

  // Cargar logs cuando cambian los filtros
  useEffect(() => {
    if (firmId) {
      loadLogs({ firmId, ...filters });
    }
  }, [firmId, filters, loadLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handleLoadStatistics = async () => {
    if (firmId) {
      const statsData = await getStatistics(
        firmId,
        filters.startDate || undefined,
        filters.endDate || undefined
      );
      if (statsData) {
        setStats(statsData);
        setShowStats(true);
      } else {
        toast.error('Error al cargar estadísticas');
      }
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.warning('No hay registros para exportar');
      return;
    }

    try {
      exportToCSV();
      toast.success(`${logs.length} registros exportados a CSV`);
    } catch (err) {
      toast.error('Error al exportar CSV');
      console.error(err);
    }
  };

  const getModuleBadgeColor = (modulo) => {
    return MODULE_COLORS[modulo] || 'bg-slate-100 text-slate-800';
  };

  const getEventBadgeColor = (tipo) => {
    return EVENT_COLORS[tipo] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Registro de Auditoría</h3>
        <p className="text-sm text-slate-600 mt-1">
          Historial completo de cambios y operaciones del sistema
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-600" />
          <h4 className="font-semibold text-slate-900">Filtros</h4>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Fecha desde */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Fecha desde
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Fecha hasta
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Tipo de evento */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Evento
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Módulo */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Módulo
            </label>
            <select
              value={filters.modulo}
              onChange={(e) => handleFilterChange('modulo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos</option>
              {modules.map(mod => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>

          {/* Usuario */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Usuario
            </label>
            <select
              value={filters.usuario}
              onChange={(e) => handleFilterChange('usuario', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos</option>
              {users.map(user => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Registros por página */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase block mb-2">
              Por página
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={handleLoadStatistics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <BarChart3 size={16} />
            Estadísticas
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Estadísticas (expandible) */}
      {showStats && stats && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-slate-900">Estadísticas</h4>

          <div className="grid grid-cols-4 gap-4">
            {/* Total eventos */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-600 uppercase font-semibold">Total de eventos</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalEvents}</p>
            </div>

            {/* Tipos únicos */}
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-green-600 uppercase font-semibold">Tipos de eventos</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {Object.keys(stats.eventsByType).length}
              </p>
            </div>

            {/* Módulos únicos */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-purple-600 uppercase font-semibold">Módulos afectados</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {Object.keys(stats.eventsByModule).length}
              </p>
            </div>

            {/* Usuarios únicos */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-orange-600 uppercase font-semibold">Usuarios activos</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {Object.keys(stats.eventsByUser).length}
              </p>
            </div>
          </div>

          {/* Top usuarios */}
          {stats.topUsers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 mb-3">Top 5 Usuarios más activos</p>
              <div className="space-y-2">
                {stats.topUsers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">{item.user}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / stats.totalEvents) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-12">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información de resultados */}
      {!loading && (
        <div className="text-sm text-slate-600">
          Mostrando <strong>{logs.length}</strong> de <strong>{total}</strong> registros
        </div>
      )}

      {/* Tabla de logs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay registros que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Evento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Módulo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {format(new Date(log.fecha || log.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getEventBadgeColor(log.tipo)}`}>
                        {log.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getModuleBadgeColor(log.modulo_origen)}`}>
                        {log.modulo_origen}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-900">{log.usuario || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">
                      {log.descripcion || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {total > filters.limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Página <strong>{Math.floor(filters.offset / filters.limit) + 1}</strong> de{' '}
            <strong>{Math.ceil(total / filters.limit)}</strong>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setFilters(prev => ({
                  ...prev,
                  offset: Math.max(0, prev.offset - prev.limit)
                }))
              }
              disabled={filters.offset === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg text-sm font-medium transition"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            <button
              onClick={() =>
                setFilters(prev => ({
                  ...prev,
                  offset: prev.offset + prev.limit
                }))
              }
              disabled={filters.offset + filters.limit >= total}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg text-sm font-medium transition"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
