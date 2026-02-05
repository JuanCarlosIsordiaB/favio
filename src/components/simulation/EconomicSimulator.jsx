/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * EconomicSimulator.jsx - Simulador Económico
 *
 * Funcionalidad:
 * - Análisis económico interactivo
 * - Sliders para ajustar parámetros
 * - Análisis de sensibilidad
 * - Visualización de punto de equilibrio
 * - Gráficos dinámicos
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import {
  executeEconomicSimulation,
  evaluateRentability
} from '../../services/simulation/economicSimulation';

export default function EconomicSimulator({ scenario = null }) {
  const [inputs, setInputs] = useState({
    input_costs: 5000,
    machinery_costs: 3000,
    labor_costs: 2000,
    other_costs: 1000,
    production_kg: 5000,
    price_per_kg: 2.5,
    area_hectares: 10
  });

  const [results, setResults] = useState(null);

  // Calcular resultados cuando cambien inputs
  const calculate = useCallback(() => {
    const calculatedResults = executeEconomicSimulation(inputs);
    setResults(calculatedResults);
  }, [inputs]);

  // Ejecutar cálculo al montar y cuando cambian inputs
  React.useEffect(() => {
    calculate();
  }, [calculate]);

  // Manejar cambio de slider
  const handleSliderChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value)
    }));
  };

  // Manejar cambio de input numérico
  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Preparar datos para gráfico de sensibilidad
  const sensitivityData = results?.sensitivity_analysis?.scenarios || [];

  // Evaluar rentabilidad
  const evaluation = results ? evaluateRentability(results) : null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          💰 Simulador Económico
        </h1>
        <p className="text-slate-600 mt-1">
          Analiza costos, márgenes, ROI y sensibilidad de precios en tiempo real
        </p>
      </div>

      {/* Alerta de rentabilidad */}
      {evaluation && (
        <Alert className={
          evaluation.is_profitable
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }>
          <AlertTriangle className={evaluation.is_profitable ? 'text-green-600' : 'text-red-600'} />
          <AlertDescription className={evaluation.is_profitable ? 'text-green-800' : 'text-red-800'}>
            <strong>Rentabilidad: {evaluation.profitability_level}</strong>
            {evaluation.risks.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Riesgos identificados:</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {evaluation.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.recommendations.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Recomendaciones:</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {evaluation.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de entrada */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Parámetros de Entrada</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Costos */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Costos</h3>
              <div className="space-y-4">
                {[
                  { field: 'input_costs', label: 'Costos Insumos', icon: '🌾' },
                  { field: 'machinery_costs', label: 'Costos Maquinaria', icon: '🚜' },
                  { field: 'labor_costs', label: 'Costos Mano de Obra', icon: '👷' },
                  { field: 'other_costs', label: 'Otros Costos', icon: '📦' }
                ].map(item => (
                  <div key={item.field}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-900">
                        {item.icon} {item.label}
                      </label>
                      <input
                        type="number"
                        value={inputs[item.field]}
                        onChange={(e) => handleInputChange(item.field, e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={item.field === 'input_costs' ? 50000 : 20000}
                      step="100"
                      value={inputs[item.field]}
                      onChange={(e) => handleSliderChange(item.field, e.target.value)}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Producción */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Producción</h3>
              <div className="space-y-4">
                {[
                  { field: 'production_kg', label: 'Producción Total (kg)', max: 50000, icon: '📊' },
                  { field: 'area_hectares', label: 'Área (ha)', max: 500, icon: '🌍' }
                ].map(item => (
                  <div key={item.field}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-900">
                        {item.icon} {item.label}
                      </label>
                      <input
                        type="number"
                        value={inputs[item.field]}
                        onChange={(e) => handleInputChange(item.field, e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={item.max}
                      step="100"
                      value={inputs[item.field]}
                      onChange={(e) => handleSliderChange(item.field, e.target.value)}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Precio</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-900">
                      💵 Precio por kg
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.price_per_kg}
                      onChange={(e) => handleInputChange('price_per_kg', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={inputs.price_per_kg}
                    onChange={(e) => handleSliderChange('price_per_kg', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs principales */}
        <div className="space-y-4">
          {/* Costo total y por kg */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Estructura de Costos</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Costo Total</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ${results?.total_cost.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Costo/kg</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ${results?.cost_per_kg.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Costo/ha</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ${results?.cost_per_ha.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Kg/ha</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.kg_per_ha.toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingresos y Márgenes */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Ingresos y Márgenes</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-xs text-blue-600 font-medium">Ingresos</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  ${results?.revenue.toFixed(0)}
                </p>
              </div>

              <div className={`p-4 rounded ${
                (results?.margin || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className={`text-xs font-medium ${
                  (results?.margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Margen
                </p>
                <p className={`text-3xl font-bold mt-1 ${
                  (results?.margin || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  ${results?.margin.toFixed(0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Margen %</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.margin_percent.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">ROI</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.roi_percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Punto de equilibrio */}
          {results?.break_even_kg && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-900">Punto de Equilibrio</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Necesitas vender</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results.break_even_kg.toFixed(0)} kg
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    para cubrir todos los costos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {results.safety_margin_percent > 0 ? (
                    <>
                      <TrendingUp className="text-green-600" size={20} />
                      <span className="text-sm text-green-600">
                        Margen de seguridad: {results.safety_margin_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="text-red-600" size={20} />
                      <span className="text-sm text-red-600">
                        No alcanzas punto de equilibrio
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Análisis de sensibilidad */}
      {sensitivityData.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">
              Análisis de Sensibilidad: Variaciones de Precio
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Cómo cambia el margen con diferentes precios
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensitivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="price_variation_percent"
                  label={{ value: 'Variación de Precio (%)', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis label={{ value: 'Margen ($)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
                <Legend />
                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: 'Punto de equilibrio', position: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#3b82f6"
                  name="Margen"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Tabla de escenarios */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Variación</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Margen</th>
                    <th className="px-3 py-2 text-right">ROI</th>
                    <th className="px-3 py-2 text-center">Rentable</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityData.slice(0, 7).map((row, idx) => (
                    <tr key={idx} className={idx === 4 ? 'bg-blue-50' : ''}>
                      <td className="px-3 py-2">
                        {row.price_variation_percent > 0 ? '+' : ''}{row.price_variation_percent}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${row.price_per_kg.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        row.margin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${row.margin.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.roi_percent.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.is_profitable ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
