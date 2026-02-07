/**
 * Servicios de exportación para Órdenes de Compra
 * Generación de PDF y envío por correo
 */

import { jsPDF } from 'jspdf';

/**
 * Generar PDF de orden de compra
 * @param {Object} order - Objeto orden de compra con items
 * @param {Object} firm - Información de la firma
 * @returns {Blob} - Blob del PDF generado
 */
export function generatePurchaseOrderPDF(order, firm = {}) {
  try {
    if (!order) throw new Error('Orden de compra es requerida');

    // Crear documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 10;

    // ===== HEADER =====
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // Azul
    doc.text('ORDEN DE COMPRA', pageWidth / 2, currentY, { align: 'center' });
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

    if (firm.location) {
      doc.setFontSize(10);
      doc.text(`Ubicación: ${firm.location}`, 10, currentY);
      currentY += 5;
    }

    if (firm.rut) {
      doc.setFontSize(10);
      doc.text(`RUT: ${firm.rut}`, 10, currentY);
      currentY += 5;
    }

    // ===== DATOS DE LA ORDEN =====
    currentY += 3;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('DATOS DE LA ORDEN', 10, currentY);
    currentY += 7;

    doc.setFontSize(10);
    const orderData = [
      [`Nº Orden: ${order.order_number}`, `Fecha: ${new Date(order.order_date).toLocaleDateString('es-ES')}`],
      [`Estado: ${order.status || 'draft'}`, `Moneda: ${order.currency || 'UYU'}`],
    ];

    // Si la moneda es USD, mostrar tipo de cambio si está disponible
    if (order.currency === 'USD' && order.exchange_rate) {
      orderData.push([`Tipo de Cambio: ${parseFloat(order.exchange_rate).toFixed(2)} UYU/USD`, '']);
    }

    if (order.delivery_date) {
      orderData.push([`Fecha Entrega: ${new Date(order.delivery_date).toLocaleDateString('es-ES')}`, '']);
    }

    orderData.forEach(row => {
      doc.text(row[0], 10, currentY);
      if (row[1]) {
        doc.text(row[1], pageWidth / 2, currentY);
      }
      currentY += 6;
    });

    // ===== DATOS DEL PROVEEDOR =====
    currentY += 3;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('PROVEEDOR', 10, currentY);
    currentY += 7;

    doc.setFontSize(10);
    const supplierData = [];
    if (order.supplier_name) supplierData.push(`Nombre: ${order.supplier_name}`);
    if (order.supplier_rut) supplierData.push(`RUT: ${order.supplier_rut}`);
    if (order.supplier_phone) supplierData.push(`Teléfono: ${order.supplier_phone}`);
    if (order.supplier_email) supplierData.push(`Email: ${order.supplier_email}`);
    if (order.supplier_address) supplierData.push(`Dirección: ${order.supplier_address}`);

    supplierData.forEach(line => {
      doc.text(line, 10, currentY);
      currentY += 5;
    });

    // ===== DIRECCIÓN DE ENTREGA =====
    if (order.delivery_address) {
      currentY += 3;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text('DIRECCIÓN DE ENTREGA', 10, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.text(order.delivery_address, 10, currentY);
      currentY += 5;
    }

    // ===== TABLA DE ÍTEMS =====
    currentY += 5;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('ÍTEMS', 10, currentY);
    currentY += 7;

    // Verificar si hay items
    const items = order.purchase_order_items || order.items || [];
    
    if (items.length > 0) {
      // Encabezados de tabla
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      const headerY = currentY;
      doc.text('Descripción', 10, headerY);
      doc.text('Cant.', 90, headerY);
      doc.text('Unidad', 110, headerY);
      doc.text('Precio', 130, headerY);
      doc.text('IVA %', 155, headerY);
      doc.text('Total', 170, headerY, { align: 'right' });
      currentY += 5;

      // Línea debajo de encabezados
      doc.setDrawColor(200, 200, 200);
      doc.line(10, currentY, pageWidth - 10, currentY);
      currentY += 3;

      // Items
      doc.setFont(undefined, 'normal');
      items.forEach((item, index) => {
        // Verificar si necesitamos nueva página
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 10;
        }

        const description = item.item_description || '';
        const quantity = item.quantity || 0;
        const unit = item.unit || '';
        const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
        const taxRate = item.tax_rate || 0;
        const total = parseFloat(item.total || 0).toFixed(2);

        // Truncar descripción si es muy larga
        const maxDescWidth = 75;
        let displayDesc = description;
        if (doc.getTextWidth(description) > maxDescWidth) {
          displayDesc = description.substring(0, 30) + '...';
        }

        doc.setFontSize(9);
        doc.text(displayDesc, 10, currentY);
        doc.text(quantity.toString(), 90, currentY);
        doc.text(unit, 110, currentY);
        doc.text(unitPrice, 130, currentY);
        doc.text(`${taxRate}%`, 155, currentY);
        doc.text(total, 170, currentY, { align: 'right' });
        currentY += 5;
      });

      // Línea antes de totales
      currentY += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(10, currentY, pageWidth - 10, currentY);
      currentY += 5;

      // Totales
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
      const taxAmount = parseFloat(order.tax_amount || 0).toFixed(2);
      const totalAmount = parseFloat(order.total_amount || 0).toFixed(2);
      const currencySymbol = order.currency === 'USD' ? 'US$' : '$';

      doc.text('Subtotal:', 120, currentY);
      doc.text(`${currencySymbol}${subtotal}`, 170, currentY, { align: 'right' });
      currentY += 6;

      doc.text('IVA:', 120, currentY);
      doc.text(`${currencySymbol}${taxAmount}`, 170, currentY, { align: 'right' });
      currentY += 6;

      doc.setFontSize(12);
      doc.text('TOTAL:', 120, currentY);
      doc.text(`${currencySymbol}${totalAmount}`, 170, currentY, { align: 'right' });
      currentY += 6;

      // Si la moneda es USD y hay tipo de cambio, mostrar equivalente en pesos
      if (order.currency === 'USD' && order.exchange_rate) {
        const exchangeRate = parseFloat(order.exchange_rate);
        const subtotalUYU = (parseFloat(subtotal) * exchangeRate).toFixed(2);
        const taxAmountUYU = (parseFloat(taxAmount) * exchangeRate).toFixed(2);
        const totalAmountUYU = (parseFloat(totalAmount) * exchangeRate).toFixed(2);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Equivalente en Pesos:', 120, currentY);
        currentY += 5;
        doc.text(`Subtotal: $${subtotalUYU}`, 125, currentY);
        doc.text(`IVA: $${taxAmountUYU}`, 125, currentY + 5);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL: $${totalAmountUYU}`, 125, currentY + 10);
        currentY += 15;
        doc.setTextColor(0, 0, 0);
      } else {
        currentY += 2;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No hay ítems en esta orden', 10, currentY);
      currentY += 5;
    }

    // ===== CONDICIONES DE PAGO =====
    if (order.payment_terms) {
      currentY += 5;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text('CONDICIONES DE PAGO', 10, currentY);
      currentY += 7;

      doc.setFontSize(10);
      const paymentTermsMap = {
        'contado': 'Contado (100%)',
        '30_dias': '30 días',
        '60_dias': '60 días',
        '90_dias': '90 días',
        '50_50': '50/50 (30 y 60 días)',
        '33_33_34': '33/33/34 (30, 60 y 90 días)',
        '25_25_25_25': '25/25/25/25 (30, 60, 90 y 120 días)',
        '40_60': '40/60 (Anticipo y saldo)'
      };
      const paymentTerm = paymentTermsMap[order.payment_terms] || order.payment_terms;
      doc.text(paymentTerm, 10, currentY);
      currentY += 5;
    }

    // ===== NOTAS =====
    if (order.notes) {
      currentY += 5;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text('NOTAS', 10, currentY);
      currentY += 7;

      doc.setFontSize(10);
      const notesLines = doc.splitTextToSize(order.notes, pageWidth - 20);
      notesLines.forEach(line => {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 10;
        }
        doc.text(line, 10, currentY);
        currentY += 5;
      });
    }

    // ===== FOOTER =====
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages} - Generado el ${new Date().toLocaleDateString('es-ES')}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // Generar blob del PDF
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('Error generando PDF de orden de compra:', error);
    throw error;
  }
}

/**
 * Convertir PDF blob a base64 para envío por email
 * @param {Blob} pdfBlob - Blob del PDF
 * @returns {Promise<string>} - Base64 string del PDF
 */
export async function pdfBlobToBase64(pdfBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1]; // Remover el prefijo data:application/pdf;base64,
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });
}

