import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Calendar, Filter, AlertTriangle, TrendingUp, DollarSign, Package, Users, Activity, Beef, BarChart3, Zap } from 'lucide-react';
import CargaAnimalReport from './reports/gerenciales/CargaAnimalReport';
import ProduccionCarneReport from './reports/gerenciales/ProduccionCarneReport';
import EstadoResultadosReport from './reports/gerenciales/EstadoResultadosReport';
import CashflowReport from './reports/gerenciales/CashflowReport';
import IndicesProductivosReport from './reports/gerenciales/IndicesProductivosReport';
import ExportToolbar from './reports/ExportToolbar';
import FinanceReport from './reports/operativos/FinanceReport';
import InventoryReport from './reports/operativos/InventoryReport';
import LivestockReport from './reports/operativos/LivestockReport';
import WorkReport from './reports/operativos/WorkReport';
import AlertsReport from './reports/operativos/AlertsReport';
import ReporteEjecutivoMensual from './reports/estandarizados/ReporteEjecutivoMensual';
import ReporteComparativoAnual from './reports/estandarizados/ReporteComparativoAnual';
import ReporteAprendizaje from './reports/estandarizados/ReporteAprendizaje';

export default function ReportsManager({ firmId, premiseId }) {
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    {
      id: 'finance',
      name: 'Reporte Financiero',
      description: 'Ingresos, gastos y balance general',
      icon: <DollarSign size={24} />
    },
    {
      id: 'inventory',
      name: 'Reporte de Inventario',
      description: 'Estado de insumos y stock actual',
      icon: <Package size={24} />
    },
    {
      id: 'livestock',
      name: 'Reporte Ganadero',
      description: 'Estado del ganado y monitoreo',
      icon: <Activity size={24} />
    },
    {
      id: 'work',
      name: 'Reporte de Trabajos',
      description: 'Trabajos realizados y proyecciones',
      icon: <Users size={24} />
    },
    {
      id: 'alerts',
      name: 'Reporte de Alertas',
      description: 'Alertas y recordatorios pendientes',
      icon: <AlertTriangle size={24} />
    },
    {
      id: 'productivity',
      name: 'Reporte de Productividad',
      description: 'Análisis de rendimiento por lote',
      icon: <TrendingUp size={24} />
    },
    {
      id: 'carga_animal',
      name: 'Carga Animal',
      description: 'Análisis de peso y densidad de animales',
      icon: <Beef size={24} />
    },
    {
      id: 'produccion_carne',
      name: 'Producción de Carne',
      description: 'Fórmula obligatoria de producción',
      icon: <TrendingUp size={24} />
    },
    {
      id: 'estado_resultados',
      name: 'Estado de Resultados (P&L)',
      description: 'Análisis de ingresos, gastos y rentabilidad',
      icon: <BarChart3 size={24} />
    },
    {
      id: 'cashflow',
      name: 'Flujo de Caja (Cashflow)',
      description: 'Análisis de ingresos vs egresos y saldo',
      icon: <DollarSign size={24} />
    },
    {
      id: 'indices',
      name: 'Índices Productivos',
      description: 'KPIs: Producción, Producción/Ha, Costo/Kg',
      icon: <Zap size={24} />
    },
    {
      id: 'ejecutivo_mensual',
      name: 'Reporte Ejecutivo Mensual',
      description: 'KPIs clave, alertas y comparación intermensual',
      icon: <BarChart3 size={24} />
    },
    {
      id: 'comparativo_anual',
      name: 'Reporte Comparativo Anual',
      description: 'Comparación de lotes, rodeos y estrategias por año',
      icon: <TrendingUp size={24} />
    },
    {
      id: 'aprendizaje',
      name: 'Reporte de Aprendizaje',
      description: 'Decisiones → Resultados → Impacto económico real',
      icon: <TrendingUp size={24} />
    },
    {
      id: 'deuda_proveedor',
      name: 'Deuda por Proveedor',
      description: 'Facturas pendientes agrupadas por proveedor',
      icon: <Users size={24} />
    },
    {
      id: 'ingresos_pendientes',
      name: 'Ingresos Pendientes de Cobro',
      description: 'Clientes con cobros pendientes',
      icon: <DollarSign size={24} />
    },
    {
      id: 'cobranzas_realizadas',
      name: 'Historial de Cobranzas',
      description: 'Registro de cobranzas efectuadas',
      icon: <TrendingUp size={24} />
    }
  ];

  const generateReport = async () => {
    if (!reportType || !dateFrom || !dateTo) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      let reportData = {};

      switch (reportType) {
        // Reportes Operativos (nuevos componentes)
        case 'finance':
          reportData = { type: 'finance' };
          break;
        case 'inventory':
          reportData = { type: 'inventory' };
          break;
        case 'livestock':
          reportData = { type: 'livestock' };
          break;
        case 'work':
          reportData = { type: 'work' };
          break;
        case 'alerts':
          reportData = { type: 'alerts' };
          break;
        case 'productivity':
          reportData = { type: 'productivity' };
          break;

        // Reportes Gerenciales
        case 'carga_animal':
          reportData = { type: 'carga_animal' };
          break;
        case 'produccion_carne':
          reportData = { type: 'produccion_carne' };
          break;
        case 'estado_resultados':
          reportData = { type: 'estado_resultados' };
          break;
        case 'cashflow':
          reportData = { type: 'cashflow' };
          break;
        case 'indices':
          reportData = { type: 'indices' };
          break;
        // Reportes Estandarizados (Módulo 15 - KPIs)
        case 'ejecutivo_mensual':
          reportData = { type: 'ejecutivo_mensual' };
          break;
        case 'comparativo_anual':
          reportData = { type: 'comparativo_anual' };
          break;
        case 'aprendizaje':
          reportData = { type: 'aprendizaje' };
          break;
        case 'deuda_proveedor':
          reportData = { type: 'deuda_proveedor' };
          break;
        case 'ingresos_pendientes':
          reportData = { type: 'ingresos_pendientes' };
          break;
        case 'cobranzas_realizadas':
          reportData = { type: 'cobranzas_realizadas' };
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      setGeneratedReport({
        type: reportType,
        dateFrom,
        dateTo,
        generatedAt: new Date().toISOString(),
        data: reportData
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const generateFinanceReport = async () => {
    const { data: incomes, error: incomeError } = await supabase
      .from('income_expense')
      .select('*')
      .eq('firm_id', firmId)
      .eq('type', 'income')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    const { data: expenses, error: expenseError } = await supabase
      .from('income_expense')
      .select('*')
      .eq('firm_id', firmId)
      .eq('type', 'expense')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (incomeError || expenseError) throw incomeError || expenseError;

    const totalIncome = incomes?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const totalExpense = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const balance = totalIncome - totalExpense;

    return {
      incomes: incomes || [],
      expenses: expenses || [],
      totalIncome,
      totalExpense,
      balance,
      incomeCount: incomes?.length || 0,
      expenseCount: expenses?.length || 0
    };
  };

  const generateInventoryReport = async () => {
    const { data: inputs, error } = await supabase
      .from('inputs')
      .select('*')
      .eq('firm_id', firmId);

    if (error) throw error;

    const totalValue = inputs?.reduce((sum, item) => sum + (item.current_stock * item.unit_price || 0), 0) || 0;
    const lowStockItems = inputs?.filter(item => item.current_stock < item.min_stock) || [];

    return {
      inputs: inputs || [],
      totalItems: inputs?.length || 0,
      totalValue,
      lowStockItems,
      lowStockCount: lowStockItems.length
    };
  };

  const generateLivestockReport = async () => {
    const { data: livestock, error } = await supabase
      .from('monitoreo_ganado')
      .select('*')
      .eq('firm_id', firmId)
      .gte('fecha', dateFrom)
      .lte('fecha', dateTo);

    if (error) throw error;

    const totalAnimals = livestock?.length || 0;
    const avgWeight = livestock?.reduce((sum, item) => sum + (item.peso || 0), 0) / totalAnimals || 0;

    return {
      livestock: livestock || [],
      totalAnimals,
      avgWeight: avgWeight.toFixed(2)
    };
  };

  const generateWorkReport = async () => {
    const { data: works, error } = await supabase
      .from('works')
      .select('*')
      .eq('firm_id', firmId)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (error) throw error;

    const completedWorks = works?.filter(w => w.status === 'completed') || [];
    const pendingWorks = works?.filter(w => w.status === 'pending') || [];

    return {
      works: works || [],
      totalWorks: works?.length || 0,
      completedWorks: completedWorks.length,
      pendingWorks: pendingWorks.length
    };
  };

  const generateAlertsReport = async () => {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmId)
      .gte('alert_date', dateFrom)
      .lte('alert_date', dateTo);

    if (error) throw error;

    const pendingAlerts = alerts?.filter(a => a.status === 'pending') || [];
    const completedAlerts = alerts?.filter(a => a.status === 'completed') || [];
    const highPriorityAlerts = alerts?.filter(a => a.priority === 'high') || [];

    return {
      alerts: alerts || [],
      totalAlerts: alerts?.length || 0,
      pendingAlerts: pendingAlerts.length,
      completedAlerts: completedAlerts.length,
      highPriorityAlerts: highPriorityAlerts.length
    };
  };

  const generateProductivityReport = async () => {
    const { data: lots, error } = await supabase
      .from('lots')
      .select('*')
      .eq('firm_id', firmId);

    if (error) throw error;

    return {
      lots: lots || [],
      totalLots: lots?.length || 0,
      totalArea: lots?.reduce((sum, lot) => sum + (lot.area || 0), 0) || 0
    };
  };

  const downloadReport = () => {
    if (!generatedReport) return;

    const reportName = reportTypes.find(r => r.id === generatedReport.type)?.name || 'Reporte';
    const reportContent = JSON.stringify(generatedReport, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!firmId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-yellow-800">Seleccione una Firma</p>
            <p className="text-sm text-yellow-600 mt-1">
              Debe seleccionar una firma para generar reportes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-green-600" />
          Reportes
        </h1>
        <p className="text-slate-600 mt-1">
          Genere reportes detallados de su gestión agropecuaria
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Filter size={20} />
              Configuración del Reporte
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Reporte *
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccione un tipo...</option>
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Desde *
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Hasta *
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={generateReport}
                disabled={loading || !reportType || !dateFrom || !dateTo}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-3">Tipos de Reportes</h3>
            <div className="space-y-2">
              {reportTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    reportType === type.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setReportType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-green-600">{type.icon}</div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{type.name}</p>
                      <p className="text-xs text-slate-600">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {generatedReport ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {reportTypes.find(r => r.id === generatedReport.type)?.name}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Período: {new Date(generatedReport.dateFrom).toLocaleDateString('es-ES')} - {new Date(generatedReport.dateTo).toLocaleDateString('es-ES')}
                  </p>
                  <p className="text-xs text-slate-500">
                    Generado: {new Date(generatedReport.generatedAt).toLocaleString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={18} />
                  Descargar
                </button>
              </div>

              <div className="space-y-6">
                {/* Reportes Operativos Mejorados */}
                {generatedReport.type === 'finance' && (
                  <FinanceReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'inventory' && (
                  <InventoryReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'livestock' && (
                  <LivestockReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'work' && (
                  <WorkReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'alerts' && (
                  <AlertsReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'productivity' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Total Lotes</p>
                      <p className="text-2xl font-bold text-blue-700">
                        No disponible en esta versión
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">Área Total</p>
                      <p className="text-2xl font-bold text-green-700">
                        Por implementar
                      </p>
                    </div>
                  </div>
                )}

                {/* Reportes Gerenciales */}

                {generatedReport.type === 'carga_animal' && (
                  <CargaAnimalReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'produccion_carne' && (
                  <ProduccionCarneReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'estado_resultados' && (
                  <EstadoResultadosReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'cashflow' && (
                  <CashflowReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {generatedReport.type === 'indices' && (
                  <IndicesProductivosReport
                    premiseId={premiseId}
                    periodo={{
                      start: generatedReport.dateFrom,
                      end: generatedReport.dateTo
                    }}
                  />
                )}

                {/* Reportes Estandarizados (Módulo 15 - KPIs) */}
                {generatedReport.type === 'ejecutivo_mensual' && (
                  <ReporteEjecutivoMensual
                    firmId={firmId}
                  />
                )}

                {generatedReport.type === 'comparativo_anual' && (
                  <ReporteComparativoAnual
                    firmId={firmId}
                  />
                )}

                {generatedReport.type === 'aprendizaje' && (
                  <ReporteAprendizaje
                    firmId={firmId}
                  />
                )}

                {/* Reportes de Cuentas por Cobrar y Pagar */}
                {generatedReport.type === 'deuda_proveedor' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="text-sm text-red-600 font-medium">Total Deuda</p>
                        <p className="text-2xl font-bold text-red-700">
                          {generatedReport.data?.totalDeuda ? `$${generatedReport.data.totalDeuda.toLocaleString()}` : '$0'}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-600 font-medium">Proveedores</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {generatedReport.data?.proveedoresCount || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-600 font-medium">Facturas Pendientes</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {generatedReport.data?.facturasCount || 0}
                        </p>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Proveedor</th>
                            <th className="px-4 py-2 text-left font-semibold">Facturas</th>
                            <th className="px-4 py-2 text-right font-semibold">Saldo Total</th>
                            <th className="px-4 py-2 text-right font-semibold">% del Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(generatedReport.data?.proveedores || []).map((prov, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="px-4 py-2">{prov.nombre}</td>
                              <td className="px-4 py-2">{prov.facturas}</td>
                              <td className="px-4 py-2 text-right font-semibold">${prov.saldo.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">{prov.porcentaje.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {generatedReport.type === 'ingresos_pendientes' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">Total Pendiente</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {generatedReport.data?.totalPendiente ? `$${generatedReport.data.totalPendiente.toLocaleString()}` : '$0'}
                        </p>
                      </div>
                      <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                        <p className="text-sm text-cyan-600 font-medium">Clientes</p>
                        <p className="text-2xl font-bold text-cyan-700">
                          {generatedReport.data?.clientesCount || 0}
                        </p>
                      </div>
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                        <p className="text-sm text-teal-600 font-medium">Comprobantes</p>
                        <p className="text-2xl font-bold text-teal-700">
                          {generatedReport.data?.comprobantesCount || 0}
                        </p>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                            <th className="px-4 py-2 text-left font-semibold">Nº Comprobante</th>
                            <th className="px-4 py-2 text-right font-semibold">Total</th>
                            <th className="px-4 py-2 text-right font-semibold">Cobrado</th>
                            <th className="px-4 py-2 text-right font-semibold">Pendiente</th>
                            <th className="px-4 py-2 text-right font-semibold">Días Vencido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(generatedReport.data?.ingresos || []).map((ing, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="px-4 py-2">{ing.cliente}</td>
                              <td className="px-4 py-2">{ing.comprobante}</td>
                              <td className="px-4 py-2 text-right font-semibold">${ing.total.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">${ing.cobrado.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-semibold text-red-600">${ing.pendiente.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">{ing.diasVencido}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {generatedReport.type === 'cobranzas_realizadas' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 font-medium">Total Cobranzas</p>
                        <p className="text-2xl font-bold text-green-700">
                          {generatedReport.data?.totalCobranzas ? `$${generatedReport.data.totalCobranzas.toLocaleString()}` : '$0'}
                        </p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-600 font-medium">Operaciones</p>
                        <p className="text-2xl font-bold text-emerald-700">
                          {generatedReport.data?.operacionesCount || 0}
                        </p>
                      </div>
                      <div className="bg-lime-50 p-4 rounded-lg border border-lime-200">
                        <p className="text-sm text-lime-600 font-medium">Clientes</p>
                        <p className="text-2xl font-bold text-lime-700">
                          {generatedReport.data?.clientesCobranzaCount || 0}
                        </p>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                            <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                            <th className="px-4 py-2 text-left font-semibold">Ingreso</th>
                            <th className="px-4 py-2 text-right font-semibold">Monto Cobrado</th>
                            <th className="px-4 py-2 text-left font-semibold">Método</th>
                            <th className="px-4 py-2 text-left font-semibold">Referencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(generatedReport.data?.cobranzas || []).map((cob, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="px-4 py-2">{new Date(cob.fecha).toLocaleDateString()}</td>
                              <td className="px-4 py-2">{cob.cliente}</td>
                              <td className="px-4 py-2">{cob.ingreso}</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-600">${cob.monto.toLocaleString()}</td>
                              <td className="px-4 py-2">{cob.metodo}</td>
                              <td className="px-4 py-2">{cob.referencia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Toolbar */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Descargue el reporte en su formato preferido
                </p>
                <ExportToolbar
                  reportType={generatedReport.type}
                  reportData={generatedReport.data}
                  firmName="Campo Gestor"
                  reportTitle={reportTypes.find(r => r.id === generatedReport.type)?.name || 'Reporte'}
                  periodo={{
                    start: generatedReport.dateFrom,
                    end: generatedReport.dateTo
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <FileText className="mx-auto text-slate-300 mb-4" size={64} />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No hay reporte generado
              </h3>
              <p className="text-slate-600">
                Configure los parámetros y genere un reporte para visualizarlo aquí
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
