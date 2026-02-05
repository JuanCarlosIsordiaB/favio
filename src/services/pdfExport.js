/**
 * Servicio para exportar datos financieros a PDF
 */

/**
 * Exportar listado de cuentas por pagar a PDF
 * @param {Array} cuentas - Listado de cuentas por pagar
 * @param {String} firmName - Nombre de la firma
 */
export const exportCuentasPorPagarPDF = (cuentas, firmName = 'Mi Empresa') => {
  const doc = document.createElement('div');
  const css = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { text-align: center; color: #333; }
      h2 { color: #666; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background-color: #4CAF50; color: white; padding: 10px; text-align: left; }
      td { border: 1px solid #ddd; padding: 10px; }
      tr:nth-child(even) { background-color: #f2f2f2; }
      .total { font-weight: bold; background-color: #e8f5e9; }
      .urgent { color: #d32f2f; }
      .soon { color: #f57c00; }
      .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
    </style>
  `;

  const today = new Date().toLocaleDateString('es-ES');
  const totalCuentas = cuentas.reduce((sum, c) => sum + (c.balance || 0), 0);

  let html = `
    ${css}
    <h1>Cuentas por Pagar</h1>
    <h2>${firmName}</h2>
    <p><strong>Fecha de Reporte:</strong> ${today}</p>

    <table>
      <thead>
        <tr>
          <th>Urgencia</th>
          <th>Proveedor</th>
          <th>Nº Factura</th>
          <th>Fecha</th>
          <th>Vencimiento</th>
          <th>Saldo Pendiente</th>
        </tr>
      </thead>
      <tbody>
  `;

  cuentas.forEach(cuenta => {
    const urgencyClass = cuenta.urgency === 'overdue' ? 'urgent' : cuenta.urgency === 'soon' ? 'soon' : '';
    const urgencyText =
      cuenta.urgency === 'overdue' ? 'VENCIDA' :
      cuenta.urgency === 'soon' ? 'PRÓXIMA' :
      cuenta.urgency === 'medium' ? 'MEDIATO' :
      'NORMAL';

    html += `
      <tr>
        <td class="${urgencyClass}">${urgencyText}</td>
        <td>${cuenta.provider_name || '-'}</td>
        <td>${cuenta.invoice_number || '-'}</td>
        <td>${new Date(cuenta.date || cuenta.invoice_date).toLocaleDateString('es-ES')}</td>
        <td>${cuenta.due_date ? new Date(cuenta.due_date).toLocaleDateString('es-ES') : '-'}</td>
        <td>${cuenta.currency} ${cuenta.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 }) || '0'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <div class="total" style="text-align: right; padding: 10px; margin-top: 20px;">
      <strong>TOTAL PENDIENTE: UYU ${totalCuentas.toLocaleString('es-UY', { maximumFractionDigits: 2 })}</strong>
    </div>

    <div class="footer">
      <p>Generado automáticamente por Sistema de Gestión Agrícola</p>
    </div>
  `;

  // Crear ventana de impresión
  const printWindow = window.open('', 'PRINT', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Abrir diálogo de impresión
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Exportar listado de cuentas por cobrar a PDF
 * @param {Array} cuentas - Listado de cuentas por cobrar
 * @param {String} firmName - Nombre de la firma
 */
export const exportCuentasPorCobrarPDF = (cuentas, firmName = 'Mi Empresa') => {
  const doc = document.createElement('div');
  const css = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { text-align: center; color: #333; }
      h2 { color: #666; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background-color: #2196F3; color: white; padding: 10px; text-align: left; }
      td { border: 1px solid #ddd; padding: 10px; }
      tr:nth-child(even) { background-color: #e3f2fd; }
      .total { font-weight: bold; background-color: #bbdefb; }
      .urgent { color: #d32f2f; }
      .soon { color: #f57c00; }
      .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
    </style>
  `;

  const today = new Date().toLocaleDateString('es-ES');
  const totalCuentas = cuentas.reduce((sum, c) => sum + (c.balance || 0), 0);

  let html = `
    ${css}
    <h1>Cuentas por Cobrar</h1>
    <h2>${firmName}</h2>
    <p><strong>Fecha de Reporte:</strong> ${today}</p>

    <table>
      <thead>
        <tr>
          <th>Urgencia</th>
          <th>Cliente</th>
          <th>Nº Comprobante</th>
          <th>Fecha</th>
          <th>Vencimiento</th>
          <th>Saldo Pendiente</th>
        </tr>
      </thead>
      <tbody>
  `;

  cuentas.forEach(cuenta => {
    const urgencyClass = cuenta.urgency === 'overdue' ? 'urgent' : cuenta.urgency === 'soon' ? 'soon' : '';
    const urgencyText =
      cuenta.urgency === 'overdue' ? 'VENCIDA' :
      cuenta.urgency === 'soon' ? 'PRÓXIMA' :
      cuenta.urgency === 'medium' ? 'MEDIATO' :
      'NORMAL';

    html += `
      <tr>
        <td class="${urgencyClass}">${urgencyText}</td>
        <td>${cuenta.client_name || '-'}</td>
        <td>${cuenta.invoice_number || '-'}</td>
        <td>${new Date(cuenta.date || cuenta.invoice_date).toLocaleDateString('es-ES')}</td>
        <td>${cuenta.due_date ? new Date(cuenta.due_date).toLocaleDateString('es-ES') : '-'}</td>
        <td>${cuenta.currency} ${cuenta.balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 }) || '0'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <div class="total" style="text-align: right; padding: 10px; margin-top: 20px;">
      <strong>TOTAL PENDIENTE: UYU ${totalCuentas.toLocaleString('es-UY', { maximumFractionDigits: 2 })}</strong>
    </div>

    <div class="footer">
      <p>Generado automáticamente por Sistema de Gestión Agrícola</p>
    </div>
  `;

  // Crear ventana de impresión
  const printWindow = window.open('', 'PRINT', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Abrir diálogo de impresión
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Descargar como CSV (alternativa a PDF)
 */
export const downloadCuentasAsCSV = (cuentas, filename = 'cuentas.csv') => {
  const headers = ['Urgencia', 'Entidad', 'Nº Documento', 'Fecha', 'Vencimiento', 'Saldo'];
  const csvContent = [
    headers.join(','),
    ...cuentas.map(c => [
      c.urgency || '',
      `"${c.provider_name || c.client_name || ''}"`,
      c.invoice_number || '',
      new Date(c.date || c.invoice_date).toLocaleDateString('es-ES'),
      c.due_date ? new Date(c.due_date).toLocaleDateString('es-ES') : '',
      c.balance || 0
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
