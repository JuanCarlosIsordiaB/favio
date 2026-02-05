/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Modal de Detalle de KPI
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useKPIAlerts } from '../../hooks/useKPIAlerts';
import KPITrendChart from './KPITrendChart';
import { X, AlertCircle, TrendingUp } from 'lucide-react';

const STATUS_COLORS = {
  VERDE: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
  AMARILLO: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' }
};

export default function KPIDetailModal({ kpi, open = false, onClose = () => {} }) {
  const [tendenciaData, setTendenciaData] = useState(null);
  const { alertas } = useKPIAlerts(kpi?.firm_id);

  if (!kpi || !open) return null;

  const config = STATUS_COLORS[kpi.status] || STATUS_COLORS.VERDE;

  // Filtrar alertas relacionadas a este KPI
  const alertasKPI = alertas.filter(a =>
    a.regla_aplicada && a.regla_aplicada.includes(kpi.code)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.icon}</span>
              <div>
                <DialogTitle className="text-2xl">{kpi.name}</DialogTitle>
                <p className="text-sm text-gray-500">{kpi.category}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Valor actual */}
          <Card className={config.bg}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-5xl font-bold ${config.text}`}>
                    {typeof kpi.value === 'number' ? kpi.value.toFixed(2) : kpi.value}
                  </span>
                  <span className={`text-lg ${config.text}`}>{kpi.unit}</span>
                </div>
                <Badge className={config.bg}>{kpi.status}</Badge>
                {kpi.metadata?.calculated_at && (
                  <p className="text-xs text-gray-500">
                    Calculado: {new Date(kpi.metadata.calculated_at).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="umbrales" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="umbrales">Umbrales</TabsTrigger>
              <TabsTrigger value="tendencia">Tendencia</TabsTrigger>
              <TabsTrigger value="alertas">Alertas</TabsTrigger>
            </TabsList>

            {/* Umbrales */}
            <TabsContent value="umbrales" className="space-y-4">
              {kpi.umbral ? (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-green-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Óptimo 🟢</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">
                        {kpi.umbral.optimal_min} - {kpi.umbral.optimal_max}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Advertencia ⚠️</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">
                        {kpi.umbral.warning_min} - {kpi.umbral.warning_max}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Crítico ❌</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">
                        {kpi.umbral.critical_min} - {kpi.umbral.critical_max}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No hay umbrales configurados</p>
                </div>
              )}
            </TabsContent>

            {/* Tendencia */}
            <TabsContent value="tendencia" className="space-y-4">
              <KPITrendChart kpiCode={kpi.code} kpiName={kpi.name} />
            </TabsContent>

            {/* Alertas */}
            <TabsContent value="alertas" className="space-y-4">
              {alertasKPI.length > 0 ? (
                <div className="space-y-2">
                  {alertasKPI.map(alerta => (
                    <Card key={alerta.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3 flex-1">
                            <AlertCircle
                              size={20}
                              className={
                                alerta.prioridad === 'alta'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }
                            />
                            <div>
                              <p className="font-semibold text-sm">{alerta.titulo}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {alerta.descripcion}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(alerta.fecha).toLocaleString('es-ES')}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              alerta.estado === 'completed' ? 'default' : 'destructive'
                            }
                          >
                            {alerta.estado}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No hay alertas para este KPI</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Metadata */}
          {kpi.metadata && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm">Información Técnica</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <pre className="bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(kpi.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
