/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * ScenarioComparison.jsx - Comparador Visual de Escenarios
 *
 * Funcionalidad:
 * - Selección de múltiples escenarios
 * - Tabla comparativa lado a lado
 * - Gráficos comparativos
 * - Sistema de scoring
 * - Recomendación automática
 * - Exportación a Excel
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { compareScenarios } from '../../services/simulation/scenarioComparison';

export default function ScenarioComparison({ scenarios = [], firmId = null }) {
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Realizar comparación
  const handleCompare = useCallback(() => {
    if (selectedScenarios.length < 2) {
      toast.error('Selecciona al menos 2 escenarios para comparar');
      return;
    }

    const scenariosToCompare = scenarios.filter(s =>
      selectedScenarios.includes(s.id)
    );

    try {
      const result = compareScenarios(scenariosToCompare);
      setComparison(result);
    } catch (error) {
      toast.error('Error comparando escenarios: ' + error.message);
    }
  }, [selectedScenarios, scenarios]);

  // Cambiar selección de escenario
  const toggleScenario = (scenarioId) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  // Seleccionar/deseleccionar todo
  const toggleAll = () => {
    if (selectedScenarios.length === scenarios.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios(scenarios.map(s => s.id));
    }
  };

  // Exportar a CSV
  const handleExport = () => {
    if (!comparison) {
      toast.error('Primero realiza una comparación');
      return;
    }

    try {
      // Preparar datos para CSV
      let csv = 'Comparación de Escenarios\n\n';
      csv += 'Escenario,Margen,ROI,Riesgo,Score\n';

      comparison.scenarios.forEach(scenario => {
        csv += `"${scenario.name}",${scenario.results?.margin.toFixed(2)},${scenario.results?.roi_percent.toFixed(1)}%,${scenario.results?.risk_level || 'N/A'},${scenario.comparison_score.toFixed(2)}\n`;
      });

      // Crear blob y descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `escenarios_comparacion_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Comparación exportada exitosamente');
    } catch (error) {
      toast.error('Error exportando comparación');
    }
  };

  // Datos para gráfico de márgenes
  const marginData = comparison?.scenarios.map(s => ({
    name: s.name,
    margin: s.results?.margin || 0,
    roi: s.results?.roi_percent || 0
  })) || [];

  // Datos para gráfico de costos
  const costData = comparison?.scenarios.map(s => ({
    name: s.name,
    cost: s.results?.total_cost || 0,
    revenue: s.results?.revenue || 0
  })) || [];

  const executedScenarios = scenarios.filter(s => s.status === 'EXECUTED');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          📊 Comparación de Escenarios
        </h1>
        <p className="text-slate-600 mt-1">
          Selecciona múltiples escenarios para compararlos y elegir la mejor opción
        </p>
      </div>

      {/* Selector de escenarios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Selecciona Escenarios</h2>
            {selectedScenarios.length > 0 && (
              <span className="text-sm font-medium text-blue-600">
                {selectedScenarios.length} seleccionados
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {executedScenarios.length === 0 ? (
            <p className="text-slate-600 text-center py-4">
              No hay escenarios ejecutados para comparar. Crea y ejecuta escenarios primero.
            </p>
          ) : (
            <>
              {/* Botón Seleccionar Todo */}
              <div className="mb-4">
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedScenarios.length === executedScenarios.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </button>
              </div>

              {/* Grid de escenarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {executedScenarios.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => toggleScenario(scenario.id)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      selectedScenarios.includes(scenario.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {scenario.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {scenario.scenario_type}
                        </p>
                        {scenario.results && (
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-slate-700">
                              <strong>Margen:</strong> ${scenario.results.margin?.toFixed(0) || 0}
                            </p>
                            <p className="text-slate-700">
                              <strong>ROI:</strong> {scenario.results.roi_percent?.toFixed(1) || 0}%
                            </p>
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                          selectedScenarios.includes(scenario.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedScenarios.includes(scenario.id) && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Botón comparar */}
              <button
                onClick={handleCompare}
                disabled={selectedScenarios.length < 2}
                className={`mt-6 w-full px-4 py-3 rounded-lg font-medium transition ${
                  selectedScenarios.length < 2
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                🔍 Comparar {selectedScenarios.length > 0 ? selectedScenarios.length : ''} Escenarios
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resultados de comparación */}
      {comparison && (
        <>
          {/* Ganador */}
          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader className="bg-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-green-900">
                    🏆 Escenario Ganador
                  </h2>
                  <p className="text-green-800 mt-1">
                    {comparison.analysis.winner.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-700 font-medium">Score</p>
                  <p className="text-3xl font-bold text-green-900">
                    {comparison.analysis.winner.score.toFixed(1)}/10
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Fortalezas */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">✅ Fortalezas</h3>
                <ul className="space-y-1 text-sm text-slate-700">
                  {comparison.analysis.winner.strengths.map((strength, idx) => (
                    <li key={idx}>• {strength}</li>
                  ))}
                </ul>
              </div>

              {/* Debilidades */}
              {comparison.analysis.winner.weaknesses?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">⚠️ Debilidades</h3>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {comparison.analysis.winner.weaknesses.map((weakness, idx) => (
                      <li key={idx}>• {weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendación */}
              <div className="p-4 bg-white rounded border border-green-200">
                <p className="text-sm font-medium text-green-900 mb-1">
                  💡 Recomendación:
                </p>
                <p className="text-sm text-slate-700">
                  {comparison.analysis.winner.recommendation}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de comparación */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-slate-900">Resumen Comparativo</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Highlights */}
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-green-700 font-medium">Mejor Margen</p>
                    <p className="text-lg font-bold text-green-900 mt-1">
                      ${comparison.analysis.comparison_summary.highest_margin.results?.margin.toFixed(0) || 0}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {comparison.analysis.comparison_summary.highest_margin.name}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-blue-700 font-medium">Mejor ROI</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                      {comparison.analysis.comparison_summary.highest_roi.results?.roi_percent.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {comparison.analysis.comparison_summary.highest_roi.name}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded">
                    <p className="text-xs text-purple-700 font-medium">Menor Riesgo</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">
                      {comparison.analysis.comparison_summary.lowest_risk.name}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {comparison.analysis.comparison_summary.lowest_risk.results?.risk_level || 'MEDIUM'}
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded">
                    <p className="text-xs text-yellow-700 font-medium">Menor Costo</p>
                    <p className="text-lg font-bold text-yellow-900 mt-1">
                      ${(comparison.analysis.comparison_summary.lowest_cost.results?.total_cost / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {comparison.analysis.comparison_summary.lowest_cost.name}
                    </p>
                  </div>
                </div>

                {/* Ranking */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Ranking</h3>
                  <div className="space-y-2">
                    {comparison.analysis.detailed_ranking.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border-l-4 ${
                          idx === 0
                            ? 'border-l-gold bg-yellow-50'
                            : idx === 1
                            ? 'border-l-gray-500 bg-slate-50'
                            : 'border-l-amber-700 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg">#{item.rank}</p>
                            <p className="text-sm font-medium text-slate-900">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Margen: ${item.margin} | ROI: {item.roi_percent}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900">
                              {item.score}
                            </p>
                            <p className="text-xs text-slate-600">/10</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos comparativos */}
          {marginData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Margen vs ROI */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-slate-900">Margen por Escenario</h3>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={marginData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
                      <Bar dataKey="margin" fill="#10b981" name="Margen" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Costo vs Ingreso */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-slate-900">Costo vs Ingreso</h3>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
                      <Legend />
                      <Bar dataKey="cost" fill="#ef4444" name="Costo" />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Ingreso" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabla detallada */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-slate-900">Tabla Detallada</h2>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">
                      Escenario
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      Producción (kg)
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      Costo Total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      Ingreso
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      Margen
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      ROI
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900">
                      Riesgo
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparison.scenarios.map((scenario, idx) => (
                    <tr
                      key={scenario.id}
                      className={idx === 0 ? 'bg-green-50' : ''}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {scenario.name}
                        {idx === 0 && ' 🏆'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {(scenario.results?.total_kg_produced / 1000 || 0).toFixed(1)}k
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        ${(scenario.results?.total_cost / 1000 || 0).toFixed(1)}k
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        ${(scenario.results?.revenue / 1000 || 0).toFixed(1)}k
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          scenario.results?.margin > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        ${(scenario.results?.margin / 1000 || 0).toFixed(1)}k
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {scenario.results?.roi_percent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            scenario.results?.risk_level === 'LOW'
                              ? 'bg-green-100 text-green-700'
                              : scenario.results?.risk_level === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {scenario.results?.risk_level || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {scenario.comparison_score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Exportar */}
          <button
            onClick={handleExport}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center justify-center gap-2"
          >
            <Download size={20} />
            📥 Exportar Comparación a CSV
          </button>
        </>
      )}
    </div>
  );
}
