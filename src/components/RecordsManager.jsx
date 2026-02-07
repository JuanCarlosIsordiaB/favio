import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import RecordDetailModal from './RecordDetailModal';
import {
  FileText,
  Calendar,
  Search,
  Activity,
  Droplets,
  Sprout,
  Tractor,
  ClipboardList,
  DollarSign,
  Package,
  Building2,
  MapPin,
  Map,
  Eye
} from 'lucide-react';

// Función para traducir módulos técnicos a nombres amigables en español
const translateModule = (modulo) => {
  if (!modulo) return '-';
  
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

const colorClasses = {
  red: 'bg-red-100 text-red-600 border-red-200 bg-red-50 text-red-700',
  green: 'bg-green-100 text-green-600 border-green-200 bg-green-50 text-green-700',
  blue: 'bg-blue-100 text-blue-600 border-blue-200 bg-blue-50 text-blue-700',
  amber: 'bg-amber-100 text-amber-600 border-amber-200 bg-amber-50 text-amber-700',
  orange: 'bg-orange-100 text-orange-600 border-orange-200 bg-orange-50 text-orange-700',
  cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200 bg-cyan-50 text-cyan-700',
  emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200 bg-emerald-50 text-emerald-700',
  lime: 'bg-lime-100 text-lime-600 border-lime-200 bg-lime-50 text-lime-700',
  brown: 'bg-stone-100 text-stone-600 border-stone-200 bg-stone-50 text-stone-700',
  yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200 bg-yellow-50 text-yellow-700',
  purple: 'bg-purple-100 text-purple-600 border-purple-200 bg-purple-50 text-purple-700',
  pink: 'bg-pink-100 text-pink-600 border-pink-200 bg-pink-50 text-pink-700',
};

export default function RecordsManager({ firmId, premiseId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (firmId) {
      fetchAllRecords();
    }
  }, [firmId, premiseId]);

  async function fetchAllRecords() {
    setLoading(true);
    try {
      let query = supabase
        .from('audit')
        .select('*')
        .eq('firm_id', firmId)
        .order('fecha', { ascending: false });

      if (premiseId) {
        query = query.or(`premise_id.eq.${premiseId},premise_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedRecords = (data || []).map(record => ({
        id: record.id,
        type: getTipoLabel(record.tipo),
        Icon: getTipoIcon(record.tipo),
        color: getTipoColor(record.tipo),
        date: record.fecha,
        title: record.descripcion.split(' - ')[0] || record.descripcion,
        details: record.descripcion,
        usuario: record.usuario,
        moduloOrigen: record.modulo_origen,
        firmId: record.firm_id,
        premiseId: record.premise_id,
        lotId: record.lot_id,
        metadata: record.metadata,
        originalData: record
      }));

      setRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Error al cargar registros');
    } finally {
      setLoading(false);
    }
  }

  function getTipoLabel(tipo) {
    const tipoMap = {
      'gasto': 'Gasto',
      'ingreso': 'Ingreso',
      'stock': 'Stock',
      'trabajo_agricola': 'Trabajo Agrícola',
      'trabajo_ganadero': 'Trabajo Ganadero',
      'lluvia': 'Lluvia',
      'monitoreo': 'Monitoreo',
      'firma_creada': 'Firma Creada',
      'firma_actualizada': 'Firma Actualizada',
      'firma_eliminada': 'Firma Eliminada',
      'predio_creado': 'Predio Creado',
      'predio_actualizado': 'Predio Actualizado',
      'predio_eliminado': 'Predio Eliminado',
      'lote_creado': 'Lote Creado',
      'lote_actualizado': 'Lote Actualizado',
      'lote_eliminado': 'Lote Eliminado',
      'orden_compra': 'Orden Compra',
      'remito': 'Remito',
      'orden_pago': 'Orden Pago',
      'proyeccion_agricola': 'Proyección Agrícola',
      'proyeccion_ganadera': 'Proyección Ganadera'
    };
    return tipoMap[tipo] || tipo;
  }

  function getTipoIcon(tipo) {
    if (tipo.includes('gasto')) return DollarSign;
    if (tipo.includes('ingreso')) return DollarSign;
    if (tipo.includes('stock')) return Package;
    if (tipo.includes('agricola')) return Tractor;
    if (tipo.includes('ganadero')) return Tractor;
    if (tipo.includes('lluvia')) return Droplets;
    if (tipo.includes('monitoreo')) return Activity;
    if (tipo.includes('firma')) return Building2;
    if (tipo.includes('predio')) return MapPin;
    if (tipo.includes('lote')) return Map;
    if (tipo.includes('orden')) return FileText;
    if (tipo.includes('remito')) return FileText;
    if (tipo.includes('proyeccion')) return Calendar;
    return FileText;
  }

  function getTipoColor(tipo) {
    if (tipo.includes('gasto')) return 'red';
    if (tipo.includes('ingreso')) return 'green';
    if (tipo.includes('stock')) return 'blue';
    if (tipo.includes('agricola')) return 'amber';
    if (tipo.includes('ganadero')) return 'orange';
    if (tipo.includes('lluvia')) return 'cyan';
    if (tipo.includes('monitoreo')) return 'emerald';
    if (tipo.includes('firma')) return 'purple';
    if (tipo.includes('predio')) return 'pink';
    if (tipo.includes('lote')) return 'lime';
    if (tipo.includes('orden') || tipo.includes('remito')) return 'yellow';
    if (tipo.includes('proyeccion')) return 'brown';
    return 'gray';
  }

  const filteredRecords = records.filter(record => {
    const matchesType = filterType === 'all' || record.type === filterType;

    // Búsqueda por: texto, fecha, referencia, lote, responsable, tipo (según spec)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      record.title.toLowerCase().includes(searchLower) ||
      record.details.toLowerCase().includes(searchLower) ||
      record.usuario.toLowerCase().includes(searchLower) ||
      record.type.toLowerCase().includes(searchLower) ||
      (record.date && new Date(record.date).toLocaleDateString().includes(searchLower)) ||
      (record.originalData?.referencia && record.originalData.referencia.toLowerCase().includes(searchLower)) ||
      (record.lotId && record.lotId.toLowerCase().includes(searchLower)) ||
      (record.originalData?.metadata && JSON.stringify(record.originalData.metadata).toLowerCase().includes(searchLower));

    return matchesType && matchesSearch;
  });

  return (
    <div className="py-6 px-16 max-w-8xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial de Registros</h2>
          <p className="text-slate-500">Movimientos y actividades de la firma</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por texto, fecha, referencia, lote, responsable o tipo..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-96"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="Gasto">Gastos</option>
            <option value="Ingreso">Ingresos</option>
            <option value="Stock">Stock</option>
            <option value="Trabajo Agrícola">Trabajos Agrícolas</option>
            <option value="Trabajo Ganadero">Trabajos Ganaderos</option>
            <option value="Lluvia">Lluvias</option>
            <option value="Monitoreo">Monitoreo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-500">Cargando historial...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-slate-400 mb-2" size={48} />
              <p className="text-slate-500">No se encontraron registros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Módulo Origen</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">Fecha/Hora</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.map((record) => {
                    const colors = colorClasses[record.color] || colorClasses.blue;
                    const [iconBg, iconText, badgeBorder, badgeBg, badgeText] = colors.split(' ');

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded ${iconBg} ${iconText}`}>
                              <record.Icon size={16} />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeBg} ${badgeText} border ${badgeBorder}`}>
                              {record.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{record.title}</p>
                            <p className="text-xs text-slate-500 truncate">{record.details}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-slate-600">{record.usuario}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-slate-600">{translateModule(record.moduloOrigen)}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <p className="text-sm font-medium text-slate-600">
                            {new Date(record.date).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(record);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver más detalles"
                          >
                            <Eye size={14} />
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {selectedRecord && (
        <RecordDetailModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}
    </div>
  );
}