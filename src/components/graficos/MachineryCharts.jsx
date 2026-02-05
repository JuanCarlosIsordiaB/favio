import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MachineryCharts({ firmId, machinery = [], profitability = [] }) {
  // Datos de tipos de maquinaria
  const typeData = machinery.reduce((acc, m) => {
    const existing = acc.find(item => item.type === m.type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type: m.type, count: 1 });
    }
    return acc;
  }, []);

  // Datos de rentabilidad
  const profitabilityData = profitability.slice(0, 10).map(m => ({
    machinery: m.machinery_name?.substring(0, 15),
    profit: Math.round(m.net_profit || 0),
    revenue: Math.round(m.total_external_revenue || 0),
    costs: Math.round(m.total_costs || 0)
  }));

  // Datos de estado
  const statusData = [
    { status: 'ACTIVE', count: machinery.filter(m => m.status === 'ACTIVE').length },
    { status: 'MAINTENANCE', count: machinery.filter(m => m.status === 'MAINTENANCE').length },
    { status: 'INACTIVE', count: machinery.filter(m => m.status === 'INACTIVE').length }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#6b7280'];

  return (
    <div className="space-y-4">
      {/* Tipos de Maquinaria */}
      <Card>
        <CardHeader>
          <CardTitle>Maquinaria por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Sin datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Estado de Maquinaria */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.filter(d => d.count > 0).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Sin datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Rentabilidad por Máquina */}
      {profitabilityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Rentabilidad (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={profitabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="machinery" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" stackId="a" fill="#10b981" name="Ingresos" />
                <Bar dataKey="costs" stackId="a" fill="#ef4444" name="Costos" />
                <Bar dataKey="profit" fill="#3b82f6" name="Ganancia" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Maquinaria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Máquinas</p>
              <p className="text-2xl font-bold text-blue-600">
                {machinery.length}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Activas</p>
              <p className="text-2xl font-bold text-green-600">
                {machinery.filter(m => m.status === 'ACTIVE').length}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-muted-foreground">En Mantenimiento</p>
              <p className="text-2xl font-bold text-yellow-600">
                {machinery.filter(m => m.status === 'MAINTENANCE').length}
              </p>
            </div>
          </div>

          {/* Máquinas con más horas */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Top 5 Máquinas por Uso</h3>
            <div className="space-y-2">
              {machinery
                .sort((a, b) => parseFloat(b.horometer_hours || 0) - parseFloat(a.horometer_hours || 0))
                .slice(0, 5)
                .map((m, idx) => (
                  <div key={m.id} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{idx + 1}. {m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.type}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-bold">{parseFloat(m.horometer_hours || 0).toFixed(1)} h</p>
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(m.total_hectares || 0).toFixed(1)} ha
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
