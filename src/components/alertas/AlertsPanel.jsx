/**
 * AlertsPanel.jsx
 * Sistema de alertas de stock y vencimiento
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  X,
  CheckCircle2,
  Trash2,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Badge de Alertas (para TabBar)
 */
export function AlertBadge({ count = 0, className = '' }) {
  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full ml-2 ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

/**
 * Tarjeta de Alerta Individual
 */
function AlertCard({ alert, onResolve, onDelete }) {
  const getAlertIcon = (tipo) => {
    switch (tipo) {
      case 'vencimiento_proximo':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'vencimiento_vencido':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'stock_minimo':
        return <TrendingDown className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'vencimiento_proximo':
        return 'border-orange-200 bg-orange-50';
      case 'vencimiento_vencido':
        return 'border-red-200 bg-red-50';
      case 'stock_minimo':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getAlertTitle = (tipo) => {
    switch (tipo) {
      case 'vencimiento_proximo':
        return 'Próximo a Vencer';
      case 'vencimiento_vencido':
        return 'Vencido';
      case 'stock_minimo':
        return 'Stock Bajo';
      default:
        return 'Alerta';
    }
  };

  const getDaysText = () => {
    if (!alert.metadata?.dias_restantes) return '';
    const dias = alert.metadata.dias_restantes;
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    return `Vence en ${dias} días`;
  };

  return (
    <div className={`border rounded-lg p-4 ${getAlertColor(alert.tipo)}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{getAlertIcon(alert.tipo)}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm">
            {getAlertTitle(alert.tipo)}
          </h4>
          <p className="text-sm text-slate-700 mt-1">{alert.descripcion}</p>
          {getDaysText() && (
            <p className="text-xs text-slate-600 mt-2">{getDaysText()}</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            {new Date(alert.fecha_creacion).toLocaleDateString('es-UY')}
          </p>
        </div>
        <div className="flex gap-2 ml-2">
          <button
            onClick={() => onResolve(alert.id)}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
            title="Marcar como resuelta"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(alert.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel principal de Alertas
 */
export function AlertsPanel({
  alerts = [],
  insumos = [],
  onResolveAlert = () => {},
  onDeleteAlert = () => {},
  loading = false
}) {
  const [expandedTypes, setExpandedTypes] = useState({
    vencimiento_vencido: true,
    vencimiento_proximo: true,
    stock_minimo: true
  });

  // Agrupar alertas por tipo
  const groupedAlerts = useMemo(() => {
    return {
      vencimiento_vencido: alerts.filter(a => a.tipo === 'vencimiento_vencido'),
      vencimiento_proximo: alerts.filter(a => a.tipo === 'vencimiento_proximo'),
      stock_minimo: alerts.filter(a => a.tipo === 'stock_minimo')
    };
  }, [alerts]);

  function toggleExpand(tipo) {
    setExpandedTypes(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  }

  function handleResolveAlert(alertId) {
    onResolveAlert(alertId);
    toast.success('Alerta marcada como resuelta');
  }

  function handleDeleteAlert(alertId) {
    onDeleteAlert(alertId);
    toast.success('Alerta eliminada');
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin">
          <Bell className="w-8 h-8 text-slate-400" />
        </div>
      </div>
    );
  }

  const totalAlerts = alerts.length;

  return (
    <div className="space-y-4">
      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-semibold text-red-900">Vencidos</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {groupedAlerts.vencimiento_vencido.length}
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-semibold text-orange-900">Próximos a Vencer</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {groupedAlerts.vencimiento_proximo.length}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-semibold text-yellow-900">Stock Bajo</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {groupedAlerts.stock_minimo.length}
          </p>
        </div>
      </div>

      {/* Secciones de Alertas */}
      {totalAlerts === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No hay alertas activas</p>
          <p className="text-sm text-slate-500">¡Tu inventario está en perfecto estado!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Alertas de Vencimiento Vencido */}
          {groupedAlerts.vencimiento_vencido.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200">
              <button
                onClick={() => toggleExpand('vencimiento_vencido')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 transition"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Productos Vencidos
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                    {groupedAlerts.vencimiento_vencido.length}
                  </span>
                </div>
                {expandedTypes.vencimiento_vencido ? (
                  <ChevronUp className="w-5 h-5 text-red-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-red-600" />
                )}
              </button>
              {expandedTypes.vencimiento_vencido && (
                <div className="border-t border-red-200 p-4 space-y-3">
                  {groupedAlerts.vencimiento_vencido.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onResolve={handleResolveAlert}
                      onDelete={handleDeleteAlert}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alertas de Vencimiento Próximo */}
          {groupedAlerts.vencimiento_proximo.length > 0 && (
            <div className="bg-white rounded-lg border border-orange-200">
              <button
                onClick={() => toggleExpand('vencimiento_proximo')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">
                    Próximos a Vencer
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-orange-600 rounded-full">
                    {groupedAlerts.vencimiento_proximo.length}
                  </span>
                </div>
                {expandedTypes.vencimiento_proximo ? (
                  <ChevronUp className="w-5 h-5 text-orange-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-600" />
                )}
              </button>
              {expandedTypes.vencimiento_proximo && (
                <div className="border-t border-orange-200 p-4 space-y-3">
                  {groupedAlerts.vencimiento_proximo.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onResolve={handleResolveAlert}
                      onDelete={handleDeleteAlert}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alertas de Stock Mínimo */}
          {groupedAlerts.stock_minimo.length > 0 && (
            <div className="bg-white rounded-lg border border-yellow-200">
              <button
                onClick={() => toggleExpand('stock_minimo')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-50 transition"
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">
                    Stock Bajo
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-yellow-600 rounded-full">
                    {groupedAlerts.stock_minimo.length}
                  </span>
                </div>
                {expandedTypes.stock_minimo ? (
                  <ChevronUp className="w-5 h-5 text-yellow-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-yellow-600" />
                )}
              </button>
              {expandedTypes.stock_minimo && (
                <div className="border-t border-yellow-200 p-4 space-y-3">
                  {groupedAlerts.stock_minimo.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onResolve={handleResolveAlert}
                      onDelete={handleDeleteAlert}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal Flotante de Alertas (para mostrar en tab)
 */
export function AlertsOverlay({ alerts = [], isOpen = false, onClose = () => {} }) {
  if (!isOpen) return null;

  const criticalCount = alerts.filter(a => a.tipo === 'vencimiento_vencido').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Alertas del Sistema</h2>
            <p className="text-sm text-slate-600 mt-1">
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AlertsPanel alerts={alerts} loading={false} />
        </div>
      </div>
    </div>
  );
}
