/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Componente para reportes avanzados: eficiencia y cumplimiento
 *
 * Funcionalidad:
 * - Eficiencia de ejecución (tiempo vs estimado)
 * - Cumplimiento de presupuesto
 * - Análisis por lote, centro de costo, tipo de trabajo
 * - Desglose de costos y productividad
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  DollarSign, Clock, Target, Zap, Loader, BarChart3
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../ui/card';

export default function AdvancedReports({ activeTab = 'agricultural' }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    efficiency: 0,
    budgetCompliance: 0,
    onTimePercentage: 0,
    costVariance: 0,
    totalCost: 0,
    estimatedCost: 0,
    totalWorkCount: 0,
    completedWorkCount: 0,
    costByLot: [],
    costByType: [],
    efficiencyTrend: [],
    budgetAnalysis: []
  });
  const [reportType, setReportType] = useState('efficiency');

  useEffect(() => {
    loadReportData();
  }, [activeTab]);

  async function loadReportData() {
    setLoading(true);
    try {
      const worksTable = activeTab === 'agricultural' ? 'agricultural_works' : 'livestock_works';
      const projectionsTable = activeTab === 'agricultural' ? 'proyecciones_agricolas' : 'proyecciones_ganaderas';

      // Cargar trabajos completados (SIN campos de costos que no existen)
      const { data: works, error: worksError } = await supabase
        .from(worksTable)
        .select(`
          id,
          date,
          ${activeTab === 'agricultural' ? 'work_type' : 'event_type'},
          status,
          hectares,
          lots(name),
          cost_centers(code, name)
        `)
        .in('status', ['APPROVED', 'CLOSED']);

      if (worksError) throw worksError;

      // Cargar costos desde tablas relacionadas
      const { data: inputCosts } = await supabase.from('work_inputs').select('agricultural_work_id, livestock_work_id, total_cost');
      const { data: machineryCosts } = await supabase.from('work_machinery').select('agricultural_work_id, livestock_work_id, total_cost');
      const { data: laborCosts } = await supabase.from('work_labor').select('agricultural_work_id, livestock_work_id, total_cost');

      // Enriquecer trabajos con costos calculados
      const enrichedWorks = works.map(work => {
        const workIdField = activeTab === 'agricultural' ? 'agricultural_work_id' : 'livestock_work_id';
        const inputs_cost = (inputCosts || []).filter(ic => ic[workIdField] === work.id).reduce((sum, ic) => sum + (ic.total_cost || 0), 0);
        const machinery_cost = (machineryCosts || []).filter(mc => mc[workIdField] === work.id).reduce((sum, mc) => sum + (mc.total_cost || 0), 0);
        const labor_cost = (laborCosts || []).filter(lc => lc[workIdField] === work.id).reduce((sum, lc) => sum + (lc.total_cost || 0), 0);
        const other_costs = 0; // Por ahora, sin tabla específica para otros costos

        return {
          ...work,
          inputs_cost,
          machinery_cost,
          labor_cost,
          other_costs
        };
      });

      // Cargar proyecciones
      const { data: projections, error: projError } = await supabase
        .from(projectionsTable)
        .select(`
          id,
          fecha_tentativa,
          ${activeTab === 'agricultural' ? 'cultivo_proyectado' : 'tipo_evento'},
          estimated_total_cost,
          estado,
          hectareas
        `);

      if (projError) throw projError;

      // Usar enrichedWorks en lugar de works
      // Calcular métricas
      const totalCost = enrichedWorks.reduce((sum, w) => sum + ((w.inputs_cost || 0) + (w.machinery_cost || 0) + (w.labor_cost || 0) + (w.other_costs || 0)), 0);
      const estimatedCost = projections.reduce((sum, p) => sum + (p.estimated_total_cost || 0), 0);
      const costVariance = estimatedCost > 0 ? ((totalCost - estimatedCost) / estimatedCost) * 100 : 0;
      const completedWorkCount = enrichedWorks.filter(w => w.status === 'CLOSED' || w.status === 'APPROVED').length;
      const totalWorkCount = enrichedWorks.length;
      const efficiency = totalWorkCount > 0 ? (completedWorkCount / totalWorkCount) * 100 : 0;

      // Calcular cumplimiento de tiempo
      let onTimeCount = 0;
      enrichedWorks.forEach(work => {
        const projection = projections.find(p => {
          const projDate = new Date(p.fecha_tentativa);
          const workDate = new Date(work.date);
          return Math.abs((projDate - workDate) / (1000 * 60 * 60 * 24)) < 3; // Menos de 3 días de diferencia
        });
        if (projection) onTimeCount++;
      });
      const onTimePercentage = totalWorkCount > 0 ? (onTimeCount / totalWorkCount) * 100 : 0;

      // Cumplimiento presupuestario
      const budgetCompliance = estimatedCost > 0 ? Math.max(0, 100 - Math.abs(costVariance)) : 100;

      // Costos por lote
      const costByLotMap = {};
      enrichedWorks.forEach(w => {
        const lotName = w.lots?.name || 'Sin lote';
        if (!costByLotMap[lotName]) {
          costByLotMap[lotName] = 0;
        }
        costByLotMap[lotName] += (w.inputs_cost || 0) + (w.machinery_cost || 0) + (w.labor_cost || 0) + (w.other_costs || 0);
      });

      const costByLot = Object.entries(costByLotMap)
        .map(([name, cost]) => ({ name, cost: parseFloat(cost.toFixed(2)) }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      // Costos por tipo de trabajo
      const costByTypeMap = {};
      enrichedWorks.forEach(w => {
        const typeName = w.work_type || w.event_type || 'Sin tipo';
        if (!costByTypeMap[typeName]) {
          costByTypeMap[typeName] = 0;
        }
        costByTypeMap[typeName] += (w.inputs_cost || 0) + (w.machinery_cost || 0) + (w.labor_cost || 0) + (w.other_costs || 0);
      });

      const costByType = Object.entries(costByTypeMap)
        .map(([name, cost]) => ({ name, value: parseFloat(cost.toFixed(2)) }))
        .sort((a, b) => b.value - a.value);

      // Tendencia de eficiencia (últimos 6 meses)
      const efficiencyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        const monthWorks = enrichedWorks.filter(w => {
          const wDate = new Date(w.date);
          return wDate.getMonth() === date.getMonth() && wDate.getFullYear() === date.getFullYear();
        });
        const monthCompleted = monthWorks.filter(w => w.status === 'CLOSED' || w.status === 'APPROVED').length;
        const monthEfficiency = monthWorks.length > 0 ? (monthCompleted / monthWorks.length) * 100 : 0;
        efficiencyTrend.push({
          month: monthStr,
          efficiency: parseFloat(monthEfficiency.toFixed(1))
        });
      }

      // Análisis presupuestario
      const budgetAnalysis = [
        {
          name: 'Insumos',
          value: parseFloat(enrichedWorks.reduce((sum, w) => sum + (w.inputs_cost || 0), 0).toFixed(2)),
          estimated: parseFloat((estimatedCost * 0.4).toFixed(2))
        },
        {
          name: 'Maquinaria',
          value: parseFloat(enrichedWorks.reduce((sum, w) => sum + (w.machinery_cost || 0), 0).toFixed(2)),
          estimated: parseFloat((estimatedCost * 0.3).toFixed(2))
        },
        {
          name: 'Mano de Obra',
          value: parseFloat(enrichedWorks.reduce((sum, w) => sum + (w.labor_cost || 0), 0).toFixed(2)),
          estimated: parseFloat((estimatedCost * 0.25).toFixed(2))
        },
        {
          name: 'Otros',
          value: parseFloat(enrichedWorks.reduce((sum, w) => sum + (w.other_costs || 0), 0).toFixed(2)),
          estimated: parseFloat((estimatedCost * 0.05).toFixed(2))
        }
      ];

      setReportData({
        efficiency: parseFloat(efficiency.toFixed(1)),
        budgetCompliance: parseFloat(budgetCompliance.toFixed(1)),
        onTimePercentage: parseFloat(onTimePercentage.toFixed(1)),
        costVariance: parseFloat(costVariance.toFixed(1)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        estimatedCost: parseFloat(estimatedCost.toFixed(2)),
        totalWorkCount,
        completedWorkCount,
        costByLot,
        costByType,
        efficiencyTrend,
        budgetAnalysis
      });
    } catch (err) {
      console.error('Error loading report data:', err);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-4">
        <Loader className="animate-spin" size={32} />
        <span className="text-slate-600">Cargando reportes...</span>
      </div>
    );
  }

  const getVarianceColor = (variance) => {
    if (variance < -10) return 'text-red-600';
    if (variance < -5) return 'text-orange-600';
    if (variance < 5) return 'text-green-600';
    if (variance < 10) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tabs de tipo de reporte */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        {['efficiency', 'budget', 'analysis'].map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
              reportType === type
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {type === 'efficiency' ? 'Eficiencia' : type === 'budget' ? 'Presupuesto' : 'Análisis'}
          </button>
        ))}
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-600">Eficiencia</h4>
              <Zap className="w-4 h-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{reportData.efficiency.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Tasa de completitud</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-600">Cumpl. Presupuesto</h4>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{reportData.budgetCompliance.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Adherencia al presupuesto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-600">A Tiempo</h4>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{reportData.onTimePercentage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Trabajos puntuales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-600">Variación Costo</h4>
              <TrendingUp className={`w-4 h-4 ${getVarianceColor(reportData.costVariance)}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${getVarianceColor(reportData.costVariance)}`}>
              {reportData.costVariance > 0 ? '+' : ''}{reportData.costVariance.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Vs presupuestado</p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido según tipo de reporte */}
      {reportType === 'efficiency' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia de eficiencia */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Tendencia de Eficiencia (6 meses)</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.efficiencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resumen de completitud */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Resumen de Completitud</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Trabajos Completados</span>
                  <span className="text-sm font-bold text-green-600">{reportData.completedWorkCount}/{reportData.totalWorkCount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(reportData.completedWorkCount / Math.max(reportData.totalWorkCount, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 space-y-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Trabajos a Tiempo:</span>
                  <span className="text-sm font-bold text-blue-600">{reportData.onTimePercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Tasa de Eficiencia:</span>
                  <span className="text-sm font-bold text-slate-900">{reportData.efficiency.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Comparación real vs estimado */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Análisis Presupuestario</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.budgetAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="estimated" fill="#94a3b8" name="Estimado" />
                  <Bar dataKey="value" fill="#3b82f6" name="Real" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Desglose de costos */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Desglose de Costos Reales</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.budgetAnalysis}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.budgetAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resumen presupuestario */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Resumen Financiero</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Presupuestado</p>
                  <p className="text-2xl font-bold text-slate-900">${reportData.estimatedCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ejecutado</p>
                  <p className="text-2xl font-bold text-blue-600">${reportData.totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Diferencia</p>
                  <p className={`text-2xl font-bold ${reportData.costVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {reportData.costVariance > 0 ? '+' : ''}${(reportData.totalCost - reportData.estimatedCost).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Costos por lote */}
          {reportData.costByLot.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Costos por Lote (Top 5)</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.costByLot}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="cost" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distribución de costos por tipo */}
          {reportData.costByType.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Distribución por Tipo de Trabajo</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.costByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.costByType.map((entry, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detalle por lote */}
          {reportData.costByLot.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Detalle de Costos por Lote</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-600">Lote</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600">Costo</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-600">% del Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.costByLot.map((lot, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-900">{lot.name}</td>
                          <td className="text-right py-3 px-3 text-slate-600">${lot.cost.toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-slate-600">
                            {((lot.cost / reportData.totalCost) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
