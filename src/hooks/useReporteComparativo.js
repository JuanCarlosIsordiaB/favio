/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook para generación de Reporte Comparativo Anual
 *
 * Proporciona:
 * - Generación del reporte comparativo
 * - Datos para heatmap y tendencias
 * - Análisis año a año
 */

import { useState, useCallback, useMemo } from 'react';
import { generarReporteComparativoAnual } from '../services/kpiReports';

export function useReporteComparativo(firmId) {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compararCon, setCompararCon] = useState('año_anterior');

  /**
   * Genera reporte comparativo para un año
   */
  const generarReporte = useCallback(async (año, filtro = 'año_anterior') => {
    if (!firmId || !año) {
      setError('Faltan parámetros requeridos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const reporteData = await generarReporteComparativoAnual(firmId, año, filtro);
      setReporte(reporteData);
      setCompararCon(filtro);
      return reporteData;
    } catch (err) {
      console.error('Error generando reporte comparativo:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene datos para heatmap (lotes vs KPIs)
   */
  const obtenerDatosHeatmap = useCallback(() => {
    if (!reporte || !reporte.comparacion_lotes) return [];

    return reporte.comparacion_lotes.map(lote => ({
      loteName: lote.lot_name,
      lotId: lote.lot_id,
      valores: lote.kpis || []
    }));
  }, [reporte]);

  /**
   * Obtiene tendencias anuales de un KPI
   */
  const obtenerTendenciaKPI = useCallback((kpiCode) => {
    if (!reporte || !reporte.tendencias_anuales) return null;

    return reporte.tendencias_anuales[kpiCode] || null;
  }, [reporte]);

  /**
   * Obtiene todos los KPIs en tendencias anuales
   */
  const obtenerTodosTendencias = useCallback(() => {
    if (!reporte || !reporte.tendencias_anuales) return {};

    return reporte.tendencias_anuales;
  }, [reporte]);

  /**
   * Prepara datos para gráfico de líneas (evolución mensual)
   */
  const datosParaGraficoTendencia = useCallback((kpiCodes = []) => {
    if (!reporte || !reporte.resumen_anual || !reporte.resumen_anual.kpis_meses) {
      return [];
    }

    const meses = reporte.resumen_anual.kpis_meses;

    return meses.map((mes, index) => {
      const datos = { mes: index + 1 };

      kpiCodes.forEach(code => {
        const kpiData = mes.kpis?.find(k => k.code === code);
        datos[code] = kpiData?.value || null;
      });

      return datos;
    });
  }, [reporte]);

  /**
   * Obtiene promedios anuales de todos los KPIs
   */
  const obtenerPromediosAnnuales = useCallback(() => {
    if (!reporte || !reporte.resumen_anual) return {};

    return reporte.resumen_anual.promedio_anual || {};
  }, [reporte]);

  /**
   * Calcula variación anual para un KPI
   */
  const calcularVariacionAnual = useCallback((kpiCode) => {
    if (!reporte || !reporte.resumen_anual || !reporte.resumen_anual.kpis_meses) {
      return null;
    }

    const meses = reporte.resumen_anual.kpis_meses;
    if (meses.length < 2) return null;

    const primerMes = meses[0]?.kpis?.find(k => k.code === kpiCode);
    const ultimoMes = meses[meses.length - 1]?.kpis?.find(k => k.code === kpiCode);

    if (!primerMes || !ultimoMes) return null;

    const variacion = ((ultimoMes.value - primerMes.value) / primerMes.value) * 100;
    return {
      inicio: primerMes.value,
      fin: ultimoMes.value,
      variacion: parseFloat(variacion.toFixed(2))
    };
  }, [reporte]);

  /**
   * Obtiene KPI con mejor performance anual
   */
  const obtenerMejorKPI = useCallback(() => {
    const promedios = obtenerPromediosAnnuales();

    let mejorKPI = null;
    let mejorValor = -Infinity;

    Object.entries(promedios).forEach(([code, data]) => {
      const valor = parseFloat(data.promedio);
      if (valor > mejorValor) {
        mejorValor = valor;
        mejorKPI = { code, ...data };
      }
    });

    return mejorKPI;
  }, [obtenerPromediosAnnuales]);

  /**
   * Obtiene KPI con peor performance anual
   */
  const obtenerPeorKPI = useCallback(() => {
    const promedios = obtenerPromediosAnnuales();

    let peorKPI = null;
    let peorValor = Infinity;

    Object.entries(promedios).forEach(([code, data]) => {
      const valor = parseFloat(data.promedio);
      if (valor < peorValor) {
        peorValor = valor;
        peorKPI = { code, ...data };
      }
    });

    return peorKPI;
  }, [obtenerPromediosAnnuales]);

  /**
   * Obtiene lote con mejor desempeño
   */
  const obtenerMejorLote = useCallback(() => {
    if (!reporte || !reporte.comparacion_lotes) return null;

    // Simplificar: el lote con más verdes (KPIs en verde)
    let mejorLote = null;
    let maxVerdes = -1;

    reporte.comparacion_lotes.forEach(lote => {
      const verdes = (lote.kpis || []).filter(k => k.status === 'VERDE').length;
      if (verdes > maxVerdes) {
        maxVerdes = verdes;
        mejorLote = lote;
      }
    });

    return mejorLote;
  }, [reporte]);

  /**
   * Obtiene estadísticas por categoría de KPI
   */
  const obtenerEstadisticasPorCategoria = useCallback(() => {
    const promedios = obtenerPromediosAnnuales();
    const categorias = {};

    Object.entries(promedios).forEach(([code, data]) => {
      const categoria = data.category || 'DESCONOCIDA';
      if (!categorias[categoria]) {
        categorias[categoria] = { count: 0, promedio: 0 };
      }
      categorias[categoria].count++;
      categorias[categoria].promedio += parseFloat(data.promedio);
    });

    // Promediar
    Object.keys(categorias).forEach(cat => {
      categorias[cat].promedio = (categorias[cat].promedio / categorias[cat].count).toFixed(2);
    });

    return categorias;
  }, [obtenerPromediosAnnuales]);

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
      a.download = `reporte_comparativo_${reporte.año}.json`;
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
      titulo: `Reporte Comparativo Anual ${reporte.año}`,
      fecha_generacion: new Date(reporte.fecha_generacion).toLocaleDateString('es-ES'),
      resumen_anual: reporte.resumen_anual,
      comparacion_lotes: reporte.comparacion_lotes,
      tendencias_anuales: reporte.tendencias_anuales,
      comparar_con: reporte.comparar_con
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
    compararCon,

    // Generación
    generarReporte,

    // Obtención de datos
    obtenerDatosHeatmap,
    obtenerTendenciaKPI,
    obtenerTodosTendencias,
    obtenerPromediosAnnuales,

    // Análisis
    calcularVariacionAnual,
    obtenerMejorKPI,
    obtenerPeorKPI,
    obtenerMejorLote,
    obtenerEstadisticasPorCategoria,
    datosParaGraficoTendencia,

    // Exportación
    exportarJSON,
    prepararParaPDF,

    // Otros
    limpiar
  };
}
