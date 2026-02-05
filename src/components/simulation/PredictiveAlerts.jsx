/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * PredictiveAlerts.jsx - Visualización de Alertas Predictivas
 *
 * Funcionalidad:
 * - Listado de alertas predictivas activas
 * - Filtros por tipo y severidad
 * - Acciones: Reconocer, Resolver, Descartar
 * - Indicadores visuales por severidad
 * - Historial de alertas
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Filter, ChevronDown, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import usePredictiveAlerts from '../../hooks/usePredictiveAlerts';

const ALERT_TYPES = {
  RIESGO_FORRAJERO: {
    label: 'Riesgo Forrajero',
    icon: '🌾',
    description: 'Riesgo de falta de pastura'
  },
  MARGEN_NEGATIVO: {
    label: 'Margen Negativo',
    icon: '📉',
    description: 'Margen negativo proyectado'
  },
  COSTO_KG_FUERA_RANGO: {
    label: 'Costo/kg Fuera de Rango',
    icon: '💰',
    description: 'Costo por kg fuera del rango esperado'
  },
  SOBREPASTOREO: {
    label: 'Sobrepastoreo',
    icon: '🐄',
    description: 'Carga animal excesiva'
  },
  PRECIO_CRITICO: {
    label: 'Precio Crítico',
    icon: '📊',
    description: 'Precio muy bajo proyectado'
  },
  CLIMA_ADVERSO: {
    label: 'Clima Adverso',
    icon: '⛈️',
    description: 'Clima adverso proyectado'
  }
};

const SEVERITY_COLORS = {
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-800',
    text: 'text-red-700',
    icon: 'text-red-600'
  },
  HIGH: {
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-700',
    icon: 'text-orange-600'
  },
  MEDIUM: {
    bg: 'bg-yellow-50',
    border: 'border-l-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
    text: 'text-yellow-700',
    icon: 'text-yellow-600'
  },
  LOW: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-700',
    icon: 'text-blue-600'
  }
};

export default function PredictiveAlerts({ selectedFirmId, selectedPremiseId }) {
  const {
    alerts,
    loading,
    filters,
    stats,
    loadAlerts,
    acknowledgeAlert,
    dismissAlert,
    resolveAlert,
    updateFilters
  } = usePredictiveAlerts(selectedFirmId, selectedPremiseId);

  const [activeTab, setActiveTab] = useState('active');
  const [currentUser] = useState(null); // Se obtendría del contexto de usuario

  // Filtrar alertas según estado
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'ACKNOWLEDGED');

  // Funciones de acción
  const handleAcknowledge = async (alertId) => {
    // En producción, obtener userId del contexto
    const userId = 'temp-user-id';
    await acknowledgeAlert(alertId, userId);
    loadAlerts();
  };

  const handleDismiss = async (alertId) => {
    await dismissAlert(alertId);
    loadAlerts();
  };

  const handleResolve = async (alertId) => {
    await resolveAlert(alertId);
    loadAlerts();
  };

  const handleFilterChange = (filterName, filterValue) => {
    updateFilters({
      [filterName]: filterValue === filters[filterName] ? null : filterValue
    });
  };

  // Componente de alerta individual
  const AlertCard = ({ alert, onAcknowledge, onDismiss, onResolve }) => {
    const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.LOW;
    const alertType = ALERT_TYPES[alert.alert_type] || {};

    return (
      <div className={`${colors.bg} border-l-4 ${colors.border} p-4 rounded-r-lg`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className="text-2xl">{alertType.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${colors.text}`}>
                    {alert.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className={`text-sm ${colors.text} mt-1`}>
                  {alertType.label}
                </p>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-sm text-slate-700 mt-3 ml-9">
              {alert.description}
            </p>

            {/* Acción recomendada */}
            {alert.recommended_action && (
              <div className="mt-3 ml-9 p-3 bg-white rounded border border-slate-200">
                <p className="text-xs font-medium text-slate-900 mb-1">
                  💡 Acción Recomendada:
                </p>
                <p className="text-sm text-slate-700">
                  {alert.recommended_action}
                </p>
              </div>
            )}

            {/* Fecha proyectada */}
            {alert.projected_date && (
              <div className="flex items-center gap-2 mt-3 ml-9 text-xs text-slate-600">
                <Clock size={14} />
                <span>
                  Fecha proyectada: {new Date(alert.projected_date).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}

            {/* Metadata */}
            {alert.metadata && (
              <div className="mt-3 ml-9 text-xs text-slate-600 space-y-1">
                {Object.entries(alert.metadata).map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}:</strong> {JSON.stringify(value)}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            {alert.status === 'ACTIVE' ? (
              <>
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition font-medium whitespace-nowrap"
                  title="Reconocer alerta"
                >
                  ✓ Reconocer
                </button>
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition font-medium whitespace-nowrap"
                  title="Resolver alerta"
                >
                  ✓✓ Resolver
                </button>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="px-3 py-1.5 bg-slate-300 text-slate-700 text-sm rounded hover:bg-slate-400 transition font-medium whitespace-nowrap"
                  title="Descartar alerta"
                >
                  ✕ Descartar
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded">
                <CheckCircle size={16} />
                <span className="font-medium">{alert.status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          🚨 Alertas Predictivas
        </h1>
        <p className="text-slate-600 mt-1">
          Monitoreo automático de riesgos identificados en simulaciones
        </p>
      </div>

      {/* KPIs de Alertas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Críticas</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats.critical}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Altas</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {stats.high}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Medias</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.medium}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Bajas</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats.low}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Activas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {activeAlerts.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Total</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {stats.total}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap size={18} />
              Alertas Activas ({activeAlerts.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('acknowledged')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === 'acknowledged'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={18} />
              Reconocidas ({acknowledgedAlerts.length})
            </span>
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <h3 className="font-semibold text-slate-900">Filtros</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por Severidad */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                Severidad
              </label>
              <div className="flex flex-wrap gap-2">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => (
                  <button
                    key={severity}
                    onClick={() => handleFilterChange('severity', severity)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                      filters.severity === severity
                        ? `${SEVERITY_COLORS[severity].badge} ring-2 ring-offset-2 ring-slate-400`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                Tipo de Alerta
              </label>
              <select
                value={filters.alertType || ''}
                onChange={(e) => handleFilterChange('alertType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(ALERT_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido según tab */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <AlertTriangle className="text-blue-600" size={40} />
          </div>
          <p className="ml-4 text-slate-600">Cargando alertas...</p>
        </div>
      ) : activeTab === 'active' ? (
        <div className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-8 text-center">
                <CheckCircle className="text-green-600 mx-auto" size={48} />
                <p className="text-green-900 font-semibold mt-2">
                  ¡Excelente! No hay alertas activas
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Todas las simulaciones están dentro de parámetros normales
                </p>
              </CardContent>
            </Card>
          ) : (
            activeAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                onResolve={handleResolve}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {acknowledgedAlerts.length === 0 ? (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-8 text-center">
                <Clock className="text-slate-400 mx-auto" size={48} />
                <p className="text-slate-600 font-semibold mt-2">
                  Sin alertas reconocidas
                </p>
              </CardContent>
            </Card>
          ) : (
            acknowledgedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                onResolve={handleResolve}
              />
            ))
          )}
        </div>
      )}

      {/* Estadísticas por tipo */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Distribución por Tipo</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(ALERT_TYPES).map(([key, val]) => {
                const count = stats.byType[key.toLowerCase().replace(/_/g, '_')] || 0;
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <p className="font-medium text-slate-900">
                        {val.icon} {val.label}
                      </p>
                      <p className="text-xs text-slate-600">{val.description}</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
