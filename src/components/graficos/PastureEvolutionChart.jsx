/**
 * PastureEvolutionChart.jsx
 *
 * Gráfico de líneas con evolución de altura de pastura
 * Incluye línea de remanente objetivo y áreas coloreadas según estado
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
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PastureEvolutionChart({ data = [], remanente = null, dias = 60 }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Altura de Pastura</CardTitle>
          <CardDescription>Últimos {dias} días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos de mediciones de pastura
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico
  const chartData = data
    .slice(-dias)
    .map(medicion => {
      const altura = parseFloat(medicion.altura_promedio_cm);
      const rem = remanente || medicion.remanente_objetivo_cm;
      const remNum = parseFloat(rem);

      // Determinar zona de color
      let zona = 'normal';
      if (altura < remNum) {
        zona = 'critico';
      } else if (altura < remNum + 2) {
        zona = 'urgente';
      } else if (altura < remNum + 5) {
        zona = 'atencion';
      }

      return {
        fecha: medicion.fecha,
        fechaFormateada: format(parseISO(medicion.fecha), 'dd MMM', { locale: es }),
        altura,
        remanente: remNum,
        zona,
        // Para áreas sombreadas
        alturaCompleta: altura
      };
    });

  // Calcular estadísticas
  const alturaActual = chartData.length > 0 ? chartData[chartData.length - 1].altura : null;
  const alturaInicial = chartData.length > 0 ? chartData[0].altura : null;
  const cambioTotal = alturaActual && alturaInicial ? alturaActual - alturaInicial : 0;
  const promedio = chartData.reduce((sum, d) => sum + d.altura, 0) / chartData.length;

  // Determinar tendencia general
  const tendenciaGeneral = cambioTotal > 2 ? 'crecimiento' : cambioTotal < -2 ? 'decrecimiento' : 'estable';

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const diferencia = data.altura - data.remanente;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.fechaFormateada}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Altura promedio:</span>
              <span className="font-bold text-blue-600">{data.altura.toFixed(1)} cm</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Remanente objetivo:</span>
              <span className="font-semibold text-red-600">{data.remanente.toFixed(1)} cm</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t">
              <span className="text-gray-600">Diferencia:</span>
              <span className={`font-bold ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(1)} cm
              </span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <span className={`text-xs font-semibold ${
                data.zona === 'critico' ? 'text-red-600' :
                data.zona === 'urgente' ? 'text-orange-600' :
                data.zona === 'atencion' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {data.zona === 'critico' ? '🔴 CRÍTICO' :
                 data.zona === 'urgente' ? '🟠 URGENTE' :
                 data.zona === 'atencion' ? '🟡 ATENCIÓN' :
                 '🟢 NORMAL'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Función para determinar color del punto según zona
  const getDotColor = (zona) => {
    switch (zona) {
      case 'critico': return '#ef4444'; // red-500
      case 'urgente': return '#f97316'; // orange-500
      case 'atencion': return '#eab308'; // yellow-500
      default: return '#10b981'; // green-500
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución de Altura de Pastura</CardTitle>
        <CardDescription>
          Últimos {dias} días • Promedio: {promedio.toFixed(1)} cm
        </CardDescription>

        {/* Indicador de tendencia */}
        <div className="flex items-center gap-2 mt-2">
          {tendenciaGeneral === 'crecimiento' ? (
            <>
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                Crecimiento: +{cambioTotal.toFixed(1)} cm en el período
              </span>
            </>
          ) : tendenciaGeneral === 'decrecimiento' ? (
            <>
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-600">
                Decrecimiento: {cambioTotal.toFixed(1)} cm en el período
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-blue-600">
              Estable: {cambioTotal >= 0 ? '+' : ''}{cambioTotal.toFixed(1)} cm en el período
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <defs>
              {/* Gradiente para área de fondo */}
              <linearGradient id="colorAltura" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>

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
              label={{ value: 'Altura (cm)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Línea de remanente objetivo (roja punteada) */}
            {remanente && (
              <ReferenceLine
                y={parseFloat(remanente)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Remanente: ${parseFloat(remanente).toFixed(1)} cm`,
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}

            {/* Área sombreada debajo de la línea */}
            <Area
              type="monotone"
              dataKey="altura"
              fill="url(#colorAltura)"
              stroke="none"
            />

            {/* Línea principal de altura */}
            <Line
              type="monotone"
              dataKey="altura"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={getDotColor(payload.zona)}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 8 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Leyenda de zonas */}
        <div className="flex flex-wrap gap-4 mt-6 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Crítico (&lt; remanente)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Urgente (remanente a +2cm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Atención (+2cm a +5cm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal (&gt; +5cm sobre remanente)</span>
          </div>
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Altura Actual</p>
            <p className="text-2xl font-bold text-blue-700">
              {alturaActual ? alturaActual.toFixed(1) : '-'} cm
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-xs text-purple-600 font-medium mb-1">Promedio Período</p>
            <p className="text-2xl font-bold text-purple-700">
              {promedio.toFixed(1)} cm
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-xs text-red-600 font-medium mb-1">Remanente Objetivo</p>
            <p className="text-2xl font-bold text-red-700">
              {remanente ? parseFloat(remanente).toFixed(1) : '-'} cm
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
