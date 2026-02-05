/**
 * SoilNutrientChart.jsx
 *
 * Gráfico de barras agrupadas comparando resultado vs objetivo
 * Para los 6 parámetros de suelo (P, K, MO, pH, N, S)
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function SoilNutrientChart({ analisis }) {
  if (!analisis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Nutrientes</CardTitle>
          <CardDescription>Resultado vs Objetivo por parámetro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos de análisis de suelo
          </div>
        </CardContent>
      </Card>
    );
  }

  // Construir datos para el gráfico
  const parametros = [
    {
      id: 'P',
      nombre: 'Fósforo (P)',
      resultado: analisis.p_resultado ? parseFloat(analisis.p_resultado) : null,
      objetivo: analisis.p_objetivo ? parseFloat(analisis.p_objetivo) : null,
      unidad: 'ppm',
      tieneObjetivo: true
    },
    {
      id: 'K',
      nombre: 'Potasio (K)',
      resultado: analisis.k_resultado ? parseFloat(analisis.k_resultado) : null,
      objetivo: analisis.k_objetivo ? parseFloat(analisis.k_objetivo) : null,
      unidad: 'ppm',
      tieneObjetivo: true
    },
    {
      id: 'N',
      nombre: 'Nitrógeno (N)',
      resultado: analisis.n_resultado ? parseFloat(analisis.n_resultado) : null,
      objetivo: analisis.n_objetivo ? parseFloat(analisis.n_objetivo) : null,
      unidad: 'ppm',
      tieneObjetivo: true
    },
    {
      id: 'S',
      nombre: 'Azufre (S)',
      resultado: analisis.s_resultado ? parseFloat(analisis.s_resultado) : null,
      objetivo: analisis.s_objetivo ? parseFloat(analisis.s_objetivo) : null,
      unidad: 'ppm',
      tieneObjetivo: true
    },
    {
      id: 'MO',
      nombre: 'Materia Orgánica',
      resultado: analisis.mo ? parseFloat(analisis.mo) : null,
      objetivo: 3.0, // Valor de referencia
      unidad: '%',
      tieneObjetivo: false
    },
    {
      id: 'pH',
      nombre: 'pH del Suelo',
      resultado: analisis.ph ? parseFloat(analisis.ph) : null,
      objetivo: 6.5, // Valor de referencia (medio del rango 6.0-7.5)
      unidad: '',
      tieneObjetivo: false
    }
  ];

  // Filtrar solo parámetros con datos
  const chartData = parametros
    .filter(p => p.resultado !== null)
    .map(p => {
      const porcentaje = p.objetivo ? (p.resultado / p.objetivo) * 100 : 100;
      let estado = 'normal';

      if (p.id === 'pH') {
        // pH especial: rango óptimo 6.0-7.5
        if (p.resultado < 6.0 || p.resultado > 7.5) {
          estado = p.resultado < 5.5 || p.resultado > 8.0 ? 'critico' : 'bajo';
        }
      } else if (p.tieneObjetivo) {
        if (porcentaje < 50) {
          estado = 'critico';
        } else if (porcentaje < 70) {
          estado = 'bajo';
        }
      } else if (p.id === 'MO') {
        if (p.resultado < 2.0) {
          estado = 'critico';
        } else if (p.resultado < 3.0) {
          estado = 'bajo';
        }
      }

      return {
        ...p,
        porcentaje,
        estado,
        deficit: p.objetivo && p.tieneObjetivo ? p.objetivo - p.resultado : 0
      };
    });

  // Contar déficits
  const deficits = chartData.filter(d => d.estado !== 'normal').length;

  const getBarColor = (estado) => {
    switch (estado) {
      case 'critico': return '#ef4444'; // red-500
      case 'bajo': return '#f97316'; // orange-500
      default: return '#10b981'; // green-500
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.nombre}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Resultado:</span>
              <span className="font-bold text-blue-600">
                {data.resultado.toFixed(2)} {data.unidad}
              </span>
            </div>
            {data.tieneObjetivo && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Objetivo:</span>
                  <span className="font-semibold text-gray-500">
                    {data.objetivo.toFixed(2)} {data.unidad}
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t">
                  <span className="text-gray-600">Porcentaje:</span>
                  <span className={`font-bold ${
                    data.porcentaje >= 100 ? 'text-green-600' :
                    data.porcentaje >= 70 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {data.porcentaje.toFixed(1)}%
                  </span>
                </div>
                {data.deficit > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Déficit:</span>
                    <span className="font-bold text-red-600">
                      {data.deficit.toFixed(2)} {data.unidad}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="mt-2 pt-2 border-t">
              <Badge variant={
                data.estado === 'critico' ? 'destructive' :
                data.estado === 'bajo' ? 'secondary' :
                'default'
              }>
                {data.estado === 'critico' ? 'Crítico' :
                 data.estado === 'bajo' ? 'Bajo' :
                 'Normal'}
              </Badge>
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
            <CardTitle>Análisis de Nutrientes</CardTitle>
            <CardDescription>
              Resultado vs Objetivo • Fecha: {new Date(analisis.fecha).toLocaleDateString('es-AR')}
            </CardDescription>
          </div>
          {deficits > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {deficits} déficit{deficits > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="id"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Valor', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'resultado') return 'Resultado Actual';
                if (value === 'objetivo') return 'Objetivo';
                return value;
              }}
            />

            {/* Barra de Resultado (coloreada según estado) */}
            <Bar dataKey="resultado" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.estado)} />
              ))}
            </Bar>

            {/* Barra de Objetivo (gris) */}
            <Bar dataKey="objetivo" fill="#9ca3af" radius={[8, 8, 0, 0]} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>

        {/* Resumen de estado */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">Normales</p>
              <p className="text-lg font-bold text-green-700">
                {chartData.filter(d => d.estado === 'normal').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-xs text-orange-600 font-medium">Bajos</p>
              <p className="text-lg font-bold text-orange-700">
                {chartData.filter(d => d.estado === 'bajo').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs text-red-600 font-medium">Críticos</p>
              <p className="text-lg font-bold text-red-700">
                {chartData.filter(d => d.estado === 'critico').length}
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Normal (≥70% del objetivo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Bajo (50-70% del objetivo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Crítico (&lt;50% del objetivo)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
