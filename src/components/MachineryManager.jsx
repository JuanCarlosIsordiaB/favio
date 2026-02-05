import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useMachinery } from '../hooks/useMachinery';
import { usePersonnelAlerts } from '../hooks/usePersonnelAlerts';
import { Wrench, Zap, TrendingUp, Clock, Bell, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MachineryListView from './vistas/MachineryListView';
import ServiceOrdersView from './vistas/ServiceOrdersView';
import MaintenanceView from './vistas/MaintenanceView';

export default function MachineryManager({ firmId, premiseId, currentUser }) {
  const [currentTab, setCurrentTab] = useState('machinery');

  const {
    machinery,
    serviceOrders,
    profitability,
    loading,
    loadMachinery,
    loadServiceOrders,
    loadProfitability
  } = useMachinery(firmId);

  const {
    alerts,
    checkAlerts
  } = usePersonnelAlerts(firmId);

  if (!firmId) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          Selecciona una empresa para gestionar la maquinaria.
        </p>
      </Card>
    );
  }

  const totalServices = serviceOrders.length;
  const completedServices = serviceOrders.filter(o => o.status === 'completed').length;
  const totalHours = serviceOrders.reduce((sum, o) => sum + (parseFloat(o.hours_worked) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Servicios</p>
              <p className="text-2xl font-bold">{totalServices}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completados</p>
              <p className="text-2xl font-bold text-green-600">{completedServices}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Horas</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {alerts?.filter(a => a.reference_table === 'machinery').length || 0}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={checkAlerts}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="machinery" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Maquinaria</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Servicios</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Mantenimiento</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Rentabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machinery" className="space-y-4">
          <MachineryListView
            firmId={firmId}
            machinery={machinery}
            loading={loading}
            onRefresh={loadMachinery}
            onCheckAlerts={checkAlerts}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServiceOrdersView
            firmId={firmId}
            premiseId={premiseId}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceView
            firmId={firmId}
            premiseId={premiseId}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          {/* Resumen General */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Costos Totales</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${(Array.isArray(profitability) ? profitability.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0) : profitability.totalCost || 0).toLocaleString('es-UY')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(Array.isArray(profitability) ? profitability.reduce((sum, p) => sum + (parseFloat(p.total_revenue) || 0), 0) : profitability.totalRevenue || 0).toLocaleString('es-UY')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margen Total</p>
                  <p className={`text-2xl font-bold ${
                    (Array.isArray(profitability)
                      ? profitability.reduce((sum, p) => sum + (parseFloat(p.profit_margin) || 0), 0)
                      : (profitability.totalRevenue || 0) - (profitability.totalCost || 0)) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    ${(Array.isArray(profitability)
                      ? profitability.reduce((sum, p) => sum + (parseFloat(p.profit_margin) || 0), 0)
                      : (profitability.totalRevenue || 0) - (profitability.totalCost || 0)).toLocaleString('es-UY')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Rentabilidad */}
          {Array.isArray(profitability) && profitability.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análisis de Rentabilidad por Máquina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={profitability.map(item => ({
                      name: item.machinery_name || 'Sin nombre',
                      'Ingresos': parseFloat(item.total_revenue || 0),
                      'Costos': parseFloat(item.total_cost || 0),
                      'Margen': parseFloat(item.profit_margin || 0)
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => `$${value.toLocaleString('es-UY')}`}
                      labelFormatter={(label) => `Máquina: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="Ingresos" stackId="a" fill="#16a34a" />
                    <Bar dataKey="Costos" stackId="a" fill="#dc2626" />
                    <Bar dataKey="Margen" stackId="a" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabla Detallada */}
          <Card>
            <CardContent className="pt-6">
              {Array.isArray(profitability) && profitability.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Maquinaria</th>
                        <th className="text-center py-3 px-4 font-semibold">Servicios</th>
                        <th className="text-center py-3 px-4 font-semibold">Horas</th>
                        <th className="text-right py-3 px-4 font-semibold">Costos</th>
                        <th className="text-right py-3 px-4 font-semibold">Ingresos</th>
                        <th className="text-right py-3 px-4 font-semibold">Margen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitability.map((item, idx) => {
                        const margin = parseFloat(item.profit_margin || 0);
                        const costs = parseFloat(item.total_cost || 0);
                        const revenue = parseFloat(item.total_revenue || 0);

                        return (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium">
                              {item.machinery_name || 'Sin nombre'}
                            </td>
                            <td className="text-center py-3 px-4">
                              {item.service_count || 0}
                            </td>
                            <td className="text-center py-3 px-4">
                              {(item.total_hours || 0).toFixed(2)} h
                            </td>
                            <td className="text-right py-3 px-4 text-red-600 font-medium">
                              ${costs.toLocaleString('es-UY')}
                            </td>
                            <td className="text-right py-3 px-4 text-green-600 font-medium">
                              ${revenue.toLocaleString('es-UY')}
                            </td>
                            <td className={`text-right py-3 px-4 font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {margin >= 0 ? '+' : ''} ${margin.toLocaleString('es-UY')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay datos de rentabilidad disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="pt-6">
              {alerts.filter(a => a.reference_table === 'machinery').length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No hay alertas de maquinaria
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.filter(a => a.reference_table === 'machinery').map(alert => (
                    <div key={alert.id} className={`p-3 border rounded ${
                      alert.priority === 'HIGH' ? 'bg-red-50 border-red-200' :
                      alert.priority === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
