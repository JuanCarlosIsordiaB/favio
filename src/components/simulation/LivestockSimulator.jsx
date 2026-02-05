/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * LivestockSimulator.jsx - Simulador de Carga Animal
 *
 * Funcionalidad:
 * - Simulación de carga animal (kg/ha)
 * - Proyección de peso final y ganancia
 * - Análisis de receptividad del lote
 * - Indicadores de riesgo de sobrepastoreo
 * - Visualización de evolución de peso
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
  simulateCargaAnimal,
  simulateProduccionCarne
} from '../../services/simulation/livestockSimulation';

export default function LivestockSimulator({ lotData = null }) {
  const [inputs, setInputs] = useState({
    animal_count: 50,
    category: 'Terneros',
    avg_weight_kg: 200,
    daily_gain_kg: 0.7,
    duration_days: 180,
    area_hectares: 25
  });

  const [results, setResults] = useState(null);

  // Calcular resultados cuando cambien inputs
  const calculate = useCallback(() => {
    const cargaAnimal = simulateCargaAnimal(inputs);
    const produccion = simulateProduccionCarne(inputs);

    // Combinar resultados
    const calculatedResults = {
      ...cargaAnimal,
      ...produccion,
      weight_evolution: generateWeightEvolution(
        inputs.avg_weight_kg,
        inputs.daily_gain_kg,
        inputs.duration_days
      )
    };

    setResults(calculatedResults);
  }, [inputs]);

  // Ejecutar cálculo al montar y cuando cambian inputs
  React.useEffect(() => {
    calculate();
  }, [calculate]);

  // Generar evolución de peso a lo largo del tiempo
  const generateWeightEvolution = (initialWeight, dailyGain, durationDays) => {
    const data = [];
    for (let day = 0; day <= durationDays; day += 10) {
      data.push({
        day,
        weight: initialWeight + (dailyGain * day),
        label: `Día ${day}`
      });
    }
    return data;
  };

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

  // Manejar cambio de categoría
  const handleCategoryChange = (category) => {
    setInputs(prev => ({
      ...prev,
      category,
      // Ajustar ganancia diaria por categoría
      daily_gain_kg: getCategoryDefaultGain(category)
    }));
  };

  // Obtener ganancia diaria predeterminada por categoría
  const getCategoryDefaultGain = (category) => {
    const gains = {
      'Terneros': 0.7,
      'Vaquillonas': 0.6,
      'Vacas': 0.3,
      'Toros': 0.5,
      'Novillos': 0.65
    };
    return gains[category] || 0.5;
  };

  // Evaluar riesgos
  const riskSobrepastoreo = results && results.sobrepastoreo_percent > 0;
  const riskMargenNegativo = results && results.projected_margin < 0;
  const riskCostPerKg = results && results.cost_per_kg > 12;

  const categories = ['Terneros', 'Vaquillonas', 'Vacas', 'Toros', 'Novillos'];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          🐄 Simulador de Carga Animal
        </h1>
        <p className="text-slate-600 mt-1">
          Analiza receptividad, ganancia de peso y riesgos de sobrepastoreo
        </p>
      </div>

      {/* Alertas de riesgo */}
      {(riskSobrepastoreo || riskMargenNegativo || riskCostPerKg) && (
        <div className="space-y-3">
          {riskSobrepastoreo && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>⚠️ RIESGO DE SOBREPASTOREO:</strong> La carga proyectada
                supera la receptividad en {results.sobrepastoreo_percent.toFixed(1)}%
              </AlertDescription>
            </Alert>
          )}
          {riskMargenNegativo && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>⚠️ MARGEN NEGATIVO:</strong> El margen proyectado es
                ${results.projected_margin.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}
          {riskCostPerKg && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                <strong>⚠️ COSTO ELEVADO:</strong> El costo por kg (${results.cost_per_kg.toFixed(2)})
                es superior al esperado
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
            {/* Categoría de Animal */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Categoría Animal</h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      inputs.category === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad de animales */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  🐄 Cantidad de Animales
                </label>
                <input
                  type="number"
                  value={inputs.animal_count}
                  onChange={(e) => handleInputChange('animal_count', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={inputs.animal_count}
                onChange={(e) => handleSliderChange('animal_count', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Peso promedio inicial */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  ⚖️ Peso Promedio Inicial (kg)
                </label>
                <input
                  type="number"
                  value={inputs.avg_weight_kg}
                  onChange={(e) => handleInputChange('avg_weight_kg', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={inputs.avg_weight_kg}
                onChange={(e) => handleSliderChange('avg_weight_kg', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Ganancia diaria */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  📈 Ganancia Diaria (kg/día)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.daily_gain_kg}
                  onChange={(e) => handleInputChange('daily_gain_kg', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={inputs.daily_gain_kg}
                onChange={(e) => handleSliderChange('daily_gain_kg', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Recomendado para {inputs.category}: {getCategoryDefaultGain(inputs.category)} kg/día
              </p>
            </div>

            {/* Duración */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  📅 Duración (días)
                </label>
                <input
                  type="number"
                  value={inputs.duration_days}
                  onChange={(e) => handleInputChange('duration_days', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <input
                type="range"
                min="30"
                max="365"
                step="10"
                value={inputs.duration_days}
                onChange={(e) => handleSliderChange('duration_days', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Área disponible */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">
                  🌍 Área Disponible (ha)
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
                max="500"
                step="0.5"
                value={inputs.area_hectares}
                onChange={(e) => handleSliderChange('area_hectares', e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPIs principales */}
        <div className="space-y-4">
          {/* Carga Animal */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Carga Animal</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-xs text-blue-600 font-medium">Carga (kg/ha)</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {results?.carga_kg_ha.toFixed(0)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded">
                <p className="text-xs text-slate-600 font-medium">Receptividad del Lote</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {results?.receptividad_percent.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {results?.receptividad_percent > 100 ? '⚠️ Sobrecargado' : '✓ Sostenible'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded">
                <p className="text-xs text-slate-600 font-medium">Sostenibilidad</p>
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        results?.sustainability_score > 0.7
                          ? 'bg-green-500'
                          : results?.sustainability_score > 0.4
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(results?.sustainability_score * 100 || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {(results?.sustainability_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Producción Proyectada */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Producción Proyectada</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-xs text-green-600 font-medium">Peso Final Promedio</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {results?.final_weight_avg.toFixed(0)} kg
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded">
                  <p className="text-xs text-green-600 font-medium">Total Producido</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {(results?.total_kg_produced / 1000).toFixed(1)}k kg
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600 font-medium">Ganancia Total/Animal</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.weight_gain_per_animal.toFixed(0)} kg
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600 font-medium">kg/ha Producidos</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {results?.kg_per_ha.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Indicador de efectividad */}
              <div className="flex items-center gap-2 mt-3">
                {results?.daily_gain_kg >= inputs.daily_gain_kg * 0.9 ? (
                  <>
                    <TrendingUp className="text-green-600" size={20} />
                    <span className="text-sm text-green-600">
                      Ganancia en línea con expectativa
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="text-red-600" size={20} />
                    <span className="text-sm text-red-600">
                      Ganancia inferior a la esperada
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Evolución de peso */}
      {results?.weight_evolution && results.weight_evolution.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">
              Evolución de Peso Proyectada
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Proyección de peso promedio a lo largo del período
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.weight_evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  label={{ value: 'Tiempo (días)', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value.toFixed(0)} kg`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  name="Peso Promedio"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Análisis de sostenibilidad */}
      {results && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Análisis de Sostenibilidad</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Factores de riesgo */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Factores de Riesgo</h3>
                <div className="space-y-2">
                  {riskSobrepastoreo && (
                    <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                      ❌ Sobrepastoreo: {results.sobrepastoreo_percent.toFixed(1)}% sobre capacidad
                    </div>
                  )}
                  {!riskSobrepastoreo && (
                    <div className="p-2 bg-green-50 rounded text-sm text-green-700">
                      ✓ Carga dentro de receptividad
                    </div>
                  )}
                  {results.sustainability_score < 0.5 && (
                    <div className="p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                      ⚠️ Sostenibilidad baja
                    </div>
                  )}
                </div>
              </div>

              {/* Recomendaciones */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Recomendaciones</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {riskSobrepastoreo && (
                    <p>
                      💡 Considera reducir la cantidad de animales a{' '}
                      {Math.floor(inputs.animal_count * 0.85)} para asegurar sostenibilidad
                    </p>
                  )}
                  {inputs.daily_gain_kg < getCategoryDefaultGain(inputs.category) && (
                    <p>
                      💡 Aumenta la ganancia diaria mediante mejor manejo de pasturas
                    </p>
                  )}
                  {results.sustainability_score > 0.8 && (
                    <p>
                      ✓ La carga actual es sostenible y aproveha bien la pastura disponible
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
