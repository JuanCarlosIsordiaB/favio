import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * CashflowChart
 * Gráfico de flujo de caja
 * Muestra ingresos vs egresos y saldo acumulado
 */

export default function CashflowChart({
  data = [],
  type = 'line', // 'line' o 'bar'
  height = 400
}) {

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-500">No hay datos para mostrar</p>
      </div>
    );
  }

  const commonProps = {
    margin: { top: 5, right: 30, left: 0, bottom: 5 }
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="mes"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
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
            formatter={(value) =>
              typeof value === 'number'
                ? `$${value.toLocaleString('es-AR')}`
                : value
            }
            labelFormatter={(label) => `Mes: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="ingresos"
            fill="#10b981"
            name="Ingresos"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="egresos"
            fill="#ef4444"
            name="Egresos"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Line chart - saldo acumulado
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="mes"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          label={{ value: 'Monto ($)', angle: -90, position: 'insideLeft' }}
        />
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
          labelFormatter={(label) => `Mes: ${label}`}
        />
        <Legend />

        {/* Ingresos */}
        <Line
          type="monotone"
          dataKey="ingresos"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3 }}
          activeDot={{ r: 5 }}
          name="Ingresos"
          connectNulls
        />

        {/* Egresos */}
        <Line
          type="monotone"
          dataKey="egresos"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: '#ef4444', r: 3 }}
          activeDot={{ r: 5 }}
          name="Egresos"
          connectNulls
        />

        {/* Flujo Neto */}
        <Line
          type="monotone"
          dataKey="flujo_neto"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3 }}
          activeDot={{ r: 5 }}
          name="Flujo Neto"
          connectNulls
        />

        {/* Saldo Acumulado - más destacado */}
        <Line
          type="monotone"
          dataKey="saldo_acumulado"
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Saldo Acumulado"
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
