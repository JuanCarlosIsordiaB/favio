import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function PersonnelAlertsPanel({ firmId, alerts = [], onRefresh }) {
  const personnelAlerts = alerts.filter(a => a.reference_table === 'personnel_training' || a.reference_table === 'personnel_assignments');

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'MEDIUM':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const groupedAlerts = {
    HIGH: personnelAlerts.filter(a => a.priority === 'HIGH'),
    MEDIUM: personnelAlerts.filter(a => a.priority === 'MEDIUM'),
    LOW: personnelAlerts.filter(a => a.priority === 'LOW')
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total de Alertas</div>
            <div className="text-2xl font-bold">{personnelAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Críticas</div>
            <div className="text-2xl font-bold text-red-600">{groupedAlerts.HIGH.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Advertencias</div>
            <div className="text-2xl font-bold text-yellow-600">{groupedAlerts.MEDIUM.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-sm text-muted-foreground">Información</div>
                <div className="text-2xl font-bold text-blue-600">{groupedAlerts.LOW.length}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      {groupedAlerts.HIGH.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              Alertas Críticas ({groupedAlerts.HIGH.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedAlerts.HIGH.map(alert => (
                <div key={alert.id} className="p-3 bg-white border border-red-200 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">{alert.title}</p>
                      <p className="text-sm text-red-700 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de advertencia */}
      {groupedAlerts.MEDIUM.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="w-5 h-5" />
              Advertencias ({groupedAlerts.MEDIUM.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedAlerts.MEDIUM.map(alert => (
                <div key={alert.id} className="p-3 bg-white border border-yellow-200 rounded">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-800">{alert.title}</p>
                      <p className="text-sm text-yellow-700 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información */}
      {groupedAlerts.LOW.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="w-5 h-5" />
              Información ({groupedAlerts.LOW.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedAlerts.LOW.map(alert => (
                <div key={alert.id} className="p-3 bg-white border border-blue-200 rounded">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-800">{alert.title}</p>
                      <p className="text-sm text-blue-700 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin alertas */}
      {personnelAlerts.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 py-8">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-800 font-medium">
                No hay alertas de personal activas
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
