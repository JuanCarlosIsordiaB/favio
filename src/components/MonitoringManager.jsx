import React, { useState } from 'react';
import { CloudRain, ClipboardList, FlaskConical, Microscope, Activity, Network } from 'lucide-react';
import RainfallManager from './monitoring/RainfallManager';
import AgriculturalMonitoring from './monitoring/AgriculturalMonitoring';
import LivestockMonitoring from './monitoring/LivestockMonitoring';
import SoilAnalysis from './monitoring/SoilAnalysis';
import SeedAnalysis from './monitoring/SeedAnalysis';
import MonitoringIntegrationDashboard from './monitoring/MonitoringIntegrationDashboard';

export default function MonitoringManager({ firmId, premiseId }) {
  const [activeTab, setActiveTab] = useState('rainfall');

  // DEBUG: Validar que tenemos IDs válidos
  console.log('🔍 MonitoringManager received:', {
    firmId,
    firmIdLength: firmId?.length,
    premiseId,
    premiseIdLength: premiseId?.length
  });

  if (!premiseId) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
        <h3 className="text-red-700 font-bold mb-2">Error: Predio no seleccionado</h3>
        <p className="text-red-600">Por favor selecciona un predio antes de acceder a monitoreo.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'rainfall', label: 'Lluvias', icon: <CloudRain size={18} /> },
    { id: 'agricultural', label: 'Monitoreo Agrícola', icon: <ClipboardList size={18} /> },
    { id: 'livestock', label: 'Monitoreo Ganadero', icon: <Activity size={18} /> },
    { id: 'soil', label: 'Análisis de Suelo', icon: <FlaskConical size={18} /> },
    { id: 'seed', label: 'Análisis de Semillas', icon: <Microscope size={18} /> },
    { id: 'integration', label: 'Integración', icon: <Network size={18} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Monitoreo</h2>
          <p className="text-slate-500">Gestión de registros de monitoreo y análisis</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'rainfall' && <RainfallManager firmId={firmId} premiseId={premiseId} />}
          {activeTab === 'agricultural' && <AgriculturalMonitoring firmId={firmId} premiseId={premiseId} />}
          {activeTab === 'livestock' && <LivestockMonitoring firmId={firmId} premiseId={premiseId} />}
          {activeTab === 'soil' && <SoilAnalysis firmId={firmId} premiseId={premiseId} />}
          {activeTab === 'seed' && <SeedAnalysis firmId={firmId} premiseId={premiseId} />}
          {activeTab === 'integration' && <MonitoringIntegrationDashboard firmId={firmId} premiseId={premiseId} />}
        </div>
      </div>
    </div>
  );
}