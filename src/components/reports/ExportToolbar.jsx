import React, { useState } from 'react';
import { FileText, Download, Loader } from 'lucide-react';
import { exportReportExcel, exportReportPDF, exportReportWord } from '../../services/reportExports';

/**
 * ExportToolbar
 * Componente con botones para exportar reportes en 3 formatos:
 * - Excel (XLSX)
 * - PDF
 * - Word (DOC)
 */

export default function ExportToolbar({
  reportType,
  reportData,
  firmName,
  reportTitle,
  periodo
}) {
  const [exporting, setExporting] = useState(null);
  const [exportComplete, setExportComplete] = useState(false);

  const metadata = {
    firmName,
    reportTitle,
    periodo
  };

  async function handleExport(format) {
    if (!reportType || !reportData) {
      alert('No hay reporte para exportar. Por favor genere uno primero.');
      return;
    }

    setExporting(format);
    try {
      switch (format) {
        case 'excel':
          await exportReportExcel(reportType, reportData, metadata);
          break;
        case 'pdf':
          await exportReportPDF(reportType, reportData, metadata);
          break;
        case 'word':
          await exportReportWord(reportType, reportData, metadata);
          break;
        default:
          throw new Error(`Formato no soportado: ${format}`);
      }

      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Error al exportar: ${error.message}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Excel Button */}
      <button
        onClick={() => handleExport('excel')}
        disabled={!reportType || exporting !== null}
        data-id="report-export-btn-excel"
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
        title="Exportar a Excel (XLSX)"
      >
        {exporting === 'excel' ? (
          <>
            <Loader size={18} className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download size={18} />
            Excel
          </>
        )}
      </button>

      {/* PDF Button */}
      <button
        onClick={() => handleExport('pdf')}
        disabled={!reportType || exporting !== null}
        data-id="report-export-btn-pdf"
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
        title="Exportar a PDF"
      >
        {exporting === 'pdf' ? (
          <>
            <Loader size={18} className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <FileText size={18} />
            PDF
          </>
        )}
      </button>

      {/* Word Button */}
      <button
        onClick={() => handleExport('word')}
        disabled={!reportType || exporting !== null}
        data-id="report-export-btn-word"
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
        title="Exportar a Word (DOC)"
      >
        {exporting === 'word' ? (
          <>
            <Loader size={18} className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <FileText size={18} />
            Word
          </>
        )}
      </button>

      {/* Success Message */}
      {exportComplete && (
        <div className="ml-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          <span className="text-sm font-medium text-green-700">¡Exportación completada!</span>
        </div>
      )}
    </div>
  );
}
