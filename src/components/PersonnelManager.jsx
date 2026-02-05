import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { usePersonnel } from '../hooks/usePersonnel';
import { usePersonnelAlerts } from '../hooks/usePersonnelAlerts';
import { Users, Briefcase, GraduationCap, ClipboardList, BarChart3, Bell, RefreshCw } from 'lucide-react';
import TrainingView from './vistas/TrainingView';
import AssignmentsView from './vistas/AssignmentsView';
import OrgChartView from './vistas/OrgChartView';
import PersonnelChartsView from './vistas/PersonnelChartsView';
import PersonnelListView from './vistas/PersonnelListView';

export default function PersonnelManager({ firmId, premiseId, currentUser }) {
  const [currentTab, setCurrentTab] = useState('personnel');
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    personnel,
    loading,
    statistics,
    loadPersonnel
  } = usePersonnel(firmId);

  const {
    alerts,
    checkAlerts
  } = usePersonnelAlerts(firmId);

  if (!firmId) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          Selecciona una empresa para gestionar el personal.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Personal Total</p>
              <p className="text-2xl font-bold">{statistics?.total || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-green-600">{statistics?.active || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Costo Mensual</p>
              <p className="text-2xl font-bold">
                ${statistics?.totalMonthlyCost?.toLocaleString() || 0}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold text-orange-600">{alerts?.length || 0}</p>
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
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">Organigrama</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Capacitaciones</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Asignaciones</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Reportes</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alertas</span>
            {alerts?.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {alerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="space-y-4">
          <PersonnelListView
            firmId={firmId}
            personnel={personnel}
            loading={loading}
            onRefresh={loadPersonnel}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="orgchart">
          <OrgChartView firmId={firmId} />
        </TabsContent>

        <TabsContent value="training">
          <TrainingView firmId={firmId} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsView firmId={firmId} premiseId={premiseId} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="charts">
          <PersonnelChartsView firmId={firmId} />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="pt-6">
              {alerts.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No hay alertas activas
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
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
