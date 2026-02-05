import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Tractor, Users, Package, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function CostDashboard({ selectedPremiseId = null, selectedFirmId = null }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCost: 0,
    avgCostPerWork: 0,
    inputsCost: 0,
    machineryCost: 0,
    laborCost: 0,
    otherCost: 0,
    workCount: 0
  });
  const [costsByLot, setCostsByLot] = useState([]);
  const [costsByMonth, setCostsByMonth] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);

  // Get premise ID from props or localStorage
  const premiseId = selectedPremiseId || localStorage.getItem('selectedPremiseId');

  useEffect(() => {
    if (premiseId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [premiseId]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Obtener trabajos agrícolas aprobados o cerrados
      const { data: works, error: worksError } = await supabase
        .from('agricultural_works')
        .select(`
          id,
          date,
          lot_id,
          lots(name),
          hectares
        `)
        .eq('premise_id', premiseId)
        .in('status', ['APPROVED', 'CLOSED']);

      if (worksError) throw worksError;

      // Obtener trabajos ganaderos aprobados o cerrados
      const { data: livestockWorks, error: livestockError } = await supabase
        .from('livestock_works')
        .select(`
          id,
          date,
          herd_id,
          herds(name)
        `)
        .eq('premise_id', premiseId)
        .in('status', ['APPROVED', 'CLOSED']);

      if (livestockError) throw livestockError;

      // Obtener costos de insumos desde work_inputs
      const { data: inputCosts, error: inputCostsError } = await supabase
        .from('work_inputs')
        .select('agricultural_work_id, livestock_work_id, total_cost');

      if (inputCostsError) throw inputCostsError;

      // Obtener costos de maquinaria desde work_machinery
      const { data: machineryCosts, error: machineryCostsError } = await supabase
        .from('work_machinery')
        .select('agricultural_work_id, livestock_work_id, total_cost');

      if (machineryCostsError) throw machineryCostsError;

      // Obtener costos de mano de obra desde work_labor
      const { data: laborCosts, error: laborCostsError } = await supabase
        .from('work_labor')
        .select('agricultural_work_id, livestock_work_id, total_cost');

      if (laborCostsError) throw laborCostsError;

      // Combinar datos de trabajos
      const allWorks = [
        ...works.map(w => ({
          ...w,
          lot_or_herd_name: w.lots?.name || 'Lote Sin Nombre',
          type: 'agricultural'
        })),
        ...livestockWorks.map(w => ({
          ...w,
          lot_or_herd_name: w.herds?.name || 'Rebaño Sin Nombre',
          hectares: 0,
          type: 'livestock'
        }))
      ];

      // Función para calcular costos por trabajo
      const getWorkInputsCost = (workId, type) => {
        const field = type === 'agricultural' ? 'agricultural_work_id' : 'livestock_work_id';
        return inputCosts
          .filter(ic => ic[field] === workId && ic[field])
          .reduce((sum, ic) => sum + (ic.total_cost || 0), 0);
      };

      const getWorkMachineryCost = (workId, type) => {
        const field = type === 'agricultural' ? 'agricultural_work_id' : 'livestock_work_id';
        return machineryCosts
          .filter(mc => mc[field] === workId && mc[field])
          .reduce((sum, mc) => sum + (mc.total_cost || 0), 0);
      };

      const getWorkLaborCost = (workId, type) => {
        const field = type === 'agricultural' ? 'agricultural_work_id' : 'livestock_work_id';
        return laborCosts
          .filter(lc => lc[field] === workId && lc[field])
          .reduce((sum, lc) => sum + (lc.total_cost || 0), 0);
      };

      // Enriquecer trabajos con costos calculados
      const enrichedWorks = allWorks.map(w => {
        const inputsCostValue = getWorkInputsCost(w.id, w.type);
        const machineryCostValue = getWorkMachineryCost(w.id, w.type);
        const laborCostValue = getWorkLaborCost(w.id, w.type);
        const totalCostValue = inputsCostValue + machineryCostValue + laborCostValue;

        return {
          ...w,
          inputs_cost: inputsCostValue,
          machinery_cost: machineryCostValue,
          labor_cost: laborCostValue,
          other_costs: 0,
          total_cost: totalCostValue
        };
      });

      // Calcular métricas
      const totalCost = enrichedWorks.reduce((sum, w) => sum + (w.total_cost || 0), 0);
      const inputsCost = enrichedWorks.reduce((sum, w) => sum + (w.inputs_cost || 0), 0);
      const machineryCost = enrichedWorks.reduce((sum, w) => sum + (w.machinery_cost || 0), 0);
      const laborCost = enrichedWorks.reduce((sum, w) => sum + (w.labor_cost || 0), 0);
      const otherCost = enrichedWorks.reduce((sum, w) => sum + (w.other_costs || 0), 0);

      setMetrics({
        totalCost,
        avgCostPerWork: enrichedWorks.length > 0 ? totalCost / enrichedWorks.length : 0,
        inputsCost,
        machineryCost,
        laborCost,
        otherCost,
        workCount: enrichedWorks.length
      });

      // Costos por lote (Top 5)
      const costsByLotMap = {};
      enrichedWorks.forEach(w => {
        const lotName = w.lot_or_herd_name;
        if (!costsByLotMap[lotName]) {
          costsByLotMap[lotName] = 0;
        }
        costsByLotMap[lotName] += w.total_cost || 0;
      });

      const costsByLotArray = Object.entries(costsByLotMap)
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      setCostsByLot(costsByLotArray);

      // Costos por mes
      const costsByMonthMap = {};
      enrichedWorks.forEach(w => {
        const month = w.date.substring(0, 7); // YYYY-MM
        if (!costsByMonthMap[month]) {
          costsByMonthMap[month] = 0;
        }
        costsByMonthMap[month] += w.total_cost || 0;
      });

      const costsByMonthArray = Object.entries(costsByMonthMap)
        .map(([month, cost]) => ({ month, cost }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setCostsByMonth(costsByMonthArray);

      // Desglose de costos (Pie chart)
      const breakdown = [];
      if (inputsCost > 0) breakdown.push({ name: 'Insumos', value: inputsCost, color: '#10b981' });
      if (machineryCost > 0) breakdown.push({ name: 'Maquinaria', value: machineryCost, color: '#3b82f6' });
      if (laborCost > 0) breakdown.push({ name: 'Mano de Obra', value: laborCost, color: '#f59e0b' });
      if (otherCost > 0) breakdown.push({ name: 'Otros', value: otherCost, color: '#8b5cf6' });

      setCostBreakdown(breakdown);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      toast.error('Error al cargar el dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin mr-2" size={32} />
        <p className="text-slate-600">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div data-id="dashboard-kpi-total-cost" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Costo Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                ${metrics.totalCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="text-green-600" size={40} />
          </div>
        </div>

        <div data-id="dashboard-kpi-avg-cost" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Costo Promedio/Trabajo</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                ${metrics.avgCostPerWork.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="text-blue-600" size={40} />
          </div>
        </div>

        <div data-id="dashboard-kpi-work-count" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Trabajos Ejecutados</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {metrics.workCount}
              </p>
            </div>
            <Tractor className="text-orange-600" size={40} />
          </div>
        </div>
      </div>

      {/* Desglose de Costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div data-id="dashboard-breakdown-inputs" className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Package className="text-green-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Insumos</p>
              <p className="text-lg font-bold text-slate-900">
                ${metrics.inputsCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        <div data-id="dashboard-breakdown-machinery" className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Tractor className="text-blue-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Maquinaria</p>
              <p className="text-lg font-bold text-slate-900">
                ${metrics.machineryCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        <div data-id="dashboard-breakdown-labor" className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="text-orange-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Mano de Obra</p>
              <p className="text-lg font-bold text-slate-900">
                ${metrics.laborCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        <div data-id="dashboard-breakdown-other" className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <DollarSign className="text-purple-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Otros Costos</p>
              <p className="text-lg font-bold text-slate-900">
                ${metrics.otherCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costos por Lote */}
        <div data-id="dashboard-chart-lots" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Lotes por Costo</h3>
          {costsByLot.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costsByLot}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
                <Bar dataKey="cost" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Sin datos de costos
            </div>
          )}
        </div>

        {/* Desglose de Costos (Pie) */}
        <div data-id="dashboard-chart-distribution" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribución de Costos</h3>
          {costBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${(value / 1000).toFixed(1)}k`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Sin datos de costos
            </div>
          )}
        </div>
      </div>

      {/* Evolución Mensual */}
      {costsByMonth.length > 0 && (
        <div data-id="dashboard-chart-monthly" className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Evolución de Costos Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Costo Total"
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {metrics.workCount === 0 && (
        <div data-id="dashboard-empty-state" className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <DollarSign className="mx-auto text-slate-400 mb-3" size={40} />
          <p className="text-slate-600 text-lg font-medium">No hay trabajos aprobados o cerrados</p>
          <p className="text-slate-500 text-sm mt-1">Los datos de costos aparecerán aquí una vez que apruebes trabajos</p>
        </div>
      )}
    </div>
  );
}
