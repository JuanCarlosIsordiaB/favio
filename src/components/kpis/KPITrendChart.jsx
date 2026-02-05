/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Gráfico de Tendencia de KPI
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '../ui/skeleton';

export default function KPITrendChart({ kpiCode, kpiName, firmId, periodo = 12 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [kpiCode, periodo]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Integrar con hook useKPIs para obtener tendencia real
      // Por ahora retornar datos de ejemplo

      const datosEjemplo = Array.from({ length: periodo }, (_, i) => ({
        mes: `M${periodo - i}`,
        valor: Math.random() * 100 + 50,
        optimo_min: 40,
        optimo_max: 80
      })).reverse();

      setData(datosEjemplo);
    } catch (err) {
      console.error('Error cargando datos de tendencia:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="w-full h-80" />;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error cargando gráfico: {error}</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay datos de tendencia</div>;
  }

  return (
    <div className="w-full h-80 bg-white p-4 rounded border">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip
            formatter={(value) => value.toFixed(2)}
            labelFormatter={(label) => `Período: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="#3b82f6"
            name={kpiName}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          {data[0].optimo_min && (
            <>
              <Line
                type="monotone"
                dataKey="optimo_min"
                stroke="#10b981"
                strokeDasharray="5 5"
                name="Mín. Óptimo"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="optimo_max"
                stroke="#10b981"
                strokeDasharray="5 5"
                name="Máx. Óptimo"
                strokeWidth={1}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
