import React, { useEffect, useState } from 'react';
import { AlertTriangle, Package, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function InventoryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { data, error } = await supabase
          .from('inputs')
          .select('*');

        if (error) throw error;

        // Filter low stock
        const lowStock = data.filter(item => item.current_stock <= item.min_stock_alert);
        setAlerts(lowStock);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  if (loading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Alertas de Stock</h3>
        <AlertTriangle size={20} className="text-orange-500" />
      </div>

      <div className="space-y-3">
        {alerts.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-3">
              <Package size={16} className="text-orange-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500 capitalize">{item.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-orange-700">{item.current_stock} {item.unit}</p>
              <p className="text-xs text-orange-600">Mín: {item.min_stock_alert}</p>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            <p>Todo el inventario está OK</p>
          </div>
        )}
      </div>
    </div>
  );
}