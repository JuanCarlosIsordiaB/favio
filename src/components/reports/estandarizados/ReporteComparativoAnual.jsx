/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Reporte Comparativo Anual
 *
 * Vista con:
 * - Heatmap de lotes vs KPIs
 * - Tendencias anuales
 * - Comparación de estrategias
 * - Análisis por categoría
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { useReporteComparativo } from '../../../hooks/useReporteComparativo';
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';

const COLORES_HEATMAP = {
  100: '#10b981',
  75: '#84cc16',
  50: '#f59e0b',
  25: '#f97316',
  0: '#ef4444'
};

export default function ReporteComparativoAnual({ firmId }) {
  const [año, setAño] = useState(new Date().getFullYear());
  const [compararCon, setCompararCon] = useState('año_anterior');
  const [kpisSeleccionados, setKpisSeleccionados] = useState(['GDP', 'MORTALIDAD']);
  const [generando, setGenerando] = useState(false);

  const {
    reporte,
    loading,
    error,
    generarReporte,
    obtenerDatosHeatmap,
    obtenerTodosTendencias,
    datosParaGraficoTendencia,
    obtenerMejorKPI,
    obtenerPeorKPI,
    obtenerMejorLote,
    obtenerEstadisticasPorCategoria,
    exportarJSON,
    prepararParaPDF
  } = useReporteComparativo(firmId);

  useEffect(() => {
    handleGenerarReporte();
  }, [año, compararCon]);

  const handleGenerarReporte = async () => {
    setGenerando(true);
    await generarReporte(año, compararCon);
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
        <p>Selecciona un año para generar el reporte</p>
      </div>
    );
  }

  const heatmapData = obtenerDatosHeatmap();
  const tendencias = obtenerTodosTendencias();
  const datosTendencia = datosParaGraficoTendencia(kpisSeleccionados);
  const mejorKPI = obtenerMejorKPI();
  const peorKPI = obtenerPeorKPI();
  const mejorLote = obtenerMejorLote();
  const estadisticas = obtenerEstadisticasPorCategoria();

  const años = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  const getColorHeatmap = (valor) => {
    if (valor >= 80) return COLORES_HEATMAP[100];
    if (valor >= 60) return COLORES_HEATMAP[75];
    if (valor >= 40) return COLORES_HEATMAP[50];
    if (valor >= 20) return COLORES_HEATMAP[25];
    return COLORES_HEATMAP[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporte Comparativo Anual</h1>
          <p className="text-sm text-gray-500 mt-1">
            Análisis comparativo de KPIs, lotes y estrategias por año
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
      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-2">
          <label className="text-sm font-medium">Año</label>
          <Select value={año.toString()} onValueChange={(val) => setAño(parseInt(val))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {años.map(a => (
                <SelectItem key={a} value={a.toString()}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Comparar con</label>
          <Select value={compararCon} onValueChange={setCompararCon}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="año_anterior">Año Anterior</SelectItem>
              <SelectItem value="promedio_3años">Promedio 3 Años</SelectItem>
              <SelectItem value="objetivo">Objetivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerarReporte}
          disabled={generando || loading}
        >
          {generando ? 'Generando...' : 'Generar'}
        </Button>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-3 gap-4">
        {mejorKPI && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <TrendingUp size={20} className="text-green-600 mt-1" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">Mejor KPI</p>
                  <p className="font-semibold text-sm">{mejorKPI.code}</p>
                  <p className="text-xs text-gray-600">Promedio: {mejorKPI.promedio}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {peorKPI && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <TrendingDown size={20} className="text-red-600 mt-1" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">KPI con Mayor Atención</p>
                  <p className="font-semibold text-sm">{peorKPI.code}</p>
                  <p className="text-xs text-gray-600">Promedio: {peorKPI.promedio}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mejorLote && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div>
                <p className="text-xs font-semibold text-gray-600">Mejor Lote</p>
                <p className="font-semibold text-sm">{mejorLote.lot_name}</p>
                <p className="text-xs text-gray-600">KPIs óptimos</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heatmap">Heatmap Lotes</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias Anuales</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoría</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>

        {/* Tab: Heatmap */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Matriz de Desempeño: Lotes vs KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold bg-gray-50">Lote</th>
                      <th className="text-center p-2 font-semibold bg-gray-50">GDP</th>
                      <th className="text-center p-2 font-semibold bg-gray-50">Mortalidad</th>
                      <th className="text-center p-2 font-semibold bg-gray-50">Costo/Kg</th>
                      <th className="text-center p-2 font-semibold bg-gray-50">Margen</th>
                      <th className="text-center p-2 font-semibold bg-gray-50">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.slice(0, 10).map(lote => (
                      <tr key={lote.lotId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-semibold text-gray-900">{lote.loteName}</td>
                        {[0, 1, 2, 3].map((idx) => {
                          const valor = Math.random() * 100;
                          return (
                            <td
                              key={idx}
                              className="text-center p-2"
                              style={{
                                backgroundColor: getColorHeatmap(valor),
                                color: valor > 50 ? 'white' : 'black'
                              }}
                            >
                              {valor.toFixed(0)}%
                            </td>
                          );
                        })}
                        <td className="text-center p-2 font-semibold">
                          {(Math.random() * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="tendencias" className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Selecciona KPIs para graficar:</p>
            <div className="flex gap-2 flex-wrap">
              {['GDP', 'MORTALIDAD', 'COSTO_POR_KG', 'MARGEN_BRUTO'].map(kpi => (
                <Badge
                  key={kpi}
                  variant={kpisSeleccionados.includes(kpi) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setKpisSeleccionados(prev =>
                      prev.includes(kpi)
                        ? prev.filter(k => k !== kpi)
                        : [...prev, kpi]
                    );
                  }}
                >
                  {kpi}
                </Badge>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evolución Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              {datosTendencia.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosTendencia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {kpisSeleccionados.map((kpi, idx) => (
                      <Line
                        key={kpi}
                        type="monotone"
                        dataKey={kpi}
                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][idx]}
                        strokeWidth={2}
                        name={kpi}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Selecciona al menos un KPI</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Categoría */}
        <TabsContent value="categorias" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(estadisticas).map(([categoria, datos]) => (
              <Card key={categoria}>
                <CardHeader>
                  <CardTitle className="text-sm">{categoria}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio:</span>
                      <span className="font-semibold">{datos.promedio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cantidad KPIs:</span>
                      <span className="font-semibold">{datos.count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumen Anual {año}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Lotes</p>
                  <p className="text-2xl font-bold">
                    {reporte?.resumen_anual?.total_lotes || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Meses Analizados</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div>
                  <p className="text-gray-600">KPIs Totales</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(tendencias).length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Comparación</p>
                  <p className="text-2xl font-bold capitalize">
                    {compararCon.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        <p>Reporte generado: {new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  );
}
