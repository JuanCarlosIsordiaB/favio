/**
 * SeedComparisonChart.jsx
 *
 * Gráfico de barras agrupadas para comparar calidad entre múltiples variedades de semillas
 * Permite seleccionar hasta 5 variedades y comparar germinación, pureza y viabilidad
 */

import { useState, useEffect } from 'react';
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
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Loader, RefreshCw, AlertCircle, FlaskRound, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COLORES_VARIEDADES = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6'  // violet-500
];

export default function SeedComparisonChart({ firmId }) {
  const [variedades, setVariedades] = useState([]);
  const [variedadesSeleccionadas, setVariedadesSeleccionadas] = useState([]);
  const [datosComparacion, setDatosComparacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar variedades de semillas con sus análisis más recientes
  const fetchVariedades = async () => {
    if (!firmId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Obtener todas las variedades con su análisis más reciente
      const { data: analisis, error: errorAnalisis } = await supabase
        .from('analisis_semillas')
        .select('*')
        .eq('firm_id', firmId)
        .order('fecha', { ascending: false });

      if (errorAnalisis) throw errorAnalisis;

      // Agrupar por variedad y tomar el más reciente
      const variedadesMap = new Map();

      analisis?.forEach(a => {
        const variedadKey = a.seed_variety || 'Sin nombre';
        if (!variedadesMap.has(variedadKey)) {
          variedadesMap.set(variedadKey, {
            nombre: variedadKey,
            analisisReciente: a,
            germinacion: parseFloat(a.germinacion) || 0,
            pureza: parseFloat(a.pureza) || 0,
            viabilidad: parseFloat(a.tetrazolio) || 0,
            humedad: parseFloat(a.humedad) || 0,
            fecha: a.fecha
          });
        }
      });

      const variedadesArray = Array.from(variedadesMap.values());
      setVariedades(variedadesArray);

      // Auto-seleccionar las primeras 3 variedades (o todas si hay menos de 3)
      const iniciales = variedadesArray.slice(0, Math.min(3, variedadesArray.length));
      setVariedadesSeleccionadas(iniciales.map(v => v.nombre));

    } catch (err) {
      console.error('Error cargando variedades:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariedades();
  }, [firmId]);

  // Preparar datos para el gráfico cuando cambian las selecciones
  useEffect(() => {
    if (variedadesSeleccionadas.length === 0) {
      setDatosComparacion([]);
      return;
    }

    const datos = variedadesSeleccionadas
      .map(nombreVariedad => {
        const variedad = variedades.find(v => v.nombre === nombreVariedad);
        if (!variedad) return null;

        return {
          nombre: variedad.nombre,
          germinacion: variedad.germinacion,
          pureza: variedad.pureza,
          viabilidad: variedad.viabilidad,
          humedad: variedad.humedad,
          fecha: variedad.fecha,
          // Calcular calidad promedio
          calidadPromedio: ((variedad.germinacion + variedad.pureza + variedad.viabilidad) / 3).toFixed(1)
        };
      })
      .filter(Boolean);

    setDatosComparacion(datos);
  }, [variedadesSeleccionadas, variedades]);

  const toggleVariedad = (nombreVariedad) => {
    if (variedadesSeleccionadas.includes(nombreVariedad)) {
      setVariedadesSeleccionadas(prev => prev.filter(v => v !== nombreVariedad));
    } else {
      // Limitar a 5 variedades
      if (variedadesSeleccionadas.length < 5) {
        setVariedadesSeleccionadas(prev => [...prev, nombreVariedad]);
      }
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
              <span className="text-gray-600">Germinación:</span>
              <span className="font-bold text-blue-600">{data.germinacion.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Pureza:</span>
              <span className="font-bold text-green-600">{data.pureza.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Viabilidad:</span>
              <span className="font-bold text-amber-600">{data.viabilidad.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t">
              <span className="text-gray-600">Humedad:</span>
              <span className="font-semibold text-gray-700">{data.humedad.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Calidad promedio:</span>
              <span className="font-bold text-purple-600">{data.calidadPromedio}%</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Última medición: {new Date(data.fecha).toLocaleDateString('es-AR')}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Variedades</CardTitle>
          <CardDescription>Análisis comparativo de calidad de semillas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-muted-foreground">Cargando variedades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Variedades</CardTitle>
          <CardDescription>Análisis comparativo de calidad de semillas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-semibold mb-2">Error cargando datos</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchVariedades} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sin variedades
  if (variedades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Variedades</CardTitle>
          <CardDescription>Análisis comparativo de calidad de semillas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FlaskRound className="w-12 h-12 mb-3 opacity-50" />
            <p className="mb-2">No hay análisis de semillas registrados</p>
            <p className="text-sm">Registra análisis de diferentes variedades para compararlas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar variedades por calidad promedio para el ranking
  const variedadesOrdenadas = [...variedades].sort((a, b) => {
    const calidadA = (a.germinacion + a.pureza + a.viabilidad) / 3;
    const calidadB = (b.germinacion + b.pureza + b.viabilidad) / 3;
    return calidadB - calidadA;
  });

  const mejorVariedad = variedadesOrdenadas[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskRound className="w-6 h-6 text-blue-600" />
              Comparación de Variedades de Semillas
            </CardTitle>
            <CardDescription>
              Selecciona hasta 5 variedades para comparar su calidad
            </CardDescription>
          </div>
          <Button onClick={fetchVariedades} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Mejor variedad destacada */}
        {mejorVariedad && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-900">
                Mejor Variedad: {mejorVariedad.nombre}
              </p>
              <Badge variant="default" className="ml-auto">
                {((mejorVariedad.germinacion + mejorVariedad.pureza + mejorVariedad.viabilidad) / 3).toFixed(1)}% calidad
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Selector de variedades */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-3">
            Variedades disponibles ({variedadesSeleccionadas.length}/5 seleccionadas):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {variedades.map((variedad, idx) => {
              const isSelected = variedadesSeleccionadas.includes(variedad.nombre);
              const canSelect = variedadesSeleccionadas.length < 5 || isSelected;
              const colorIndex = variedadesSeleccionadas.indexOf(variedad.nombre);
              const color = colorIndex >= 0 ? COLORES_VARIEDADES[colorIndex] : '#9ca3af';

              return (
                <div
                  key={variedad.nombre}
                  className={`flex items-center gap-2 p-2 rounded border-2 transition-colors ${
                    isSelected ? 'bg-white border-blue-300' : 'bg-white border-gray-200'
                  } ${!canSelect ? 'opacity-50' : 'cursor-pointer hover:border-blue-200'}`}
                  onClick={() => canSelect && toggleVariedad(variedad.nombre)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={!canSelect}
                    onCheckedChange={() => canSelect && toggleVariedad(variedad.nombre)}
                  />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{variedad.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {((variedad.germinacion + variedad.pureza + variedad.viabilidad) / 3).toFixed(1)}% calidad
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sin variedades seleccionadas */}
        {variedadesSeleccionadas.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <FlaskRound className="w-12 h-12 mb-3 opacity-50 mx-auto" />
              <p>Selecciona al menos una variedad para comparar</p>
            </div>
          </div>
        )}

        {/* Gráfico de comparación */}
        {variedadesSeleccionadas.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={datosComparacion}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  label={{ value: 'Porcentaje (%)', position: 'bottom', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => {
                    if (value === 'germinacion') return 'Germinación';
                    if (value === 'pureza') return 'Pureza';
                    if (value === 'viabilidad') return 'Viabilidad';
                    return value;
                  }}
                />

                <Bar dataKey="germinacion" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pureza" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="viabilidad" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Tabla resumen */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Resumen Comparativo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2">
                    <tr>
                      <th className="text-left p-2 font-semibold">Variedad</th>
                      <th className="text-center p-2 font-semibold">Germinación</th>
                      <th className="text-center p-2 font-semibold">Pureza</th>
                      <th className="text-center p-2 font-semibold">Viabilidad</th>
                      <th className="text-center p-2 font-semibold">Humedad</th>
                      <th className="text-center p-2 font-semibold">Calidad Promedio</th>
                      <th className="text-center p-2 font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparacion.map((dato, idx) => (
                      <tr key={dato.nombre} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORES_VARIEDADES[idx] }}
                            ></div>
                            <span className="font-medium">{dato.nombre}</span>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-semibold ${
                            dato.germinacion >= 85 ? 'text-green-600' :
                            dato.germinacion >= 70 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {dato.germinacion.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-semibold ${
                            dato.pureza >= 98 ? 'text-green-600' :
                            dato.pureza >= 95 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {dato.pureza.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-semibold ${
                            dato.viabilidad >= 85 ? 'text-green-600' :
                            dato.viabilidad >= 70 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {dato.viabilidad.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-semibold ${
                            dato.humedad <= 12 ? 'text-green-600' :
                            dato.humedad <= 13 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {dato.humedad.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="default" className="font-bold">
                            {dato.calidadPromedio}%
                          </Badge>
                        </td>
                        <td className="text-center p-2 text-gray-600">
                          {new Date(dato.fecha).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leyenda de umbrales */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold mb-2 text-gray-700">Umbrales de calidad:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="font-medium">Germinación/Viabilidad:</span>
                  <span className="text-green-600 ml-1">≥85%</span>
                  <span className="text-orange-600 ml-1">70-85%</span>
                  <span className="text-red-600 ml-1">&lt;70%</span>
                </div>
                <div>
                  <span className="font-medium">Pureza:</span>
                  <span className="text-green-600 ml-1">≥98%</span>
                  <span className="text-orange-600 ml-1">95-98%</span>
                  <span className="text-red-600 ml-1">&lt;95%</span>
                </div>
                <div>
                  <span className="font-medium">Humedad:</span>
                  <span className="text-green-600 ml-1">≤12%</span>
                  <span className="text-orange-600 ml-1">12-13%</span>
                  <span className="text-red-600 ml-1">&gt;13%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
