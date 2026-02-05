import React, { useEffect, useState } from 'react';
import { PieChart } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ExpenseChart() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('category, amount');

        if (error) throw error;

        // Group by category
        const grouped = data.reduce((acc, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
          return acc;
        }, {});

        const formatted = Object.entries(grouped).map(([category, amount]) => ({
          category,
          amount
        })).sort((a, b) => b.amount - a.amount);

        setExpenses(formatted);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, []);

  if (loading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>;

  const maxAmount = Math.max(...expenses.map(e => e.amount), 1);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Gastos por Categoría</h3>
        <PieChart size={20} className="text-slate-400" />
      </div>

      <div className="space-y-4">
        {expenses.map((item) => (
          <div key={item.category}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{item.category}</span>
              <span className="text-slate-500">USD {item.amount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(item.amount / maxAmount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <p className="text-center text-slate-400 py-4">No hay gastos registrados</p>
        )}
      </div>
    </div>
  );
}