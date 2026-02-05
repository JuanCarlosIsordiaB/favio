import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generarCashflow, analizarTendencias, proyectarCashflow } from '../../../services/cashflowService';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CashflowReport({ premiseId, periodo, onClose }) {
  const [cashflow, setCashflow] = useState(null);
  const [tendencias, setTendencias] = useState(null);
  const [proyecciones, setProyecciones] = useState(null);
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

      const datos = await generarCashflow({
        premiseId,
        startDate: periodo?.start,
        endDate: periodo?.end
      });

      setCashflow(datos);

      // Analizar tendencias
      const tendenciasData = analizarTendencias(datos.cashflow_mensual);
      setTendencias(tendenciasData);

      // Proyectar 3 meses siguientes
      const proyData = proyectarCashflow(datos.cashflow_mensual, 3);
      setProyecciones(proyData);
    } catch (err) {
      console.error('Error loading cashflow:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Generando análisis de cashflow...</p>
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

  if (!cashflow) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos de cashflow disponibles</p>
      </div>
    );
  }

  const combinedData = [...cashflow.cashflow_mensual, ...proyecciones];
  const porcentajePorCategoria = cashflow.por_categoria.map(cat => ({
    ...cat,
    porcentaje: (cat.monto / cashflow.resumen.total_egresos) * 100
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-cashflow-title" className="text-2xl font-bold text-slate-800 mb-2">
          Análisis de Cashflow (Flujo de Caja)
        </h2>
        <p className="text-slate-600">Comparación de ingresos vs egresos e impacto en saldo</p>
      </div>

      {/* Resumen KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Total Ingresos</p>
          <p data-id="report-cashflow-total-ingresos" className="text-2xl font-bold text-green-900">
            ${cashflow.resumen.total_ingresos.toLocaleString('es-AR')}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-600 mb-1">Total Egresos</p>
          <p data-id="report-cashflow-total-egresos" className="text-2xl font-bold text-red-900">
            ${cashflow.resumen.total_egresos.toLocaleString('es-AR')}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Flujo Neto</p>
          <p className={`text-2xl font-bold ${cashflow.resumen.flujo_neto >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
            ${cashflow.resumen.flujo_neto.toLocaleString('es-AR')}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Saldo Final</p>
          <p className={`text-2xl font-bold ${cashflow.resumen.saldo_final >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
            ${cashflow.resumen.saldo_final.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* Tendencias */}
      {tendencias && (
        <div className={`border rounded-lg p-4 ${
          tendencias.tendencia === 'POSITIVA'
            ? 'bg-green-50 border-green-200'
            : tendencias.tendencia === 'NEGATIVA'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className={
              tendencias.tendencia === 'POSITIVA'
                ? 'text-green-600'
                : tendencias.tendencia === 'NEGATIVA'
                ? 'text-red-600'
                : 'text-blue-600'
            } />
            <div>
              <p className={`font-semibold ${
                tendencias.tendencia === 'POSITIVA'
                  ? 'text-green-900'
                  : tendencias.tendencia === 'NEGATIVA'
                  ? 'text-red-900'
                  : 'text-blue-900'
              }`}>
                Tendencia: {tendencias.tendencia}
              </p>
              <p className={`text-sm ${
                tendencias.tendencia === 'POSITIVA'
                  ? 'text-green-800'
                  : tendencias.tendencia === 'NEGATIVA'
                  ? 'text-red-800'
                  : 'text-blue-800'
              }`}>
                {tendencias.mensaje} ({tendencias.cambio_porcentaje.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Mensual */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Flujo Mensual</h3>
        </div>

        <div data-id="report-cashflow-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Mes</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Ingresos ($)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Egresos ($)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Flujo Neto ($)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Saldo Acum. ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cashflow.cashflow_mensual.map((mes) => {
                const esPositivoNeto = mes.flujo_neto >= 0;
                const esPositivoAcum = mes.saldo_acumulado >= 0;
                return (
                  <tr key={mes.mes} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{mes.mes}</td>
                    <td className="px-6 py-3 text-right text-green-700">
                      ${mes.ingresos.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-right text-red-700">
                      ${mes.egresos.toLocaleString('es-AR')}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${esPositivoNeto ? 'text-green-700' : 'text-red-700'}`}>
                      ${mes.flujo_neto.toLocaleString('es-AR')}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${esPositivoAcum ? 'text-blue-700' : 'text-red-700'}`}>
                      ${mes.saldo_acumulado.toLocaleString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de Flujo Mensual */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Evolución de Ingresos vs Egresos</h3>
        </div>

        <div data-id="report-cashflow-chart" className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? `$${value.toLocaleString('es-AR')}`
                    : value
                }
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} />
              <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Saldo Acumulado */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Saldo Acumulado (Histórico + Proyecciones)</h3>
        </div>

        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value) =>
                  typeof value === 'number'
                    ? `$${value.toLocaleString('es-AR')}`
                    : value
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="saldo_acumulado"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Saldo Acumulado"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          <p>Los datos después de {cashflow.cashflow_mensual[cashflow.cashflow_mensual.length - 1]?.mes} son proyecciones basadas en promedio histórico.</p>
        </div>
      </div>

      {/* Desglose por Categoría de Egreso */}
      {cashflow.por_categoria && cashflow.por_categoria.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Tabla */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Egresos por Categoría</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Monto ($)</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {porcentajePorCategoria.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900 capitalize">
                        {cat.categoria.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        ${cat.monto.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {cat.porcentaje.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico Pie */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Distribución de Egresos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={porcentajePorCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoria, porcentaje }) => `${categoria}: ${porcentaje.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="monto"
                >
                  {porcentajePorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? `$${value.toLocaleString('es-AR')}`
                      : value
                  }
                />
              </PieChart>
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
