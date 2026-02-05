/**
 * RainfallComparisonChart.jsx
 *
 * Gráfico de líneas con comparación interanual
 * Muestra campaña actual vs campañas anteriores vs promedio histórico
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function RainfallComparisonChart({ data = [] }) {
  // Validación robusta: asegurar que data es un array válido
  const validData = Array.isArray(data) ? data : [];

  if (!validData || validData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparación Interanual</CardTitle>
          <CardDescription>Campañas agrícolas (Julio - Junio)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos de comparación disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar datos por mes del año (1-12 o Jul-Jun según campaña)
  const mesesNombres = [
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'
  ];

  // Construir chartData con estructura: mes, campania1, campania2, campania3, promedioHistorico
  const chartData = mesesNombres.map((mes, index) => {
    const dataPoint = { mes, mesIndex: index };

    validData.forEach(campania => {
      const key = campania.nombre; // ej: "2023/2024", "2022/2023", "Promedio"
      const mesCampania = campania.meses ? campania.meses[index] : null;
      dataPoint[key] = mesCampania ? parseFloat(mesCampania.acumulado || 0) : null;
    });

    return dataPoint;
  });

  // Colores para cada línea
  const colores = [
    '#3b82f6', // blue-500 (actual)
    '#10b981', // green-500 (anterior)
    '#f59e0b', // amber-500 (hace 2 años)
    '#8b5cf6', // violet-500 (hace 3 años)
    '#ef4444'  // red-500 (promedio histórico)
  ];

  // Identificar campaña actual (suele ser la primera)
  const campaniaActual = validData.length > 0 ? validData[0] : null;
  const promedioHistorico = validData.find(d => d.esPromedio);

  // Calcular totales
  const totales = validData.map(campania => ({
    nombre: campania.nombre,
    total: campania.acumulado || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex justify-between gap-4 text-sm">
                <span style={{ color: entry.color }}>{entry.name}:</span>
                <span className="font-bold" style={{ color: entry.color }}>
                  {entry.value ? `${entry.value.toFixed(1)} mm` : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
      {validData.map((campania, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-8 h-0.5"
            style={{ backgroundColor: colores[index % colores.length] }}
          ></div>
          <span className={campania.esPromedio ? 'font-semibold' : ''}>
            {campania.nombre}
            {campania.acumulado && ` (${campania.acumulado.toFixed(0)} mm)`}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación Interanual</CardTitle>
        <CardDescription>
          Evolución mensual de precipitaciones por campaña agrícola (Julio - Junio)
        </CardDescription>

        {/* Indicador de tendencia */}
        {campaniaActual && promedioHistorico && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm">
              <span className="font-semibold text-blue-600">Campaña {campaniaActual.nombre}</span>
              {': '}
              {campaniaActual.acumulado > promedioHistorico.acumulado ? (
                <>
                  <TrendingUp className="w-4 h-4 inline text-green-600" />
                  <span className="text-green-600 font-semibold">
                    {' '}+{((campaniaActual.acumulado / promedioHistorico.acumulado - 1) * 100).toFixed(1)}% vs promedio
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 inline text-orange-600" />
                  <span className="text-orange-600 font-semibold">
                    {' '}{((campaniaActual.acumulado / promedioHistorico.acumulado - 1) * 100).toFixed(1)}% vs promedio
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Milímetros (mm)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {/* Línea para cada campaña */}
            {validData.map((campania, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={campania.nombre}
                name={campania.nombre}
                stroke={colores[index % colores.length]}
                strokeWidth={campania.esPromedio ? 3 : 2}
                strokeDasharray={campania.esPromedio ? '5 5' : '0'}
                dot={{ r: campania.esPromedio ? 0 : 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Resumen de totales */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3">Acumulados por campaña:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {totales.map((total, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-white rounded border"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colores[index % colores.length] }}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{total.nombre}</p>
                  <p className="font-bold text-sm">{total.total.toFixed(0)} mm</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
