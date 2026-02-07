import React from 'react';
import { X, Calendar, Tag, FileText, DollarSign, MapPin, Activity, Droplets, Package, Tractor, ClipboardList, Building2, Phone, Mail, Truck, CreditCard } from 'lucide-react';

// Función para traducir módulos técnicos a nombres amigables en español
const translateModule = (modulo) => {
  if (!modulo) return 'Sistema';
  
  const moduleMap = {
    'purchase_orders': 'Órdenes de Compra',
    'modulo_08_finanzas': 'Módulo 08 - Finanzas',
    'firmas': 'Firmas',
    'work_manager': 'Gestor de Trabajos',
    'personnel_manager': 'Gestor de Personal',
    'integration_manager': 'Gestor de Integraciones',
    'machinery_manager': 'Gestor de Maquinaria',
    'performance_evaluations': 'Evaluaciones de Desempeño',
    'alertas_automaticas': 'Alertas Automáticas',
    'alertas_recordatorios': 'Alertas y Recordatorios',
    'modulo_17_ventas': 'Módulo 17 - Ventas',
    'monitoring_integration': 'Integración de Monitoreo',
    'modulo_11': 'Módulo 11',
    'livestock_monitoring': 'Monitoreo de Ganado',
    'rainfall_manager': 'Gestor de Lluvias',
    'seed_analysis': 'Análisis de Semillas',
    'agricultural_monitoring': 'Monitoreo Agrícola',
    'soil_analysis': 'Análisis de Suelos',
    'gestiones': 'Gestiones',
    'remittances': 'Remesas',
    'remitos': 'Remitos',
    'lotes_y_mapas': 'Lotes y Mapas',
    'lotes': 'Lotes',
    'input_manager': 'Gestor de Insumos',
    'insumos': 'Insumos',
    'projections': 'Proyecciones',
    'stock_movement': 'Movimiento de Stock',
    'predios': 'Predios',
    'payment_orders': 'Órdenes de Pago'
  };
  
  return moduleMap[modulo] || modulo;
};

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
        {renderField('Módulo Origen', translateModule(originalData.modulo_origen), <FileText />)}
        {renderField('Fecha/Hora', formatDate(originalData.fecha), <Calendar />)}
        {renderField('ID Firma', originalData.firma_id ? originalData.firma_id.slice(0, 8) + '...' : '-')}
        {originalData.predio_id && renderField('ID Predio', originalData.predio_id.slice(0, 8) + '...')}
        {originalData.lote_id && renderField('ID Lote', originalData.lote_id.slice(0, 8) + '...')}
      </div>
    </div>
  );

  const renderPurchaseOrderDetails = (metadata) => {
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

    const statusMap = {
      'draft': 'Borrador',
      'approved': 'Aprobada',
      'sent': 'Enviada',
      'received': 'Recibida',
      'cancelled': 'Cancelada'
    };

    return (
      <div className="space-y-4">
        {/* Información de la Orden */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Información de la Orden
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {renderField('Nº Orden', metadata.order_number, <Tag />)}
            {renderField('Fecha', metadata.order_date ? formatDate(metadata.order_date) : null, <Calendar />)}
            {renderField('Estado', statusMap[metadata.status] || metadata.status, <Activity />)}
            {renderField('Moneda', metadata.currency, <DollarSign />)}
            {metadata.exchange_rate && renderField('Tipo de Cambio', `${parseFloat(metadata.exchange_rate).toFixed(2)} UYU/USD`)}
            {renderField('Condiciones de Pago', paymentTermsMap[metadata.payment_terms] || metadata.payment_terms, <CreditCard />)}
            {metadata.delivery_date && renderField('Fecha Entrega', formatDate(metadata.delivery_date), <Calendar />)}
            {metadata.delivery_address && renderField('Dirección Entrega', metadata.delivery_address, <MapPin />)}
          </div>
        </div>

        {/* Información del Proveedor */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Building2 size={16} />
            Proveedor
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {renderField('Nombre', metadata.supplier_name, <Building2 />)}
            {renderField('RUT', metadata.supplier_rut, <Tag />)}
            {renderField('Teléfono', metadata.supplier_phone, <Phone />)}
            {renderField('Email', metadata.supplier_email, <Mail />)}
            {metadata.supplier_address && renderField('Dirección', metadata.supplier_address, <MapPin />)}
          </div>
        </div>

        {/* Productos */}
        {metadata.items && Array.isArray(metadata.items) && metadata.items.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <Package size={16} />
              Productos ({metadata.items.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metadata.items.map((item, index) => (
                <div key={index} className="bg-white rounded p-3 border border-amber-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.description || item.item_description || 'Sin descripción'}</p>
                      <p className="text-xs text-slate-600">
                        {item.quantity} {item.unit} × {metadata.currency === 'USD' ? 'US$' : '$'}{parseFloat(item.unit_price || 0).toFixed(2)}
                        {item.tax_rate > 0 && ` (IVA ${item.tax_rate}%)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {metadata.currency === 'USD' ? 'US$' : '$'}{parseFloat(item.total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totales */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <DollarSign size={16} />
            Totales
          </h4>
          <div className="space-y-2">
            {renderField('Subtotal', metadata.subtotal ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.subtotal).toFixed(2)}` : null)}
            {renderField('IVA', metadata.tax_amount ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.tax_amount).toFixed(2)}` : null)}
            {renderField('Total', metadata.total_amount ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.total_amount).toFixed(2)}` : null)}
          </div>
        </div>

        {/* Notas */}
        {metadata.notes && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Notas</h4>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{metadata.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderExpenseDetails = (metadata) => {
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

    const statusMap = {
      'DRAFT': 'Borrador',
      'REGISTERED': 'Registrada',
      'APPROVED': 'Crédito',
      'PAID_PARTIAL': 'Pagada Parcial',
      'PAID': 'Contado',
      'CANCELLED': 'Anulada'
    };

    return (
      <div className="space-y-4">
        {/* Información de la Factura */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Información de la Factura
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {renderField('Serie', metadata.invoice_series, <Tag />)}
            {renderField('Número', metadata.invoice_number, <Tag />)}
            {renderField('Factura Completa', metadata.invoice_full, <FileText />)}
            {renderField('Fecha', metadata.invoice_date ? formatDate(metadata.invoice_date) : null, <Calendar />)}
            {renderField('Estado', statusMap[metadata.status] || metadata.status, <Activity />)}
            {renderField('Moneda', metadata.currency, <DollarSign />)}
            {renderField('Categoría', metadata.category, <Tag />)}
            {renderField('Concepto', metadata.concept, <FileText />)}
            {renderField('Condiciones de Pago', paymentTermsMap[metadata.payment_terms] || metadata.payment_terms, <CreditCard />)}
            {metadata.due_date && renderField('Fecha Vencimiento', formatDate(metadata.due_date), <Calendar />)}
          </div>
        </div>

        {/* Información del Proveedor */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Building2 size={16} />
            Proveedor
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {renderField('Nombre', metadata.provider_name || metadata.provider, <Building2 />)}
            {renderField('RUT', metadata.provider_rut, <Tag />)}
            {renderField('Teléfono', metadata.provider_phone, <Phone />)}
            {renderField('Email', metadata.provider_email, <Mail />)}
            {metadata.provider_address && renderField('Dirección', metadata.provider_address, <MapPin />)}
          </div>
        </div>

        {/* Items/Productos */}
        {metadata.items && Array.isArray(metadata.items) && metadata.items.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <Package size={16} />
              Productos ({metadata.items.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metadata.items.map((item, index) => (
                <div key={index} className="bg-white rounded p-3 border border-amber-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.concept || item.description || 'Sin descripción'}</p>
                      <p className="text-xs text-slate-600">
                        {item.quantity} {item.unit} × {metadata.currency === 'USD' ? 'US$' : '$'}{parseFloat(item.unit_price || 0).toFixed(2)}
                        {item.tax_rate > 0 && ` (IVA ${item.tax_rate}%)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {metadata.currency === 'USD' ? 'US$' : '$'}{parseFloat(item.total || ((item.quantity || 0) * (item.unit_price || 0) * (1 + (item.tax_rate || 22) / 100))).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totales */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <DollarSign size={16} />
            Totales
          </h4>
          <div className="space-y-2">
            {renderField('Subtotal', metadata.subtotal ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.subtotal).toFixed(2)}` : null)}
            {renderField('IVA', (metadata.iva_amount || metadata.tax_amount) ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.iva_amount || metadata.tax_amount).toFixed(2)}` : null)}
            {renderField('Total', (metadata.total_amount || metadata.amount) ? `${metadata.currency === 'USD' ? 'US$' : '$'}${parseFloat(metadata.total_amount || metadata.amount).toFixed(2)}` : null)}
          </div>
        </div>

        {/* Notas */}
        {metadata.notes && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Notas</h4>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{metadata.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSpecificDetails = () => {
    const metadata = originalData.metadata || {};

    if (Object.keys(metadata).length === 0) {
      return (
        <div className="text-slate-500 italic">
          Sin detalles adicionales disponibles.
        </div>
      );
    }

    // Si es una orden de compra, mostrar detalles especiales
    if (originalData.tipo === 'orden_compra' || type === 'Orden Compra') {
      return renderPurchaseOrderDetails(metadata);
    }

    // Si es una factura de compra, mostrar detalles especiales
    if (originalData.tipo === 'factura_creada' || type === 'Gasto' || (metadata.invoice_series && metadata.invoice_number)) {
      return renderExpenseDetails(metadata);
    }

    // Para otros tipos, mostrar metadata genérico
    return (
      <div className="space-y-3">
        {Object.entries(metadata).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null;
          if (key === 'items' && Array.isArray(value)) {
            return (
              <div key={key} className="mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Productos ({value.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {value.map((item, index) => (
                    <div key={index} className="bg-slate-50 rounded p-2 text-sm">
                      {typeof item === 'object' ? (
                        <div>
                          {(item.description || item.concept) && <p className="font-medium">{item.description || item.concept}</p>}
                          {item.quantity && <p className="text-xs text-slate-600">{item.quantity} {item.unit || ''}</p>}
                          {item.unit_price && <p className="text-xs text-slate-600">Precio: ${parseFloat(item.unit_price).toFixed(2)}</p>}
                        </div>
                      ) : (
                        <p>{String(item)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          // Traducir nombres de campos comunes al español
          const fieldLabels = {
            'amount': 'Monto',
            'provider': 'Proveedor',
            'invoice_full': 'Factura Completa',
            'invoice_series': 'Serie',
            'invoice_number': 'Número',
            'invoice_date': 'Fecha',
            'provider_name': 'Proveedor',
            'provider_rut': 'RUT',
            'provider_email': 'Email',
            'provider_phone': 'Teléfono',
            'provider_address': 'Dirección',
            'category': 'Categoría',
            'concept': 'Concepto',
            'currency': 'Moneda',
            'status': 'Estado',
            'payment_terms': 'Condiciones de Pago',
            'due_date': 'Fecha Vencimiento',
            'notes': 'Notas',
            'subtotal': 'Subtotal',
            'iva_amount': 'IVA',
            'tax_amount': 'IVA',
            'total_amount': 'Total',
            'items_count': 'Cantidad de Productos'
          };
          const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return (
            <div key={key} className="mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                {label}
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