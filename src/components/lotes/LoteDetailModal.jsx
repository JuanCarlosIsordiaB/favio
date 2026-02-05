import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertCircle,
    Calendar,
    TrendingUp,
    History,
    Sprout,
    Hammer,
    Trash2,
    Edit2,
    Cloud,
    Maximize2,
    FileText,
    Download,
    Beef,
    Mic,
    Play,
    Fuel,
    AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { obtenerHistorialNDVI } from '@/services/ndviStatistics';
import { MiniAudioPlayer } from '../ui/MiniAudioPlayer';
import '@/lib/leafletConfig';

/**
 * Helper para centrar mapa en el lote
 */
function FitBoundsDetail({ lote }) {
    const map = useMap();
    useEffect(() => {
        if (!lote) return;

        try {
            let positions = [];
            // Manejar formato de array simple o GeoJSON
            if (Array.isArray(lote.polygon_data)) {
                positions = lote.polygon_data;
            } else if (lote.polygon_data?.coordinates?.[0]) {
                positions = lote.polygon_data.coordinates[0].map(c => [c[1], c[0]]);
            } else if (typeof lote.polygon_data === 'string') {
                const parsed = JSON.parse(lote.polygon_data);
                positions = Array.isArray(parsed) ? parsed : (parsed.coordinates?.[0]?.map(c => [c[1], c[0]]) || []);
            }

            if (positions.length >= 2) {
                setTimeout(() => {
                    map.invalidateSize();
                    map.fitBounds(positions, { padding: [40, 40], maxZoom: 16 });
                }, 300);
            }
        } catch (err) {
            console.warn('Error en FitBoundsDetail:', err);
        }
    }, [lote?.id, map]);
    return null;
}

export function LoteDetailModal({
    lote,
    predio,
    open,
    onOpenChange,
    onEdit = () => { },
    onDelete = () => { },
}) {
    const [activeTab, setActiveTab] = useState('details');
    const [historyNDVI, setHistoryNDVI] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [works, setWorks] = useState([]);
    const [livestockWorks, setLivestockWorks] = useState([]);
    const [finances, setFinances] = useState({ expenses: [], income: [] });
    const [animalCount, setAnimalCount] = useState(0);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (open && lote?.id) {
            loadAllHistory();
            fetchCurrentAnimalCount();
        }
    }, [open, lote?.id]);

    async function fetchCurrentAnimalCount() {
        // ... (rest of function remains same)
        // Sincronización real con tabla animals
        const { count } = await supabase
            .from('animals')
            .select('*', { count: 'exact', head: true })
            .eq('current_lot_id', lote.id)
            .eq('status', 'ACTIVE');
        setAnimalCount(count || 0);
    }

    async function loadAllHistory() {
        // ... (rest of loadAllHistory remains same)
        setLoadingHistory(true);
        try {
            const ndviData = await obtenerHistorialNDVI(lote.id, supabase);
            setHistoryNDVI(ndviData.map(d => ({
                fecha: new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                ndvi: parseFloat(d.mean_ndvi),
                nubes: d.cloud_coverage_percent,
                originalDate: d.date
            })));

            // 2. Audit Logs
            const { data: audits } = await supabase
                .from('audit')
                .select('*')
                .eq('lot_id', lote.id)
                .order('fecha', { ascending: false });
            setAuditLogs(audits || []);

            // 3. Trabajos Agrícolas
            const { data: agriWorks } = await supabase
                .from('agricultural_works')
                .select('*')
                .eq('lot_id', lote.id)
                .order('date', { ascending: false });
            setWorks(agriWorks || []);

            // 4. Trabajos Ganaderos (NUEVO)
            const { data: lWorks } = await supabase
                .from('livestock_works')
                .select('*')
                .eq('lot_id', lote.id)
                .order('date', { ascending: false });
            setLivestockWorks(lWorks || []);

            // 5. Finanzas (NUEVO)
            const [expRes, incRes] = await Promise.all([
                supabase.from('expenses').select('*').eq('lot_id', lote.id),
                supabase.from('income').select('*').eq('lot_id', lote.id)
            ]);
            setFinances({
                expenses: expRes.data || [],
                income: incRes.data || []
            });

        } catch (error) {
            console.error('Error cargando historial del lote:', error);
        } finally {
            setLoadingHistory(false);
        }
    }

    // Helper para obtener posiciones del polígono de forma segura
    const getPolyPositions = () => {
        if (!lote?.polygon_data) return [];
        try {
            if (Array.isArray(lote.polygon_data)) return lote.polygon_data;
            if (lote.polygon_data?.coordinates?.[0]) return lote.polygon_data.coordinates[0].map(c => [c[1], c[0]]);
            if (typeof lote.polygon_data === 'string') {
                const parsed = JSON.parse(lote.polygon_data);
                return Array.isArray(parsed) ? parsed : (parsed.coordinates?.[0]?.map(c => [c[1], c[0]]) || []);
            }
        } catch (e) {
            return [];
        }
        return [];
    };

    if (!lote) return null;

    // Cálculos dinámicos (AHORA SEGUROS PORQUE LOTE YA NO ES NULL)
    const totalFuel = works.reduce((sum, w) => sum + (parseFloat(w.fuel_used) || 0), 0);
    const disponibilidad = lote.pasture_height && lote.remnant_height ? (lote.pasture_height - lote.remnant_height) * 250 : 0;
    const ispcValue = animalCount > 0 && disponibilidad > 0 ? (animalCount / (disponibilidad / 1000)).toFixed(2) : 0;
    const isIspcCritical = ispcValue > 1.2;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col bg-slate-50/95 backdrop-blur-md border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="bg-white p-6 border-b shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sprout className="text-emerald-600 w-6 h-6" />
                                <DialogTitle className="text-2xl font-bold text-slate-900">{lote.name}</DialogTitle>
                            </div>
                            <DialogDescription className="text-slate-500">
                                {predio?.name} • {lote.area_hectares} ha • {lote.land_use || 'Sin uso definido'}
                            </DialogDescription>
                        </div>
                        {/* <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(lote)} className="gap-2 border-slate-200 hover:bg-slate-50">
                                <Edit2 size={14} /> Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(lote)} className="gap-2">
                                <Trash2 size={14} /> Eliminar
                            </Button>
                        </div> */}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                        <TabsList className="grid grid-cols-3 mb-6 bg-slate-200/50 p-1 rounded-xl shrink-0">
                            <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Maximize2 size={14} className="mr-2" /> Vista General
                            </TabsTrigger>
                            <TabsTrigger value="satellite" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <TrendingUp size={14} className="mr-2" /> Vigor (NDVI)
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <History size={14} className="mr-2" /> Actividad
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {/* TAB 1: VISTA GENERAL */}
                            <TabsContent value="details" className="mt-0 space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Mapa */}
                                    <Card className="overflow-hidden border-slate-200 shadow-sm h-[400px] rounded-xl shrink-0">
                                        <MapContainer
                                            center={[-32.5, -55.7]}
                                            zoom={13}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                            {lote.polygon_data && (
                                                <Polygon
                                                    positions={getPolyPositions()}
                                                    pathOptions={{ color: '#fb923c', fillColor: '#fb923c', fillOpacity: 0.2, weight: 3 }}
                                                />
                                            )}
                                            <FitBoundsDetail lote={lote} />
                                        </MapContainer>
                                    </Card>

                                    {/* Info Cards */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-xs text-slate-500 uppercase font-bold tracking-wider">Estado Actual</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-lg font-bold text-slate-800">{lote.current_crop || 'Suelo Desnudo'}</p>
                                                    <p className="text-xs text-slate-400">Siembra: {lote.planting_date ? new Date(lote.planting_date).toLocaleDateString() : 'N/A'}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-xs text-slate-500 uppercase font-bold tracking-wider">Vigor Satelital</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex items-center gap-2">
                                                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                                                    <p className="text-2xl font-bold text-slate-800">{lote.ndvi_valor?.toFixed(2) || 'N/A'}</p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                                            <CardHeader>
                                                <CardTitle className="text-sm font-semibold">Manejo de Pasturas e Índices</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Altura Promedio</p>
                                                        <p className="text-lg font-bold text-blue-700">{lote.pasture_height || 0} cm</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Remanente Obj.</p>
                                                        <p className="text-lg font-bold text-amber-700">{lote.remnant_height || 0} cm</p>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Días de Descanso</p>
                                                        <p className="text-lg font-bold text-slate-700">
                                                            {lote.pasture_height_date ? (
                                                                Math.floor((new Date() - new Date(lote.pasture_height_date)) / (1000 * 60 * 60 * 24))
                                                            ) : '0'} días
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-emerald-600 uppercase font-bold">Disp. Forrajera</p>
                                                        <p className="text-lg font-bold text-emerald-700">
                                                            {lote.pasture_height && lote.remnant_height ? (
                                                                ((lote.pasture_height - lote.remnant_height) * 250).toLocaleString()
                                                            ) : '0'}
                                                            <span className="text-xs ml-1 font-medium">kg MS/ha</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* IsPC y Carga (NUEVO) */}
                                                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 bg-slate-50/50 p-2 rounded-lg">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Carga Actual</p>
                                                        <p className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                                            <Beef size={16} className="text-slate-400" /> {animalCount} <span className="text-[10px] font-medium">Cab.</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-blue-600 uppercase font-bold">Índice IsPC</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-lg font-black ${isIspcCritical ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>
                                                                {ispcValue}
                                                            </p>
                                                            {isIspcCritical && (
                                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[8px] uppercase">
                                                                    Sobrepastoreo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Consumo Combustible</p>
                                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                            <Fuel size={14} className="text-slate-400" /> {works.reduce((sum, w) => sum + (parseFloat(w.fuel_used) || 0), 0)} <span className="text-[10px]">Ltrs.</span>
                                                        </p>
                                                    </div>
                                                    {lote.audio_note_url && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Nota de Voz</p>
                                                            <MiniAudioPlayer url={lote.audio_note_url} readOnly />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-slate-400 mb-1 italic">Notas de manejo:</p>
                                                        <p className="text-sm text-slate-700 leading-relaxed">{lote.notes || lote.notas || 'Sin observaciones.'}</p>
                                                    </div>

                                                    {/* Botón PUMRS - Ver/Descargar */}
                                                    {lote.pumrs_url && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="ml-4 gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                            onClick={() => window.open(lote.pumrs_url, '_blank')}
                                                        >
                                                            <FileText size={14} /> Ver PUMRS
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: EVOLUCIÓN NDVI */}
                            <TabsContent value="satellite" className="mt-0 space-y-4 animate-in fade-in duration-300">
                                <Card className="bg-white border-slate-200 p-6 shadow-sm rounded-xl">
                                    <CardHeader className="px-0 pt-0">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg font-bold text-slate-800">Tendencia de Salud Vegetal</CardTitle>
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Datos Sentinel-2</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-0 h-[450px]">
                                        {historyNDVI.length > 0 ? (
                                            activeTab === 'satellite' && (
                                                <div style={{ width: '100%', height: '400px' }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                        <AreaChart data={historyNDVI}>
                                                            <defs>
                                                                <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                            <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                            <ChartTooltip
                                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                                formatter={(value) => [value.toFixed(3), 'NDVI']}
                                                            />
                                                            <Area type="monotone" dataKey="ndvi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNdvi)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                <Cloud size={48} className="mb-2 opacity-20" />
                                                <p className="font-medium">No hay datos históricos para este lote aún.</p>
                                                <p className="text-xs">El procesamiento satelital es automático.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB 3: HISTORIAL ACTIVIDADES */}
                            <TabsContent value="history" className="mt-0 space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                    {/* Trabajos Agrícolas y Ganaderos */}
                                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                                        <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-50">
                                            <Hammer className="w-4 h-4 text-slate-500" />
                                            <CardTitle className="text-sm font-semibold">Operativa de Campo</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            {[...works, ...livestockWorks]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map((work, idx) => (
                                                    <div key={idx} className="flex gap-3 border-l-2 border-slate-100 pl-4 relative">
                                                        <div className="absolute w-2 h-2 rounded-full bg-emerald-500 -left-[5px] top-1.5" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-slate-800">{work.work_type || 'Tratamiento Ganadero'}</p>
                                                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                                                                    {work.work_type ? 'Agrícola' : 'Ganadero'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-500">{new Date(work.date).toLocaleDateString()}</p>
                                                            <p className="text-xs text-slate-600 mt-1">{work.detail || work.treatment_name || work.herd_name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            {works.length === 0 && livestockWorks.length === 0 && (
                                                <p className="text-sm text-slate-400 text-center py-8 font-medium">No hay tareas registradas.</p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Resumen Económico Imputado */}
                                    <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                                        <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-50">
                                            <TrendingUp className="w-4 h-4 text-slate-500" />
                                            <CardTitle className="text-sm font-semibold">Resumen Económico (Lote)</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <p className="text-[9px] font-bold text-red-600 uppercase">Gastos Imputados</p>
                                                    <p className="text-lg font-black text-red-700">
                                                        ${finances.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <p className="text-[9px] font-bold text-green-600 uppercase">Ingresos Vinculados</p>
                                                    <p className="text-lg font-black text-green-700">
                                                        ${finances.income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Últimos Movimientos</p>
                                                {[...finances.expenses, ...finances.income]
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                    .slice(0, 5)
                                                    .map((f, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
                                                            <span className="text-slate-600 truncate max-w-[300px]">{f.description || f.category}</span>
                                                            <span className={f.amount > 0 && finances.income.includes(f) ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                                {finances.income.includes(f) ? '+' : '-'}${Math.abs(parseFloat(f.amount)).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
