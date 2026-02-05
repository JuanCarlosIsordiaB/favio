import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calcularCargaAnimal, getHistoricoCargaAnimal } from '../../../services/produccionCarneService';

export default function CargaAnimalReport({ premiseId, periodo, onClose }) {
  const [cargaActual, setCargaActual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (premiseId) {
      loadData();
    }
  }, [premiseId, periodo]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Get current load
      const carga = await calcularCargaAnimal(premiseId);
      setCargaActual(carga);

      // Get historical data
      if (periodo?.start && periodo?.end) {
        const hist = await getHistoricoCargaAnimal(premiseId, periodo.start, periodo.end);
        setHistorico(hist);
      }
    } catch (err) {
      console.error('Error loading carga animal:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Calculando carga animal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Error cargando reporte</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!cargaActual) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos de carga animal disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-carga-animal-title" className="text-2xl font-bold text-slate-800 mb-2">
          Carga Animal
        </h2>
        <p className="text-slate-600">Análisis de peso y densidad de animales en el predio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-600 mb-1">Total Animales</p>
          <p className="text-3xl font-bold text-slate-900">{cargaActual.animales_activos}</p>
          <p className="text-xs text-slate-500 mt-2">Cabezas activas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-600 mb-1">Peso Total</p>
          <p data-id="report-carga-animal-total-kg" className="text-3xl font-bold text-slate-900">
            {cargaActual.peso_total_kg.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-2">kg</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-600 mb-1">Área</p>
          <p className="text-3xl font-bold text-slate-900">{cargaActual.hectareas}</p>
          <p className="text-xs text-slate-500 mt-2">hectáreas</p>
        </div>

        <div
          className={`border rounded-lg p-4 ${
            cargaActual.esta_sobrecargado
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <p className="text-sm font-medium text-slate-600 mb-1">Carga kg/ha</p>
          <p
            data-id="report-carga-animal-kg-ha"
            className={`text-3xl font-bold ${
              cargaActual.esta_sobrecargado ? 'text-red-900' : 'text-green-900'
            }`}
          >
            {cargaActual.carga_kg_ha.toLocaleString('es-AR')}
          </p>
          <p
            className={`text-xs mt-2 ${
              cargaActual.esta_sobrecargado ? 'text-red-700' : 'text-green-700'
            }`}
          >
            {cargaActual.esta_sobrecargado ? '⚠️ SOBRECARGADO' : '✓ NORMAL'}
          </p>
        </div>
      </div>

      {/* Warning if overloaded */}
      {cargaActual.esta_sobrecargado && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <TrendingUp size={20} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Carga Excesiva Detectada</p>
            <p className="text-sm text-red-800 mt-1">
              La carga actual ({cargaActual.carga_kg_ha.toLocaleString('es-AR')} kg/ha) supera el umbral recomendado de {cargaActual.umbral_kg_ha} kg/ha.
              Considera reducir la cantidad de animales o ampliar el área de pastoreo.
            </p>
          </div>
        </div>
      )}

      {/* Table by category */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Detalle por Categoría</h3>
        </div>

        <div data-id="report-carga-animal-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Cabezas</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Peso Total (kg)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Peso Promedio (kg)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Object.entries(cargaActual.por_categoria).map(([key, cat]) => {
                const porcentaje = (cat.peso_total_kg / cargaActual.peso_total_kg * 100).toFixed(1);
                return (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{cat.categoria}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{cat.cabezas}</td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {cat.peso_total_kg.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {cat.peso_promedio_kg.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">{porcentaje}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical chart */}
      {historico && historico.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Evolución Mensual de Carga</h3>
          </div>

          <div data-id="report-carga-animal-chart" className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="mes"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'kg/ha', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString('es-AR') : value,
                    'kg/ha'
                  ]}
                />
                <Legend />

                {/* Reference line at threshold */}
                <Line
                  type="monotone"
                  dataKey={() => cargaActual.umbral_kg_ha}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  name={`Umbral (${cargaActual.umbral_kg_ha} kg/ha)`}
                  isAnimationActive={false}
                />

                {/* Actual load */}
                <Line
                  type="monotone"
                  dataKey="carga_kg_ha_redondeada"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Carga kg/ha"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <p>La línea roja punteada indica el umbral recomendado ({cargaActual.umbral_kg_ha} kg/ha).</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <p>Calculado: {new Date(cargaActual.calculado_en).toLocaleString('es-AR')}</p>
      </div>
    </div>
  );
}
