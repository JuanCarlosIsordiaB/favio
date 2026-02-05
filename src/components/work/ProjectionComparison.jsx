/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Componente para comparar proyección vs trabajo ejecutado
 *
 * Funcionalidad:
 * - Mostrar proyección original y trabajo ejecutado lado a lado
 * - Comparar: fechas, costos, insumos, variaciones
 * - Indicadores visuales con colores según desviación
 * - Exportación de datos (opcional)
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  DollarSign, Calendar, Zap, Loader, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../ui/card';

export default function ProjectionComparison({ projectionId, workId, onClose }) {
  const [projection, setProjection] = useState(null);
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    loadComparison();
  }, [projectionId, workId]);

  async function loadComparison() {
    setLoading(true);
    try {
      // Cargar proyección
      const { data: projData, error: projError } = await supabase
        .from('proyecciones_agricolas')
        .select(`
          *,
          lots(id, name),
          firms(id, name),
          premises(id, name)
        `)
        .eq('id', projectionId)
        .single();

      if (projError) throw projError;

      // Cargar trabajo (usando workId o buscándolo por proyección)
      let workData;
      if (workId) {
        const { data, error } = await supabase
          .from('agricultural_works')
          .select(`
            *,
            lots(id, name, area_hectares),
            firms(id, name),
            premises(id, name),
            cost_centers(id, code, name)
          `)
          .eq('id', workId)
          .single();

        if (error) throw error;
        workData = data;
      }

      setProjection(projData);
      setWork(workData);

      // Calcular variaciones
      if (projData && workData) {
        calculateVariances(projData, workData);
      }
    } catch (err) {
      console.error('Error loading comparison:', err);
      toast.error('Error al cargar datos de comparación');
    } finally {
      setLoading(false);
    }
  }

  function calculateVariances(proj, work) {
    // Variación de fecha (días)
    const projDate = new Date(proj.fecha_tentativa);
    const workDate = new Date(work.date);
    const dateVariance = Math.floor((workDate - projDate) / (1000 * 60 * 60 * 24));

    // Variación de costo (%)
    const estimatedCost = proj.estimated_total_cost || 0;
    const actualCost =
      (work.inputs_cost || 0) +
      (work.machinery_cost || 0) +
      (work.labor_cost || 0) +
      (work.other_costs || 0);

    const costVariance = estimatedCost > 0
      ? ((actualCost - estimatedCost) / estimatedCost) * 100
      : 0;

    // Variación de dosis (si hay datos)
    const doseVariance = proj.dosis_ha ? 0 : null; // Simplificado

    // Variación de hectáreas
    const hectareVariance = (
      ((work.hectares || proj.hectareas) - (proj.hectareas || work.hectares)) /
      (proj.hectareas || work.hectares)
    ) * 100;

    setComparison({
      dateVariance,
      costVariance,
      doseVariance,
      hectareVariance,
      estimatedCost,
      actualCost,
      difference: actualCost - estimatedCost
    });
  }

  const getVarianceColor = (variance) => {
    if (variance === null || variance === undefined) return 'text-slate-500';
    if (Math.abs(variance) < 5) return 'text-green-600';
    if (Math.abs(variance) < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceBgColor = (variance) => {
    if (variance === null || variance === undefined) return 'bg-slate-50';
    if (Math.abs(variance) < 5) return 'bg-green-50';
    if (Math.abs(variance) < 15) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const VarianceIndicator = ({ value, label, unit = '%' }) => {
    if (value === null || value === undefined) {
      return (
        <div className="p-3 bg-slate-50 rounded text-center">
          <p className="text-xs text-slate-600">{label}</p>
          <p className="text-sm font-medium text-slate-500">N/A</p>
        </div>
      );
    }

    const isPositive = value >= 0;
    const absValue = Math.abs(value);
    const colorClass = getVarianceColor(value);
    const bgColor = getVarianceBgColor(value);

    return (
      <div className={`p-3 ${bgColor} rounded text-center`}>
        <p className="text-xs text-slate-600">{label}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className={`w-4 h-4 ${colorClass}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 ${colorClass}`} />
          )}
          <p className={`text-sm font-bold ${colorClass}`}>
            {isPositive ? '+' : ''}{absValue.toFixed(1)}{unit}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <Loader className="animate-spin" size={32} />
            <p className="text-slate-600">Cargando comparación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projection || !work) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-orange-500" />
            <div className="text-center">
              <p className="font-semibold text-slate-900">Datos incompletos</p>
              <p className="text-sm text-slate-600 mt-1">
                No se encontraron datos para la comparación
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Cerrar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-5xl w-full my-8">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Comparación: Planificado vs Ejecutado
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {projection.lots?.name || 'Lote'} - {projection.firms?.name || 'Firma'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Resumen de variaciones principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <VarianceIndicator value={comparison?.dateVariance} label="Variación Fecha" unit=" días" />
            <VarianceIndicator value={comparison?.costVariance} label="Variación Costo" unit="%" />
            <VarianceIndicator value={comparison?.hectareVariance} label="Variación Hectáreas" unit="%" />
            <VarianceIndicator value={comparison?.doseVariance} label="Variación Dosis" unit="%" />
          </div>

          {/* Información general lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PLANIFICADO */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Planificado (Proyección)</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600">Fecha Tentativa</p>
                  <p className="font-medium text-slate-900">
                    {new Date(projection.fecha_tentativa).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Costo Estimado</p>
                  <p className="font-bold text-blue-600 text-lg">
                    ${(projection.estimated_total_cost || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Desglose Estimado</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Insumos:</span>
                      <span className="font-medium">
                        ${(projection.estimated_inputs_cost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Maquinaria:</span>
                      <span className="font-medium">
                        ${(projection.estimated_machinery_cost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Mano de Obra:</span>
                      <span className="font-medium">
                        ${(projection.estimated_labor_cost || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Hectáreas</p>
                  <p className="font-medium text-slate-900">{projection.hectareas} ha</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Prioridad</p>
                  <p className="font-medium text-slate-900">{projection.priority || 'MEDIUM'}</p>
                </div>
              </CardContent>
            </Card>

            {/* EJECUTADO */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Ejecutado (Trabajo Real)</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600">Fecha Ejecución</p>
                  <p className="font-medium text-slate-900">
                    {new Date(work.date).toLocaleDateString('es-ES')}
                  </p>
                  {comparison?.dateVariance && (
                    <p className={`text-xs mt-1 ${getVarianceColor(comparison.dateVariance)}`}>
                      {comparison.dateVariance > 0 ? '+' : ''}{comparison.dateVariance} días
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-600">Costo Real</p>
                  <p className="font-bold text-green-600 text-lg">
                    ${comparison?.actualCost.toFixed(2)}
                  </p>
                  {comparison?.difference && (
                    <p className={`text-xs mt-1 ${getVarianceColor(comparison.costVariance)}`}>
                      {comparison.difference > 0 ? '+$' : '-$'}{Math.abs(comparison.difference).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-600">Desglose Real</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Insumos:</span>
                      <span className="font-medium">
                        ${(work.inputs_cost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Maquinaria:</span>
                      <span className="font-medium">
                        ${(work.machinery_cost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Mano de Obra:</span>
                      <span className="font-medium">
                        ${(work.labor_cost || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Hectáreas</p>
                  <p className="font-medium text-slate-900">{work.hectares} ha</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Centro de Costo</p>
                  <p className="font-medium text-slate-900">
                    {work.cost_centers?.code || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análisis detallado */}
          <Card className="bg-slate-50">
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-slate-900">Análisis de Variaciones</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Costo */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Variación de Costo</span>
                  <span className={`text-sm font-bold ${getVarianceColor(comparison?.costVariance)}`}>
                    {comparison?.costVariance > 0 ? '+' : ''}{comparison?.costVariance.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      Math.abs(comparison?.costVariance || 0) < 5
                        ? 'bg-green-500'
                        : Math.abs(comparison?.costVariance || 0) < 15
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(Math.abs(comparison?.costVariance || 0) * 3, 100)}%`
                    }}
                  />
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Estimado: ${comparison?.estimatedCost.toFixed(2)} → Real: ${comparison?.actualCost.toFixed(2)}
                </p>
              </div>

              {/* Fecha */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Variación de Fecha</span>
                  <span className={`text-sm font-bold ${getVarianceColor(comparison?.dateVariance)}`}>
                    {comparison?.dateVariance > 0 ? '+' : ''}{comparison?.dateVariance} días
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {comparison?.dateVariance === 0
                    ? '✓ Se ejecutó en la fecha planificada'
                    : comparison?.dateVariance > 0
                    ? `⚠ Se retrasó ${Math.abs(comparison.dateVariance)} días`
                    : `✓ Se adelantó ${Math.abs(comparison.dateVariance)} días`}
                </p>
              </div>

              {/* Hectáreas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Variación de Hectáreas</span>
                  <span className={`text-sm font-bold ${getVarianceColor(comparison?.hectareVariance)}`}>
                    {comparison?.hectareVariance > 0 ? '+' : ''}{comparison?.hectareVariance.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Planificado: {projection.hectareas} ha → Ejecutado: {work.hectares} ha
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Observaciones */}
          {work.detail && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-slate-900">Observaciones de Ejecución</h3>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{work.detail}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </Card>
    </div>
  );
}
