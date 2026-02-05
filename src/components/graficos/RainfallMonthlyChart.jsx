/**
 * RainfallMonthlyChart.jsx
 *
 * Gráfico de barras con acumulado mensual
 * Incluye línea de promedio histórico para comparación
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function RainfallMonthlyChart({ data = [], promedioHistorico = null, meses = 12 }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acumulado Mensual</CardTitle>
          <CardDescription>Últimos {meses} meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos mensuales disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tomar los últimos N meses
  const chartData = data.slice(-meses).map(item => {
    const acumulado = parseFloat(item.acumulado) || 0;
    const promedio = promedioHistorico || item.promedioHistorico || 0;
    const diferencia = acumulado - promedio;
    const porcentaje = promedio > 0 ? ((acumulado / promedio) * 100) - 100 : 0;

    // Usar mesNombre si ya está disponible, o construirlo desde anio y mes
    let mesNombre = item.mesNombre;
    if (!mesNombre && item.anio && item.mes) {
      try {
        mesNombre = format(new Date(item.anio, item.mes - 1, 1), 'MMM yyyy', { locale: es });
      } catch (e) {
        console.warn('Error formatting month name, using fallback:', { item, error: e });
        mesNombre = `${item.mes}/${item.anio}`;
      }
    }

    return {
      mes: item.mes,
      mesNombre: mesNombre || 'N/A',
      acumulado,
      promedio,
      diferencia,
      porcentaje,
      superaPromedio: acumulado >= promedio
    };
  });

  // Calcular totales
  const totalAcumulado = chartData.reduce((sum, d) => sum + d.acumulado, 0);
  const totalPromedio = chartData.reduce((sum, d) => sum + d.promedio, 0);
  const diferenciaTotalPorcentaje = totalPromedio > 0
    ? ((totalAcumulado / totalPromedio) * 100) - 100
    : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.mesNombre}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Acumulado:</span>
              <span className="font-bold text-blue-600">{data.acumulado.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Promedio histórico:</span>
              <span className="font-semibold text-gray-500">{data.promedio.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t">
              <span className="text-gray-600">Diferencia:</span>
              <span className={`font-bold ${data.diferencia >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {data.diferencia >= 0 ? '+' : ''}{data.diferencia.toFixed(1)} mm
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Variación:</span>
              <span className={`font-bold ${data.porcentaje >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {data.porcentaje >= 0 ? '+' : ''}{data.porcentaje.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap gap-6 justify-center mt-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded"></div>
        <span>Acumulado del período</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-0.5 bg-orange-500"></div>
        <span>Promedio histórico</span>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acumulado Mensual</CardTitle>
        <CardDescription>
          Últimos {meses} meses • Total: {totalAcumulado.toFixed(1)} mm vs {totalPromedio.toFixed(1)} mm promedio
        </CardDescription>

        {/* Indicador de tendencia */}
        <div className="flex items-center gap-2 mt-2">
          {diferenciaTotalPorcentaje > 10 ? (
            <>
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                +{diferenciaTotalPorcentaje.toFixed(1)}% sobre el promedio
              </span>
            </>
          ) : diferenciaTotalPorcentaje < -10 ? (
            <>
              <TrendingDown className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold text-orange-600">
                {diferenciaTotalPorcentaje.toFixed(1)}% bajo el promedio
              </span>
            </>
          ) : (
            <>
              <Minus className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">
                Normal ({diferenciaTotalPorcentaje >= 0 ? '+' : ''}{diferenciaTotalPorcentaje.toFixed(1)}%)
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="mesNombre"
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
            <Legend content={<CustomLegend />} />

            {/* Barras coloreadas según si superan o no el promedio */}
            <Bar
              dataKey="acumulado"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              opacity={0.8}
            >
              {chartData.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={entry.superaPromedio ? '#10b981' : '#f59e0b'}
                />
              ))}
            </Bar>

            {/* Línea de promedio histórico */}
            <Line
              type="monotone"
              dataKey="promedio"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 4, fill: '#f97316' }}
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Leyenda adicional */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Por encima del promedio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Por debajo del promedio</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
