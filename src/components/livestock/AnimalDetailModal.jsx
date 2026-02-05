import React, { useState, useEffect } from 'react';
import {
    X,
    Tags,
    History,
    TrendingUp,
    Scale,
    MapPin,
    Calendar,
    Activity,
    Baby,
    ArrowRightLeft,
    Loader2,
    Edit
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getAnimalEvents } from '../../services/livestock';

const EVENT_CONFIG = {
    'BIRTH': { icon: Baby, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Nacimiento' },
    'WEIGHING': { icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pesaje' },
    'MOVE_INTERNAL': { icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Traslado' },
    'HEALTH_TREATMENT': { icon: Activity, color: 'text-red-600', bg: 'bg-red-50', label: 'Sanidad' },
    'CATEGORY_CHANGE': { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Cambio Categoría' },
};

export default function AnimalDetailModal({ animal, open, onOpenChange, onEditClick }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adpv, setAdpv] = useState(null);

    useEffect(() => {
        if (open && animal?.id) {
            loadHistory();
        }
    }, [open, animal?.id]);

    async function loadHistory() {
        setLoading(true);
        try {
            const data = await getAnimalEvents(animal.id);
            setEvents(data || []);
            calcularADPV(data || []);
        } catch (error) {
            console.error('Error loading animal history:', error);
        } finally {
            setLoading(false);
        }
    }

    const calcularADPV = (history) => {
        const pesajes = history.filter(e => e.event_type === 'WEIGHING');
        if (pesajes.length < 2) {
            setAdpv(null);
            return;
        }

        const actual = pesajes[0];
        const anterior = pesajes[1];

        const kilosGanados = actual.qty_kg - anterior.qty_kg;
        const dias = (new Date(actual.event_date) - new Date(anterior.event_date)) / (1000 * 60 * 60 * 24);

        if (dias > 0) {
            setAdpv(kilosGanados / dias);
        }
    };

    if (!animal) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
                {/* Header Estilizado */}
                <div className="bg-slate-900 text-white p-8 rounded-t-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Tags size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg">
                                <Tags size={40} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter">
                                    {animal.visual_tag || 'S/N'}
                                </h2>
                                <p className="text-slate-400 font-mono text-sm tracking-widest">{animal.rfid_tag}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-1 rounded-full font-bold uppercase tracking-widest text-[10px]">
                                {animal.current_category?.name}
                            </Badge>
                            {onEditClick && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onOpenChange(false);
                                        onEditClick();
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 gap-1"
                                >
                                    <Edit size={16} />
                                    Editar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Resumen Biológico y KPIs */}
                        <div className="md:col-span-1 space-y-6">
                            {adpv !== null && (
                                <Card className="bg-emerald-50 border-emerald-100 shadow-none overflow-hidden">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mb-1">Aumento Diario (ADPV)</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-black text-emerald-700">+{adpv.toFixed(2)}</p>
                                            <p className="text-sm font-bold text-emerald-600 mb-1">kg / día</p>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                                            <TrendingUp size={12} />
                                            Tendencia positiva
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Información del Animal</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Biología</p>
                                        <p className="text-sm font-bold text-slate-700">{animal.species} • {animal.breed || 'N/A'}</p>
                                        <p className="text-xs text-slate-500">{animal.sex === 'M' ? 'Macho' : 'Hembra'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Nacimiento</p>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mt-1">
                                            <Calendar size={14} className="text-slate-400" />
                                            {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Ubicación</p>
                                        <p className="text-sm font-bold text-emerald-600 flex items-center gap-2 mt-1">
                                            <MapPin size={14} className="text-emerald-500" />
                                            {animal.lot?.name || 'No asignado'}
                                        </p>
                                    </div>
                                    {animal.initial_weight && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Peso Ingreso</p>
                                            <p className="text-sm font-bold text-slate-700">{animal.initial_weight} kg</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Historial / Timeline */}
                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <History size={16} /> Línea de Tiempo del Animal
                            </h3>

                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="animate-spin text-emerald-600" />
                                </div>
                            ) : events.length > 0 ? (
                                <div className="space-y-4 relative before:absolute before:inset-0 before:left-[19px] before:w-0.5 before:bg-slate-100">
                                    {events.map((event) => {
                                        const config = EVENT_CONFIG[event.event_type] || { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Evento' };
                                        const Icon = config.icon;

                                        return (
                                            <div key={event.id} className="relative pl-12">
                                                <div className={`absolute left-0 p-2 rounded-full border-2 border-white shadow-sm z-10 ${config.bg}`}>
                                                    <Icon className={config.color} size={14} />
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-xs font-bold text-slate-900">{config.label}</p>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(event.event_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1">
                                                        {event.event_type === 'WEIGHING' && (
                                                            <p className="text-sm font-bold text-emerald-600">{event.qty_kg} kg</p>
                                                        )}
                                                        {event.event_type === 'MOVE_INTERNAL' && (
                                                            <p className="text-xs text-slate-600">Traslado al lote <span className="font-bold">{event.to_lote?.name}</span></p>
                                                        )}
                                                        {event.event_type === 'CATEGORY_CHANGE' && (
                                                            <p className="text-xs text-slate-600">Cambio a <span className="font-bold">{event.category_to?.name}</span></p>
                                                        )}
                                                        {event.notes && <p className="text-xs text-slate-400 italic mt-1 leading-relaxed">"{event.notes}"</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-xs">
                                    No hay registros históricos para este animal.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}