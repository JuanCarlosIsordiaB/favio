/**
 * MovementsView.jsx
 * Vista de historial de movimientos con filtros de fecha y kardex
 */

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  History,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRightLeft,
  Package,
  Download
} from 'lucide-react';
import { exportarKardexExcel } from '../../services/exportUtils';

export default function MovementsView({
  movimientos = [],
  insumos = [],
  depots = [],
  dateRange = { from: '', to: '' },
  onDateRangeChange = () => {},
  loading = false,
  firmName = 'Firma'
}) {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedInsumo, setSelectedInsumo] = useState('all');
  const [filterDocument, setFilterDocument] = useState('');

  function handleExportKardex() {
    try {
      // Crear mapa de insumos
      const insumoMap = {};
      insumos.forEach(i => { insumoMap[i.id] = i; });

      exportarKardexExcel(kardex, insumoMap, firmName);
      toast.success('Kardex exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar kardex');
    }
  }

  // Filtrar movimientos por fecha, tipo, insumo y documento
  const filteredMovimientos = useMemo(() => {
    return movimientos.filter(mov => {
      const matchType = selectedType === 'all' || mov.type === selectedType;
      const matchInsumo = selectedInsumo === 'all' || mov.input_id === selectedInsumo;

      // Filtro por documento
      const matchDocument = !filterDocument ||
        (mov.document_reference && mov.document_reference.toLowerCase().includes(filterDocument.toLowerCase()));

      let matchDate = true;
      if (dateRange.from || dateRange.to) {
        // Normalizar fecha del movimiento (solo año-mes-día)
        const movDate = new Date(mov.date);
        const movDateOnly = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate());

        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          matchDate = matchDate && movDateOnly >= fromDate;
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setDate(toDate.getDate() + 1); // Incluir todo el día "hasta"
          matchDate = matchDate && movDateOnly < toDate;
        }
      }

      return matchType && matchInsumo && matchDocument && matchDate;
    });
  }, [movimientos, selectedType, selectedInsumo, filterDocument, dateRange]);

  // Ordenar movimientos por fecha descendente
  const sortedMovimientos = useMemo(() => {
    return [...filteredMovimientos].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  }, [filteredMovimientos]);

  // Calcular kardex (saldos acumulados POR INSUMO)
  const kardex = useMemo(() => {
    const result = [];
    const balancesByInsumo = new Map(); // Mantener balance separado por insumo

    // Ordenar ascendentemente para kardex (de viejo a nuevo)
    const sorted = [...sortedMovimientos].reverse();

    sorted.forEach(mov => {
      let change = 0;
      switch (mov.type) {
        case 'entry':
          change = mov.quantity;
          break;
        case 'exit':
          change = -mov.quantity;
          break;
        case 'adjustment':
          change = mov.quantity; // Puede ser positivo o negativo
          break;
        case 'transfer':
          // TRANSFER es una salida en el origen (negativo), ENTRY es la llegada en destino (positivo)
          change = -mov.quantity; // Transfer siempre es negativo (sale del stock)
          break;
        default:
          change = 0;
      }

      // Inicializar balance del insumo si no existe
      if (!balancesByInsumo.has(mov.input_id)) {
        balancesByInsumo.set(mov.input_id, 0);
      }

      // Actualizar balance del INSUMO específico
      const currentBalance = balancesByInsumo.get(mov.input_id);
      const newBalance = currentBalance + change;
      balancesByInsumo.set(mov.input_id, newBalance);

      result.push({
        ...mov,
        change,
        balance: newBalance // Balance ESPECÍFICO del insumo, no global
      });
    });

    return result;
  }, [sortedMovimientos]);

  function getMovementIcon(type) {
    const icons = {
      entry: { icon: TrendingUp, color: 'text-green-600', label: 'Ingreso' },
      exit: { icon: TrendingDown, color: 'text-red-600', label: 'Egreso' },
      adjustment: { icon: AlertTriangle, color: 'text-blue-600', label: 'Ajuste' },
      transfer: { icon: ArrowRightLeft, color: 'text-purple-600', label: 'Transferencia' }
    };
    return icons[type] || icons.adjustment;
  }

  function getMovementBgColor(type) {
    const colors = {
      entry: 'bg-green-50',
      exit: 'bg-red-50',
      adjustment: 'bg-blue-50',
      transfer: 'bg-purple-50'
    };
    return colors[type] || 'bg-slate-50';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-UY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getInsumoName(insumoId) {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.name : 'Insumo desconocido';
  }

  function getInsumoUnit(insumoId) {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.unit : '';
  }

  function getDepotName(depotId) {
    if (!depotId) return '-';
    const depot = depots.find(d => d.id === depotId);
    return depot ? depot.name : '-';
  }

  function formatQuantity(quantity) {
    return Math.abs(parseFloat(quantity)).toFixed(2);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <History className="w-8 h-8 text-slate-400" />
        </div>
      </div>
    );
  }

  const tiposMovimiento = [
    { valor: 'all', etiqueta: 'Todos' },
    { valor: 'entry', etiqueta: 'Ingresos' },
    { valor: 'exit', etiqueta: 'Egresos' },
    { valor: 'adjustment', etiqueta: 'Ajustes' },
    { valor: 'transfer', etiqueta: 'Transferencias' }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="space-y-4">
          {/* Rango de fechas */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Rango de fechas
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-600 block mb-1">Desde</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Tipo de movimiento
            </label>
            <div className="flex flex-wrap gap-2">
              {tiposMovimiento.map(tipo => (
                <button
                  key={tipo.valor}
                  onClick={() => setSelectedType(tipo.valor)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedType === tipo.valor
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tipo.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Insumo específico */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Insumo
            </label>
            <select
              value={selectedInsumo}
              onChange={(e) => setSelectedInsumo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los insumos</option>
              {insumos.map(insumo => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.name}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda por documento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Buscar por documento
            </label>
            <input
              type="text"
              placeholder="Ej: FAC-001, REM-456..."
              value={filterDocument}
              onChange={(e) => setFilterDocument(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Información de resultados */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Mostrando <span className="font-semibold">{sortedMovimientos.length}</span> movimiento(s)
            </p>
            <button
              onClick={handleExportKardex}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar Kardex
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Insumo</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Cantidad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Referencia</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Depósito/Destino</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {kardex.map((mov, idx) => {
                const info = getMovementIcon(mov.type);
                const Icon = info.icon;
                const unit = getInsumoUnit(mov.input_id);

                return (
                  <tr key={`${mov.id}-${idx}`} className={`border-b border-slate-200 hover:bg-slate-50 transition ${getMovementBgColor(mov.type)}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {formatDate(mov.date)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatTime(mov.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${info.color}`} />
                        <span className={`text-sm font-medium ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {getInsumoName(mov.input_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`inline-block px-2 py-1 rounded-md text-sm font-semibold ${
                        mov.change >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                      }`}>
                        {mov.change >= 0 ? '+' : ''}{formatQuantity(mov.change)} {unit}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 max-w-xs truncate">
                        {mov.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {mov.document_reference ? (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          📄 {mov.document_reference}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">
                        {mov.created_by || <span className="text-slate-400 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">
                        {mov.type === 'transfer' ? (
                          <div>
                            <p className="font-medium">Origen: {getDepotName(mov.depot_id)}</p>
                            <p className="text-xs">Destino: {getDepotName(mov.destination_depot_id)}</p>
                          </div>
                        ) : (
                          getDepotName(mov.depot_id)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatQuantity(mov.balance)} {unit}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen por tipo */}
      {sortedMovimientos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(() => {
            const summary = {
              entry: sortedMovimientos.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.quantity, 0),
              exit: sortedMovimientos.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.quantity, 0),
              adjustment: sortedMovimientos.filter(m => m.type === 'adjustment').reduce((sum, m) => sum + m.quantity, 0),
              transfer: sortedMovimientos.filter(m => m.type === 'transfer').length
            };

            return (
              <>
                <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">Ingresos</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{summary.entry.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">Egresos</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">-{summary.exit.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Ajustes</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{summary.adjustment >= 0 ? '+' : ''}{summary.adjustment.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-900">Transferencias</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{summary.transfer}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Empty State */}
      {sortedMovimientos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No hay movimientos registrados</p>
          <p className="text-sm text-slate-500">Ajusta los filtros o registra un nuevo movimiento</p>
        </div>
      )}
    </div>
  );
}
