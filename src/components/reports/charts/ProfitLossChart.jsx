import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * ProfitLossChart
 * Gráfico de estado de resultados (P&L)
 * Muestra ingresos, costos, márgenes
 */

export default function ProfitLossChart({
  data = {},
  height = 400
}) {

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-500">No hay datos para mostrar</p>
      </div>
    );
  }

  // Preparar datos para gráfico
  const chartData = [
    {
      nombre: 'Ingresos',
      valor: data.ingresos?.total_ingresos || 0,
      tipo: 'ingreso'
    },
    {
      nombre: 'Costo Ventas',
      valor: -(data.costo_ventas?.total_costo_ventas || 0),
      tipo: 'costo'
    },
    {
      nombre: 'Margen Bruto',
      valor: data.margen_bruto?.valor || 0,
      tipo: 'margen'
    },
    {
      nombre: 'Gastos Op.',
      valor: -(data.gastos_operativos?.total_gastos_operativos || 0),
      tipo: 'gasto'
    },
    {
      nombre: 'Resultado Op.',
      valor: data.resultado_operativo?.valor || 0,
      tipo: 'resultado'
    },
    {
      nombre: 'Gastos Fin.',
      valor: -(data.gastos_financieros?.total_gastos_financieros || 0),
      tipo: 'gasto'
    },
    {
      nombre: 'Resultado Final',
      valor: data.resultado_final?.valor || 0,
      tipo: 'final'
    }
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="nombre"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
          formatter={(value) => {
            if (typeof value === 'number') {
              return `$${value.toLocaleString('es-AR')}`;
            }
            return value;
          }}
        />
        <Legend />

        <Bar
          dataKey="valor"
          fill="#3b82f6"
          name="Valor ($)"
          radius={[8, 8, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
