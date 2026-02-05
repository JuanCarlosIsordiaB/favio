import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

/**
 * InventoryReport
 * Reporte de inventario/stock con movimientos y valorización
 */

export default function InventoryReport({ premiseId, periodo }) {
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo, filterCategory]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener insumos del predio
      const { data: inputs } = await supabase
        .from('inputs')
        .select('*')
        .eq('premise_id', premiseId);

      // Obtener movimientos del período
      const { data: movements } = await supabase
        .from('input_movements')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end);

      // Calcular stock actual y valor
      let totalValue = 0;
      let totalItems = 0;
      const itemsArray = (inputs || []).map(input => {
        const movs = (movements || []).filter(m => m.input_id === input.id);
        const entries = movs.filter(m => m.type === 'entry').reduce((sum, m) => sum + (m.quantity || 0), 0);
        const exits = movs.filter(m => m.type === 'exit').reduce((sum, m) => sum + (m.quantity || 0), 0);
        const currentStock = (input.initial_stock || 0) + entries - exits;
        const value = currentStock * (input.unit_price || 0);

        totalValue += value;
        totalItems += currentStock;

        return {
          id: input.id,
          name: input.name,
          category: input.category,
          unit: input.unit,
          initialStock: input.initial_stock || 0,
          entries,
          exits,
          currentStock,
          unitPrice: input.unit_price || 0,
          value,
          movements: movs.length
        };
      });

      // Filtrar por categoría
      const filtered = filterCategory === 'all'
        ? itemsArray
        : itemsArray.filter(item => item.category === filterCategory);

      // Obtener categorías únicas
      const categories = [...new Set((inputs || []).map(i => i.category))];

      setData({
        totalValue,
        totalItems,
        itemCount: itemsArray.length,
        categories,
        totalMovements: movements?.length || 0
      });

      setItems(filtered);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando datos de inventario...</p>
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
        <p className="text-sm text-yellow-800">No hay datos de inventario disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-inventory-title" className="text-2xl font-bold text-slate-800 mb-2">
          Reporte de Inventario
        </h2>
        <p className="text-slate-600">Estado de insumos y stock valorizado</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Stock Total</p>
          <p data-id="report-inventory-total-items" className="text-2xl font-bold text-blue-900">
            {data.totalItems.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-blue-600 mt-1">unidades</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Valor Total Inventario</p>
          <p data-id="report-inventory-total-value" className="text-2xl font-bold text-green-900">
            ${data.totalValue.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-green-600 mt-1">valorizado</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Líneas de Producto</p>
          <p data-id="report-inventory-item-count" className="text-2xl font-bold text-purple-900">
            {data.itemCount}
          </p>
          <p className="text-xs text-purple-600 mt-1">tipos de insumos</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-600 mb-1">Movimientos</p>
          <p className="text-2xl font-bold text-orange-900">
            {data.totalMovements}
          </p>
          <p className="text-xs text-orange-600 mt-1">en el período</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filtrar por categoría:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            data-id="report-inventory-filter"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las categorías</option>
            {data.categories.map(cat => (
              <option key={cat} value={cat}>
                {cat || 'Sin categoría'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Detalle de Insumos</h3>
        </div>

        <div data-id="report-inventory-detail-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Producto</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Stock Inicial</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Entradas</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Salidas</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Stock Actual</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Precio Unitario</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Valor Total ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length > 0 ? items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {item.initialStock.toLocaleString('es-AR')} {item.unit}
                  </td>
                  <td className="px-6 py-3 text-right text-green-600 font-medium">
                    +{item.entries.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600 font-medium">
                    -{item.exits.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    {item.currentStock.toLocaleString('es-AR')} {item.unit}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    ${item.unitPrice.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    ${item.value.toLocaleString('es-AR')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No hay insumos en esta categoría
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico Top 5 Productos por Valor */}
      {items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Top 5 Productos por Valor</h3>
          </div>

          <div data-id="report-inventory-top5-chart" className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={items.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                />
                <Bar dataKey="value" fill="#3b82f6" name="Valor ($)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
