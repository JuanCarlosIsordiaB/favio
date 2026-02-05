import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

/**
 * LivestockReport
 * Reporte ganadero con conteos, pesos y eventos
 */

export default function LivestockReport({ premiseId, periodo }) {
  const [data, setData] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSpecies, setFilterSpecies] = useState('all');

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo, filterSpecies]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener animales del predio
      const { data: livestock } = await supabase
        .from('livestock')
        .select('*')
        .eq('premise_id', premiseId);

      // Obtener eventos del período
      const { data: events } = await supabase
        .from('livestock_events')
        .select('*')
        .eq('premise_id', premiseId)
        .gte('date', periodo.start)
        .lte('date', periodo.end);

      // Procesar datos por especie y categoría
      const speciesData = {};
      let totalAnimals = 0;
      let totalWeight = 0;

      (livestock || []).forEach(animal => {
        const species = animal.species || 'Desconocido';
        const category = animal.category || 'Sin categoría';
        const key = `${species} - ${category}`;

        if (!speciesData[key]) {
          speciesData[key] = {
            species,
            category,
            count: 0,
            totalWeight: 0,
            avgWeight: 0,
            events: 0
          };
        }

        speciesData[key].count++;
        speciesData[key].totalWeight += animal.weight || 0;
        totalAnimals++;
        totalWeight += animal.weight || 0;

        const eventCount = (events || []).filter(e => e.animal_id === animal.id).length;
        speciesData[key].events += eventCount;
      });

      // Calcular promedios
      const animalsArray = Object.entries(speciesData).map(([key, data]) => ({
        ...data,
        avgWeight: data.count > 0 ? (data.totalWeight / data.count).toFixed(2) : 0
      }));

      // Obtener especies únicas
      const species = [...new Set((livestock || []).map(a => a.species))];

      // Filtrar
      const filtered = filterSpecies === 'all'
        ? animalsArray
        : animalsArray.filter(a => a.species === filterSpecies);

      // Contar eventos por tipo
      const eventsByType = {};
      (events || []).forEach(event => {
        const type = event.event_type || 'Otro';
        eventsByType[type] = (eventsByType[type] || 0) + 1;
      });

      setData({
        totalAnimals,
        totalWeight,
        avgWeight: totalAnimals > 0 ? (totalWeight / totalAnimals).toFixed(2) : 0,
        species,
        eventCount: events?.length || 0,
        eventsByType
      });

      setAnimals(filtered);
    } catch (err) {
      console.error('Error loading livestock data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Cargando datos ganaderos...</p>
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

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos ganaderos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-livestock-title" className="text-2xl font-bold text-slate-800 mb-2">
          Reporte Ganadero
        </h2>
        <p className="text-slate-600">Estado del ganado y registro de eventos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 mb-1">Total Animales</p>
          <p data-id="report-livestock-total" className="text-2xl font-bold text-blue-900">
            {data.totalAnimals.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-blue-600 mt-1">cabezas</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600 mb-1">Peso Total</p>
          <p data-id="report-livestock-total-weight" className="text-2xl font-bold text-green-900">
            {data.totalWeight.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-green-600 mt-1">kg</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 mb-1">Peso Promedio</p>
          <p data-id="report-livestock-avg-weight" className="text-2xl font-bold text-purple-900">
            {data.avgWeight}
          </p>
          <p className="text-xs text-purple-600 mt-1">kg/animal</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-600 mb-1">Eventos Registrados</p>
          <p className="text-2xl font-bold text-orange-900">
            {data.eventCount}
          </p>
          <p className="text-xs text-orange-600 mt-1">en el período</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filtrar por especie:</label>
          <select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            data-id="report-livestock-filter"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las especies</option>
            {data.species.map(spec => (
              <option key={spec} value={spec}>
                {spec || 'Sin especie'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Categorías */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Composición del Hato</h3>
        </div>

        <div data-id="report-livestock-composition-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Especie</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Cantidad</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Peso Total (kg)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Peso Promedio (kg)</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Eventos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {animals.length > 0 ? animals.map((animal, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {animal.species}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {animal.category || 'Sin categoría'}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    {animal.count}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {animal.totalWeight.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {animal.avgWeight}
                  </td>
                  <td className="px-6 py-3 text-right text-blue-600 font-medium">
                    {animal.events}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No hay animales en esta especie
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de Composición */}
      {animals.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Distribución por Categoría</h3>
          </div>

          <div data-id="report-livestock-distribution-chart" className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={animals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="category"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Cantidad" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Period info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Período:</strong> {periodo?.start} a {periodo?.end}
        </p>
        <p className="mt-1">
          <strong>Generado:</strong> {new Date().toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  );
}
