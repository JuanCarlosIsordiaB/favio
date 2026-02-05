import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LicenseSummary() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLicenses() {
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*, firms(name)')
          .eq('status', 'active');

        if (error) throw error;
        setLicenses(data || []);
      } catch (error) {
        console.error('Error fetching licenses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLicenses();
  }, []);

  if (loading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse"></div>;

  const totalRevenue = licenses.reduce((sum, lic) => sum + Number(lic.price), 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Licencias Activas</h3>
        <CreditCard size={20} className="text-slate-400" />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-800">{licenses.length}</p>
            <p className="text-sm text-slate-500">Clientes Activos</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-green-600">USD {totalRevenue}</p>
            <p className="text-sm text-slate-500">Facturación Mensual</p>
          </div>
        </div>

        <div className="space-y-3">
          {licenses.slice(0, 3).map((license) => (
            <div key={license.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{license.firms?.name || 'Firma'}</p>
                  <p className="text-xs text-slate-500 capitalize">Plan {license.plan_type}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-700">USD {license.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}