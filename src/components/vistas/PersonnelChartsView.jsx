import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePersonnel } from '../../hooks/usePersonnel';
import { DollarSign } from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PersonnelChartsView({ firmId }) {
  const { personnel, statistics } = usePersonnel(firmId);
  const [roleData, setRoleData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [topSalaries, setTopSalaries] = useState([]);

  useEffect(() => {
    if (personnel && personnel.length > 0) {
      // Calcular datos por rol
      const roleCount = {};
      personnel.forEach(p => {
        if (p.status === 'ACTIVE') {
          const role = p.role || 'Sin rol';
          roleCount[role] = (roleCount[role] || 0) + 1;
        }
      });
      setRoleData(Object.entries(roleCount).map(([role, count]) => ({
        name: role.replace('_', ' ').toUpperCase(),
        value: count
      })));

      // Calcular datos por estado
      const statusCount = {};
      personnel.forEach(p => {
        const status = p.status || 'ACTIVO';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      setStatusData(Object.entries(statusCount).map(([status, count]) => ({
        name: status,
        value: count
      })));

      // Calcular top 5 salarios
      const sorted = [...personnel]
        .sort((a, b) => (b.salary_amount || 0) - (a.salary_amount || 0))
        .slice(0, 5)
        .map(p => ({
          name: p.full_name,
          salary: p.salary_amount || 0
        }));
      setTopSalaries(sorted);
    }
  }, [personnel]);

  const totalMonthlyCost = statistics?.totalMonthlyCost || 0;
  const totalMonthlyWithCharges = totalMonthlyCost * 1.3; // 30% cargas sociales

  return (
    <div className="space-y-4">
      {/* Costo Mensual Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Costo Mensual Total</p>
              <p className="text-3xl font-bold">${totalMonthlyWithCharges.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Salarios: ${totalMonthlyCost.toLocaleString('es-UY', { maximumFractionDigits: 0 })} + 30% cargas
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal por Rol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado del Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Personal</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Salarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 5 Salarios Mensuales</CardTitle>
        </CardHeader>
        <CardContent>
          {topSalaries.length > 0 ? (
            <div className="space-y-2">
              {topSalaries.map((person, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{person.name}</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    ${person.salary.toLocaleString('es-UY', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">
              Sin datos de personal
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
