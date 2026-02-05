/**
 * SoilHistoryChart.jsx
 *
 * Gráfico de líneas con evolución histórica de un parámetro de suelo
 * Muestra tendencia y comparación con objetivo
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState } from 'react';

export default function SoilHistoryChart({ evolucionHistorica = {} }) {
  const [parametroSeleccionado, setParametroSeleccionado] = useState('P');

  const parametrosDisponibles = [
    { id: 'P', nombre: 'Fósforo', unidad: 'ppm' },
    { id: 'K', nombre: 'Potasio', unidad: 'ppm' },
    { id: 'N', nombre: 'Nitrógeno', unidad: 'ppm' },
    { id: 'S', nombre: 'Azufre', unidad: 'ppm' },
    { id: 'MO', nombre: 'Materia Orgánica', unidad: '%' },
    { id: 'pH', nombre: 'pH', unidad: '' }
  ];

  const parametroInfo = parametrosDisponibles.find(p => p.id === parametroSeleccionado);
  const datosParametro = evolucionHistorica[parametroSeleccionado];

  if (!datosParametro || !datosParametro.valores || datosParametro.valores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución Histórica</CardTitle>
          <CardDescription>Cambios en el tiempo por parámetro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={parametroSeleccionado} onValueChange={setParametroSeleccionado}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parametrosDisponibles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos históricos para {parametroInfo?.nombre}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico
  const chartData = datosParametro.valores.map(item => ({
    fecha: item.fecha,
    fechaFormateada: format(parseISO(item.fecha), 'dd MMM yyyy', { locale: es }),
    valor: item.valor
  }));

  // Calcular promedio
  const promedio = chartData.reduce((sum, d) => sum + d.valor, 0) / chartData.length;

  // Determinar tendencia
  const tendenciaInfo = {
    tendencia: datosParametro.tendencia,
    ultimoValor: datosParametro.ultimoValor,
    primerValor: datosParametro.primerValor,
    cambio: datosParametro.ultimoValor - datosParametro.primerValor,
    porcentaje: ((datosParametro.ultimoValor - datosParametro.primerValor) / datosParametro.primerValor) * 100
  };

  const getTendenciaIcon = () => {
    switch (datosParametro.tendencia) {
      case 'mejorando':
        return { Icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'empeorando':
        return { Icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50' };
      default:
        return { Icon: Minus, color: 'text-blue-600', bgColor: 'bg-blue-50' };
    }
  };

  const { Icon: TendenciaIcon, color: tendenciaColor, bgColor: tendenciaBgColor } = getTendenciaIcon();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const diferenciaConPromedio = data.valor - promedio;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.fechaFormateada}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-blue-600">
                {data.valor.toFixed(2)} {parametroInfo?.unidad}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Promedio:</span>
              <span className="font-semibold text-gray-500">
                {promedio.toFixed(2)} {parametroInfo?.unidad}
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t">
              <span className="text-gray-600">Diferencia:</span>
              <span className={`font-bold ${diferenciaConPromedio >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {diferenciaConPromedio >= 0 ? '+' : ''}{diferenciaConPromedio.toFixed(2)} {parametroInfo?.unidad}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolución Histórica de {parametroInfo?.nombre}</CardTitle>
            <CardDescription>
              Tendencia a lo largo del tiempo • {chartData.length} análisis
            </CardDescription>
          </div>

          <Select value={parametroSeleccionado} onValueChange={setParametroSeleccionado}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {parametrosDisponibles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre} ({p.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Indicador de tendencia */}
        <div className={`flex items-center gap-2 mt-4 p-3 rounded-lg ${tendenciaBgColor}`}>
          <TendenciaIcon className={`w-5 h-5 ${tendenciaColor}`} />
          <div className="flex-1">
            <span className={`font-semibold ${tendenciaColor}`}>
              {datosParametro.tendencia === 'mejorando' ? 'Tendencia Positiva' :
               datosParametro.tendencia === 'empeorando' ? 'Tendencia Negativa' :
               'Tendencia Estable'}
            </span>
            <p className="text-sm text-gray-600">
              Cambio: {tendenciaInfo.cambio >= 0 ? '+' : ''}{tendenciaInfo.cambio.toFixed(2)} {parametroInfo?.unidad}
              {' '}({tendenciaInfo.porcentaje >= 0 ? '+' : ''}{tendenciaInfo.porcentaje.toFixed(1)}%)
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <defs>
              <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
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
              label={{
                value: `${parametroInfo?.nombre} (${parametroInfo?.unidad})`,
                angle: -90,
                position: 'insideLeft'
              }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Línea de promedio */}
            <ReferenceLine
              y={promedio}
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `Promedio: ${promedio.toFixed(2)}`,
                position: 'right',
                fill: '#6b7280',
                fontSize: 12
              }}
            />

            {/* Área sombreada */}
            <Area
              type="monotone"
              dataKey="valor"
              fill="url(#colorValor)"
              stroke="none"
            />

            {/* Línea principal */}
            <Line
              type="monotone"
              dataKey="valor"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 8 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Valor Actual</p>
            <p className="text-2xl font-bold text-blue-700">
              {tendenciaInfo.ultimoValor.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-xs text-purple-600 font-medium mb-1">Promedio</p>
            <p className="text-2xl font-bold text-purple-700">
              {promedio.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-600 font-medium mb-1">Valor Inicial</p>
            <p className="text-2xl font-bold text-gray-700">
              {tendenciaInfo.primerValor.toFixed(2)}
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${
            tendenciaInfo.cambio > 0 ? 'bg-green-50' :
            tendenciaInfo.cambio < 0 ? 'bg-red-50' :
            'bg-gray-50'
          }`}>
            <p className={`text-xs font-medium mb-1 ${
              tendenciaInfo.cambio > 0 ? 'text-green-600' :
              tendenciaInfo.cambio < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              Cambio Total
            </p>
            <p className={`text-2xl font-bold ${
              tendenciaInfo.cambio > 0 ? 'text-green-700' :
              tendenciaInfo.cambio < 0 ? 'text-red-700' :
              'text-gray-700'
            }`}>
              {tendenciaInfo.cambio >= 0 ? '+' : ''}{tendenciaInfo.cambio.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
