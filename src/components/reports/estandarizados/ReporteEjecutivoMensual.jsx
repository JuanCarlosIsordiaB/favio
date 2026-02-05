/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Reporte Ejecutivo Mensual
 *
 * Vista consolidada con:
 * - KPIs críticos
 * - Alertas del mes
 * - Comparación intermensual
 * - Recomendaciones automáticas
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useReporteEjecutivo } from '../../../hooks/useReporteEjecutivo';
import { Download, FileText, TrendingUp, AlertCircle } from 'lucide-react';

const MESES = [
  { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' },
  { num: 3, nombre: 'Marzo' },
  { num: 4, nombre: 'Abril' },
  { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' },
  { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' },
  { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' }
];

const COLORES = {
  VERDE: '#10b981',
  AMARILLO: '#f59e0b',
  ROJO: '#ef4444'
};

export default function ReporteEjecutivoMensual({ firmId }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [año, setAño] = useState(new Date().getFullYear());
  const [generando, setGenerando] = useState(false);

  const {
    reporte,
    loading,
    error,
    generarReporte,
    obtenerResumen,
    obtenerKPIsParaTarjetas,
    obtenerAlertas,
    obtenerComparacion,
    obtenerRecomendaciones,
    datosParaGraficoComparacion,
    exportarJSON,
    prepararParaPDF
  } = useReporteEjecutivo(firmId);

  // Generar reporte al cambiar mes/año
  useEffect(() => {
    handleGenerarReporte();
  }, [mes, año]);

  const handleGenerarReporte = async () => {
    setGenerando(true);
    await generarReporte(mes, año);
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
        <p>Selecciona un mes para generar el reporte</p>
      </div>
    );
  }

  const resumen = obtenerResumen();
  const kpis = obtenerKPIsParaTarjetas();
  const alertas = obtenerAlertas();
  const comparacion = obtenerComparacion();
  const recomendaciones = obtenerRecomendaciones();
  const datosGrafico = datosParaGraficoComparacion();

  // Datos para gráfico de pie (KPIs por status)
  const datosPie = [
    { name: 'Óptimos', value: resumen.kpis_optimos, color: COLORES.VERDE },
    { name: 'Advertencia', value: resumen.kpis_advertencia, color: COLORES.AMARILLO },
    { name: 'Críticos', value: resumen.kpis_criticos, color: COLORES.ROJO }
  ];

  const años = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporte Ejecutivo Mensual</h1>
          <p className="text-sm text-gray-500 mt-1">
            KPIs, alertas y comparativas del período seleccionado
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

      {/* Controles de período */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Mes</label>
          <Select value={mes.toString()} onValueChange={(val) => setMes(parseInt(val))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map(m => (
                <SelectItem key={m.num} value={m.num.toString()}>
                  {m.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <Button
          onClick={handleGenerarReporte}
          disabled={generando || loading}
        >
          {generando ? 'Generando...' : 'Generar'}
        </Button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{resumen.kpis_optimos}</div>
              <p className="text-xs text-gray-500 mt-1">Óptimos</p>
              <p className="text-xs text-gray-400">{resumen.porcentaje_optimo}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{resumen.kpis_advertencia}</div>
              <p className="text-xs text-gray-500 mt-1">Advertencia</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{resumen.kpis_criticos}</div>
              <p className="text-xs text-gray-500 mt-1">Críticos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{resumen.total_alertas}</div>
              <p className="text-xs text-gray-500 mt-1">Alertas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kpis" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="alertas">
            <div className="flex items-center gap-2">
              Alertas
              {resumen.total_alertas > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {resumen.total_alertas}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="comparacion">Comparación</TabsTrigger>
          <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
        </TabsList>

        {/* Tab: KPIs */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Gráfico de pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribución de KPIs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabla de KPIs críticos */}
            <div className="col-span-2 space-y-2">
              <h3 className="font-semibold text-sm">KPIs por Status</h3>

              {/* Críticos */}
              {kpis.filter(k => k.status === 'ROJO').length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-red-600">❌ Críticos ({kpis.filter(k => k.status === 'ROJO').length})</p>
                  {kpis
                    .filter(k => k.status === 'ROJO')
                    .slice(0, 3)
                    .map(kpi => (
                      <div key={kpi.id} className="text-xs bg-red-50 p-2 rounded">
                        <p className="font-semibold">{kpi.name}</p>
                        <p className="text-gray-600">{kpi.value} {kpi.unit}</p>
                      </div>
                    ))}
                </div>
              )}

              {/* Advertencia */}
              {kpis.filter(k => k.status === 'AMARILLO').length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-yellow-600">⚠️ Advertencia ({kpis.filter(k => k.status === 'AMARILLO').length})</p>
                  {kpis
                    .filter(k => k.status === 'AMARILLO')
                    .slice(0, 3)
                    .map(kpi => (
                      <div key={kpi.id} className="text-xs bg-yellow-50 p-2 rounded">
                        <p className="font-semibold">{kpi.name}</p>
                        <p className="text-gray-600">{kpi.value} {kpi.unit}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="space-y-4">
          {alertas.length > 0 ? (
            <div className="space-y-2">
              {alertas.map(alerta => (
                <Card key={alerta.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={20}
                        className={
                          alerta.prioridad === 'alta'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alerta.titulo}</p>
                        <p className="text-xs text-gray-600 mt-1">{alerta.descripcion}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {alerta.prioridad === 'alta' ? '🔴 Crítica' : '🟡 Advertencia'}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(alerta.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>✅ No hay alertas en este período</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Comparación */}
        <TabsContent value="comparacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparación Mes Anterior vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="anterior" fill="#9ca3af" name="Mes Anterior" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Mes Actual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabla de variación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalle de Variación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparacion.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="flex-1">{item.name}</span>
                    <span className="text-gray-600 w-20 text-right">{item.value_prev}</span>
                    <span className="text-gray-900 font-semibold w-20 text-right">{item.value_current}</span>
                    <span className={`w-20 text-right font-semibold ${
                      item.variation > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.variation > 0 ? '+' : ''}{item.variation}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Recomendaciones */}
        <TabsContent value="recomendaciones" className="space-y-4">
          {recomendaciones.length > 0 ? (
            <div className="space-y-3">
              {recomendaciones.map((rec, idx) => (
                <Card key={idx} className={
                  rec.prioridad === 'alta'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <TrendingUp
                        size={20}
                        className={
                          rec.prioridad === 'alta'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      />
                      <p className="text-sm">{rec.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay recomendaciones en este período</p>
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
