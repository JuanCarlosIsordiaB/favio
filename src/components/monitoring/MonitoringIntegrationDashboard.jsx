/**
 * MonitoringIntegrationDashboard.jsx
 *
 * Dashboard de Integración de Monitoreo
 * Muestra correlaciones y recomendaciones automáticas basadas en datos de monitoreo
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import MonitoringMapOverlay from './MonitoringMapOverlay';
import {
  RefreshCw,
  CloudRain,
  Sprout,
  FlaskConical,
  Wheat,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Loader
} from 'lucide-react';
import {
  ajustarCargaAnimalPorPastura,
  verificarAjustesLluviaPredio,
  generarRecomendacionFertilizacion,
  correlacionarNDVIRendimiento,
  ejecutarVerificacionesAutomaticas
} from '../../services/monitoringIntegration';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function MonitoringIntegrationDashboard({ firmId, premiseId }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados para cada sección
  const [ajustesCarga, setAjustesCarga] = useState([]);
  const [ajustesLluvia, setAjustesLluvia] = useState([]);
  const [recomendacionesFert, setRecomendacionesFert] = useState([]);
  const [correlacionNDVI, setCorrelacionNDVI] = useState(null);
  const [resumenVerificaciones, setResumenVerificaciones] = useState(null);

  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [lotesDisponibles, setLotesDisponibles] = useState([]);

  // Cargar lotes disponibles
  useEffect(() => {
    if (premiseId) {
      fetchLotes();
    }
  }, [premiseId]);

  const fetchLotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select('id, name')
        .eq('premise_id', premiseId)
        .order('name');

      if (error) throw error;
      setLotesDisponibles(data || []);
      if (data && data.length > 0) {
        setLoteSeleccionado(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando lotes:', error);
    }
  };

  // Cargar todas las verificaciones
  const cargarVerificaciones = async () => {
    if (!premiseId) return;

    setLoading(true);
    try {
      // 1. Ajustes de carga animal
      const carga = await ajustarCargaAnimalPorPastura(premiseId);
      setAjustesCarga(carga);

      // 2. Ajustes por lluvia
      const lluvia = await verificarAjustesLluviaPredio(premiseId);
      setAjustesLluvia(lluvia);

      // 3. Recomendaciones de fertilización (por lote seleccionado)
      if (loteSeleccionado) {
        const fert = await generarRecomendacionFertilizacion(loteSeleccionado);
        setRecomendacionesFert([fert]);
      }

      // 4. Correlación NDVI (por lote seleccionado)
      if (loteSeleccionado) {
        const ndvi = await correlacionarNDVIRendimiento(loteSeleccionado);
        setCorrelacionNDVI(ndvi);
      }

      // 5. Resumen general
      const resumen = await ejecutarVerificacionesAutomaticas(firmId, premiseId);
      setResumenVerificaciones(resumen);

    } catch (error) {
      console.error('Error cargando verificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (premiseId && firmId) {
      cargarVerificaciones();
    }
  }, [premiseId, firmId, loteSeleccionado]);

  // Componente de resumen general
  const OverviewCard = () => {
    if (!resumenVerificaciones) return null;

    const stats = [
      {
        icon: CloudRain,
        label: 'Proyecciones Revisadas',
        value: resumenVerificaciones.verificaciones.ajustesLluvia?.proyeccionesRevisadas || 0,
        alert: resumenVerificaciones.verificaciones.ajustesLluvia?.requierenAtencion || 0,
        color: 'text-blue-600'
      },
      {
        icon: Sprout,
        label: 'Lotes Sobrecargados',
        value: resumenVerificaciones.verificaciones.ajustesCarga?.sobrecargados || 0,
        total: resumenVerificaciones.verificaciones.ajustesCarga?.lotesRevisados || 0,
        color: 'text-green-600'
      },
      {
        icon: FlaskConical,
        label: 'Lotes Requieren Fertilización',
        value: resumenVerificaciones.verificaciones.fertilizacion?.lotesPendientes || 0,
        total: resumenVerificaciones.verificaciones.fertilizacion?.lotesRevisados || 0,
        color: 'text-purple-600'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                    {stat.total && <span className="text-sm text-slate-400 ml-1">/ {stat.total}</span>}
                    {stat.alert > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {stat.alert} urgentes
                      </Badge>
                    )}
                  </p>
                </div>
                <stat.icon className={`w-10 h-10 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Componente de ajustes de carga animal
  const CargaAnimalSection = () => (
    <div className="space-y-4">
      {ajustesCarga.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-slate-500">
            No hay datos de carga animal disponibles
          </CardContent>
        </Card>
      ) : (
        ajustesCarga.map((ajuste, idx) => (
          <Card key={idx} className={ajuste.prioridad === 'alta' ? 'border-red-500 border-2' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sprout className="w-5 h-5" />
                  {ajuste.lot_name}
                </CardTitle>
                <Badge variant={
                  ajuste.accion === 'reducir' ? 'destructive' :
                  ajuste.accion === 'aumentar' ? 'default' : 'secondary'
                }>
                  {ajuste.accion.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-600">Altura Pastura</p>
                  <p className="text-lg font-semibold">{ajuste.altura_actual} cm</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Carga Actual</p>
                  <p className="text-lg font-semibold">{ajuste.carga_actual} animales</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Carga Recomendada</p>
                  <p className="text-lg font-semibold text-green-600">{ajuste.carga_recomendada} animales</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Diferencia</p>
                  <p className={`text-lg font-semibold ${ajuste.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ajuste.diferencia > 0 ? '+' : ''}{ajuste.diferencia}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{ajuste.mensaje}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Componente de ajustes por lluvia
  const AjustesLluviaSection = () => (
    <div className="space-y-4">
      {ajustesLluvia.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-slate-500">
            No hay proyecciones activas para ajustar
          </CardContent>
        </Card>
      ) : (
        ajustesLluvia.map((ajuste, idx) => (
          <Card key={idx} className={ajuste.prioridad === 'alta' ? 'border-orange-500 border-2' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Proyección #{ajuste.proyeccionId.slice(0, 8)}</span>
                </div>
                {ajuste.requiereAtencion && (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Atención Requerida
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-600">Factor de Ajuste</p>
                  <p className="text-lg font-semibold">{(ajuste.factorAjuste * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Rend. Original</p>
                  <p className="text-lg font-semibold">{ajuste.rendimientoOriginal} kg/ha</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Rend. Ajustado</p>
                  <p className="text-lg font-semibold text-orange-600">{Math.round(ajuste.rendimientoAjustado)} kg/ha</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">{ajuste.descripcion}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Componente de correlación NDVI
  const CorrelacionNDVISection = () => {
    if (!correlacionNDVI) return null;

    if (!correlacionNDVI.disponible) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-slate-500">
            {correlacionNDVI.mensaje}
          </CardContent>
        </Card>
      );
    }

    // Preparar datos para scatter plot
    const scatterData = correlacionNDVI.datos.map(d => ({
      ndvi: d.ndvi_promedio,
      rendimiento: d.rendimiento_real,
      cultivo: d.cultivo
    }));

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="w-5 h-5" />
              Correlación NDVI vs Rendimiento
            </CardTitle>
            <CardDescription>
              Análisis basado en {correlacionNDVI.muestras} cosechas históricas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-slate-600">Coeficiente R²</p>
                <p className="text-2xl font-bold">{correlacionNDVI.correlacion.r2}</p>
                <Badge variant={
                  correlacionNDVI.correlacion.fuerza === 'fuerte' ? 'default' :
                  correlacionNDVI.correlacion.fuerza === 'moderada' ? 'secondary' : 'outline'
                }>
                  {correlacionNDVI.correlacion.fuerza}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-600">NDVI Actual</p>
                <p className="text-2xl font-bold text-green-600">
                  {correlacionNDVI.ndviActual?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Rendimiento Proyectado</p>
                <p className="text-2xl font-bold text-orange-600">
                  {correlacionNDVI.rendimientoProyectado || 'N/A'} kg/ha
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Ecuación</p>
                <p className="text-sm font-mono mt-2">{correlacionNDVI.ecuacion.formula}</p>
              </div>
            </div>

            {/* Gráfico de dispersión */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="ndvi"
                    name="NDVI"
                    domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    label={{ value: 'NDVI Promedio', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="rendimiento"
                    name="Rendimiento"
                    label={{ value: 'Rendimiento (kg/ha)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                            <p className="font-semibold">{payload[0].payload.cultivo}</p>
                            <p className="text-sm">NDVI: {payload[0].value}</p>
                            <p className="text-sm">Rendimiento: {payload[1].value} kg/ha</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter name="Cosechas Históricas" data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Integración de Monitoreo</h2>
          <p className="text-sm text-slate-600">
            Correlaciones y recomendaciones automáticas basadas en datos de campo
          </p>
        </div>
        <Button onClick={cargarVerificaciones} disabled={loading}>
          {loading ? (
            <Loader className="animate-spin mr-2" size={16} />
          ) : (
            <RefreshCw className="mr-2" size={16} />
          )}
          Actualizar
        </Button>
      </div>

      {/* Resumen general */}
      <OverviewCard />

      {/* Tabs de detalles */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="carga">Carga Animal</TabsTrigger>
          <TabsTrigger value="ndvi">Correlación NDVI</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AjustesLluviaSection />
        </TabsContent>

        <TabsContent value="carga">
          <CargaAnimalSection />
        </TabsContent>

        <TabsContent value="ndvi">
          {/* Selector de lote */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleccionar Lote para Análisis NDVI
              </label>
              <select
                value={loteSeleccionado || ''}
                onChange={(e) => setLoteSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {lotesDisponibles.map(lote => (
                  <option key={lote.id} value={lote.id}>{lote.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <CorrelacionNDVISection />
        </TabsContent>

        <TabsContent value="mapa">
          <MonitoringMapOverlay premiseId={premiseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
