import React from 'react';
import { X, Calendar, Tag, FileText, DollarSign, MapPin, Activity, Droplets, Package, Tractor, ClipboardList } from 'lucide-react';

export default function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  const { originalData, type, color } = record;

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-UY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderField = (label, value, icon = null) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          {icon && React.cloneElement(icon, { size: 12 })}
          {label}
        </p>
        <p className="text-slate-800 font-medium">{value}</p>
      </div>
    );
  };

  const renderAuditInfo = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Información de Auditoría</h4>
      <div className="grid grid-cols-2 gap-3">
        {renderField('Usuario', originalData.usuario, <Activity />)}
        {renderField('Módulo Origen', originalData.modulo_origen || 'Sistema', <FileText />)}
        {renderField('Fecha/Hora', formatDate(originalData.fecha), <Calendar />)}
        {renderField('ID Firma', originalData.firma_id ? originalData.firma_id.slice(0, 8) + '...' : '-')}
        {originalData.predio_id && renderField('ID Predio', originalData.predio_id.slice(0, 8) + '...')}
        {originalData.lote_id && renderField('ID Lote', originalData.lote_id.slice(0, 8) + '...')}
      </div>
    </div>
  );

  const renderSpecificDetails = () => {
    const metadata = originalData.metadata || {};

    if (Object.keys(metadata).length === 0) {
      return (
        <div className="text-slate-500 italic">
          Sin detalles adicionales disponibles.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(metadata).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null;
          return (
            <div key={key} className="mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-slate-800 font-medium">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${color.replace('bg-', 'bg-opacity-20 bg-').split(' ')[0]} ${color.split(' ')[1]}`}>
              <record.Icon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{record.title}</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{type}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {renderAuditInfo()}
          {renderSpecificDetails()}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}