/**
 * SeedQualityChart.jsx
 *
 * Gráfico de radar con 4 métricas de calidad de semilla
 * Visualización multidimensional: Germinación, Pureza, Humedad inversa, Viabilidad
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { calcularCalidadGeneral } from '../../lib/seedAlerts.config';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function SeedQualityChart({ analisis, varietyName }) {
  if (!analisis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calidad de Semilla</CardTitle>
          <CardDescription>Análisis multidimensional</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos de análisis de semilla
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular calidad general
  const calidadGeneral = calcularCalidadGeneral({
    germinacion: analisis.germinacion,
    pureza: analisis.pureza,
    humedad: analisis.humedad,
    tetrazolio: analisis.tetrazolio
  });

  // Preparar datos para el radar
  // Nota: La humedad se invierte (100 - humedad) porque menor humedad es mejor
  const chartData = [
    {
      parametro: 'Germinación',
      valor: analisis.germinacion ? parseFloat(analisis.germinacion) : 0,
      objetivo: 90,
      fullMark: 100
    },
    {
      parametro: 'Pureza',
      valor: analisis.pureza ? parseFloat(analisis.pureza) : 0,
      objetivo: 99,
      fullMark: 100
    },
    {
      parametro: 'Humedad\n(inversa)',
      // Invertir humedad: 12% → 88 puntos (100-12), 13% → 87, etc.
      valor: analisis.humedad ? 100 - parseFloat(analisis.humedad) : 0,
      objetivo: 88, // 100-12 = 88
      fullMark: 100
    },
    {
      parametro: 'Viabilidad\n(Tetrazolio)',
      valor: analisis.tetrazolio ? parseFloat(analisis.tetrazolio) : 0,
      objetivo: 90,
      fullMark: 100
    }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Para humedad, mostrar el valor real (no invertido)
      let valorMostrar = data.valor;
      let objetivoMostrar = data.objetivo;

      if (data.parametro.includes('Humedad')) {
        valorMostrar = 100 - data.valor;
        objetivoMostrar = 12; // Objetivo real de humedad
      }

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.parametro.replace('\n', ' ')}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-blue-600">
                {valorMostrar.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Objetivo:</span>
              <span className="font-semibold text-green-600">
                {objetivoMostrar}%
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t">
              <span className="text-gray-600">Puntuación:</span>
              <span className={`font-bold ${
                data.valor >= data.objetivo ? 'text-green-600' :
                data.valor >= data.objetivo * 0.85 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {data.valor.toFixed(0)}/100
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getCalidadIcon = () => {
    switch (calidadGeneral.clasificacion) {
      case 'EXCELENTE':
      case 'BUENA':
        return { Icon: CheckCircle, color: 'text-green-600' };
      case 'ACEPTABLE':
        return { Icon: AlertCircle, color: 'text-yellow-600' };
      case 'DEFICIENTE':
        return { Icon: AlertCircle, color: 'text-orange-600' };
      case 'INADECUADA':
        return { Icon: AlertTriangle, color: 'text-red-600' };
      default:
        return { Icon: AlertCircle, color: 'text-gray-600' };
    }
  };

  const { Icon: CalidadIcon, color: calidadColor } = getCalidadIcon();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calidad de Semilla {varietyName && `- ${varietyName}`}</CardTitle>
            <CardDescription>
              Análisis multidimensional • Fecha: {new Date(analisis.fecha).toLocaleDateString('es-AR')}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <CalidadIcon className={`w-5 h-5 ${calidadColor}`} />
              <Badge
                variant={
                  calidadGeneral.clasificacion === 'INADECUADA' || calidadGeneral.clasificacion === 'DEFICIENTE'
                    ? 'destructive'
                    : 'default'
                }
                className="text-sm"
              >
                {calidadGeneral.clasificacion}
              </Badge>
            </div>
            <p className="text-3xl font-bold" style={{ color: calidadGeneral.color }}>
              {calidadGeneral.calidad}/100
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="parametro"
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Área de objetivo (gris translúcido) */}
            <Radar
              name="Objetivo"
              dataKey="objetivo"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
            />

            {/* Área de valor real (azul) */}
            <Radar
              name="Valor Real"
              dataKey="valor"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.5}
              strokeWidth={2}
            />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'valor') return 'Valor Real';
                if (value === 'objetivo') return 'Objetivo';
                return value;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Detalle de parámetros */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg ${
            analisis.germinacion >= 85 ? 'bg-green-50' :
            analisis.germinacion >= 70 ? 'bg-orange-50' :
            'bg-red-50'
          }`}>
            <p className="text-xs font-medium mb-1 text-gray-600">Germinación</p>
            <p className={`text-2xl font-bold ${
              analisis.germinacion >= 85 ? 'text-green-700' :
              analisis.germinacion >= 70 ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {analisis.germinacion || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Objetivo: ≥85%</p>
          </div>

          <div className={`p-3 rounded-lg ${
            analisis.pureza >= 98 ? 'bg-green-50' :
            analisis.pureza >= 95 ? 'bg-orange-50' :
            'bg-red-50'
          }`}>
            <p className="text-xs font-medium mb-1 text-gray-600">Pureza</p>
            <p className={`text-2xl font-bold ${
              analisis.pureza >= 98 ? 'text-green-700' :
              analisis.pureza >= 95 ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {analisis.pureza || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Objetivo: ≥98%</p>
          </div>

          <div className={`p-3 rounded-lg ${
            analisis.humedad <= 12 ? 'bg-green-50' :
            analisis.humedad <= 13 ? 'bg-orange-50' :
            'bg-red-50'
          }`}>
            <p className="text-xs font-medium mb-1 text-gray-600">Humedad</p>
            <p className={`text-2xl font-bold ${
              analisis.humedad <= 12 ? 'text-green-700' :
              analisis.humedad <= 13 ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {analisis.humedad || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Objetivo: ≤12%</p>
          </div>

          <div className={`p-3 rounded-lg ${
            analisis.tetrazolio >= 85 ? 'bg-green-50' :
            analisis.tetrazolio >= 70 ? 'bg-orange-50' :
            'bg-red-50'
          }`}>
            <p className="text-xs font-medium mb-1 text-gray-600">Viabilidad</p>
            <p className={`text-2xl font-bold ${
              analisis.tetrazolio >= 85 ? 'text-green-700' :
              analisis.tetrazolio >= 70 ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {analisis.tetrazolio || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Objetivo: ≥85%</p>
          </div>
        </div>

        {/* Mensaje de calidad general */}
        <div className={`mt-6 p-4 rounded-lg border-2`} style={{
          backgroundColor: `${calidadGeneral.color}20`,
          borderColor: calidadGeneral.color
        }}>
          <p className="font-semibold mb-2 flex items-center gap-2">
            <CalidadIcon className="w-5 h-5" style={{ color: calidadGeneral.color }} />
            Evaluación General
          </p>
          <p className="text-sm text-gray-700">{calidadGeneral.mensaje}</p>
        </div>

        {/* Observaciones si existen */}
        {analisis.observaciones && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Observaciones:</p>
            <p className="text-sm text-gray-700">{analisis.observaciones}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
