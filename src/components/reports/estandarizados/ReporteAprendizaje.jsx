/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Reporte de Aprendizaje
 *
 * Vista con:
 * - Decisiones tomadas y resultados
 * - Impacto económico consolidado (ROI)
 * - Lecciones aprendidas
 * - Recomendaciones futuras
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { useReporteAprendizaje } from '../../../hooks/useReporteAprendizaje';
import {
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  Lightbulb,
  Target
} from 'lucide-react';

export default function ReporteAprendizaje({ firmId }) {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - 1);
    return fecha.toISOString().split('T')[0];
  });

  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [generando, setGenerando] = useState(false);

  const {
    reporte,
    loading,
    error,
    generarReporte,
    obtenerDecisiones,
    obtenerImpacto,
    obtenerLecciones,
    obtenerRecomendaciones,
    obtenerROIPromedio,
    obtenerAhorroTotal,
    obtenerIngresoTotal,
    obtenerMejorDecision,
    obtenerPeorDecision,
    categorizarDecisionesPorROI,
    datosParaGraficoROI,
    datosParaGraficoImpacto,
    tasaExito,
    impactoPorCategoria,
    exportarJSON,
    prepararParaPDF
  } = useReporteAprendizaje(firmId);

  useEffect(() => {
    handleGenerarReporte();
  }, []);

  const handleGenerarReporte = async () => {
    setGenerando(true);
    await generarReporte(new Date(fechaInicio), new Date(fechaFin));
    setGenerando(false);
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Error generando reporte: {error}</p>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Selecciona un período para generar el reporte</p>
      </div>
    );
  }

  const decisiones = obtenerDecisiones();
  const impacto = obtenerImpacto();
  const lecciones = obtenerLecciones();
  const recomendaciones = obtenerRecomendaciones();
  const roiPromedio = obtenerROIPromedio();
  const ahorroTotal = obtenerAhorroTotal();
  const ingresoTotal = obtenerIngresoTotal();
  const mejorDecision = obtenerMejorDecision();
  const peorDecision = obtenerPeorDecision();
  const categorizacion = categorizarDecisionesPorROI();
  const datosROI = datosParaGraficoROI();
  const datosImpacto = datosParaGraficoImpacto();
  const porcentajeExito = tasaExito;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Aprendizaje</h1>
          <p className="text-sm text-gray-500 mt-1">
            Análisis de decisiones, impacto económico y lecciones aprendidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportarJSON()}
            className="gap-2"
          >
            <Download size={16} />
            Exportar JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => prepararParaPDF()}
            className="gap-2"
          >
            <FileText size={16} />
            Ver PDF
          </Button>
        </div>
      </div>

      {/* Controles */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <Button
          onClick={handleGenerarReporte}
          disabled={generando || loading}
        >
          {generando ? 'Generando...' : 'Generar'}
        </Button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-semibold">Decisiones Totales</p>
              <p className="text-3xl font-bold text-blue-600">{decisiones.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-semibold">ROI Promedio</p>
              <p className="text-3xl font-bold text-green-600">{roiPromedio}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-semibold">Tasa de Éxito</p>
              <p className="text-3xl font-bold text-purple-600">{porcentajeExito}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-semibold">Ahorro Total</p>
              <p className="text-2xl font-bold text-yellow-600">
                ${ahorroTotal.toLocaleString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mejores/Peores decisiones */}
      <div className="grid grid-cols-2 gap-4">
        {mejorDecision && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                Mejor Decisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold text-sm">{mejorDecision.description}</p>
                <p className="text-xs text-gray-600">
                  {new Date(mejorDecision.decision_date).toLocaleDateString('es-ES')}
                </p>
                <Badge className="bg-green-200 text-green-800">
                  ROI: +{mejorDecision.roi}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {peorDecision && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target size={16} className="text-red-600" />
                Con Mayor Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold text-sm">{peorDecision.description}</p>
                <p className="text-xs text-gray-600">
                  {new Date(peorDecision.decision_date).toLocaleDateString('es-ES')}
                </p>
                <Badge className="bg-red-200 text-red-800">
                  ROI: {peorDecision.roi}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="impacto" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="impacto">Impacto Económico</TabsTrigger>
          <TabsTrigger value="decisiones">Decisiones</TabsTrigger>
          <TabsTrigger value="lecciones">Lecciones</TabsTrigger>
          <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
        </TabsList>

        {/* Tab: Impacto Económico */}
        <TabsContent value="impacto" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ahorro Generado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  ${ahorroTotal.toLocaleString('es-ES')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ingreso Adicional</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  ${ingresoTotal.toLocaleString('es-ES')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Impacto Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  ${(ahorroTotal + ingresoTotal).toLocaleString('es-ES')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de impacto acumulado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Impacto Acumulado en el Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {datosImpacto.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosImpacto}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString('es-ES')}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="acumulado"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Acumulado"
                    />
                    <Line
                      type="monotone"
                      dataKey="ahorro"
                      stroke="#10b981"
                      strokeWidth={1}
                      name="Ahorro"
                    />
                    <Line
                      type="monotone"
                      dataKey="ingreso"
                      stroke="#3b82f6"
                      strokeWidth={1}
                      name="Ingreso"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay datos de impacto</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impacto por categoría */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Impacto por Categoría de Decisión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(impactoPorCategoria).map(([categoria, datos]) => (
                  <div key={categoria} className="border-b pb-3 last:border-0">
                    <p className="font-semibold text-sm mb-2">{categoria}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Decisiones</p>
                        <p className="font-bold">{datos.count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">ROI Promedio</p>
                        <p className="font-bold">{datos.roi_promedio}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Impacto Total</p>
                        <p className="font-bold">
                          ${(datos.ahorro + datos.ingreso).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Decisiones */}
        <TabsContent value="decisiones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gráfico de ROI por Decisión</CardTitle>
            </CardHeader>
            <CardContent>
              {datosROI.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosROI}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nombre"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="roi" fill="#8b5cf6" name="ROI %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay datos de decisiones</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla detallada de decisiones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalle de Decisiones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {decisiones.slice(0, 5).map(dec => (
                  <div key={dec.id} className="border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{dec.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(dec.decision_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <Badge className={dec.roi > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {dec.roi > 0 ? '+' : ''}{dec.roi}% ROI
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Inversión</p>
                        <p className="font-semibold">${dec.investment?.toLocaleString('es-ES') || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ahorro</p>
                        <p className="font-semibold">${dec.impacto_economico?.ahorro?.toLocaleString('es-ES') || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ingreso</p>
                        <p className="font-semibold">${dec.impacto_economico?.ingreso_adicional?.toLocaleString('es-ES') || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Lecciones */}
        <TabsContent value="lecciones" className="space-y-4">
          {lecciones.length > 0 ? (
            <div className="space-y-3">
              {lecciones.map((leccion, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb size={20} className="text-yellow-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">
                          {leccion.tipo}
                        </Badge>
                        <p className="text-sm">{leccion.mensaje}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay lecciones documentadas</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Recomendaciones */}
        <TabsContent value="recomendaciones" className="space-y-4">
          {recomendaciones.length > 0 ? (
            <div className="space-y-3">
              {recomendaciones.map((rec, idx) => (
                <Card key={idx} className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Target size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay recomendaciones generadas</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        <p>Reporte generado: {new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  );
}
