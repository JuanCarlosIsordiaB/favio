/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook para generación de Reporte Ejecutivo Mensual
 *
 * Proporciona:
 * - Generación del reporte ejecutivo
 * - Datos para visualización
 * - Exportación a PDF/Excel
 */

import { useState, useCallback } from 'react';
import { generarReporteEjecutivoMensual } from '../services/kpiReports';

export function useReporteEjecutivo(firmId) {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Genera reporte ejecutivo para un mes específico
   */
  const generarReporte = useCallback(async (mes, año) => {
    if (!firmId || !mes || !año) {
      setError('Faltan parámetros requeridos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const reporteData = await generarReporteEjecutivoMensual(firmId, mes, año);
      setReporte(reporteData);
      return reporteData;
    } catch (err) {
      console.error('Error generando reporte ejecutivo:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene resumen del reporte
   */
  const obtenerResumen = useCallback(() => {
    if (!reporte) return null;

    return {
      periodo: reporte.periodo,
      fecha_generacion: reporte.fecha_generacion,
      total_kpis: reporte.resumen.total_kpis,
      kpis_optimos: reporte.resumen.kpis_en_optimo,
      kpis_advertencia: reporte.resumen.kpis_en_advertencia,
      kpis_criticos: reporte.resumen.kpis_en_critico,
      porcentaje_optimo: reporte.resumen.porcentaje_optimo,
      total_alertas: reporte.alertas_del_mes?.total || 0,
      alertas_criticas: reporte.alertas_del_mes?.criticas || 0,
      alertas_advertencias: reporte.alertas_del_mes?.advertencias || 0
    };
  }, [reporte]);

  /**
   * Obtiene KPIs para visualización en tarjetas
   */
  const obtenerKPIsParaTarjetas = useCallback(() => {
    if (!reporte) return [];

    return [
      ...reporte.kpis_optimos?.map(k => ({ ...k, status: 'VERDE' })) || [],
      ...reporte.kpis_advertencia?.map(k => ({ ...k, status: 'AMARILLO' })) || [],
      ...reporte.kpis_criticos?.map(k => ({ ...k, status: 'ROJO' })) || []
    ];
  }, [reporte]);

  /**
   * Obtiene alertas del período
   */
  const obtenerAlertas = useCallback(() => {
    if (!reporte || !reporte.alertas_del_mes) return [];
    return reporte.alertas_del_mes.alertas || [];
  }, [reporte]);

  /**
   * Obtiene comparación intermensual
   */
  const obtenerComparacion = useCallback(() => {
    if (!reporte) return [];
    return reporte.comparacion_intermensual || [];
  }, [reporte]);

  /**
   * Obtiene recomendaciones automáticas
   */
  const obtenerRecomendaciones = useCallback(() => {
    if (!reporte) return [];
    return reporte.recomendaciones || [];
  }, [reporte]);

  /**
   * Calcula tendencias de KPIs (mejora/empeoramiento)
   */
  const calcularTendencias = useCallback(() => {
    const comparacion = reporte?.comparacion_intermensual || [];

    return {
      mejorados: comparacion.filter(c => c.variation > 0).length,
      empeorados: comparacion.filter(c => c.variation < 0).length,
      sin_cambio: comparacion.filter(c => c.variation === 0).length
    };
  }, [reporte]);

  /**
   * Prepara datos para gráfico de comparación
   */
  const datosParaGraficoComparacion = useCallback(() => {
    const comparacion = reporte?.comparacion_intermensual || [];

    return comparacion.map(item => ({
      name: item.name,
      anterior: item.value_prev || 0,
      actual: item.value_current || 0,
      variation: item.variation || 0
    }));
  }, [reporte]);

  /**
   * Obtiene KPIs críticos ordenados
   */
  const obtenerKPIsCriticosOrdenados = useCallback(() => {
    if (!reporte) return [];

    return (reporte.kpis_criticos || [])
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 10); // Top 10
  }, [reporte]);

  /**
   * Exporta reporte a JSON
   */
  const exportarJSON = useCallback(() => {
    if (!reporte) {
      setError('No hay reporte para exportar');
      return false;
    }

    try {
      const contenido = JSON.stringify(reporte, null, 2);
      const blob = new Blob([contenido], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_ejecutivo_${reporte.periodo.mes}_${reporte.periodo.año}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      setError('Error exportando JSON');
      return false;
    }
  }, [reporte]);

  /**
   * Prepara contenido para exportación a PDF
   */
  const prepararParaPDF = useCallback(() => {
    if (!reporte) return null;

    return {
      titulo: `Reporte Ejecutivo - ${new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long'
      }).format(new Date(reporte.periodo.año, reporte.periodo.mes - 1))}`,
      fecha_generacion: new Date(reporte.fecha_generacion).toLocaleDateString('es-ES'),
      resumen: reporte.resumen,
      kpis_criticos: reporte.kpis_criticos,
      kpis_advertencia: reporte.kpis_advertencia,
      alertas: reporte.alertas_del_mes,
      comparacion: reporte.comparacion_intermensual,
      recomendaciones: reporte.recomendaciones
    };
  }, [reporte]);

  /**
   * Limpiar reporte actual
   */
  const limpiar = useCallback(() => {
    setReporte(null);
    setError(null);
  }, []);

  return {
    // Estado
    reporte,
    loading,
    error,

    // Generación
    generarReporte,

    // Obtención de datos
    obtenerResumen,
    obtenerKPIsParaTarjetas,
    obtenerAlertas,
    obtenerComparacion,
    obtenerRecomendaciones,
    obtenerKPIsCriticosOrdenados,

    // Análisis
    calcularTendencias,
    datosParaGraficoComparacion,

    // Exportación
    exportarJSON,
    prepararParaPDF,

    // Otros
    limpiar
  };
}
