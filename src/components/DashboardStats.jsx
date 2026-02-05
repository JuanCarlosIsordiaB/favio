import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    net: 0,
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch income
        const { data: incomeData, error: incomeError } = await supabase
          .from('income')
          .select('amount');
        
        // Fetch expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('amount');

        if (incomeError) throw incomeError;
        if (expenseError) throw expenseError;

        const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        setStats({
          income: totalIncome,
          expenses: totalExpenses,
          net: totalIncome - totalExpenses,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  if (stats.loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>)}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard 
        title="Ingresos Totales" 
        amount={stats.income} 
        icon={<TrendingUp size={24} className="text-green-600" />}
        trend="+12.5%"
        trendUp={true}
        color="bg-green-50"
      />
      <StatCard 
        title="Gastos Totales" 
        amount={stats.expenses} 
        icon={<TrendingDown size={24} className="text-red-600" />}
        trend="+5.2%"
        trendUp={false}
        color="bg-red-50"
      />
      <StatCard 
        title="Resultado Neto" 
        amount={stats.net} 
        icon={<Wallet size={24} className="text-blue-600" />}
        trend="Balance"
        trendUp={stats.net >= 0}
        color="bg-blue-50"
      />
    </div>
  );
}

function StatCard({ title, amount, icon, trend, trendUp, color }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {trend}
        </span>
      </div>
      <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-800">
        USD {amount.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}