import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * reportExports.js
 * Servicio de exportación de reportes en 3 formatos:
 * - Excel (XLSX)
 * - PDF
 * - Word (HTML)
 */

const EXCEL_HEADER_STYLE = {
  font: { bold: true, color: 'FFFFFF' },
  fill: { fgColor: { rgb: 'FF1F3864' } },
  alignment: { horizontal: 'center', vertical: 'center' }
};

/**
 * Exporta reporte a Excel
 * @param {string} reportType - Tipo de reporte
 * @param {object} reportData - Datos del reporte
 * @param {object} metadata - {firmName, reportTitle, periode}
 */
export async function exportReportExcel(reportType, reportData, metadata) {
  try {
    const workbook = XLSX.utils.book_new();
    const date = new Date().toISOString().split('T')[0];

    switch (reportType) {
      // Reportes Operativos
      case 'finance':
        exportFinanceExcel(workbook, reportData, metadata);
        break;
      case 'inventory':
        exportInventoryExcel(workbook, reportData, metadata);
        break;
      case 'livestock':
        exportLivestockExcel(workbook, reportData, metadata);
        break;
      case 'work':
        exportWorkExcel(workbook, reportData, metadata);
        break;
      case 'alerts':
        exportAlertsExcel(workbook, reportData, metadata);
        break;
      case 'productivity':
        exportProductivityExcel(workbook, reportData, metadata);
        break;

      // Reportes Gerenciales
      case 'estado_resultados':
        exportEstadoResultadosExcel(workbook, reportData, metadata);
        break;
      case 'cashflow':
        exportCashflowExcel(workbook, reportData, metadata);
        break;
      case 'carga_animal':
        exportCargaAnimalExcel(workbook, reportData, metadata);
        break;
      case 'produccion_carne':
        exportProduccionCarneExcel(workbook, reportData, metadata);
        break;
      case 'indices':
        exportIndicesExcel(workbook, reportData, metadata);
        break;

      // Reportes Estandarizados
      case 'ejecutivo_mensual':
        exportEjecutivoMensualExcel(workbook, reportData, metadata);
        break;
      case 'comparativo_anual':
        exportComparativoAnualExcel(workbook, reportData, metadata);
        break;
      case 'aprendizaje':
        exportAprendizajeExcel(workbook, reportData, metadata);
        break;

      // Reportes de Cuentas por Cobrar y Pagar
      case 'deuda_proveedor':
        exportDeudaProveedorExcel(workbook, reportData, metadata);
        break;
      case 'ingresos_pendientes':
        exportIngresosPendientesExcel(workbook, reportData, metadata);
        break;
      case 'cobranzas_realizadas':
        exportCobranzasExcel(workbook, reportData, metadata);
        break;

      default:
        throw new Error(`Exportación no soportada para ${reportType}`);
    }

    const filename = `${reportType}_${metadata.firmName}_${date}.xlsx`;
    XLSX.writeFile(workbook, filename);

    return { success: true, message: `Reporte exportado: ${filename}` };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
}

/**
 * Exporta reporte a PDF
 * @param {string} reportType - Tipo de reporte
 * @param {object} reportData - Datos del reporte
 * @param {object} metadata - {firmName, reportTitle, periodo}
 */
export async function exportReportPDF(reportType, reportData, metadata) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(metadata.reportTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Firma y período
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Firma: ${metadata.firmName}`, 10, yPosition);
    yPosition += 5;
    doc.text(`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`, 10, yPosition);
    yPosition += 5;
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 10, yPosition);
    yPosition += 10;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(10, yPosition, pageWidth - 10, yPosition);
    yPosition += 5;

    switch (reportType) {
      // Reportes Operativos
      case 'finance':
        yPosition = exportFinancePDF(doc, reportData, metadata, yPosition);
        break;
      case 'inventory':
        yPosition = exportInventoryPDF(doc, reportData, metadata, yPosition);
        break;
      case 'livestock':
        yPosition = exportLivestockPDF(doc, reportData, metadata, yPosition);
        break;
      case 'work':
        yPosition = exportWorkPDF(doc, reportData, metadata, yPosition);
        break;
      case 'alerts':
        yPosition = exportAlertsPDF(doc, reportData, metadata, yPosition);
        break;
      case 'productivity':
        yPosition = exportProductivityPDF(doc, reportData, metadata, yPosition);
        break;

      // Reportes Gerenciales
      case 'estado_resultados':
        yPosition = exportEstadoResultadosPDF(doc, reportData, metadata, yPosition);
        break;
      case 'cashflow':
        yPosition = exportCashflowPDF(doc, reportData, metadata, yPosition);
        break;
      case 'carga_animal':
        yPosition = exportCargaAnimalPDF(doc, reportData, metadata, yPosition);
        break;
      case 'produccion_carne':
        yPosition = exportProduccionCarnePDF(doc, reportData, metadata, yPosition);
        break;
      case 'indices':
        yPosition = exportIndicesPDF(doc, reportData, metadata, yPosition);
        break;

      // Reportes Estandarizados
      case 'ejecutivo_mensual':
        yPosition = exportEjecutivoMensualPDF(doc, reportData, metadata, yPosition);
        break;
      case 'comparativo_anual':
        yPosition = exportComparativoAnualPDF(doc, reportData, metadata, yPosition);
        break;
      case 'aprendizaje':
        yPosition = exportAprendizajePDF(doc, reportData, metadata, yPosition);
        break;

      // Reportes de Cuentas por Cobrar y Pagar
      case 'deuda_proveedor':
        yPosition = exportDeudaProveedorPDF(doc, reportData, metadata, yPosition);
        break;
      case 'ingresos_pendientes':
        yPosition = exportIngresosPendientesPDF(doc, reportData, metadata, yPosition);
        break;
      case 'cobranzas_realizadas':
        yPosition = exportCobranzasPDF(doc, reportData, metadata, yPosition);
        break;

      default:
        throw new Error(`Exportación no soportada para ${reportType}`);
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    const date = new Date().toISOString().split('T')[0];
    const filename = `${reportType}_${metadata.firmName}_${date}.pdf`;
    doc.save(filename);

    return { success: true, message: `Reporte exportado: ${filename}` };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Exporta reporte a Word (HTML)
 * @param {string} reportType - Tipo de reporte
 * @param {object} reportData - Datos del reporte
 * @param {object} metadata - {firmName, reportTitle, periodo}
 */
export async function exportReportWord(reportType, reportData, metadata) {
  try {
    let htmlContent = buildWordHeader(metadata);

    switch (reportType) {
      // Reportes Operativos
      case 'finance':
        htmlContent += buildFinanceWord(reportData, metadata);
        break;
      case 'inventory':
        htmlContent += buildInventoryWord(reportData, metadata);
        break;
      case 'livestock':
        htmlContent += buildLivestockWord(reportData, metadata);
        break;
      case 'work':
        htmlContent += buildWorkWord(reportData, metadata);
        break;
      case 'alerts':
        htmlContent += buildAlertsWord(reportData, metadata);
        break;
      case 'productivity':
        htmlContent += buildProductivityWord(reportData, metadata);
        break;

      // Reportes Gerenciales
      case 'estado_resultados':
        htmlContent += buildEstadoResultadosWord(reportData, metadata);
        break;
      case 'cashflow':
        htmlContent += buildCashflowWord(reportData, metadata);
        break;
      case 'carga_animal':
        htmlContent += buildCargaAnimalWord(reportData, metadata);
        break;
      case 'produccion_carne':
        htmlContent += buildProduccionCarneWord(reportData, metadata);
        break;
      case 'indices':
        htmlContent += buildIndicesWord(reportData, metadata);
        break;

      // Reportes Estandarizados
      case 'ejecutivo_mensual':
        htmlContent += buildEjecutivoMensualWord(reportData, metadata);
        break;
      case 'comparativo_anual':
        htmlContent += buildComparativoAnualWord(reportData, metadata);
        break;
      case 'aprendizaje':
        htmlContent += buildAprendizajeWord(reportData, metadata);
        break;

      // Reportes de Cuentas por Cobrar y Pagar
      case 'deuda_proveedor':
        htmlContent += buildDeudaProveedorWord(reportData, metadata);
        break;
      case 'ingresos_pendientes':
        htmlContent += buildIngresosPendientesWord(reportData, metadata);
        break;
      case 'cobranzas_realizadas':
        htmlContent += buildCobranzasWord(reportData, metadata);
        break;

      default:
        throw new Error(`Exportación no soportada para ${reportType}`);
    }

    htmlContent += buildWordFooter();

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const date = new Date().toISOString().split('T')[0];
    link.download = `${reportType}_${metadata.firmName}_${date}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, message: `Reporte exportado: ${link.download}` };
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw error;
  }
}

// === EXCEL EXPORTERS ===

function exportEstadoResultadosExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // Header
  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CONCEPTO', 'MONTO ($)', '% INGRESOS']
  ], { origin: 'A1' });

  // Data
  let row = 6;
  if (data && data.ingresos) {
    const items = [
      ['INGRESOS', data.ingresos?.total_ingresos || 0, '100%'],
      ['  Ventas Principales', data.ingresos?.ventas_principales || 0, ((data.ingresos?.ventas_principales || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['  Otros Ingresos', data.ingresos?.otros_ingresos || 0, ((data.ingresos?.otros_ingresos || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['', '', ''],
      ['COSTO DE VENTAS', -(data.costo_ventas?.total_costo_ventas || 0), ((data.costo_ventas?.total_costo_ventas || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['MARGEN BRUTO', data.margen_bruto?.valor || 0, ((data.margen_bruto?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['', '', ''],
      ['GASTOS OPERATIVOS', -(data.gastos_operativos?.total_gastos_operativos || 0), ((data.gastos_operativos?.total_gastos_operativos || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['RESULTADO OPERATIVO', data.resultado_operativo?.valor || 0, ((data.resultado_operativo?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['', '', ''],
      ['GASTOS FINANCIEROS', -(data.gastos_financieros?.total_gastos_financieros || 0), ((data.gastos_financieros?.total_gastos_financieros || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%'],
      ['RESULTADO FINAL', data.resultado_final?.valor || 0, ((data.resultado_final?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1) + '%']
    ];

    XLSX.utils.sheet_add_aoa(worksheet, items, { origin: `A${row}` });
  }

  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estado Resultados');
}

function exportCashflowExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['MES', 'INGRESOS ($)', 'EGRESOS ($)', 'FLUJO NETO ($)', 'SALDO ACUM. ($)']
  ], { origin: 'A1' });

  if (data && data.cashflow_mensual) {
    const rows = data.cashflow_mensual.map(mes => [
      mes.mes,
      mes.ingresos,
      mes.egresos,
      mes.flujo_neto,
      mes.saldo_acumulado
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: 'A6' });
  }

  worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cashflow');
}

function exportCargaAnimalExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CATEGORÍA', 'CANTIDAD', 'PESO TOTAL (kg)', 'KG/HA']
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Carga Animal');
}

function exportProduccionCarneExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CONCEPTO', 'VALOR (kg)', 'NOTA'],
    ['Inventario Inicial', data?.inv_inicial || 0, ''],
    ['Inventario Final', data?.inv_final || 0, ''],
    ['Ventas (kg)', data?.ventas_kg || 0, ''],
    ['Compras (kg)', -(data?.compras_kg || 0), ''],
    ['Traspasos Entrada', data?.traspasos_entrada || 0, ''],
    ['Traspasos Salida', -(data?.traspasos_salida || 0), ''],
    ['', '', ''],
    ['PRODUCCIÓN TOTAL', data?.produccion_total || 0, 'Fórmula: Final - Inicial + Ventas - Compras ± Traspasos']
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Producción Carne');
}

function exportIndicesExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['ÍNDICE', 'VALOR', 'UNIDAD', 'VARIACIÓN %'],
    ['Producción de Carne', data?.produccion_carne_kg || 0, 'kg', data?.variacion_produccion || 0],
    ['Producción por Hectárea', data?.produccion_por_ha || 0, 'kg/ha', data?.variacion_ha || 0],
    ['Costo del kg Producido', data?.costo_por_kg || 0, '$/kg', data?.variacion_costo || 0]
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Índices Productivos');
}

// === EXCEL EXPORTERS - OPERATIVOS ===

function exportFinanceExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['TIPO', 'MONTO ($)', 'CANTIDAD', 'PROMEDIO ($)']
  ], { origin: 'A1' });

  const items = [
    ['INGRESOS', data?.totalIncome || 0, data?.incomeCount || 0, (data?.totalIncome || 0) / (data?.incomeCount || 1)],
    ['GASTOS', data?.totalExpense || 0, data?.expenseCount || 0, (data?.totalExpense || 0) / (data?.expenseCount || 1)],
    ['BALANCE', data?.balance || 0, '', '']
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Financiero');
}

function exportInventoryExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CONCEPTO', 'VALOR']
  ], { origin: 'A1' });

  const items = [
    ['Total de Ítems', data?.totalItems || 0],
    ['Valor Total Inventario', `$${(data?.totalValue || 0).toLocaleString('es-AR')}`],
    ['Ítems con Stock Bajo', data?.lowStockCount || 0]
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
}

function exportLivestockExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CONCEPTO', 'VALOR']
  ], { origin: 'A1' });

  const items = [
    ['Total de Animales', data?.totalAnimals || 0],
    ['Peso Promedio (kg)', data?.avgWeight || 0]
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ganadería');
}

function exportWorkExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['ESTADO', 'CANTIDAD']
  ], { origin: 'A1' });

  const items = [
    ['Total de Trabajos', data?.totalWorks || 0],
    ['Trabajos Completados', data?.completedWorks || 0],
    ['Trabajos Pendientes', data?.pendingWorks || 0]
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trabajos');
}

function exportAlertsExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['ESTADO', 'CANTIDAD']
  ], { origin: 'A1' });

  const items = [
    ['Total de Alertas', data?.totalAlerts || 0],
    ['Alertas Pendientes', data?.pendingAlerts || 0],
    ['Alertas Completadas', data?.completedAlerts || 0],
    ['Alertas Prioridad Alta', data?.highPriorityAlerts || 0]
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alertas');
}

function exportProductivityExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CONCEPTO', 'VALOR']
  ], { origin: 'A1' });

  const items = [
    ['Total de Lotes', data?.totalLots || 0],
    ['Área Total (ha)', data?.totalArea || 0]
  ];

  XLSX.utils.sheet_add_aoa(worksheet, items, { origin: 'A6' });
  worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productividad');
}

// === EXCEL EXPORTERS - ESTANDARIZADOS ===

function exportEjecutivoMensualExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    ['KPIs clave del mes con alertas y comparación intermensual'],
    [],
    ['INDICADOR', 'VALOR ACTUAL', 'VALOR ANTERIOR', 'VARIACIÓN %']
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ejecutivo Mensual');
}

function exportComparativoAnualExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    ['Comparación de lotes, rodeos y estrategias por año'],
    [],
    ['CONCEPTO', 'AÑO ACTUAL', 'AÑO ANTERIOR', 'VARIACIÓN %']
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparativo Anual');
}

function exportAprendizajeExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    ['Decisiones → Resultados → Impacto económico real'],
    [],
    ['DECISIÓN', 'RESULTADO', 'IMPACTO ECONÓMICO', 'ROI %']
  ], { origin: 'A1' });

  worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aprendizaje');
}

// === PDF EXPORTERS ===

function exportEstadoResultadosPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'MONTO ($)', '% INGRESOS'],
    ['INGRESOS', data.ingresos?.total_ingresos || 0, '100%'],
    ['  Ventas Principales', data.ingresos?.ventas_principales || 0, ''],
    ['  Otros Ingresos', data.ingresos?.otros_ingresos || 0, ''],
    ['COSTO DE VENTAS', -(data.costo_ventas?.total_costo_ventas || 0), ''],
    ['MARGEN BRUTO', data.margen_bruto?.valor || 0, ''],
    ['GASTOS OPERATIVOS', -(data.gastos_operativos?.total_gastos_operativos || 0), ''],
    ['RESULTADO OPERATIVO', data.resultado_operativo?.valor || 0, ''],
    ['GASTOS FINANCIEROS', -(data.gastos_financieros?.total_gastos_financieros || 0), ''],
    ['RESULTADO FINAL', data.resultado_final?.valor || 0, '']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportCashflowPDF(doc, data, metadata, startY) {
  const tableData = [
    ['MES', 'INGRESOS ($)', 'EGRESOS ($)', 'FLUJO NETO ($)', 'SALDO ACUM. ($)']
  ];

  if (data && data.cashflow_mensual) {
    data.cashflow_mensual.forEach(mes => {
      tableData.push([
        mes.mes,
        mes.ingresos,
        mes.egresos,
        mes.flujo_neto,
        mes.saldo_acumulado
      ]);
    });
  }

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportCargaAnimalPDF(doc, data, metadata, startY) {
  autoTable(doc, {
    head: [['CATEGORÍA', 'CANTIDAD', 'PESO TOTAL (kg)', 'KG/HA']],
    body: [],
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportProduccionCarnePDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'VALOR (kg)'],
    ['Inventario Inicial', data?.inv_inicial || 0],
    ['Inventario Final', data?.inv_final || 0],
    ['Ventas', data?.ventas_kg || 0],
    ['Compras', -(data?.compras_kg || 0)],
    ['PRODUCCIÓN TOTAL', data?.produccion_total || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportIndicesPDF(doc, data, metadata, startY) {
  const tableData = [
    ['ÍNDICE', 'VALOR', 'UNIDAD'],
    ['Producción de Carne', data?.produccion_carne_kg || 0, 'kg'],
    ['Producción por Hectárea', data?.produccion_por_ha || 0, 'kg/ha'],
    ['Costo del kg Producido', data?.costo_por_kg || 0, '$/kg']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

// === PDF EXPORTERS - OPERATIVOS ===

function exportFinancePDF(doc, data, metadata, startY) {
  const tableData = [
    ['TIPO', 'MONTO ($)', 'CANTIDAD', 'PROMEDIO ($)'],
    ['INGRESOS', data?.totalIncome || 0, data?.incomeCount || 0, (data?.totalIncome || 0) / (data?.incomeCount || 1)],
    ['GASTOS', data?.totalExpense || 0, data?.expenseCount || 0, (data?.totalExpense || 0) / (data?.expenseCount || 1)],
    ['BALANCE', data?.balance || 0, '', '']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportInventoryPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'VALOR'],
    ['Total de Ítems', data?.totalItems || 0],
    ['Valor Total Inventario', `$${(data?.totalValue || 0).toLocaleString('es-AR')}`],
    ['Ítems con Stock Bajo', data?.lowStockCount || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportLivestockPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'VALOR'],
    ['Total de Animales', data?.totalAnimals || 0],
    ['Peso Promedio (kg)', data?.avgWeight || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportWorkPDF(doc, data, metadata, startY) {
  const tableData = [
    ['ESTADO', 'CANTIDAD'],
    ['Total de Trabajos', data?.totalWorks || 0],
    ['Trabajos Completados', data?.completedWorks || 0],
    ['Trabajos Pendientes', data?.pendingWorks || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportAlertsPDF(doc, data, metadata, startY) {
  const tableData = [
    ['ESTADO', 'CANTIDAD'],
    ['Total de Alertas', data?.totalAlerts || 0],
    ['Alertas Pendientes', data?.pendingAlerts || 0],
    ['Alertas Completadas', data?.completedAlerts || 0],
    ['Alertas Prioridad Alta', data?.highPriorityAlerts || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportProductivityPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'VALOR'],
    ['Total de Lotes', data?.totalLots || 0],
    ['Área Total (ha)', data?.totalArea || 0]
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

// === PDF EXPORTERS - ESTANDARIZADOS ===

function exportEjecutivoMensualPDF(doc, data, metadata, startY) {
  const tableData = [
    ['INDICADOR', 'VALOR ACTUAL', 'VALOR ANTERIOR', 'VARIACIÓN %']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: [],
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportComparativoAnualPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CONCEPTO', 'AÑO ACTUAL', 'AÑO ANTERIOR', 'VARIACIÓN %']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: [],
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportAprendizajePDF(doc, data, metadata, startY) {
  const tableData = [
    ['DECISIÓN', 'RESULTADO', 'IMPACTO ECONÓMICO', 'ROI %']
  ];

  autoTable(doc, {
    head: [tableData[0]],
    body: [],
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

// === WORD EXPORTERS ===

function buildWordHeader(metadata) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      margin: 1in;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #1f3864;
      padding-bottom: 10px;
    }
    h1 { font-size: 20px; color: #1f3864; margin: 0 0 10px 0; }
    .metadata {
      font-size: 11px;
      color: #666;
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background-color: #1f3864;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #1f3864;
    }
    td {
      padding: 8px;
      border: 1px solid #ddd;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .section-title {
      background-color: #e8eef5;
      font-weight: bold;
      color: #1f3864;
    }
    .total-row {
      background-color: #1f3864;
      color: white;
      font-weight: bold;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${metadata.reportTitle}</h1>
    <div class="metadata">Firma: <strong>${metadata.firmName}</strong></div>
    <div class="metadata">Período: <strong>${metadata.periodo.start} a ${metadata.periodo.end}</strong></div>
    <div class="metadata">Generado: ${new Date().toLocaleString('es-AR')}</div>
  </div>
`;
}

function buildEstadoResultadosWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>MONTO ($)</th>
        <th>% INGRESOS</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-title">
        <td colspan="3">INGRESOS</td>
      </tr>
      <tr>
        <td>Ventas Principales</td>
        <td>${(data.ingresos?.ventas_principales || 0).toLocaleString('es-AR')}</td>
        <td>${((data.ingresos?.ventas_principales || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Otros Ingresos</td>
        <td>${(data.ingresos?.otros_ingresos || 0).toLocaleString('es-AR')}</td>
        <td>${((data.ingresos?.otros_ingresos || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL INGRESOS</td>
        <td>${(data.ingresos?.total_ingresos || 0).toLocaleString('es-AR')}</td>
        <td>100%</td>
      </tr>
      <tr class="section-title">
        <td colspan="3">COSTO DE VENTAS</td>
      </tr>
      <tr>
        <td>Total Costo Ventas</td>
        <td>-${(data.costo_ventas?.total_costo_ventas || 0).toLocaleString('es-AR')}</td>
        <td>${((data.costo_ventas?.total_costo_ventas || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="total-row">
        <td>MARGEN BRUTO</td>
        <td>${(data.margen_bruto?.valor || 0).toLocaleString('es-AR')}</td>
        <td>${((data.margen_bruto?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="section-title">
        <td colspan="3">GASTOS OPERATIVOS</td>
      </tr>
      <tr>
        <td>Total Gastos Operativos</td>
        <td>-${(data.gastos_operativos?.total_gastos_operativos || 0).toLocaleString('es-AR')}</td>
        <td>${((data.gastos_operativos?.total_gastos_operativos || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="total-row">
        <td>RESULTADO OPERATIVO</td>
        <td>${(data.resultado_operativo?.valor || 0).toLocaleString('es-AR')}</td>
        <td>${((data.resultado_operativo?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="section-title">
        <td colspan="3">GASTOS FINANCIEROS</td>
      </tr>
      <tr>
        <td>Total Gastos Financieros</td>
        <td>-${(data.gastos_financieros?.total_gastos_financieros || 0).toLocaleString('es-AR')}</td>
        <td>${((data.gastos_financieros?.total_gastos_financieros || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr class="total-row">
        <td>RESULTADO FINAL</td>
        <td>${(data.resultado_final?.valor || 0).toLocaleString('es-AR')}</td>
        <td>${((data.resultado_final?.valor || 0) / (data.ingresos?.total_ingresos || 1) * 100).toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildCashflowWord(data, metadata) {
  let tableHtml = `
  <table>
    <thead>
      <tr>
        <th>MES</th>
        <th>INGRESOS ($)</th>
        <th>EGRESOS ($)</th>
        <th>FLUJO NETO ($)</th>
        <th>SALDO ACUM. ($)</th>
      </tr>
    </thead>
    <tbody>
`;

  if (data && data.cashflow_mensual) {
    data.cashflow_mensual.forEach(mes => {
      tableHtml += `
      <tr>
        <td>${mes.mes}</td>
        <td>${mes.ingresos.toLocaleString('es-AR')}</td>
        <td>${mes.egresos.toLocaleString('es-AR')}</td>
        <td>${mes.flujo_neto.toLocaleString('es-AR')}</td>
        <td>${mes.saldo_acumulado.toLocaleString('es-AR')}</td>
      </tr>
`;
    });
  }

  tableHtml += `
    </tbody>
  </table>
  <div class="page-break"></div>
`;

  return tableHtml;
}

function buildCargaAnimalWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>CATEGORÍA</th>
        <th>CANTIDAD</th>
        <th>PESO TOTAL (kg)</th>
        <th>KG/HA</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildProduccionCarneWord(data, metadata) {
  return `
  <h2 style="color: #1f3864;">Fórmula: Inv. Final - Inv. Inicial + Ventas - Compras ± Traspasos</h2>
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>VALOR (kg)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Inventario Inicial</td>
        <td>${(data?.inv_inicial || 0).toLocaleString('es-AR')}</td>
      </tr>
      <tr>
        <td>Inventario Final</td>
        <td>${(data?.inv_final || 0).toLocaleString('es-AR')}</td>
      </tr>
      <tr>
        <td>Ventas (kg)</td>
        <td>${(data?.ventas_kg || 0).toLocaleString('es-AR')}</td>
      </tr>
      <tr>
        <td>Compras (kg)</td>
        <td>-${(data?.compras_kg || 0).toLocaleString('es-AR')}</td>
      </tr>
      <tr class="total-row">
        <td>PRODUCCIÓN TOTAL</td>
        <td>${(data?.produccion_total || 0).toLocaleString('es-AR')}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildIndicesWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>ÍNDICE</th>
        <th>VALOR</th>
        <th>UNIDAD</th>
        <th>VARIACIÓN %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Producción de Carne</td>
        <td>${(data?.produccion_carne_kg || 0).toLocaleString('es-AR')}</td>
        <td>kg</td>
        <td>${(data?.variacion_produccion || 0).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Producción por Hectárea</td>
        <td>${(data?.produccion_por_ha || 0).toLocaleString('es-AR')}</td>
        <td>kg/ha</td>
        <td>${(data?.variacion_ha || 0).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Costo del kg Producido</td>
        <td>$${(data?.costo_por_kg || 0).toLocaleString('es-AR')}</td>
        <td>$/kg</td>
        <td>${(data?.variacion_costo || 0).toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

// === WORD EXPORTERS - OPERATIVOS ===

function buildFinanceWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>TIPO</th>
        <th>MONTO ($)</th>
        <th>CANTIDAD</th>
        <th>PROMEDIO ($)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>INGRESOS</td>
        <td>${(data?.totalIncome || 0).toLocaleString('es-AR')}</td>
        <td>${data?.incomeCount || 0}</td>
        <td>${((data?.totalIncome || 0) / (data?.incomeCount || 1)).toLocaleString('es-AR')}</td>
      </tr>
      <tr>
        <td>GASTOS</td>
        <td>${(data?.totalExpense || 0).toLocaleString('es-AR')}</td>
        <td>${data?.expenseCount || 0}</td>
        <td>${((data?.totalExpense || 0) / (data?.expenseCount || 1)).toLocaleString('es-AR')}</td>
      </tr>
      <tr class="total-row">
        <td>BALANCE</td>
        <td>${(data?.balance || 0).toLocaleString('es-AR')}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildInventoryWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>VALOR</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total de Ítems</td>
        <td>${data?.totalItems || 0}</td>
      </tr>
      <tr>
        <td>Valor Total Inventario</td>
        <td>$${(data?.totalValue || 0).toLocaleString('es-AR')}</td>
      </tr>
      <tr class="total-row">
        <td>Ítems con Stock Bajo</td>
        <td>${data?.lowStockCount || 0}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildLivestockWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>VALOR</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total de Animales</td>
        <td>${data?.totalAnimals || 0}</td>
      </tr>
      <tr class="total-row">
        <td>Peso Promedio (kg)</td>
        <td>${(data?.avgWeight || 0).toLocaleString('es-AR')}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildWorkWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>ESTADO</th>
        <th>CANTIDAD</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total de Trabajos</td>
        <td>${data?.totalWorks || 0}</td>
      </tr>
      <tr>
        <td>Trabajos Completados</td>
        <td>${data?.completedWorks || 0}</td>
      </tr>
      <tr class="total-row">
        <td>Trabajos Pendientes</td>
        <td>${data?.pendingWorks || 0}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildAlertsWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>ESTADO</th>
        <th>CANTIDAD</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total de Alertas</td>
        <td>${data?.totalAlerts || 0}</td>
      </tr>
      <tr>
        <td>Alertas Pendientes</td>
        <td>${data?.pendingAlerts || 0}</td>
      </tr>
      <tr>
        <td>Alertas Completadas</td>
        <td>${data?.completedAlerts || 0}</td>
      </tr>
      <tr class="total-row">
        <td>Alertas Prioridad Alta</td>
        <td>${data?.highPriorityAlerts || 0}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildProductivityWord(data, metadata) {
  return `
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>VALOR</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total de Lotes</td>
        <td>${data?.totalLots || 0}</td>
      </tr>
      <tr class="total-row">
        <td>Área Total (ha)</td>
        <td>${data?.totalArea || 0}</td>
      </tr>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

// === WORD EXPORTERS - ESTANDARIZADOS ===

function buildEjecutivoMensualWord(data, metadata) {
  return `
  <h2 style="color: #1f3864;">KPIs Clave del Mes</h2>
  <table>
    <thead>
      <tr>
        <th>INDICADOR</th>
        <th>VALOR ACTUAL</th>
        <th>VALOR ANTERIOR</th>
        <th>VARIACIÓN %</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildComparativoAnualWord(data, metadata) {
  return `
  <h2 style="color: #1f3864;">Comparación Anual de Desempeño</h2>
  <table>
    <thead>
      <tr>
        <th>CONCEPTO</th>
        <th>AÑO ACTUAL</th>
        <th>AÑO ANTERIOR</th>
        <th>VARIACIÓN %</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

function buildAprendizajeWord(data, metadata) {
  return `
  <h2 style="color: #1f3864;">Análisis de Decisiones e Impacto Económico</h2>
  <table>
    <thead>
      <tr>
        <th>DECISIÓN</th>
        <th>RESULTADO</th>
        <th>IMPACTO ECONÓMICO</th>
        <th>ROI %</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <div class="page-break"></div>
`;
}

// === EXCEL EXPORTERS - DEUDA Y COBRANZAS ===

function exportDeudaProveedorExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['PROVEEDOR', 'FACTURAS', 'SALDO TOTAL ($)', '% DEL TOTAL']
  ], { origin: 'A1' });

  if (data && data.proveedores) {
    const rows = data.proveedores.map(p => [
      p.nombre || 'Sin especificar',
      p.facturas || 0,
      p.saldo || 0,
      (p.porcentaje || 0).toFixed(1) + '%'
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: 'A6' });

    // Agregar totales
    const totalRow = [
      'TOTAL',
      data.proveedores.reduce((sum, p) => sum + (p.facturas || 0), 0),
      data.proveedores.reduce((sum, p) => sum + (p.saldo || 0), 0),
      '100%'
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: `A${6 + data.proveedores.length + 1}` });
  }

  worksheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Deuda Proveedor');
}

function exportIngresosPendientesExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['CLIENTE', 'Nº COMPROBANTE', 'TOTAL ($)', 'COBRADO ($)', 'PENDIENTE ($)', 'DÍAS VENCIDO']
  ], { origin: 'A1' });

  if (data && data.ingresos) {
    const rows = data.ingresos.map(i => [
      i.cliente || 'Sin especificar',
      i.comprobante || '',
      i.total || 0,
      i.cobrado || 0,
      (i.total || 0) - (i.cobrado || 0),
      i.dias_vencido || 0
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: 'A6' });

    // Agregar totales
    const totalRow = [
      'TOTAL',
      '',
      data.ingresos.reduce((sum, i) => sum + (i.total || 0), 0),
      data.ingresos.reduce((sum, i) => sum + (i.cobrado || 0), 0),
      data.ingresos.reduce((sum, i) => sum + ((i.total || 0) - (i.cobrado || 0)), 0),
      ''
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: `A${6 + data.ingresos.length + 1}` });
  }

  worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ingresos Pendientes');
}

function exportCobranzasExcel(workbook, data, metadata) {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [metadata.reportTitle],
    [`Firma: ${metadata.firmName}`],
    [`Período: ${metadata.periodo.start} a ${metadata.periodo.end}`],
    [],
    ['FECHA', 'CLIENTE', 'INGRESO', 'MONTO COBRADO ($)', 'MÉTODO', 'REFERENCIA']
  ], { origin: 'A1' });

  if (data && data.cobranzas) {
    const rows = data.cobranzas.map(c => [
      c.fecha || '',
      c.cliente || 'Sin especificar',
      c.ingreso || '',
      c.monto || 0,
      c.metodo || 'N/A',
      c.referencia || ''
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: 'A6' });

    // Agregar total
    const totalRow = [
      'TOTAL',
      '',
      '',
      data.cobranzas.reduce((sum, c) => sum + (c.monto || 0), 0),
      '',
      ''
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: `A${6 + data.cobranzas.length + 1}` });
  }

  worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cobranzas Realizadas');
}

// === PDF EXPORTERS - DEUDA Y COBRANZAS ===

function exportDeudaProveedorPDF(doc, data, metadata, startY) {
  const tableData = [
    ['PROVEEDOR', 'FACTURAS', 'SALDO TOTAL ($)', '% DEL TOTAL']
  ];

  if (data && data.proveedores) {
    data.proveedores.forEach(p => {
      tableData.push([
        p.nombre || 'Sin especificar',
        (p.facturas || 0).toString(),
        (p.saldo || 0).toLocaleString('es-AR'),
        ((p.porcentaje || 0).toFixed(1)) + '%'
      ]);
    });

    // Agregar fila de totales
    tableData.push([
      'TOTAL',
      data.proveedores.reduce((sum, p) => sum + (p.facturas || 0), 0).toString(),
      data.proveedores.reduce((sum, p) => sum + (p.saldo || 0), 0).toLocaleString('es-AR'),
      '100%'
    ]);
  }

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportIngresosPendientesPDF(doc, data, metadata, startY) {
  const tableData = [
    ['CLIENTE', 'Nº COMPROBANTE', 'TOTAL ($)', 'COBRADO ($)', 'PENDIENTE ($)', 'DÍAS VENCIDO']
  ];

  if (data && data.ingresos) {
    data.ingresos.forEach(i => {
      tableData.push([
        i.cliente || 'Sin especificar',
        i.comprobante || '',
        (i.total || 0).toLocaleString('es-AR'),
        (i.cobrado || 0).toLocaleString('es-AR'),
        ((i.total || 0) - (i.cobrado || 0)).toLocaleString('es-AR'),
        (i.dias_vencido || 0).toString()
      ]);
    });

    // Agregar fila de totales
    tableData.push([
      'TOTAL',
      '',
      data.ingresos.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString('es-AR'),
      data.ingresos.reduce((sum, i) => sum + (i.cobrado || 0), 0).toLocaleString('es-AR'),
      data.ingresos.reduce((sum, i) => sum + ((i.total || 0) - (i.cobrado || 0)), 0).toLocaleString('es-AR'),
      ''
    ]);
  }

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

function exportCobranzasPDF(doc, data, metadata, startY) {
  const tableData = [
    ['FECHA', 'CLIENTE', 'INGRESO', 'MONTO COBRADO ($)', 'MÉTODO', 'REFERENCIA']
  ];

  if (data && data.cobranzas) {
    data.cobranzas.forEach(c => {
      tableData.push([
        c.fecha || '',
        c.cliente || 'Sin especificar',
        c.ingreso || '',
        (c.monto || 0).toLocaleString('es-AR'),
        c.metodo || 'N/A',
        c.referencia || ''
      ]);
    });

    // Agregar fila de totales
    tableData.push([
      'TOTAL',
      '',
      '',
      data.cobranzas.reduce((sum, c) => sum + (c.monto || 0), 0).toLocaleString('es-AR'),
      '',
      ''
    ]);
  }

  autoTable(doc, {
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: startY,
    margin: 10
  });

  return doc.lastAutoTable.finalY + 10;
}

// === WORD EXPORTERS - DEUDA Y COBRANZAS ===

function buildDeudaProveedorWord(data, metadata) {
  let rows = '';
  if (data && data.proveedores) {
    rows = data.proveedores.map(p => `
      <tr>
        <td>${p.nombre || 'Sin especificar'}</td>
        <td>${p.facturas || 0}</td>
        <td>${(p.saldo || 0).toLocaleString('es-AR')}</td>
        <td>${(p.porcentaje || 0).toFixed(1)}%</td>
      </tr>
    `).join('');

    // Agregar fila de totales
    rows += `
      <tr class="total-row">
        <td>TOTAL</td>
        <td>${data.proveedores.reduce((sum, p) => sum + (p.facturas || 0), 0)}</td>
        <td>${data.proveedores.reduce((sum, p) => sum + (p.saldo || 0), 0).toLocaleString('es-AR')}</td>
        <td>100%</td>
      </tr>
    `;
  }

  return `
  <h2 style="color: #1f3864;">Deuda por Proveedor</h2>
  <table>
    <thead>
      <tr>
        <th>PROVEEDOR</th>
        <th>FACTURAS</th>
        <th>SALDO TOTAL ($)</th>
        <th>% DEL TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="page-break"></div>
  `;
}

function buildIngresosPendientesWord(data, metadata) {
  let rows = '';
  if (data && data.ingresos) {
    rows = data.ingresos.map(i => `
      <tr>
        <td>${i.cliente || 'Sin especificar'}</td>
        <td>${i.comprobante || ''}</td>
        <td>${(i.total || 0).toLocaleString('es-AR')}</td>
        <td>${(i.cobrado || 0).toLocaleString('es-AR')}</td>
        <td>${((i.total || 0) - (i.cobrado || 0)).toLocaleString('es-AR')}</td>
        <td>${i.dias_vencido || 0}</td>
      </tr>
    `).join('');

    // Agregar fila de totales
    rows += `
      <tr class="total-row">
        <td>TOTAL</td>
        <td></td>
        <td>${data.ingresos.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString('es-AR')}</td>
        <td>${data.ingresos.reduce((sum, i) => sum + (i.cobrado || 0), 0).toLocaleString('es-AR')}</td>
        <td>${data.ingresos.reduce((sum, i) => sum + ((i.total || 0) - (i.cobrado || 0)), 0).toLocaleString('es-AR')}</td>
        <td></td>
      </tr>
    `;
  }

  return `
  <h2 style="color: #1f3864;">Ingresos Pendientes de Cobro</h2>
  <table>
    <thead>
      <tr>
        <th>CLIENTE</th>
        <th>Nº COMPROBANTE</th>
        <th>TOTAL ($)</th>
        <th>COBRADO ($)</th>
        <th>PENDIENTE ($)</th>
        <th>DÍAS VENCIDO</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="page-break"></div>
  `;
}

function buildCobranzasWord(data, metadata) {
  let rows = '';
  if (data && data.cobranzas) {
    rows = data.cobranzas.map(c => `
      <tr>
        <td>${c.fecha || ''}</td>
        <td>${c.cliente || 'Sin especificar'}</td>
        <td>${c.ingreso || ''}</td>
        <td>${(c.monto || 0).toLocaleString('es-AR')}</td>
        <td>${c.metodo || 'N/A'}</td>
        <td>${c.referencia || ''}</td>
      </tr>
    `).join('');

    // Agregar fila de totales
    rows += `
      <tr class="total-row">
        <td>TOTAL</td>
        <td></td>
        <td></td>
        <td>${data.cobranzas.reduce((sum, c) => sum + (c.monto || 0), 0).toLocaleString('es-AR')}</td>
        <td></td>
        <td></td>
      </tr>
    `;
  }

  return `
  <h2 style="color: #1f3864;">Historial de Cobranzas</h2>
  <table>
    <thead>
      <tr>
        <th>FECHA</th>
        <th>CLIENTE</th>
        <th>INGRESO</th>
        <th>MONTO COBRADO ($)</th>
        <th>MÉTODO</th>
        <th>REFERENCIA</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="page-break"></div>
  `;
}

function buildWordFooter() {
  return `
  <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #999; text-align: center;">
    <p>Documento generado automáticamente por Campo Gestor - ERP Agrícola</p>
    <p>Confidencial - Solo para uso interno</p>
  </div>
</body>
</html>
`;
}
