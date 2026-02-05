import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

/**
 * FinanceReport
 * Reporte financiero mejorado con ingresos/gastos, gráficos y filtros
 */

export default function FinanceReport({ premiseId, periodo }) {
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, income, expense

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo, filterType]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener ingresos aprobados
      const { data: incomes } = await supabase
        .from('income')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end)
        .eq('status', 'APPROVED');

      // Obtener gastos aprobados
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end)
        .eq('status', 'APPROVED');

      // Procesar datos
      const totalIncome = incomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
      const totalExpense = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const balance = totalIncome - totalExpense;

      // Agrupar por mes
      const monthly = {};
      incomes?.forEach(item => {
        const month = new Date(item.date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
        if (!monthly[month]) monthly[month] = { mes: month, ingresos: 0, egresos: 0 };
        monthly[month].ingresos += item.amount || 0;
      });

      expenses?.forEach(item => {
        const month = new Date(item.date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
        if (!monthly[month]) monthly[month] = { mes: month, ingresos: 0, egresos: 0 };
        monthly[month].egresos += item.amount || 0;
      });

      const monthlyArray = Object.values(monthly).sort((a, b) =>
        new Date(a.mes) - new Date(b.mes)
      );

      // Agrupar por categoría
      const categories = {};
      expenses?.forEach(item => {
        const cat = item.category || 'Sin categoría';
        if (!categories[cat]) categories[cat] = 0;
        categories[cat] += item.amount || 0;
      });

      const categoryArray = Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setData({
        totalIncome,
        totalExpense,
        balance,
        incomeCount: incomes?.length || 0,
        expenseCount: expenses?.length || 0,
        ratio: totalExpense > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0
      });

      setMonthlyData(monthlyArray);
      setCategoryData(categoryArray);
    } catch (err) {
      console.error('Error loading finance data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando datos financieros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Error cargando reporte</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos financieros disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-finance-title" className="text-2xl font-bold text-slate-800 mb-2">
          Reporte Financiero
        </h2>
        <p className="text-slate-600">Análisis de ingresos y gastos con visualizaciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Total Ingresos</p>
          <p data-id="report-finance-total-income" className="text-2xl font-bold text-green-900">
            ${data.totalIncome.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-green-600 mt-1">{data.incomeCount} registros</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-600 mb-1">Total Gastos</p>
          <p data-id="report-finance-total-expense" className="text-2xl font-bold text-red-900">
            ${data.totalExpense.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-red-600 mt-1">{data.expenseCount} registros</p>
        </div>

        <div className={`rounded-lg p-4 ${data.balance >= 0 ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'}`}>
          <p className={`text-sm font-medium mb-1 ${data.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            Balance
          </p>
          <p data-id="report-finance-balance" className={`text-2xl font-bold ${data.balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            ${data.balance.toLocaleString('es-AR')}
          </p>
          <p className={`text-xs mt-1 ${data.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {data.balance >= 0 ? 'Positivo' : 'Negativo'}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Índice Gasto/Ingreso</p>
          <p className="text-2xl font-bold text-purple-900">{data.ratio}%</p>
          <p className="text-xs text-purple-600 mt-1">Relación gastos</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filtrar por tipo:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            data-id="report-finance-filter"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="income">Solo Ingresos</option>
            <option value="expense">Solo Gastos</option>
          </select>
        </div>
      </div>

      {/* Gráfico de Evolución Mensual */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Evolución Mensual (Ingresos vs Gastos)</h3>
          </div>

          <div data-id="report-finance-monthly-chart" className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} />
                <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de Categorías */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Tabla de Categorías */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Gastos por Categoría</h3>
            </div>

            <div data-id="report-finance-categories-table" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Monto ($)</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categoryData.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900 capitalize">
                        {cat.name.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        ${cat.value.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {((cat.value / data.totalExpense) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Distribución de Gastos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${((value / data.totalExpense) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${value.toLocaleString('es-AR')}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Period info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Período:</strong> {periodo?.start} a {periodo?.end}
        </p>
        <p className="mt-1">
          <strong>Generado:</strong> {new Date().toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  );
}
