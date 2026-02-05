import React, { useEffect, useState } from 'react';
import { Bell, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RemindersPanel() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('status', 'pending')
          .order('due_date', { ascending: true });

        if (error) throw error;
        setReminders(data || []);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReminders();
  }, []);

  if (loading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Recordatorios y Alertas</h3>
        <Bell size={20} className="text-slate-400" />
      </div>

      <div className="space-y-3">
        {reminders.map((item) => (
          <div key={item.id} className={`p-3 rounded-lg border-l-4 ${
            item.priority === 'high' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {new Date(item.due_date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{item.description}</p>
          </div>
        ))}
        {reminders.length === 0 && (
          <p className="text-center text-slate-400 py-4">No hay recordatorios pendientes</p>
        )}
      </div>
    </div>
  );
}