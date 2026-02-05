/**
 * InventoryView.jsx
 * Vista de inventario general con tabla filtrable de insumos
 * Incluye búsqueda, filtros y acciones (editar, ver detalles)
 */

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Edit2,
  AlertCircle,
  TrendingDown,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';
import { exportarInventarioExcel } from '../../services/exportUtils';

export default function InventoryView({
  insumos = [],
  categories = [],
  depots = [],
  searchTerm = '',
  onSearchChange = () => {},
  filterCategory = '',
  onFilterCategoryChange = () => {},
  filterDepot = '',
  onFilterDepotChange = () => {},
  onEditInput = () => {},
  loading = false,
  firmName = 'Firma'
}) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  function handleExportExcel() {
    try {
      exportarInventarioExcel(sortedInsumos, firmName);
      toast.success('Inventario exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar inventario');
    }
  }

  // Filtrar insumos
  const filteredInsumos = useMemo(() => {
    return insumos.filter(insumo => {
      const matchSearch = !searchTerm ||
        insumo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (insumo.batch_number && insumo.batch_number.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = !filterCategory || insumo.category === filterCategory;
      const matchDepot = !filterDepot || insumo.depot_id === filterDepot;

      return matchSearch && matchCategory && matchDepot;
    });
  }, [insumos, searchTerm, filterCategory, filterDepot]);

  // Ordenar insumos
  const sortedInsumos = useMemo(() => {
    const sorted = [...filteredInsumos].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'stock':
          aVal = a.current_stock || 0;
          bVal = b.current_stock || 0;
          break;
        case 'expiration':
          aVal = a.expiration_date ? new Date(a.expiration_date) : new Date('2099-12-31');
          bVal = b.expiration_date ? new Date(b.expiration_date) : new Date('2099-12-31');
          break;
        case 'cost':
          aVal = a.cost_per_unit || 0;
          bVal = b.cost_per_unit || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredInsumos, sortBy, sortOrder]);

  function getStockStatus(insumo) {
    const stock = insumo.current_stock || 0;
    const minAlert = insumo.min_stock_alert || 0;

    if (stock === 0) return { status: 'sin-stock', label: 'Sin stock', color: 'text-red-700 bg-red-50' };
    if (stock < minAlert) return { status: 'bajo', label: 'Stock bajo', color: 'text-yellow-700 bg-yellow-50' };
    return { status: 'ok', label: 'OK', color: 'text-green-700 bg-green-50' };
  }

  function getExpirationStatus(insumo) {
    if (!insumo.expiration_date) return { status: 'sin-vencimiento', label: 'Sin vencimiento', color: 'text-slate-500' };

    const today = new Date();
    const expDate = new Date(insumo.expiration_date);
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { status: 'vencido', label: 'Vencido', color: 'text-red-600' };
    if (daysLeft <= 30) return { status: 'proximo', label: `${daysLeft}d para vencer`, color: 'text-yellow-600' };
    return { status: 'ok', label: `${daysLeft}d`, color: 'text-green-600' };
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-UY', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatPrice(price) {
    if (!price) return '$0';
    return `$${parseFloat(price).toFixed(2)}`;
  }

  function getDepotName(depotId) {
    const depot = depots.find(d => d.id === depotId);
    return depot ? depot.name : '-';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <Package className="w-8 h-8 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="space-y-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Buscar insumo
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o lote..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Categoría
              </label>
              <select
                value={filterCategory}
                onChange={(e) => onFilterCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Depósito
              </label>
              <select
                value={filterDepot}
                onChange={(e) => onFilterDepotChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los depósitos</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>{depot.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="name">Nombre</option>
                <option value="stock">Stock</option>
                <option value="expiration">Vencimiento</option>
                <option value="cost">Costo</option>
              </select>
            </div>
          </div>

          {/* Resultados y modo de vista */}
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{sortedInsumos.length}</span> insumo(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`px-3 py-1 text-sm border rounded-lg transition ${
                  sortOrder === 'asc'
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-100 border-slate-300'
                }`}
              >
                {sortOrder === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="px-3 py-1 text-sm border border-slate-300 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
              >
                {viewMode === 'grid' ? '📊 Tabla' : '🔲 Grid'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vista Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedInsumos.map(insumo => {
            const stockStatus = getStockStatus(insumo);
            const expStatus = getExpirationStatus(insumo);

            return (
              <div key={insumo.id} className="bg-white rounded-lg border border-slate-200 hover:border-emerald-500 transition overflow-hidden">
                {/* Header de la tarjeta */}
                <div className="p-4 border-b border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900 flex-1">{insumo.name}</h3>
                    <button
                      onClick={() => onEditInput(insumo)}
                      className="text-slate-400 hover:text-emerald-600 transition p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{insumo.category}</p>
                </div>

                {/* Body de la tarjeta */}
                <div className="p-4 space-y-3">
                  {/* Stock */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Stock</span>
                    <div className={`px-2 py-1 rounded-md text-sm font-semibold ${stockStatus.color}`}>
                      {insumo.current_stock || 0} {insumo.unit}
                    </div>
                  </div>

                  {/* Mínimo */}
                  {insumo.min_stock_alert > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Mínimo</span>
                      <span className="text-slate-700">{insumo.min_stock_alert}</span>
                    </div>
                  )}

                  {/* Costo */}
                  {insumo.cost_per_unit > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Costo unitario</span>
                      <span className="text-slate-700 font-semibold">{formatPrice(insumo.cost_per_unit)}</span>
                    </div>
                  )}

                  {/* Depósito */}
                  {insumo.depot_id && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Depósito</span>
                      <span className="text-slate-700">{getDepotName(insumo.depot_id)}</span>
                    </div>
                  )}

                  {/* Vencimiento */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Vencimiento</span>
                    <span className={`font-semibold ${expStatus.color}`}>
                      {expStatus.label}
                    </span>
                  </div>

                  {/* Información técnica si existe */}
                  {(insumo.batch_number || insumo.brand || insumo.variety) && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-600 mb-1 font-semibold">Técnica</p>
                      <div className="text-xs text-slate-700 space-y-0.5">
                        {insumo.batch_number && <p>Lote: {insumo.batch_number}</p>}
                        {insumo.brand && <p>Marca: {insumo.brand}</p>}
                        {insumo.variety && <p>Variedad: {insumo.variety}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista Tabla */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Insumo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Stock</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Costo Unit.</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Depósito</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Vencimiento</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedInsumos.map(insumo => {
                  const stockStatus = getStockStatus(insumo);
                  const expStatus = getExpirationStatus(insumo);

                  return (
                    <tr key={insumo.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{insumo.name}</p>
                          <p className="text-xs text-slate-500">{insumo.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${stockStatus.color}`}>
                          {insumo.current_stock || 0} {insumo.unit}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {insumo.cost_per_unit ? formatPrice(insumo.cost_per_unit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {getDepotName(insumo.depot_id)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${expStatus.color}`}>
                          {expStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onEditInput(insumo)}
                          className="text-emerald-600 hover:text-emerald-700 transition p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedInsumos.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No hay insumos que mostrar</p>
          <p className="text-sm text-slate-500">Ajusta los filtros o crea un nuevo insumo</p>
        </div>
      )}
    </div>
  );
}
