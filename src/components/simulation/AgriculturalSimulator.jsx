/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * AgriculturalSimulator.jsx - Simulador de Producción Agrícola
 *
 * Funcionalidad:
 * - Simulación de producción agrícola por cultivo
 * - Ajuste de rendimiento por clima y suelo
 * - Análisis de rotación de cultivos
 * - Proyección de ingresos y márgenes
 * - Impacto de plagas y enfermedades
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import {
  simulateAgriculturalProduction
} from '../../services/simulation/agricultureSimulation';

export default function AgriculturalSimulator({ lotData = null }) {
  const [inputs, setInputs] = useState({
    crop_type: 'Soja',
    area_hectares: 100,
    expected_yield_kg_ha: 3000,
    input_costs_per_ha: 500,
    machinery_costs_per_ha: 200,
    labor_costs_per_ha: 150,
    price_per_kg: 2.5,
    rainfall_historical_mm: 700,
    soil_quality: 'MEDIUM'
  });

  const [results, setResults] = useState(null);

  // Calcular resultados cuando cambien inputs
  const calculate = useCallback(() => {
    const productionResults = simulateAgriculturalProduction(inputs);
    setResults(productionResults);
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

  // Manejar cambio de select
  const handleSelectChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Cultivos disponibles
  const crops = [
    { name: 'Soja', baseYield: 3000, minArea: 1, description: 'Leguminosa de verano' },
    { name: 'Maíz', baseYield: 8000, minArea: 1, description: 'Cereal de verano' },
    { name: 'Trigo', baseYield: 4500, minArea: 1, description: 'Cereal de invierno' },
    { name: 'Cebada', baseYield: 4000, minArea: 1, description: 'Cereal de invierno' },
    { name: 'Girasol', baseYield: 2500, minArea: 1, description: 'Oleaginosa de verano' },
    { name: 'Alfalfa', baseYield: 12000, minArea: 1, description: 'Forrajera perenne' }
  ];

  const selectedCrop = crops.find(c => c.name === inputs.crop_type);
  const soilQualityMultipliers = {
    'LOW': 0.75,
    'MEDIUM': 1.0,
    'HIGH': 1.15
  };

  // Calcular costos totales
  const totalCostPerHa =
    inputs.input_costs_per_ha +
    inputs.machinery_costs_per_ha +
    inputs.labor_costs_per_ha;

  const totalCosts = totalCostPerHa * inputs.area_hectares;

  // Evaluar riesgos
  const riskLowRainfall = inputs.rainfall_historical_mm < 400;
  const riskHighCost = totalCostPerHa > 1000;
  const riskMargenNegativo = results && results.projected_margin < 0;

  // Calcular distribución de costos
  const costDistribution = [
    { name: 'Insumos', value: inputs.input_costs_per_ha * inputs.area_hectares },
    { name: 'Maquinaria', value: inputs.machinery_costs_per_ha * inputs.area_hectares },
    { name: 'Mano de Obra', value: inputs.labor_costs_per_ha * inputs.area_hectares }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          🌾 Simulador de Producción Agrícola
        </h1>
        <p className="text-slate-600 mt-1">
          Proyecta rendimiento, costos y márgenes según cultivo y condiciones
        </p>
      </div>

      {/* Alertas de riesgo */}
      {(riskLowRainfall || riskHighCost || riskMargenNegativo) && (
        <div className="space-y-3">
          {riskLowRainfall && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                <strong>⚠️ LLUVIA INSUFICIENTE:</strong> Histórico de {inputs.rainfall_historical_mm}mm
                es bajo. El rendimiento puede verse afectado.
              </AlertDescription>
            </Alert>
          )}
          {riskHighCost && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                <strong>⚠️ COSTOS ELEVADOS:</strong> Costo por hectárea (${totalCostPerHa.toFixed(0)})
                es superior al promedio.
              </AlertDescription>
            </Alert>
          )}
          {riskMargenNegativo && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>❌ MARGEN NEGATIVO:</strong> El margen proyectado es
                ${results.projected_margin.toFixed(0)}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de entrada */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Parámetros de Entrada</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de cultivo */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Cultivo a Simular</h3>
              <div className="space-y-2">
                {crops.map(crop => (
                  <button
                    key={crop.name}
                    onClick={() => handleSelectChange('crop_type', crop.name)}
                    className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                      inputs.crop_type === crop.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{crop.name}</p>
                    <p className="text-xs text-slate-600">{crop.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Rendimiento base: {crop.baseYield} kg/ha
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Área */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  🌍 Área (ha)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.area_hectares}
                  onChange={(e) => handleInputChange('area_hectares', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                step="1"
                value={inputs.area_hectares}
                onChange={(e) => handleSliderChange('area_hectares', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Rendimiento esperado */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  📊 Rendimiento (kg/ha)
                </label>
                <input
                  type="number"
                  value={inputs.expected_yield_kg_ha}
                  onChange={(e) => handleInputChange('expected_yield_kg_ha', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="1000"
                max="15000"
                step="100"
                value={inputs.expected_yield_kg_ha}
                onChange={(e) => handleSliderChange('expected_yield_kg_ha', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Base para {inputs.crop_type}: {selectedCrop?.baseYield || 0} kg/ha
              </p>
            </div>

            {/* Lluvia histórica */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  🌧️ Lluvia Histórica (mm)
                </label>
                <input
                  type="number"
                  value={inputs.rainfall_historical_mm}
                  onChange={(e) => handleInputChange('rainfall_historical_mm', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="200"
                max="1500"
                step="50"
                value={inputs.rainfall_historical_mm}
                onChange={(e) => handleSliderChange('rainfall_historical_mm', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Calidad de suelo */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                🌱 Calidad de Suelo
              </label>
              <select
                value={inputs.soil_quality}
                onChange={(e) => handleSelectChange('soil_quality', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Baja (75% rendimiento)</option>
                <option value="MEDIUM">Media (100% rendimiento)</option>
                <option value="HIGH">Alta (115% rendimiento)</option>
              </select>
            </div>

            {/* Costos */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-4">Costos por Hectárea</h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-900">
                      🌾 Insumos ($/ha)
                    </label>
                    <input
                      type="number"
                      value={inputs.input_costs_per_ha}
                      onChange={(e) => handleInputChange('input_costs_per_ha', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1500"
                    step="50"
                    value={inputs.input_costs_per_ha}
                    onChange={(e) => handleSliderChange('input_costs_per_ha', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-900">
                      🚜 Maquinaria ($/ha)
                    </label>
                    <input
                      type="number"
                      value={inputs.machinery_costs_per_ha}
                      onChange={(e) => handleInputChange('machinery_costs_per_ha', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="25"
                    value={inputs.machinery_costs_per_ha}
                    onChange={(e) => handleSliderChange('machinery_costs_per_ha', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-900">
                      👷 Mano de Obra ($/ha)
                    </label>
                    <input
                      type="number"
                      value={inputs.labor_costs_per_ha}
                      onChange={(e) => handleInputChange('labor_costs_per_ha', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    step="25"
                    value={inputs.labor_costs_per_ha}
                    onChange={(e) => handleSliderChange('labor_costs_per_ha', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Precio */}
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
          </CardContent>
        </Card>

        {/* KPIs principales */}
        <div className="space-y-4">
          {/* Producción */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Producción Proyectada</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-green-50 rounded">
                <p className="text-xs text-green-600 font-medium">
                  Rendimiento Final (con ajustes)
                </p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {results?.adjusted_yield_kg_ha.toFixed(0)} kg/ha
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Factor climático: {(inputs.rainfall_historical_mm < 400 ? 0.7 : inputs.rainfall_historical_mm < 600 ? 0.85 : inputs.rainfall_historical_mm > 1200 ? 0.9 : 1).toFixed(2)}x
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Producción Total</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {(results?.total_production_kg / 1000).toFixed(1)}k kg
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Por Hectárea</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.adjusted_yield_kg_ha.toFixed(0)} kg
                  </p>
                </div>
              </div>

              {/* Indicador de ajustes */}
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                <p className="font-medium mb-1">Ajustes aplicados:</p>
                <p>Lluvia: {inputs.rainfall_historical_mm < 600 ? '⚠️ Factor negativo' : '✓ Normal'}</p>
                <p>Suelo: {soilQualityMultipliers[inputs.soil_quality]}x</p>
              </div>
            </CardContent>
          </Card>

          {/* Costos */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Estructura de Costos</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-blue-600 font-medium">Costo/ha</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    ${totalCostPerHa.toFixed(0)}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-blue-600 font-medium">Costo Total</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    ${(totalCosts / 1000).toFixed(1)}k
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Costo/kg</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ${(totalCostPerHa / (inputs.expected_yield_kg_ha / 1000)).toFixed(2)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Mayor Item</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {inputs.input_costs_per_ha > inputs.machinery_costs_per_ha &&
                    inputs.input_costs_per_ha > inputs.labor_costs_per_ha
                      ? 'Insumos'
                      : inputs.machinery_costs_per_ha > inputs.labor_costs_per_ha
                      ? 'Maquinaria'
                      : 'Mano de Obra'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rentabilidad */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Análisis Económico</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={`p-4 rounded ${
                  results?.projected_margin > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    results?.projected_margin > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  Margen Total
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    results?.projected_margin > 0
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}
                >
                  ${results?.projected_margin.toFixed(0)}
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
        </div>
      </div>

      {/* Distribución de costos */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Distribución de Costos</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
                <Bar dataKey="value" fill="#3b82f6">
                  {costDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {costDistribution.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[idx] }}
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      ${item.value.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {((item.value / totalCosts) * 100).toFixed(1)}% del total
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      {results && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Recomendaciones</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate-700">
              {results.projected_margin < 0 ? (
                <p className="text-red-700">
                  ❌ El margen es negativo. Considera reducir costos o negociar mejor precio.
                </p>
              ) : results.margin_percent > 30 ? (
                <p className="text-green-700">
                  ✅ Margen excelente. Esta configuración es muy rentable.
                </p>
              ) : (
                <p className="text-yellow-700">
                  ⚠️ Margen moderado. Hay oportunidades de mejora en costos.
                </p>
              )}

              {inputs.rainfall_historical_mm < 400 && (
                <p className="text-yellow-700">
                  💧 Lluvia baja histórica. Considera riego complementario o cultivos tolerantes a sequía.
                </p>
              )}

              {inputs.soil_quality === 'LOW' && (
                <p className="text-yellow-700">
                  🌱 Calidad de suelo baja. Mejora mediante enmiendas y rotación de cultivos.
                </p>
              )}

              {totalCostPerHa > 1000 && (
                <p className="text-yellow-700">
                  💰 Costos elevados. Revisa oportunidades de ahorro en insumos o mecanización.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
