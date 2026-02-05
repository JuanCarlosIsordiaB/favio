/**
 * Servicios de exportación para Remitos
 * Módulo 09: PDF y Excel exports
 */

import { jsPDF } from 'jspdf';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';

// ===========================
// EXPORTACIÓN A PDF
// ===========================

/**
 * Exportar remito individual a PDF
 * @param {Object} remittance - Objeto remito con ítems
 * @param {Object} firm - Información de la firma
 */
export function exportarRemitoPDF(remittance, firm = {}) {
  try {
    if (!remittance) throw new Error('Remito es requerido');

    // Crear documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 10;

    // ===== HEADER =====
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94); // Verde
    doc.text('COMPROBANTE DE REMITO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(10, currentY, pageWidth - 10, currentY);
    currentY += 5;

    // Información de la firma
    if (firm.name) {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`FIRMA: ${firm.name}`, 10, currentY);
      currentY += 6;
    }

    if (firm.rut) {
      doc.setFontSize(10);
      doc.text(`RUT: ${firm.rut}`, 10, currentY);
      currentY += 5;
    }

    // ===== DATOS DEL REMITO =====
    currentY += 3;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('DATOS DEL REMITO', 10, currentY);
    currentY += 7;

    doc.setFontSize(10);
    const remittoData = [
      [`Nº Remito: ${remittance.remittance_number}`, `Fecha: ${remittance.remittance_date}`],
      [`Proveedor: ${remittance.supplier_name}`, `RUT: ${remittance.supplier_rut || 'N/A'}`],
      [`Estado: ${remittance.status}`, `Recibido: ${remittance.received_date || 'Pendiente'}`]
    ];

    remittoData.forEach(row => {
      doc.text(row[0], 10, currentY);
      doc.text(row[1], pageWidth / 2, currentY);
      currentY += 6;
    });

    // ===== INFORMACIÓN DE TRANSPORTE =====
    if (remittance.transport_company || remittance.driver_name) {
      currentY += 2;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text('TRANSPORTE', 10, currentY);
      currentY += 7;

      doc.setFontSize(10);
      if (remittance.transport_company) {
        doc.text(`Empresa: ${remittance.transport_company}`, 10, currentY);
        currentY += 5;
      }
      if (remittance.driver_name) {
        doc.text(`Conductor: ${remittance.driver_name}`, 10, currentY);
        currentY += 5;
      }
      if (remittance.vehicle_plate) {
        doc.text(`Placa: ${remittance.vehicle_plate}`, 10, currentY);
        currentY += 5;
      }
    }

    // ===== TABLA DE ÍTEMS =====
    currentY += 5;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('ÍTEMS RECIBIDOS', 10, currentY);
    currentY += 7;

    if (remittance.items && remittance.items.length > 0) {
      // Headers de tabla
      const headers = ['Descripción', 'Cantidad Ord.', 'Cantidad Rec.', 'Unidad', 'Condición'];
      const colWidths = [60, 20, 20, 20, 25];
      let colX = 10;

      // Dibujar headers
      doc.setFillColor(34, 197, 94);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');

      headers.forEach((header, idx) => {
        doc.text(header, colX, currentY, { maxWidth: colWidths[idx] });
        colX += colWidths[idx];
      });

      currentY += 6;

      // Dibujar filas
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      remittance.items.forEach(item => {
        const itemText = [
          item.item_description || 'Sin descripción',
          item.quantity_ordered || 0,
          item.quantity_received || 0,
          item.unit || '',
          item.condition || 'good'
        ];

        colX = 10;
        itemText.forEach((text, idx) => {
          const maxWidth = colWidths[idx] - 2;
          doc.text(String(text).substring(0, 20), colX, currentY, { maxWidth });
          colX += colWidths[idx];
        });

        currentY += 5;

        // Agregar nueva página si es necesario
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 10;
        }
      });
    }

    // ===== OBSERVACIONES =====
    if (remittance.notes) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text('OBSERVACIONES:', 10, currentY);
      currentY += 5;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const observacionesY = doc.splitTextToSize(remittance.notes, pageWidth - 20);
      doc.text(observacionesY, 10, currentY);
    }

    // ===== FOOTER =====
    currentY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 10, currentY);
    doc.text(`Módulo 09 - Remitos`, pageWidth - 10, currentY, { align: 'right' });

    // Descargar
    const nombreArchivo = `remito-${remittance.remittance_number}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);

    return { success: true, fileName: nombreArchivo };
  } catch (error) {
    console.error('Error en exportarRemitoPDF:', error);
    throw error;
  }
}

// ===========================
// EXPORTACIÓN A EXCEL
// ===========================

/**
 * Exportar todos los remitos a Excel con múltiples sheets
 * @param {Array} remittances - Array de remitos
 * @param {Object} firm - Información de la firma
 */
export function exportarRemitosExcel(remittances, firm = {}) {
  try {
    if (!remittances || remittances.length === 0) {
      throw new Error('No hay remitos para exportar');
    }

    // Crear workbook
    const wb = {
      SheetNames: ['Remitos', 'Ítems', 'Estadísticas'],
      Sheets: {}
    };

    // ===== SHEET 1: Listado de Remitos =====
    const remitosData = remittances.map(r => ({
      'Nº Remito': r.remittance_number,
      'Fecha': r.remittance_date,
      'Proveedor': r.supplier_name,
      'RUT': r.supplier_rut || '',
      'Estado': r.status,
      'Cantidad Ítems': r.items?.length || 0,
      'Fecha Recepción': r.received_date || 'Pendiente',
      'Recibido por': r.received_by || '',
      'Observaciones': r.notes || ''
    }));

    wb.Sheets['Remitos'] = XLSXUtils.json_to_sheet(remitosData);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Nº Remito
      { wch: 12 }, // Fecha
      { wch: 25 }, // Proveedor
      { wch: 15 }, // RUT
      { wch: 15 }, // Estado
      { wch: 15 }, // Cantidad Ítems
      { wch: 15 }, // Fecha Recepción
      { wch: 15 }, // Recibido por
      { wch: 30 }  // Observaciones
    ];
    wb.Sheets['Remitos']['!cols'] = colWidths;

    // ===== SHEET 2: Ítems Detallados =====
    const itemsData = [];
    remittances.forEach(r => {
      if (r.items && r.items.length > 0) {
        r.items.forEach(item => {
          itemsData.push({
            'Remito': r.remittance_number,
            'Proveedor': r.supplier_name,
            'Descripción': item.item_description,
            'Cantidad Ordenada': item.quantity_ordered || 0,
            'Cantidad Recibida': item.quantity_received || 0,
            'Unidad': item.unit,
            'Condición': item.condition || 'good',
            'Diferencia': (item.quantity_received || 0) - (item.quantity_ordered || 0),
            'Notas': item.notes || ''
          });
        });
      }
    });

    wb.Sheets['Ítems'] = XLSXUtils.json_to_sheet(itemsData);
    wb.Sheets['Ítems']['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 25 }
    ];

    // ===== SHEET 3: Estadísticas =====
    const stats = calcularEstadisticas(remittances);
    const statsData = [
      { Métrica: 'Total Remitos', Valor: stats.total },
      { Métrica: 'En Tránsito', Valor: stats.in_transit },
      { Métrica: 'Recibidos', Valor: stats.received },
      { Métrica: 'Parcialmente Recibidos', Valor: stats.partially_received },
      { Métrica: 'Cancelados', Valor: stats.cancelled },
      { Métrica: 'Total Ítems', Valor: stats.totalItems },
      { Métrica: 'Proveedores Únicos', Valor: stats.uniqueSuppliers },
      { Métrica: 'Diferencias Detectadas', Valor: stats.differences },
      { Métrica: '', Valor: '' },
      { Métrica: 'Por Proveedor', Valor: '' }
    ];

    // Agregar estadísticas por proveedor
    stats.bySupplier.forEach(supplier => {
      statsData.push({
        Métrica: supplier.name,
        Valor: supplier.count
      });
    });

    // Agregar estadísticas por mes
    statsData.push({ Métrica: '', Valor: '' });
    statsData.push({ Métrica: 'Por Mes', Valor: '' });
    stats.byMonth.forEach(month => {
      statsData.push({
        Métrica: month.month,
        Valor: month.count
      });
    });

    wb.Sheets['Estadísticas'] = XLSXUtils.json_to_sheet(statsData);
    wb.Sheets['Estadísticas']['!cols'] = [{ wch: 30 }, { wch: 15 }];

    // Descargar
    const nombreArchivo = `remitos-${firm.name || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSXWrite(wb, { bookType: 'xlsx', type: 'array', bookSST: false });

    // Convertir a Blob y descargar
    const blob = new Blob([XLSXWrite(wb, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);

    return { success: true, fileName: nombreArchivo };
  } catch (error) {
    console.error('Error en exportarRemitosExcel:', error);
    throw error;
  }
}

// ===========================
// UTILIDADES
// ===========================

/**
 * Calcular estadísticas para la sheet de reportes
 */
function calcularEstadisticas(remittances) {
  const stats = {
    total: remittances.length,
    in_transit: 0,
    received: 0,
    partially_received: 0,
    cancelled: 0,
    totalItems: 0,
    uniqueSuppliers: new Set(),
    differences: 0,
    bySupplier: {},
    byMonth: {}
  };

  remittances.forEach(r => {
    // Contar por estado
    if (r.status === 'in_transit') stats.in_transit++;
    if (r.status === 'received') stats.received++;
    if (r.status === 'partially_received') stats.partially_received++;
    if (r.status === 'cancelled') stats.cancelled++;

    // Contar ítems totales
    if (r.items) {
      stats.totalItems += r.items.length;

      // Detectar diferencias
      r.items.forEach(item => {
        const diferencia = (item.quantity_received || 0) - (item.quantity_ordered || 0);
        if (diferencia !== 0) stats.differences++;
      });
    }

    // Proveedores únicos
    stats.uniqueSuppliers.add(r.supplier_name);

    // Por proveedor
    if (!stats.bySupplier[r.supplier_name]) {
      stats.bySupplier[r.supplier_name] = 0;
    }
    stats.bySupplier[r.supplier_name]++;

    // Por mes
    if (r.remittance_date) {
      const mes = r.remittance_date.substring(0, 7);
      if (!stats.byMonth[mes]) {
        stats.byMonth[mes] = 0;
      }
      stats.byMonth[mes]++;
    }
  });

  // Convertir a arrays
  stats.uniqueSuppliers = stats.uniqueSuppliers.size;
  stats.bySupplier = Object.entries(stats.bySupplier).map(([name, count]) => ({ name, count }));
  stats.byMonth = Object.entries(stats.byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return stats;
}
