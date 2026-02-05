import React from 'react';
import DashboardStats from './DashboardStats';
import ExpenseChart from './ExpenseChart';
import InventoryAlerts from './InventoryAlerts';
import RemindersPanel from './RemindersPanel';

export default function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
        <p className="text-slate-500">Resumen general de Campo Gestor</p>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ExpenseChart />
        <InventoryAlerts />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RemindersPanel />
      </div>
    </div>
  );
}