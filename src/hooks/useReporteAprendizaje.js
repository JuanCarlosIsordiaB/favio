/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Hook para generación de Reporte de Aprendizaje
 *
 * Proporciona:
 * - Generación del reporte de decisiones
 * - Análisis de impacto económico
 * - Lecciones aprendidas
 * - ROI de decisiones
 */

import { useState, useCallback, useMemo } from 'react';
import { generarReporteAprendizaje } from '../services/kpiReports';

export function useReporteAprendizaje(firmId) {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leccionesEdicion, setLeccionesEdicion] = useState({});

  /**
   * Genera reporte de aprendizaje para un período
   */
  const generarReporte = useCallback(async (fechaInicio, fechaFin) => {
    if (!firmId || !fechaInicio || !fechaFin) {
      setError('Faltan parámetros requeridos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const reporteData = await generarReporteAprendizaje(firmId, fechaInicio, fechaFin);
      setReporte(reporteData);
      return reporteData;
    } catch (err) {
      console.error('Error generando reporte de aprendizaje:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Obtiene lista de decisiones tomadas
   */
  const obtenerDecisiones = useCallback(() => {
    if (!reporte) return [];
    return reporte.decisiones_tomadas || [];
  }, [reporte]);

  /**
   * Obtiene impacto consolidado
   */
  const obtenerImpacto = useCallback(() => {
    if (!reporte) return null;
    return reporte.impacto_consolidado || null;
  }, [reporte]);

  /**
   * Obtiene ROI promedio de todas las decisiones
   */
  const obtenerROIPromedio = useCallback(() => {
    const impacto = obtenerImpacto();
    if (!impacto) return 0;
    return parseFloat(impacto.roi_promedio) || 0;
  }, [obtenerImpacto]);

  /**
   * Obtiene ahorro total generado
   */
  const obtenerAhorroTotal = useCallback(() => {
    const impacto = obtenerImpacto();
    if (!impacto) return 0;
    return parseFloat(impacto.ahorro_total) || 0;
  }, [obtenerImpacto]);

  /**
   * Obtiene ingreso adicional total
   */
  const obtenerIngresoTotal = useCallback(() => {
    const impacto = obtenerImpacto();
    if (!impacto) return 0;
    return parseFloat(impacto.ingreso_adicional_total) || 0;
  }, [obtenerImpacto]);

  /**
   * Obtiene margen mejorado total
   */
  const obtenerMargenTotal = useCallback(() => {
    const impacto = obtenerImpacto();
    if (!impacto) return 0;
    return parseFloat(impacto.margen_mejorado_total) || 0;
  }, [obtenerImpacto]);

  /**
   * Categoriza decisiones por ROI
   */
  const categorizarDecisionesPorROI = useCallback(() => {
    const decisiones = obtenerDecisiones();

    return {
      altisimo_exito: decisiones.filter(d => d.roi > 50),
      exito: decisiones.filter(d => d.roi > 20 && d.roi <= 50),
      moderado: decisiones.filter(d => d.roi > 0 && d.roi <= 20),
      negativo: decisiones.filter(d => d.roi < 0)
    };
  }, [obtenerDecisiones]);

  /**
   * Obtiene lecciones clave
   */
  const obtenerLecciones = useCallback(() => {
    if (!reporte) return [];
    return reporte.lecciones_clave || [];
  }, [reporte]);

  /**
   * Obtiene recomendaciones futuras
   */
  const obtenerRecomendaciones = useCallback(() => {
    if (!reporte) return [];
    return reporte.recomendaciones_futuras || [];
  }, [reporte]);

  /**
   * Edita lección de una decisión
   */
  const editarLeccion = useCallback((decisionId, nuevaLeccion) => {
    setLeccionesEdicion(prev => ({
      ...prev,
      [decisionId]: nuevaLeccion
    }));
  }, []);

  /**
   * Guarda lección editada (simulado, requeriría endpoint real)
   */
  const guardarLeccion = useCallback((decisionId) => {
    const leccion = leccionesEdicion[decisionId];
    if (!leccion) return false;

    // En producción, aquí guardaríamos en Supabase
    console.log(`Guardar lección para decisión ${decisionId}:`, leccion);

    // Limpiar
    setLeccionesEdicion(prev => {
      const copy = { ...prev };
      delete copy[decisionId];
      return copy;
    });

    return true;
  }, [leccionesEdicion]);

  /**
   * Obtiene decisión con mayor ROI
   */
  const obtenerMejorDecision = useCallback(() => {
    const decisiones = obtenerDecisiones();
    if (decisiones.length === 0) return null;

    return decisiones.reduce((mejor, actual) =>
      actual.roi > mejor.roi ? actual : mejor
    );
  }, [obtenerDecisiones]);

  /**
   * Obtiene decisión con menor ROI
   */
  const obtenerPeorDecision = useCallback(() => {
    const decisiones = obtenerDecisiones();
    if (decisiones.length === 0) return null;

    return decisiones.reduce((peor, actual) =>
      actual.roi < peor.roi ? actual : peor
    );
  }, [obtenerDecisiones]);

  /**
   * Calcula impacto económico por categoría
   */
  const impactoPorCategoria = useMemo(() => {
    const decisiones = obtenerDecisiones();
    const porCategoria = {};

    decisiones.forEach(dec => {
      const cat = dec.category || 'DESCONOCIDA';
      if (!porCategoria[cat]) {
        porCategoria[cat] = {
          total: 0,
          roi_promedio: 0,
          ahorro: 0,
          ingreso: 0,
          margen: 0,
          count: 0
        };
      }

      porCategoria[cat].count++;
      porCategoria[cat].roi_promedio += dec.roi;
      porCategoria[cat].ahorro += dec.impacto_economico?.ahorro || 0;
      porCategoria[cat].ingreso += dec.impacto_economico?.ingreso_adicional || 0;
      porCategoria[cat].margen += dec.impacto_economico?.margen_mejorado || 0;
    });

    // Promediar ROI
    Object.keys(porCategoria).forEach(cat => {
      porCategoria[cat].roi_promedio = (porCategoria[cat].roi_promedio / porCategoria[cat].count).toFixed(2);
    });

    return porCategoria;
  }, [obtenerDecisiones]);

  /**
   * Prepara datos para gráfico de ROI de decisiones
   */
  const datosParaGraficoROI = useCallback(() => {
    const decisiones = obtenerDecisiones();

    return decisiones.map(dec => ({
      nombre: dec.description,
      roi: dec.roi,
      categoria: dec.category,
      inversin: dec.investment,
      fecha: new Date(dec.decision_date).toLocaleDateString('es-ES')
    }));
  }, [obtenerDecisiones]);

  /**
   * Prepara datos para gráfico de impacto acumulado
   */
  const datosParaGraficoImpacto = useCallback(() => {
    const decisiones = obtenerDecisiones();
    let acumulado = 0;

    return decisiones
      .sort((a, b) => new Date(a.decision_date) - new Date(b.decision_date))
      .map(dec => {
        acumulado += (dec.impacto_economico?.ahorro || 0) +
                     (dec.impacto_economico?.ingreso_adicional || 0);

        return {
          fecha: new Date(dec.decision_date).toLocaleDateString('es-ES'),
          ahorro: dec.impacto_economico?.ahorro || 0,
          ingreso: dec.impacto_economico?.ingreso_adicional || 0,
          acumulado: acumulado,
          decision: dec.description
        };
      });
  }, [obtenerDecisiones]);

  /**
   * Calcula tasa de éxito (decisiones con ROI > 0)
   */
  const tasaExito = useMemo(() => {
    const decisiones = obtenerDecisiones();
    if (decisiones.length === 0) return 0;

    const exitosas = decisiones.filter(d => d.roi > 0).length;
    return ((exitosas / decisiones.length) * 100).toFixed(1);
  }, [obtenerDecisiones]);

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
      a.download = `reporte_aprendizaje_${new Date().getTime()}.json`;
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
      titulo: 'Reporte de Aprendizaje',
      periodo: reporte.periodo,
      fecha_generacion: new Date(reporte.fecha_generacion).toLocaleDateString('es-ES'),
      decisiones_tomadas: reporte.decisiones_tomadas,
      impacto_consolidado: reporte.impacto_consolidado,
      lecciones_clave: reporte.lecciones_clave,
      recomendaciones_futuras: reporte.recomendaciones_futuras
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
    obtenerDecisiones,
    obtenerImpacto,
    obtenerLecciones,
    obtenerRecomendaciones,

    // Métricas principales
    obtenerROIPromedio,
    obtenerAhorroTotal,
    obtenerIngresoTotal,
    obtenerMargenTotal,

    // Análisis
    categorizarDecisionesPorROI,
    obtenerMejorDecision,
    obtenerPeorDecision,
    impactoPorCategoria,
    tasaExito,

    // Gráficos
    datosParaGraficoROI,
    datosParaGraficoImpacto,

    // Lecciones
    editarLeccion,
    guardarLeccion,

    // Exportación
    exportarJSON,
    prepararParaPDF,

    // Otros
    limpiar
  };
}
