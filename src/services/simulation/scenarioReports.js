/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * scenarioReports.js - Generación de Reportes Estratégicos
 *
 * Funcionalidad:
 * - Reporte de escenarios por lote
 * - Reporte de proyección de resultados
 * - Reporte de decisiones críticas
 * - Exportación a Excel/PDF
 */

import { supabase } from '../../lib/supabase';

// =============================================
// REPORTE 1: ESCENARIOS POR LOTE
// =============================================

/**
 * Generar reporte de todos los escenarios de un lote
 */
export async function generateLotScenariosReport(lotId) {
  try {
    // Obtener todos los escenarios del lote
    const { data: scenarios, error } = await supabase
      .from('simulation_scenarios')
      .select(`
        *,
        lots(name, area),
        premises(name),
        firms(name)
      `)
      .eq('lot_id', lotId)
      .eq('status', 'EXECUTED')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!scenarios || scenarios.length === 0) {
      return {
        success: true,
        data: null,
        message: 'No hay escenarios ejecutados para este lote'
      };
    }

    // Analizar escenarios
    const analysis = {
      lot: {
        id: lotId,
        name: scenarios[0].lots?.name,
        area: scenarios[0].lots?.area,
        premise: scenarios[0].premises?.name,
        firm: scenarios[0].firms?.name
      },
      total_scenarios: scenarios.length,
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        type: s.scenario_type,
        simulation_type: s.simulation_type,
        results: {
          margin: s.results?.margin,
          margin_percent: s.results?.margin_percent,
          roi_percent: s.results?.roi_percent,
          total_cost: s.results?.total_cost,
          revenue: s.results?.revenue,
          production_kg: s.results?.total_kg_produced,
          risk_level: s.results?.risk_level,
          risk_factors: s.results?.risk_factors?.length || 0
        },
        created_at: s.created_at
      })),
      summary: {
        best_margin: scenarios.reduce((max, s) =>
          (s.results?.margin || 0) > (max.results?.margin || 0) ? s : max
        ),
        best_roi: scenarios.reduce((max, s) =>
          (s.results?.roi_percent || 0) > (max.results?.roi_percent || 0) ? s : max
        ),
        avg_margin: scenarios.reduce((sum, s) => sum + (s.results?.margin || 0), 0) / scenarios.length,
        avg_roi: scenarios.reduce((sum, s) => sum + (s.results?.roi_percent || 0), 0) / scenarios.length,
        low_risk_count: scenarios.filter(s => s.results?.risk_level === 'LOW').length,
        total_risk_factors: scenarios.reduce((sum, s) => sum + (s.results?.risk_factors?.length || 0), 0)
      }
    };

    return {
      success: true,
      data: analysis,
      message: 'Reporte generado exitosamente'
    };
  } catch (error) {
    console.error('Error generando reporte de lote:', error);
    throw error;
  }
}

// =============================================
// REPORTE 2: PROYECCIÓN DE RESULTADOS
// =============================================

/**
 * Generar reporte de proyección de resultados (esperado vs actual)
 */
export async function generateProjectionResultsReport(firmId, dateFrom, dateTo) {
  try {
    // Obtener decisiones con resultados evaluados
    const { data: decisions, error } = await supabase
      .from('decision_history')
      .select('*')
      .eq('firm_id', firmId)
      .gte('decided_at', dateFrom)
      .lte('decided_at', dateTo)
      .eq('outcome_evaluation', 'POSITIVE') // O incluir todas
      .order('decided_at', { ascending: false });

    if (error) throw error;

    // Calcular varianzas
    const projectionAnalysis = (decisions || []).map(decision => {
      const expected = decision.expected_results || {};
      const actual = decision.actual_results || {};

      return {
        id: decision.id,
        description: decision.decision_description,
        type: decision.decision_type,
        decided_at: decision.decided_at,
        evaluated_at: decision.evaluated_at,
        expected: {
          margin: expected.margin,
          production_kg: expected.production_kg,
          cost: expected.total_cost
        },
        actual: {
          margin: actual.margin,
          production_kg: actual.production_kg,
          cost: actual.total_cost
        },
        variance: {
          margin_variance: actual.margin - expected.margin,
          margin_variance_percent: ((actual.margin - expected.margin) / expected.margin * 100).toFixed(2),
          production_variance: actual.production_kg - expected.production_kg,
          cost_variance: actual.total_cost - expected.total_cost
        },
        lessons_learned: decision.lessons_learned
      };
    });

    // Resumen
    const summary = {
      total_decisions_evaluated: projectionAnalysis.length,
      avg_margin_variance: projectionAnalysis.length > 0
        ? (projectionAnalysis.reduce((sum, p) => sum + p.variance.margin_variance, 0) / projectionAnalysis.length).toFixed(2)
        : 0,
      avg_margin_variance_percent: projectionAnalysis.length > 0
        ? (projectionAnalysis.reduce((sum, p) => sum + parseFloat(p.variance.margin_variance_percent), 0) / projectionAnalysis.length).toFixed(1)
        : 0,
      decisions_above_projection: projectionAnalysis.filter(p => p.variance.margin_variance > 0).length,
      decisions_below_projection: projectionAnalysis.filter(p => p.variance.margin_variance < 0).length,
      date_range: {
        from: dateFrom,
        to: dateTo
      }
    };

    return {
      success: true,
      data: {
        projections: projectionAnalysis,
        summary
      },
      message: 'Reporte de proyecciones generado'
    };
  } catch (error) {
    console.error('Error generando reporte de proyecciones:', error);
    throw error;
  }
}

// =============================================
// REPORTE 3: DECISIONES CRÍTICAS
// =============================================

/**
 * Generar reporte de decisiones críticas y lecciones aprendidas
 */
export async function generateDecisionsCriticalReport(firmId) {
  try {
    // Obtener todas las decisiones
    const { data: decisions, error } = await supabase
      .from('decision_history')
      .select('*')
      .eq('firm_id', firmId)
      .order('decided_at', { ascending: false });

    if (error) throw error;

    // Categorizar decisiones
    const positive = decisions.filter(d => d.outcome_evaluation === 'POSITIVE');
    const negative = decisions.filter(d => d.outcome_evaluation === 'NEGATIVE');
    const neutral = decisions.filter(d => d.outcome_evaluation === 'NEUTRAL');
    const pending = decisions.filter(d => d.outcome_evaluation === 'PENDING');

    // Analizar lecciones
    const lessons = [
      ...positive.map(d => ({
        outcome: 'POSITIVE',
        decision: d.decision_description,
        lesson: d.lessons_learned || 'Sin lecciones registradas'
      })),
      ...negative.map(d => ({
        outcome: 'NEGATIVE',
        decision: d.decision_description,
        lesson: d.lessons_learned || 'Sin lecciones registradas'
      }))
    ];

    // Estadísticas de efectividad
    const total = decisions.length;
    const effectivenessRate = total > 0 ? (positive.length / total * 100).toFixed(1) : 0;

    // Decisiones por tipo
    const decisionsByType = {};
    decisions.forEach(d => {
      if (!decisionsByType[d.decision_type]) {
        decisionsByType[d.decision_type] = {
          count: 0,
          positive: 0,
          negative: 0,
          neutral: 0
        };
      }
      decisionsByType[d.decision_type].count++;
      if (d.outcome_evaluation === 'POSITIVE') decisionsByType[d.decision_type].positive++;
      if (d.outcome_evaluation === 'NEGATIVE') decisionsByType[d.decision_type].negative++;
      if (d.outcome_evaluation === 'NEUTRAL') decisionsByType[d.decision_type].neutral++;
    });

    return {
      success: true,
      data: {
        summary: {
          total_decisions: total,
          positive_decisions: positive.length,
          negative_decisions: negative.length,
          neutral_decisions: neutral.length,
          pending_decisions: pending.length,
          effectiveness_rate: effectivenessRate + '%'
        },
        by_type: decisionsByType,
        lessons_learned: lessons,
        positive_decisions: positive.map(d => ({
          description: d.decision_description,
          type: d.decision_type,
          date: d.decided_at,
          lesson: d.lessons_learned
        })),
        negative_decisions: negative.map(d => ({
          description: d.decision_description,
          type: d.decision_type,
          date: d.decided_at,
          lesson: d.lessons_learned,
          improvement_needed: true
        }))
      },
      message: 'Reporte de decisiones críticas generado'
    };
  } catch (error) {
    console.error('Error generando reporte de decisiones:', error);
    throw error;
  }
}

// =============================================
// EXPORTACIÓN A EXCEL
// =============================================

/**
 * Exportar escenarios a Excel (formato simple CSV)
 */
export async function exportScenariosToCSV(lotId, filename = 'escenarios.csv') {
  try {
    const report = await generateLotScenariosReport(lotId);

    if (!report.data) {
      throw new Error('No hay datos para exportar');
    }

    const { scenarios, summary } = report.data;

    // Construir CSV
    let csv = 'REPORTE DE ESCENARIOS POR LOTE\n';
    csv += `Lote: ${summary.best_margin.name}\n`;
    csv += `Área: ${summary.best_margin.area} ha\n`;
    csv += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Tabla de escenarios
    csv += 'Escenario,Tipo,Margen,Margen %,ROI %,Costo Total,Ingresos,Riesgo,Factores de Riesgo\n';
    scenarios.forEach(s => {
      csv += `"${s.name}",${s.type},${s.results.margin.toFixed(0)},${s.results.margin_percent.toFixed(1)},${s.results.roi_percent.toFixed(1)},${s.results.total_cost.toFixed(0)},${s.results.revenue.toFixed(0)},${s.results.risk_level},${s.results.risk_factors}\n`;
    });

    csv += '\n\nRESUMEN\n';
    csv += `Total Escenarios,${scenarios.length}\n`;
    csv += `Margen Promedio,${summary.avg_margin.toFixed(0)}\n`;
    csv += `ROI Promedio,${summary.avg_roi.toFixed(1)}%\n`;
    csv += `Escenarios de Bajo Riesgo,${summary.low_risk_count}\n`;
    csv += `Total Factores de Riesgo,${summary.total_risk_factors}\n`;

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    return {
      success: true,
      message: 'Escenarios exportados exitosamente'
    };
  } catch (error) {
    console.error('Error exportando a CSV:', error);
    throw error;
  }
}

/**
 * Exportar decisiones y lecciones a Excel
 */
export async function exportDecisionsToCSV(firmId, filename = 'decisiones.csv') {
  try {
    const report = await generateDecisionsCriticalReport(firmId);

    if (!report.data) {
      throw new Error('No hay datos para exportar');
    }

    const { summary, positive_decisions, negative_decisions } = report.data;

    // Construir CSV
    let csv = 'REPORTE DE DECISIONES Y LECCIONES APRENDIDAS\n';
    csv += `Empresa ID: ${firmId}\n`;
    csv += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Resumen
    csv += 'RESUMEN\n';
    csv += `Total Decisiones,${summary.total_decisions}\n`;
    csv += `Decisiones Positivas,${summary.positive_decisions}\n`;
    csv += `Decisiones Negativas,${summary.negative_decisions}\n`;
    csv += `Tasa de Efectividad,${summary.effectiveness_rate}\n\n`;

    // Decisiones positivas
    csv += 'DECISIONES POSITIVAS\n';
    csv += 'Descripción,Fecha,Lección Aprendida\n';
    positive_decisions.forEach(d => {
      csv += `"${d.description}",${new Date(d.date).toLocaleDateString('es-ES')},"${d.lesson}"\n`;
    });

    csv += '\nDECISIONES NEGATIVAS - OPORTUNIDADES DE MEJORA\n';
    csv += 'Descripción,Fecha,Lección Aprendida\n';
    negative_decisions.forEach(d => {
      csv += `"${d.description}",${new Date(d.date).toLocaleDateString('es-ES')},"${d.lesson}"\n`;
    });

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    return {
      success: true,
      message: 'Decisiones exportadas exitosamente'
    };
  } catch (error) {
    console.error('Error exportando decisiones:', error);
    throw error;
  }
}

// =============================================
// EXPORTACIÓN A FORMATO COMPLETO
// =============================================

/**
 * Generar documento de análisis completo
 */
export async function generateComprehensiveReport(firmId, lotId) {
  try {
    const scenariosReport = await generateLotScenariosReport(lotId);
    const decisionsReport = await generateDecisionsCriticalReport(firmId);

    return {
      success: true,
      data: {
        scenarios: scenariosReport.data,
        decisions: decisionsReport.data,
        generated_at: new Date().toISOString()
      },
      message: 'Reporte comprensivo generado'
    };
  } catch (error) {
    console.error('Error generando reporte comprensivo:', error);
    throw error;
  }
}

export default {
  generateLotScenariosReport,
  generateProjectionResultsReport,
  generateDecisionsCriticalReport,
  exportScenariosToCSV,
  exportDecisionsToCSV,
  generateComprehensiveReport
};
