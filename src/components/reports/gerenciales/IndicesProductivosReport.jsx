import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

/**
 * IndicesProductivosReport
 * Reporte de KPIs productivos obligatorios
 * - Producción de carne (kg)
 * - Producción por hectárea (kg/ha)
 * - Costo del kg producido ($/kg)
 */

export default function IndicesProductivosReport({ premiseId, periodo, onClose }) {
  const [indices, setIndices] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [comparacion, setComparacion] = useState(null);
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

      // Obtener datos del período actual
      const indicesData = await calcularIndicesProductivos(premiseId, periodo);
      setIndices(indicesData);

      // Obtener histórico de 12 últimos meses
      const historicData = await obtenerHistoricoIndices(premiseId);
      setHistorico(historicData);

      // Comparar con períodos anteriores
      const compData = await compararConPeriodosAnteriores(premiseId, periodo);
      setComparacion(compData);
    } catch (err) {
      console.error('Error loading indices:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function calcularIndicesProductivos(premiseId, periodo) {
    // Obtener inventario inicial y final
    const { data: invInicial } = await supabase
      .from('livestock')
      .select('*')
      .eq('premise_id', premiseId)
      .lte('created_at', periodo.start);

    const { data: invFinal } = await supabase
      .from('livestock')
      .select('*')
      .eq('premise_id', premiseId)
      .lte('created_at', periodo.end);

    // Obtener ventas
    const { data: ventas } = await supabase
      .from('income')
      .select('amount')
      .eq('premise_id', premiseId)
      .gte('date', periodo.start)
      .lte('date', periodo.end)
      .eq('status', 'APPROVED');

    // Obtener compras
    const { data: compras } = await supabase
      .from('expenses')
      .select('amount')
      .eq('premise_id', premiseId)
      .gte('date', periodo.start)
      .lte('date', periodo.end)
      .eq('status', 'APPROVED')
      .in('category', ['compras', 'semillas_fertilizantes']);

    // Obtener costos operativos
    const { data: costos } = await supabase
      .from('expenses')
      .select('amount')
      .eq('premise_id', premiseId)
      .gte('date', periodo.start)
      .lte('date', periodo.end)
      .eq('status', 'APPROVED')
      .in('category', ['mano_obra', 'combustible', 'servicios', 'mantenimiento']);

    // Obtener predio para área
    const { data: premise } = await supabase
      .from('premises')
      .select('total_area')
      .eq('id', premiseId)
      .single();

    // Calcular producción (Inv.Final - Inv.Inicial + Ventas - Compras)
    const pesoInicial = invInicial?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;
    const pesoFinal = invFinal?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;
    const ventasKg = ventas?.reduce((sum, v) => sum + (v.amount / 100), 0) || 0; // Aproximación
    const comprasKg = compras?.reduce((sum, c) => sum + (c.amount / 100), 0) || 0;

    const produccionCarne = pesoFinal - pesoInicial + ventasKg - comprasKg;
    const area = premise?.total_area || 1;
    const produccionPorHa = produccionCarne / area;
    const costoTotal = costos?.reduce((sum, c) => sum + c.amount, 0) || 0;
    const costoPorKg = produccionCarne > 0 ? costoTotal / produccionCarne : 0;

    return {
      produccion_carne_kg: Math.round(produccionCarne),
      produccion_por_ha: Math.round(produccionPorHa * 100) / 100,
      costo_por_kg: Math.round(costoPorKg * 100) / 100,
      area_ha: area,
      peso_inicial: Math.round(pesoInicial),
      peso_final: Math.round(pesoFinal),
      costo_total: Math.round(costoTotal),
      animales_inicial: invInicial?.length || 0,
      animales_final: invFinal?.length || 0
    };
  }

  async function obtenerHistoricoIndices(premiseId) {
    // Último año en meses
    const meses = [];
    const hoy = new Date();

    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setMonth(fecha.getMonth() - i);

      const mes = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      const start = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];

      const indice = await calcularIndicesProductivos(premiseId, { start, end });

      meses.push({
        mes,
        produccion_carne_kg: indice.produccion_carne_kg,
        produccion_por_ha: indice.produccion_por_ha,
        costo_por_kg: indice.costo_por_kg
      });
    }

    return meses;
  }

  async function compararConPeriodosAnteriores(premiseId, periodo) {
    // Obtener período anterior (mismo número de días)
    const dias = (new Date(periodo.end) - new Date(periodo.start)) / (1000 * 60 * 60 * 24);

    const startAnterior = new Date(periodo.start);
    startAnterior.setDate(startAnterior.getDate() - dias);
    const endAnterior = new Date(periodo.start);
    endAnterior.setDate(endAnterior.getDate() - 1);

    const indiceActual = await calcularIndicesProductivos(premiseId, periodo);
    const indiceAnterior = await calcularIndicesProductivos(premiseId, {
      start: startAnterior.toISOString().split('T')[0],
      end: endAnterior.toISOString().split('T')[0]
    });

    return {
      produccion_carne: {
        actual: indiceActual.produccion_carne_kg,
        anterior: indiceAnterior.produccion_carne_kg,
        variacion: ((indiceActual.produccion_carne_kg - indiceAnterior.produccion_carne_kg) / indiceAnterior.produccion_carne_kg) * 100
      },
      produccion_por_ha: {
        actual: indiceActual.produccion_por_ha,
        anterior: indiceAnterior.produccion_por_ha,
        variacion: ((indiceActual.produccion_por_ha - indiceAnterior.produccion_por_ha) / indiceAnterior.produccion_por_ha) * 100
      },
      costo_por_kg: {
        actual: indiceActual.costo_por_kg,
        anterior: indiceAnterior.costo_por_kg,
        variacion: ((indiceAnterior.costo_por_kg - indiceActual.costo_por_kg) / indiceAnterior.costo_por_kg) * 100
      }
    };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Calculando índices productivos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Error cargando índices</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!indices) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos de índices disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-indices-title" className="text-2xl font-bold text-slate-800 mb-2">
          Índices Productivos
        </h2>
        <p className="text-slate-600">KPIs obligatorios: Producción, Producción/Ha, Costo/Kg</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Producción de Carne</p>
          <p data-id="report-indices-produccion-kg" className="text-3xl font-bold text-blue-900">
            {indices.produccion_carne_kg.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-blue-600 mt-1">kg</p>
          {comparacion && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
              comparacion.produccion_carne.variacion >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comparacion.produccion_carne.variacion >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(comparacion.produccion_carne.variacion).toFixed(1)}% vs período anterior
            </div>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Producción por Hectárea</p>
          <p data-id="report-indices-produccion-ha" className="text-3xl font-bold text-green-900">
            {indices.produccion_por_ha.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-green-600 mt-1">kg/ha</p>
          {comparacion && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
              comparacion.produccion_por_ha.variacion >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comparacion.produccion_por_ha.variacion >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(comparacion.produccion_por_ha.variacion).toFixed(1)}% vs período anterior
            </div>
          )}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Costo del kg Producido</p>
          <p data-id="report-indices-costo-kg" className="text-3xl font-bold text-purple-900">
            ${indices.costo_por_kg.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-purple-600 mt-1">$/kg</p>
          {comparacion && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
              comparacion.costo_por_kg.variacion >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comparacion.costo_por_kg.variacion >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(comparacion.costo_por_kg.variacion).toFixed(1)}% reducción de costo
            </div>
          )}
        </div>
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">Área Total</p>
          <p className="text-xl font-bold text-slate-900">{indices.area_ha}</p>
          <p className="text-xs text-slate-500">hectáreas</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">Costo Total Operativo</p>
          <p className="text-xl font-bold text-slate-900">${indices.costo_total.toLocaleString('es-AR')}</p>
          <p className="text-xs text-slate-500">período</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">Animales Inicial</p>
          <p className="text-xl font-bold text-slate-900">{indices.animales_inicial}</p>
          <p className="text-xs text-slate-500">cabezas</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">Animales Final</p>
          <p className="text-xl font-bold text-slate-900">{indices.animales_final}</p>
          <p className="text-xs text-slate-500">cabezas</p>
        </div>
      </div>

      {/* Gráfico de Evolución */}
      {historico.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Evolución de Índices (Últimos 12 Meses)</h3>
          </div>

          <div data-id="report-indices-chart" className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="produccion_carne_kg"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Producción (kg)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="produccion_por_ha"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Producción/Ha (kg/ha)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="costo_por_kg"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Costo/Kg ($/kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla de Comparación */}
      {comparacion && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Comparación con Período Anterior</h3>
          </div>

          <div data-id="report-indices-comparison-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Índice</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Período Actual</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Período Anterior</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Variación %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">Producción de Carne (kg)</td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {comparacion.produccion_carne.actual.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {comparacion.produccion_carne.anterior.toLocaleString('es-AR')}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${
                    comparacion.produccion_carne.variacion >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {comparacion.produccion_carne.variacion >= 0 ? '+' : ''}{comparacion.produccion_carne.variacion.toFixed(1)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">Producción por Hectárea (kg/ha)</td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {comparacion.produccion_por_ha.actual.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {comparacion.produccion_por_ha.anterior.toLocaleString('es-AR')}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${
                    comparacion.produccion_por_ha.variacion >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {comparacion.produccion_por_ha.variacion >= 0 ? '+' : ''}{comparacion.produccion_por_ha.variacion.toFixed(1)}%
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">Costo del kg Producido ($/kg)</td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    ${comparacion.costo_por_kg.actual.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    ${comparacion.costo_por_kg.anterior.toLocaleString('es-AR')}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${
                    comparacion.costo_por_kg.variacion >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {comparacion.costo_por_kg.variacion >= 0 ? '+' : ''}{comparacion.costo_por_kg.variacion.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
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
