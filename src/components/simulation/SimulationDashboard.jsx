/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * SimulationDashboard.jsx - Dashboard Principal
 *
 * Funcionalidad:
 * - Vista principal del módulo de simulación
 * - KPIs principales
 * - Tabs para diferentes simulaciones
 * - Lista de escenarios recientes
 * - Alertas predictivas activas
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Zap, AlertTriangle, TrendingUp, DollarSign, Loader, Plus,
  Play, Trash2, ArrowRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import useScenarios from '../../hooks/useScenarios';
import ScenarioBuilder from './ScenarioBuilder';
import ScenarioComparison from './ScenarioComparison';
import { supabase } from '../../lib/supabase';

export default function SimulationDashboard({
  selectedFirmId,
  selectedPremiseId,
  selectedLotId
}) {
  const [activeTab, setActiveTab] = useState('scenarios');
  const [showBuilder, setShowBuilder] = useState(false);
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const { scenarios, loading, loadScenarios, executeSimulation, deleteScenario } =
    useScenarios(selectedFirmId, selectedPremiseId);

  // Cargar escenarios y alertas al montar
  useEffect(() => {
    loadScenarios({ limit: 20 });
    loadPredictiveAlerts();
  }, [selectedFirmId, selectedPremiseId]);

  /**
   * Cargar alertas predictivas activas
   */
  const loadPredictiveAlerts = async () => {
    if (!selectedFirmId) return;

    setAlertsLoading(true);
    try {
      const { data, error } = await supabase
        .from('predictive_alerts')
        .select('*')
        .eq('firm_id', selectedFirmId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPredictiveAlerts(data || []);
    } catch (error) {
      console.error('Error cargando alertas:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  /**
   * Ejecutar simulación
   */
  const handleExecuteSimulation = async (scenarioId) => {
    try {
      await executeSimulation(scenarioId);
      toast.success('Simulación ejecutada');
    } catch (error) {
      toast.error('Error ejecutando simulación');
    }
  };

  /**
   * Eliminar escenario
   */
  const handleDeleteScenario = async (scenarioId) => {
    try {
      await deleteScenario(scenarioId);
      toast.success('Escenario eliminado');
    } catch (error) {
      toast.error('Error eliminando escenario');
    }
  };

  // Calcular estadísticas
  const executedScenarios = scenarios.filter(s => s.status === 'EXECUTED');
  const activeScenarios = scenarios.filter(s => s.status === 'DRAFT');
  const totalMargin = executedScenarios.reduce((sum, s) => sum + (s.results?.margin || 0), 0);
  const avgROI = executedScenarios.length > 0
    ? executedScenarios.reduce((sum, s) => sum + (s.results?.roi_percent || 0), 0) / executedScenarios.length
    : 0;

  // Datos para gráficos
  const marginByScenario = scenarios
    .filter(s => s.status === 'EXECUTED')
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      margin: s.results?.margin || 0,
      roi: s.results?.roi_percent || 0
    }));

  const typeDistribution = [
    { name: 'Carga Animal', value: scenarios.filter(s => s.simulation_type === 'CARGA_ANIMAL').length },
    { name: 'Agrícola', value: scenarios.filter(s => s.simulation_type === 'PRODUCCION').length },
    { name: 'Económico', value: scenarios.filter(s => s.simulation_type === 'ECONOMICO').length },
    { name: 'Integral', value: scenarios.filter(s => s.simulation_type === 'INTEGRAL').length }
  ].filter(item => item.value > 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="p-6 space-y-6">
      {/* Header con título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            ✨ Simulación y Toma de Decisiones
          </h1>
          <p className="text-slate-600 mt-1">
            Motor de análisis estratégico para proyecciones agrícolas y ganaderas
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuevo Escenario
        </button>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Escenarios Totales */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Escenarios Totales</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{scenarios.length}</p>
              </div>
              <Zap className="text-blue-600" size={40} />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Alertas Activas */}
        <Card className={predictiveAlerts.length > 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Alertas Predictivas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{predictiveAlerts.length}</p>
              </div>
              <AlertTriangle
                className={predictiveAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}
                size={40}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Margen Total */}
        <Card className={totalMargin >= 0 ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Margen Total Simulado</p>
                <p className={`text-3xl font-bold mt-2 ${totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(totalMargin / 1000).toFixed(1)}k
                </p>
              </div>
              <DollarSign className="text-slate-400" size={40} />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: ROI Promedio */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">ROI Promedio</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{avgROI.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-purple-600" size={40} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Predictivas */}
      {predictiveAlerts.length > 0 && (
        <Alert className="border-l-4 border-l-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-3 text-red-800">
            <strong>{predictiveAlerts.length} alerta(s) predictiva(s)</strong> requieren atención.
            Revisa el tab de "Alertas Predictivas" para más detalles.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scenarios">
            Escenarios
            <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs">
              {scenarios.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="livestock">Ganadería</TabsTrigger>
          <TabsTrigger value="agricultural">Agrícola</TabsTrigger>
          <TabsTrigger value="economic">Económico</TabsTrigger>
          <TabsTrigger value="comparison">Comparación</TabsTrigger>
        </TabsList>

        {/* Tab: Escenarios */}
        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lista de escenarios */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-900">Escenarios Recientes</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="animate-spin text-blue-600" />
                  </div>
                ) : scenarios.length === 0 ? (
                  <p className="text-slate-600 text-center py-4">
                    No hay escenarios creados. Crea uno para comenzar.
                  </p>
                ) : (
                  scenarios.slice(0, 8).map(scenario => (
                    <div
                      key={scenario.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 text-sm">
                            {scenario.name}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1">
                            {scenario.simulation_type} • {scenario.scenario_type}
                          </p>
                          {scenario.status === 'EXECUTED' && scenario.results && (
                            <div className="mt-2 text-xs space-y-1">
                              <p className="text-slate-700">
                                <strong>Margen:</strong> ${(scenario.results.margin || 0).toFixed(0)}
                              </p>
                              <p className="text-slate-700">
                                <strong>ROI:</strong> {(scenario.results.roi_percent || 0).toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {scenario.status === 'DRAFT' ? (
                            <button
                              onClick={() => handleExecuteSimulation(scenario.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Ejecutar simulación"
                            >
                              <Play size={16} />
                            </button>
                          ) : (
                            <button
                              className="p-2 text-green-600 rounded"
                              title="Ejecutado"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteScenario(scenario.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Gráficos de distribución */}
            <div className="space-y-4">
              {marginByScenario.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-slate-900">Margen por Escenario</h3>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={marginByScenario}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
                        <Bar dataKey="margin" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {typeDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-slate-900">Distribución por Tipo</h3>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={typeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1 text-xs">
                      {typeDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span>{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Simulación Ganadera */}
        <TabsContent value="livestock">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">
                El constructor de escenarios te permite crear simulaciones ganaderas.
              </p>
              <button
                onClick={() => setShowBuilder(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Crear Simulación Ganadera
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Simulación Agrícola */}
        <TabsContent value="agricultural">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">
                Crea simulaciones agrícolas con parámetros de producción y costos.
              </p>
              <button
                onClick={() => setShowBuilder(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Crear Simulación Agrícola
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Simulación Económica */}
        <TabsContent value="economic">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">
                Analiza rentabilidad, márgenes y sensibilidad de precios.
              </p>
              <button
                onClick={() => setShowBuilder(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Crear Simulación Económica
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comparación de Escenarios */}
        <TabsContent value="comparison">
          <ScenarioComparison
            scenarios={scenarios.filter(s => s.status === 'EXECUTED')}
            firmId={selectedFirmId}
          />
        </TabsContent>
      </Tabs>

      {/* Modal: Constructor de Escenarios */}
      {showBuilder && (
        <ScenarioBuilder
          firmId={selectedFirmId}
          premiseId={selectedPremiseId}
          lotId={selectedLotId}
          onClose={() => setShowBuilder(false)}
          onScenarioCreated={() => loadScenarios()}
        />
      )}
    </div>
  );
}
