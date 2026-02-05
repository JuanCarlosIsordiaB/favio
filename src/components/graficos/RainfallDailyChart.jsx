/**
 * RainfallDailyChart.jsx
 *
 * Gráfico de barras con precipitaciones diarias
 * Muestra últimos 30-60 días de registros de lluvia
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function RainfallDailyChart({ data = [], dias = 30 }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Precipitaciones Diarias</CardTitle>
          <CardDescription>Últimos {dias} días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos de lluvia disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tomar los últimos N días
  const chartData = data
    .slice(-dias)
    .map(registro => ({
      fecha: registro.fecha,
      mm: parseFloat(registro.mm) || 0,
      fechaFormateada: format(parseISO(registro.fecha), 'dd MMM', { locale: es })
    }));

  // Calcular total y promedio
  const totalMm = chartData.reduce((sum, d) => sum + d.mm, 0);
  const promedioMm = totalMm / chartData.length;

  // Determinar color de barra según cantidad
  const getBarColor = (mm) => {
    if (mm === 0) return '#e5e7eb'; // gray-200
    if (mm < 5) return '#93c5fd'; // blue-300
    if (mm < 15) return '#3b82f6'; // blue-500
    if (mm < 30) return '#1e40af'; // blue-700
    return '#1e3a8a'; // blue-900 (lluvia intensa)
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.fechaFormateada}</p>
          <p className="text-blue-600 font-bold text-lg">{data.mm.toFixed(1)} mm</p>
          {data.mm === 0 && (
            <p className="text-xs text-gray-500 mt-1">Sin lluvia</p>
          )}
          {data.mm > 30 && (
            <p className="text-xs text-orange-600 mt-1">Lluvia intensa</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precipitaciones Diarias</CardTitle>
        <CardDescription>
          Últimos {dias} días • Total: {totalMm.toFixed(1)} mm • Promedio: {promedioMm.toFixed(1)} mm/día
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="fechaFormateada"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Milímetros (mm)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="mm" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.mm)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e5e7eb' }}></div>
            <span>Sin lluvia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#93c5fd' }}></div>
            <span>Leve (&lt;5mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Moderada (5-15mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1e40af' }}></div>
            <span>Fuerte (15-30mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1e3a8a' }}></div>
            <span>Intensa (&gt;30mm)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
