/**
 * Utilidades de exportación Excel/CSV
 * Reutiliza patrón de DicoseManager.jsx
 */

import * as XLSX from 'xlsx';

/**
 * Exporta inventario completo a Excel
 * @param {Array} insumos - Lista de insumos
 * @param {string} firmName - Nombre de la firma
 */
export function exportarInventarioExcel(insumos, firmName = 'Firma') {
  try {
    const workbook = XLSX.utils.book_new();

    // HOJA 1: Inventario completo
    const inventoryData = [
      ['INVENTARIO DE INSUMOS'],
      [],
      ['Firma:', firmName],
      ['Fecha de exportación:', new Date().toLocaleString('es-UY')],
      ['Total de insumos:', insumos.length],
      [],
      ['ID', 'Nombre', 'Categoría', 'Stock Actual', 'Unidad', 'Stock Mínimo', 'Estado', 'Costo Unitario', 'Valor Total', 'Depósito', 'Lote', 'Marca', 'Vencimiento']
    ];

    insumos.forEach(insumo => {
      const stock = insumo.current_stock || 0;
      const minStock = insumo.min_stock_alert || 0;
      const costo = insumo.cost_per_unit || 0;
      const valorTotal = stock * costo;

      let estado = 'OK';
      if (stock === 0) estado = 'SIN STOCK';
      else if (stock <= minStock) estado = 'STOCK BAJO';

      inventoryData.push([
        insumo.id,
        insumo.name,
        insumo.category,
        stock,
        insumo.unit,
        minStock,
        estado,
        costo,
        valorTotal,
        insumo.depot_name || '-',
        insumo.batch_number || '-',
        insumo.brand || '-',
        insumo.expiration_date || '-'
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(inventoryData);

    // Establecer anchos de columnas
    sheet['!cols'] = [
      { wch: 10 }, // ID
      { wch: 30 }, // Nombre
      { wch: 15 }, // Categoría
      { wch: 12 }, // Stock
      { wch: 8 },  // Unidad
      { wch: 12 }, // Mínimo
      { wch: 12 }, // Estado
      { wch: 12 }, // Costo
      { wch: 12 }, // Valor
      { wch: 20 }, // Depósito
      { wch: 15 }, // Lote
      { wch: 15 }, // Marca
      { wch: 12 }  // Vencimiento
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventario');

    // HOJA 2: Resumen por categoría
    const categorias = {};
    insumos.forEach(i => {
      if (!categorias[i.category]) {
        categorias[i.category] = { count: 0, valorTotal: 0, sinStock: 0, stockBajo: 0 };
      }
      categorias[i.category].count++;
      categorias[i.category].valorTotal += (i.current_stock || 0) * (i.cost_per_unit || 0);
      if ((i.current_stock || 0) === 0) categorias[i.category].sinStock++;
      if ((i.current_stock || 0) <= (i.min_stock_alert || 0) && (i.current_stock || 0) > 0) categorias[i.category].stockBajo++;
    });

    const resumenData = [
      ['RESUMEN POR CATEGORÍA'],
      [],
      ['Categoría', 'Cantidad Items', 'Valor Total', 'Sin Stock', 'Stock Bajo']
    ];

    Object.entries(categorias).forEach(([cat, data]) => {
      resumenData.push([cat, data.count, data.valorTotal, data.sinStock, data.stockBajo]);
    });

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    // Descargar archivo con base64 (solución para Chrome)
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `Inventario_${firmName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const link = document.createElement('a');
      link.href = reader.result;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  } catch (error) {
    console.error('Error exportando Inventario:', error);
    throw error;
  }
}

/**
 * Exporta kardex (movimientos) a Excel
 * @param {Array} movimientos - Lista de movimientos con saldo
 * @param {Object} insumoMap - Mapa de insumos por ID
 * @param {string} firmName - Nombre de la firma
 */
export function exportarKardexExcel(movimientos, insumoMap, firmName = 'Firma') {
  try {
    const workbook = XLSX.utils.book_new();

    // Calcular saldos progresivos (kardex)
    let runningBalance = 0;
    const kardexData = [
      ['KARDEX DE MOVIMIENTOS DE STOCK'],
      [],
      ['Firma:', firmName],
      ['Fecha de exportación:', new Date().toLocaleString('es-UY')],
      ['Total movimientos:', movimientos.length],
      [],
      ['Fecha', 'Tipo', 'Insumo', 'Cantidad', 'Saldo', 'Descripción', 'Documento', 'Usuario', 'Depósito']
    ];

    // Ordenar por fecha ascendente para calcular saldo
    const sorted = [...movimientos].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(mov => {
      let change = 0;
      switch (mov.type) {
        case 'entry': change = mov.quantity; break;
        case 'exit': change = -mov.quantity; break;
        case 'adjustment': change = mov.quantity; break;
        case 'transfer': change = mov.quantity; break;
      }
      runningBalance += change;

      const insumo = insumoMap[mov.input_id];

      kardexData.push([
        new Date(mov.date).toLocaleString('es-UY'),
        mov.type.toUpperCase(),
        insumo?.name || mov.input_id,
        change,
        runningBalance,
        mov.description || '-',
        mov.document_reference || '-',
        mov.created_by || '-',
        mov.destination_depot_id || '-'
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(kardexData);
    sheet['!cols'] = [
      { wch: 18 }, // Fecha
      { wch: 12 }, // Tipo
      { wch: 30 }, // Insumo
      { wch: 10 }, // Cantidad
      { wch: 10 }, // Saldo
      { wch: 40 }, // Descripción
      { wch: 15 }, // Documento
      { wch: 15 }, // Usuario
      { wch: 15 }  // Depósito
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Kardex');

    // Descargar archivo con base64 (solución para Chrome)
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `Kardex_${firmName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const link = document.createElement('a');
      link.href = reader.result;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  } catch (error) {
    console.error('Error exportando Kardex:', error);
    throw error;
  }
}

/**
 * Exporta stock valorizado a Excel
 * @param {Object} stockValorizado - Objeto con total y por_categoria
 * @param {Array} insumos - Lista completa de insumos
 * @param {string} firmName - Nombre de la firma
 */
export function exportarStockValorizadoExcel(stockValorizado, insumos, firmName = 'Firma') {
  try {
    const workbook = XLSX.utils.book_new();

    // HOJA 1: Resumen valorizado
    const resumenData = [
      ['STOCK VALORIZADO'],
      [],
      ['Firma:', firmName],
      ['Fecha:', new Date().toLocaleString('es-UY')],
      ['Valor Total:', stockValorizado.total],
      [],
      ['Categoría', 'Valor Total']
    ];

    Object.entries(stockValorizado.por_categoria || {}).forEach(([cat, valor]) => {
      resumenData.push([cat, valor]);
    });

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    // HOJA 2: Detalle por insumo
    const detalleData = [
      ['DETALLE DE VALORIZACIÓN POR INSUMO'],
      [],
      ['Insumo', 'Categoría', 'Stock', 'Unidad', 'Costo Unitario', 'Valor Total']
    ];

    insumos.forEach(i => {
      const valor = (i.current_stock || 0) * (i.cost_per_unit || 0);
      if (valor > 0) {
        detalleData.push([
          i.name,
          i.category,
          i.current_stock || 0,
          i.unit,
          i.cost_per_unit || 0,
          valor
        ]);
      }
    });

    const detalleSheet = XLSX.utils.aoa_to_sheet(detalleData);
    XLSX.utils.book_append_sheet(workbook, detalleSheet, 'Detalle');

    // Descargar archivo con base64 (solución para Chrome)
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `Stock_Valorizado_${firmName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const link = document.createElement('a');
      link.href = reader.result;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  } catch (error) {
    console.error('Error exportando Stock Valorizado:', error);
    throw error;
  }
}
