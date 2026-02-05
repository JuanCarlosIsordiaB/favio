import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PersonnelCharts({ firmId, personnel = [], statistics = {} }) {
  // Preparar datos por rol
  const roleData = Object.entries(statistics?.byRole || {}).map(([role, count]) => ({
    role: role.replace('_', ' ').toUpperCase(),
    count
  }));

  // Preparar datos por estado
  const statusData = [
    { status: 'ACTIVE', count: personnel.filter(p => p.status === 'ACTIVE').length },
    { status: 'INACTIVE', count: personnel.filter(p => p.status === 'INACTIVE').length },
    { status: 'ON_LEAVE', count: personnel.filter(p => p.status === 'ON_LEAVE').length },
    { status: 'SUSPENDED', count: personnel.filter(p => p.status === 'SUSPENDED').length }
  ];

  // Colores
  const COLORS = ['#10b981', '#6b7280', '#f59e0b', '#ef4444'];
  const ROLE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];

  return (
    <div className="space-y-4">
      {/* Personal por Rol */}
      <Card>
        <CardHeader>
          <CardTitle>Personal por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          {roleData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Sin datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Estado del Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Personal</CardTitle>
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

      {/* Resumen de Costos */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Personal Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {statistics?.total || 0}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Personal Activo</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics?.active || 0}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Costo Mensual Total</p>
              <p className="text-2xl font-bold text-purple-600">
                ${(statistics?.totalMonthlyCost || 0).toLocaleString('es-UY', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución de Salarios */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Salarios Más Altos</CardTitle>
        </CardHeader>
        <CardContent>
          {personnel.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Sin datos para mostrar
            </div>
          ) : (
            <div className="space-y-2">
              {personnel
                .filter(p => p.salary_amount)
                .sort((a, b) => parseFloat(b.salary_amount) - parseFloat(a.salary_amount))
                .slice(0, 5)
                .map((person, idx) => (
                  <div key={person.id} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{idx + 1}. {person.full_name}</p>
                      <p className="text-xs text-muted-foreground">{person.position_title}</p>
                    </div>
                    <p className="font-bold">
                      ${parseFloat(person.salary_amount).toLocaleString('es-UY', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
