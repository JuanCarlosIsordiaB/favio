/**
 * ByDepotView.jsx
 * Vista agrupada de insumos por depósito
 * Muestra stock, capacidad utilizada y alertas por depósito
 */

import React, { useState, useMemo } from 'react';
import {
  Warehouse,
  Package,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Edit2
} from 'lucide-react';

export default function ByDepotView({
  insumos = [],
  depots = [],
  onEditInput = () => {},
  loading = false
}) {
  const [expandedDepots, setExpandedDepots] = useState(() => {
    // Expandir primer depósito por defecto
    return depots.length > 0 ? [depots[0].id] : [];
  });

  // Agrupar insumos por depósito
  const insumosPorDeposito = useMemo(() => {
    const grouped = {};

    depots.forEach(depot => {
      grouped[depot.id] = {
        depot,
        insumos: insumos.filter(i => i.depot_id === depot.id),
        insumosSinDeposito: false
      };
    });

    // Insumos sin depósito asignado
    const sinDeposito = insumos.filter(i => !i.depot_id);
    if (sinDeposito.length > 0) {
      grouped['sin-deposito'] = {
        depot: { id: 'sin-deposito', name: 'Sin depósito asignado' },
        insumos: sinDeposito,
        insumosSinDeposito: true
      };
    }

    return grouped;
  }, [insumos, depots]);

  function toggleDepotExpand(depotId) {
    setExpandedDepots(prev =>
      prev.includes(depotId)
        ? prev.filter(id => id !== depotId)
        : [...prev, depotId]
    );
  }

  function getStockStatus(insumo) {
    const stock = insumo.current_stock || 0;
    const minAlert = insumo.min_stock_alert || 0;

    if (stock === 0) return 'sin-stock';
    if (stock < minAlert) return 'bajo';
    return 'ok';
  }

  function getStatusColor(status) {
    const colors = {
      'sin-stock': 'text-red-700 bg-red-50',
      'bajo': 'text-yellow-700 bg-yellow-50',
      'ok': 'text-green-700 bg-green-50'
    };
    return colors[status] || 'text-slate-700 bg-slate-50';
  }

  function calcularMetricasDeposito(insumosDeposito) {
    const total = insumosDeposito.length;
    const sinStock = insumosDeposito.filter(i => (i.current_stock || 0) === 0).length;
    const stockBajo = insumosDeposito.filter(i => {
      const stock = i.current_stock || 0;
      const min = i.min_stock_alert || 0;
      return stock > 0 && stock < min;
    }).length;
    const valorTotal = insumosDeposito.reduce((sum, i) => {
      return sum + ((i.current_stock || 0) * (i.cost_per_unit || 0));
    }, 0);

    return { total, sinStock, stockBajo, valorTotal };
  }

  function formatPrice(price) {
    if (!price) return '$0';
    return `$${parseFloat(price).toFixed(2)}`;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-UY', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <Warehouse className="w-8 h-8 text-slate-400" />
        </div>
      </div>
    );
  }

  const depotIds = Object.keys(insumosPorDeposito);

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-bold mb-1">Total Depósitos</p>
          <p className="text-2xl font-bold text-slate-900">{depots.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-bold mb-1">Insumos Activos</p>
          <p className="text-2xl font-bold text-emerald-600">{insumos.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-bold mb-1">Stock Bajo</p>
          <p className="text-2xl font-bold text-yellow-600">
            {insumos.filter(i => {
              const stock = i.current_stock || 0;
              const min = i.min_stock_alert || 0;
              return stock > 0 && stock < min;
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-bold mb-1">Sin Stock</p>
          <p className="text-2xl font-bold text-red-600">
            {insumos.filter(i => (i.current_stock || 0) === 0).length}
          </p>
        </div>
      </div>

      {/* Lista de Depósitos */}
      <div className="space-y-3">
        {depotIds.map(depotId => {
          const { depot, insumos: insumosDeposito } = insumosPorDeposito[depotId];
          const isExpanded = expandedDepots.includes(depotId);
          const metricas = calcularMetricasDeposito(insumosDeposito);

          return (
            <div key={depotId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Header del Depósito */}
              <button
                onClick={() => toggleDepotExpand(depotId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition border-b border-slate-200"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Warehouse className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">{depot.name}</h3>
                    <p className="text-sm text-slate-600">
                      {metricas.total} insumo{metricas.total !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Métricas rápidas */}
                  <div className="flex gap-3 text-sm">
                    {metricas.stockBajo > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-md">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700 font-semibold">{metricas.stockBajo}</span>
                      </div>
                    )}
                    {metricas.sinStock > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-md">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-red-700 font-semibold">{metricas.sinStock}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700 font-semibold">{formatPrice(metricas.valorTotal)}</span>
                    </div>
                  </div>

                  {/* Botón expand */}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Contenido expandible */}
              {isExpanded && (
                <div className="px-6 py-4 bg-slate-50 space-y-3 border-t border-slate-200">
                  {insumosDeposito.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">No hay insumos en este depósito</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {insumosDeposito.map(insumo => {
                        const status = getStockStatus(insumo);
                        const color = getStatusColor(status);

                        return (
                          <div
                            key={insumo.id}
                            className="bg-white rounded-lg p-3 flex items-center justify-between hover:bg-slate-50 transition border border-slate-200"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>
                                  {insumo.current_stock || 0} {insumo.unit}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{insumo.name}</p>
                                  <p className="text-xs text-slate-600">{insumo.category}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 ml-4">
                              {/* Información adicional */}
                              <div className="text-right text-xs">
                                {insumo.expiration_date && (
                                  <p className="text-slate-700">
                                    Vence: {formatDate(insumo.expiration_date)}
                                  </p>
                                )}
                                {insumo.cost_per_unit > 0 && (
                                  <p className="text-slate-700">
                                    Costo: {formatPrice(insumo.cost_per_unit)}
                                  </p>
                                )}
                              </div>

                              {/* Botón editar */}
                              <button
                                onClick={() => onEditInput(insumo)}
                                className="text-slate-400 hover:text-emerald-600 transition p-2"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer del depósito expandido */}
                  <div className="pt-3 border-t border-slate-200 mt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-slate-600 mb-1">Total Items</p>
                        <p className="font-bold text-slate-900">{metricas.total}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Stock OK</p>
                        <p className="font-bold text-green-600">{metricas.total - metricas.sinStock - metricas.stockBajo}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Bajo Stock</p>
                        <p className="font-bold text-yellow-600">{metricas.stockBajo}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Valor Total</p>
                        <p className="font-bold text-blue-600">{formatPrice(metricas.valorTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {depotIds.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No hay depósitos configurados</p>
          <p className="text-sm text-slate-500">Crea depósitos para organizar tu inventario</p>
        </div>
      )}
    </div>
  );
}
