import React from 'react';
import { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * AnimalLoadChart
 * Gráfico reutilizable de evolución de carga animal
 *
 * Props:
 * - data: Array de {mes, carga_kg_ha, carga_kg_ha_redondeada, peso_total_kg, cabezas}
 * - umbral: Valor del umbral en kg/ha (default: 500)
 * - height: Altura del gráfico (default: 400)
 */

export default function AnimalLoadChart({ data = [], umbral = 500, height = 400 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-500">No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="mes"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          label={{ value: 'kg/ha', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
          formatter={(value) => {
            if (typeof value === 'number') {
              return [value.toLocaleString('es-AR'), value === umbral ? 'Umbral' : 'Carga'];
            }
            return value;
          }}
          labelFormatter={(label) => `Período: ${label}`}
        />
        <Legend />

        {/* Reference line - Threshold */}
        <ReferenceLine
          y={umbral}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{
            value: `Umbral: ${umbral} kg/ha`,
            position: 'right',
            fill: '#ef4444',
            fontSize: 12
          }}
          name={`Umbral (${umbral} kg/ha)`}
        />

        {/* Main line - Actual load */}
        <Line
          type="monotone"
          dataKey="carga_kg_ha_redondeada"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Carga kg/ha"
          connectNulls
        />

        {/* Optional secondary line - Weight total */}
        <Line
          type="monotone"
          dataKey="peso_total_kg"
          stroke="#10b981"
          strokeWidth={1}
          strokeOpacity={0.5}
          dot={false}
          name="Peso Total (kg)"
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
