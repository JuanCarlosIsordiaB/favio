import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calcularProduccionCarne } from '../../../services/produccionCarneService';

export default function ProduccionCarneReport({ premiseId, periodo, onClose }) {
  const [produccion, setProduccion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const datos = await calcularProduccionCarne(premiseId, {
        start: periodo?.start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: periodo?.end || new Date().toISOString().split('T')[0]
      });

      setProduccion(datos);
    } catch (err) {
      console.error('Error calculating produccion:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Calculando producción de carne...</p>
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

  if (!produccion) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos de producción disponibles</p>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = [
    {
      nombre: 'Inv. Inicial',
      kg: Math.abs(produccion.inventario_inicial.total_kg),
      tipo: 'inicial'
    },
    {
      nombre: 'Inv. Final',
      kg: Math.abs(produccion.inventario_final.total_kg),
      tipo: 'final'
    },
    {
      nombre: 'Ventas',
      kg: Math.abs(produccion.ventas.total_kg),
      tipo: 'venta'
    },
    {
      nombre: 'Compras',
      kg: Math.abs(produccion.compras.total_kg),
      tipo: 'compra'
    },
    {
      nombre: 'Traspasos Netos',
      kg: Math.abs(produccion.traspasos.neto_kg),
      tipo: 'traspaso'
    }
  ];

  const isPositivo = produccion.produccion_kg >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-produccion-title" className="text-2xl font-bold text-slate-800 mb-2">
          Producción de Carne
        </h2>
        <p className="text-slate-600">Análisis de producción según fórmula contable obligatoria</p>
      </div>

      {/* Formula Visualization */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Fórmula de Cálculo</h3>
        </div>

        <div data-id="report-produccion-formula" className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 font-mono text-center">
              <span className="font-bold">Producción (kg) = </span>
              <br className="md:hidden" />
              Inv.Final − Inv.Inicial + Ventas − Compras ± Traspasos
            </p>
          </div>

          {/* Step-by-step calculation */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Inventario Final:</span>
              <span className="font-semibold text-slate-900">
                +{produccion.inventario_final.total_kg.toLocaleString('es-AR')} kg
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Inventario Inicial:</span>
              <span className="font-semibold text-slate-900">
                −{produccion.inventario_inicial.total_kg.toLocaleString('es-AR')} kg
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Ventas (Salidas):</span>
              <span className="font-semibold text-slate-900">
                +{produccion.ventas.total_kg.toLocaleString('es-AR')} kg
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Compras (Entradas):</span>
              <span className="font-semibold text-slate-900">
                −{produccion.compras.total_kg.toLocaleString('es-AR')} kg
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Traspasos Netos:</span>
              <span className="font-semibold text-slate-900">
                {produccion.traspasos.neto_kg >= 0 ? '+' : ''}
                {produccion.traspasos.neto_kg.toLocaleString('es-AR')} kg
              </span>
            </div>

            <div className="border-t border-slate-300 pt-2 mt-2 flex items-center justify-between">
              <span className="text-slate-700 font-bold">Resultado:</span>
              <span
                className={`text-lg font-bold ${isPositivo ? 'text-green-700' : 'text-red-700'}`}
              >
                {isPositivo ? '+' : ''}
                {produccion.produccion_kg_redondeado.toLocaleString('es-AR')} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Result KPI */}
      <div
        className={`border rounded-lg p-6 ${
          isPositivo
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <p className="text-sm font-medium text-slate-600 mb-2">Producción Total de Carne</p>
        <p
          data-id="report-produccion-result-kg"
          className={`text-4xl font-bold mb-2 ${
            isPositivo ? 'text-green-900' : 'text-red-900'
          }`}
        >
          {produccion.produccion_kg_redondeado.toLocaleString('es-AR')} kg
        </p>
        <p
          className={`text-sm ${
            isPositivo ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {isPositivo
            ? '✓ Producción positiva en el período'
            : '⚠️ Pérdida de carne en el período'}
        </p>
      </div>

      {/* Detailed table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Detalle de Componentes</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Componente</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Valor (kg)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Operación</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Aporte (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50 bg-blue-50">
                <td className="px-6 py-3 font-semibold text-slate-900">Inventario Inicial</td>
                <td data-id="report-produccion-inventory-initial" className="px-6 py-3 text-right text-slate-600">
                  {produccion.inventario_inicial.total_kg.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-slate-600">−</td>
                <td className="px-6 py-3 text-right font-semibold text-slate-900">
                  −{produccion.inventario_inicial.total_kg.toLocaleString('es-AR')}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-blue-50">
                <td className="px-6 py-3 font-semibold text-slate-900">Inventario Final</td>
                <td data-id="report-produccion-inventory-final" className="px-6 py-3 text-right text-slate-600">
                  {produccion.inventario_final.total_kg.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-slate-600">+</td>
                <td className="px-6 py-3 text-right font-semibold text-green-700">
                  +{produccion.inventario_final.total_kg.toLocaleString('es-AR')}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-green-50">
                <td className="px-6 py-3 font-semibold text-slate-900">Ventas de Carne</td>
                <td className="px-6 py-3 text-right text-slate-600">
                  {produccion.ventas.total_kg.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-slate-600">+</td>
                <td className="px-6 py-3 text-right font-semibold text-green-700">
                  +{produccion.ventas.total_kg.toLocaleString('es-AR')}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-red-50">
                <td className="px-6 py-3 font-semibold text-slate-900">Compras de Animales</td>
                <td className="px-6 py-3 text-right text-slate-600">
                  {produccion.compras.total_kg.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-slate-600">−</td>
                <td className="px-6 py-3 text-right font-semibold text-red-700">
                  −{produccion.compras.total_kg.toLocaleString('es-AR')}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-purple-50">
                <td className="px-6 py-3 font-semibold text-slate-900">Traspasos Netos</td>
                <td className="px-6 py-3 text-right text-slate-600">
                  {Math.abs(produccion.traspasos.neto_kg).toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-slate-600">
                  {produccion.traspasos.neto_kg >= 0 ? '+' : '−'}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-purple-700">
                  {produccion.traspasos.neto_kg >= 0 ? '+' : '−'}
                  {Math.abs(produccion.traspasos.neto_kg).toLocaleString('es-AR')}
                </td>
              </tr>

              <tr className={isPositivo ? 'bg-green-100' : 'bg-red-100'}>
                <td colSpan="3" className="px-6 py-3 font-bold text-slate-900">
                  PRODUCCIÓN TOTAL
                </td>
                <td className={`px-6 py-3 text-right font-bold text-lg ${
                  isPositivo ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isPositivo ? '+' : ''}
                  {produccion.produccion_kg_redondeado.toLocaleString('es-AR')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison chart */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Comparación de Componentes</h3>
        </div>

        <div data-id="report-produccion-chart" className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="nombre"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                label={{ value: 'kg', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? value.toLocaleString('es-AR')
                    : value
                }
              />
              <Legend />
              <Bar
                dataKey="kg"
                fill="#3b82f6"
                name="Valor (kg)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Period info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Período:</strong> {periodo?.start} a {periodo?.end}
        </p>
        <p className="mt-1">
          <strong>Calculado:</strong> {new Date(produccion.calculado_en).toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  );
}
