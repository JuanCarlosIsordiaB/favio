/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: KPI Card con Semáforo
 *
 * Tarjeta visual individual de KPI con:
 * - Semáforo (🟢⚠️❌)
 * - Valor actual
 * - Tendencia
 * - Barra de progreso
 */

import React, { useState, useMemo } from 'react';
import { canEditThresholds } from '../../lib/roleMapping';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
  Settings,
  BarChart3
} from 'lucide-react';

const STATUS_CONFIG = {
  VERDE: {
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    icon: '🟢',
    label: 'Óptimo',
    bgBar: 'bg-green-500'
  },
  AMARILLO: {
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    icon: '⚠️',
    label: 'Advertencia',
    bgBar: 'bg-yellow-500'
  },
  ROJO: {
    color: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    icon: '❌',
    label: 'Crítico',
    bgBar: 'bg-red-500'
  }
};

export default function KPICard({
  kpi,
  onClick,
  onViewDetail,
  onConfigure,
  onViewTrend,
  userRole = 'administrador'
}) {
  const [isHovered, setIsHovered] = useState(false);

  const config = STATUS_CONFIG[kpi.status] || STATUS_CONFIG.VERDE;

  // Calcular porcentaje de progreso para barra visual
  const calcularProgreso = () => {
    if (!kpi.umbral) return 50;

    const {
      optimal_min,
      optimal_max,
      critical_min,
      critical_max
    } = kpi.umbral;

    // Simplificar: porcentaje dentro del rango óptimo
    const range = optimal_max - optimal_min;
    const valor = kpi.value - optimal_min;
    const porcentaje = Math.max(0, Math.min(100, (valor / range) * 100));

    return porcentaje;
  };

  // Verificar si el usuario puede editar umbrales
  const canEdit = useMemo(() => canEditThresholds(userRole), [userRole]);

  const handleViewDetail = () => {
    if (onViewDetail) {
      onViewDetail(kpi);
    } else if (onClick) {
      onClick(kpi);
    }
  };

  return (
    <Card
      className={`relative border-2 cursor-pointer transition-all hover:shadow-lg ${config.color}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleViewDetail}
    >
      <CardContent className="p-4">
        {/* Header: Semáforo + Nombre */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl mt-1">{config.icon}</div>
            <div className="flex-1">
              <p className={`text-xs font-semibold ${config.textColor} opacity-75`}>
                {kpi.category}
              </p>
              <h3 className={`font-semibold text-sm ${config.textColor} leading-tight`}>
                {kpi.name}
              </h3>
            </div>
          </div>

          {/* Menú de acciones (cuando se hoverea) */}
          {isHovered && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  e.stopPropagation?.();
                  handleViewDetail();
                }}>
                  <Eye size={14} className="mr-2" />
                  Ver Detalle
                </DropdownMenuItem>
                {onViewTrend && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation?.();
                    onViewTrend(kpi);
                  }}>
                    <BarChart3 size={14} className="mr-2" />
                    Ver Tendencia
                  </DropdownMenuItem>
                )}
                {canEdit && onConfigure && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation?.();
                    onConfigure(kpi);
                  }}>
                    <Settings size={14} className="mr-2" />
                    Configurar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Valor actual + Unit */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${config.textColor}`}>
              {typeof kpi.value === 'number' ? kpi.value.toFixed(2) : kpi.value}
            </span>
            <span className={`text-xs ${config.textColor} opacity-75`}>
              {kpi.unit || ''}
            </span>
          </div>
        </div>

        {/* Tendencia */}
        {kpi.trend !== undefined && (
          <div className={`text-xs flex items-center gap-1 mb-2 ${
            kpi.trend > 0 ? 'text-green-600' : kpi.trend < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {kpi.trend > 0 && <TrendingUp size={14} />}
            {kpi.trend < 0 && <TrendingDown size={14} />}
            {kpi.trend > 0 ? '+' : ''}{kpi.trend}% vs período anterior
          </div>
        )}

        {/* Barra de progreso (opcional) */}
        {kpi.umbral && (
          <div className="mb-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.bgBar} transition-all`}
                style={{ width: `${calcularProgreso()}%` }}
              />
            </div>
          </div>
        )}

        {/* Rango de referencia */}
        {kpi.umbral && (
          <div className="text-xs text-gray-500 mt-2">
            Óptimo: {kpi.umbral.optimal_min} - {kpi.umbral.optimal_max}
          </div>
        )}

        {/* Footer con badge de status */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-current border-opacity-10">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.color}`}>
            {config.label}
          </span>

          {/* Info adicional */}
          {kpi.is_mandatory && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Obligatorio
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
