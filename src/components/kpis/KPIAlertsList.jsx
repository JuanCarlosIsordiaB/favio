/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Lista de Alertas de KPIs
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Button } from '../ui/button';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Badge } from '../ui/badge';

const PRIORITY_CONFIG = {
  alta: { icon: <AlertCircle size={16} />, color: 'bg-red-50', textColor: 'text-red-700', label: 'Crítica' },
  media: { icon: <AlertTriangle size={16} />, color: 'bg-yellow-50', textColor: 'text-yellow-700', label: 'Advertencia' },
  baja: { icon: <Clock size={16} />, color: 'bg-blue-50', textColor: 'text-blue-700', label: 'Baja' }
};

const STATUS_CONFIG = {
  pendiente: { icon: <AlertCircle size={14} />, color: 'bg-orange-100 text-orange-800', label: 'Pendiente' },
  completed: { icon: <CheckCircle size={14} />, color: 'bg-green-100 text-green-800', label: 'Resuelta' },
  cancelled: { icon: <XCircle size={14} />, color: 'bg-gray-100 text-gray-800', label: 'Cancelada' }
};

export default function KPIAlertsList({
  alertas = [],
  priority = null,
  onResolve = null,
  showActions = true
}) {
  const [resolviendo, setResolviendo] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');

  const alertasFiltradas = alertas.filter(a => {
    if (priority && a.prioridad !== priority) return false;
    if (filtroEstado && a.estado !== filtroEstado) return false;
    return true;
  });

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  const extraerKPICode = (reglaAplicada) => {
    if (!reglaAplicada) return 'DESCONOCIDO';
    const match = reglaAplicada.match(/KPI_([A-Z_]+)_/);
    return match ? match[1] : 'DESCONOCIDO';
  };

  const extraerStatus = (reglaAplicada) => {
    if (!reglaAplicada) return 'DESCONOCIDO';
    const match = reglaAplicada.match(/_([A-Z]+)$/);
    return match ? match[1] : 'DESCONOCIDO';
  };

  if (alertasFiltradas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
        <p>No hay alertas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros de estado */}
      {showActions && (
        <div className="flex gap-2">
          <Button
            variant={filtroEstado === 'pendiente' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado('pendiente')}
          >
            Pendientes
          </Button>
          <Button
            variant={filtroEstado === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado('completed')}
          >
            Resueltas
          </Button>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Prioridad</TableHead>
              <TableHead>KPI</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-24">Fecha</TableHead>
              <TableHead className="w-20">Estado</TableHead>
              {showActions && <TableHead className="w-20">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertasFiltradas.map(alerta => {
              const config = PRIORITY_CONFIG[alerta.prioridad];
              const statusConfig = STATUS_CONFIG[alerta.estado];
              const kpiCode = extraerKPICode(alerta.regla_aplicada);
              const kpiStatus = extraerStatus(alerta.regla_aplicada);

              return (
                <TableRow
                  key={alerta.id}
                  className={`${config.color} hover:bg-opacity-75 transition-colors`}
                >
                  <TableCell>
                    <div className={`flex items-center justify-center ${config.textColor}`}>
                      {config.icon}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <code className={`text-sm font-semibold ${config.textColor}`}>
                        {kpiCode}
                      </code>
                      {kpiStatus && (
                        <Badge variant="secondary" className="text-xs">
                          {kpiStatus}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm">
                    {alerta.descripcion || alerta.titulo}
                  </TableCell>

                  <TableCell className="text-xs text-gray-600">
                    {formatearFecha(alerta.fecha)}
                  </TableCell>

                  <TableCell>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>

                  {showActions && (
                    <TableCell>
                      {alerta.estado === 'pendiente' && onResolve && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolviendo === alerta.id}
                          onClick={async () => {
                            setResolviendo(alerta.id);
                            try {
                              await onResolve(alerta.id);
                            } finally {
                              setResolviendo(null);
                            }
                          }}
                        >
                          {resolviendo === alerta.id ? '...' : 'Resolver'}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Resumen */}
      <div className="text-xs text-gray-500">
        <p>Mostrando {alertasFiltradas.length} de {alertas.length} alertas</p>
      </div>
    </div>
  );
}
