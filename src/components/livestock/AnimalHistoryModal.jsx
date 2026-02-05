import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText, Calendar, User, Tag, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

const EVENT_LABELS = {
    'MOVE_INTERNAL': 'Traslado Interno',
    'MOVE_EXTERNAL_IN': 'Ingreso Externo',
    'MOVE_EXTERNAL_OUT': 'Egreso Externo',
    'WEIGHING': 'Pesaje',
    'HEALTH_TREATMENT': 'Tratamiento Sanitario',
    'BIRTH': 'Nacimiento',
    'DEATH': 'Mortandad',
    'CATEGORY_CHANGE': 'Cambio de Categoría',
    'PURCHASE': 'Compra',
    'SALE': 'Venta',
    'CONSUMPTION': 'Consumo',
    'LOST_WITH_HIDE': 'Perdido con Cuero',
    'FAENA': 'Faena',
    'CONSIGNACION_IN': 'Consignación Ingreso',
    'CONSIGNACION_OUT': 'Consignación Egreso',
    'REMATE_IN': 'Remate Ingreso',
    'REMATE_OUT': 'Remate Egreso'
};

const EVENT_COLORS = {
    'MOVE_INTERNAL': 'text-blue-600',
    'MOVE_EXTERNAL_IN': 'text-indigo-600',
    'MOVE_EXTERNAL_OUT': 'text-violet-600',
    'WEIGHING': 'text-amber-600',
    'HEALTH_TREATMENT': 'text-red-600',
    'BIRTH': 'text-emerald-600',
    'DEATH': 'text-slate-600',
    'CATEGORY_CHANGE': 'text-purple-600',
    'PURCHASE': 'text-blue-600',
    'SALE': 'text-green-600',
    'CONSUMPTION': 'text-orange-600',
    'LOST_WITH_HIDE': 'text-yellow-600',
    'FAENA': 'text-red-600',
    'CONSIGNACION_IN': 'text-cyan-600',
    'CONSIGNACION_OUT': 'text-teal-600',
    'REMATE_IN': 'text-lime-600',
    'REMATE_OUT': 'text-amber-600'
};

export default function AnimalHistoryModal({ animal, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (animal?.id) loadHistory();
    }, [animal?.id]);

    async function loadHistory() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('herd_events')
                .select(`
                    *,
                    approved_user:approved_by(email)
                `)
                .eq('animal_id', animal.id)
                .order('event_date', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('Error al cargar historial');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <FileText className="text-emerald-600" size={28} />
                            Historial del Animal
                        </h2>
                        <div className="flex gap-4 mt-2 text-sm">
                            <p className="text-slate-600">
                                <span className="font-bold">Caravana:</span> {animal?.visual_tag || 'S/N'}
                            </p>
                            <p className="text-slate-600">
                                <span className="font-bold">RFID:</span>
                                <span className="font-mono ml-1">{animal?.rfid_tag || '-'}</span>
                            </p>
                            <Badge variant="outline">{animal?.species}</Badge>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <p className="font-medium">Sin eventos registrados</p>
                        </div>
                    ) : (
                        <div className="relative space-y-4">
                            {/* Línea vertical timeline */}
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                            {history.map((event, index) => {
                                const isFirst = index === 0;

                                return (
                                    <Card
                                        key={event.id}
                                        className={`
                                            relative ml-16 border-2 transition-all
                                            ${event.status === 'APPROVED' ? 'border-emerald-200' :
                                              event.status === 'REJECTED' ? 'border-red-200' :
                                              'border-amber-200'}
                                            ${isFirst ? 'border-emerald-400 shadow-lg' : ''}
                                        `}
                                    >
                                        {/* Círculo en timeline */}
                                        <div
                                            className={`
                                                absolute -left-20 top-6 w-8 h-8 rounded-full border-4
                                                flex items-center justify-center bg-white
                                                ${event.status === 'APPROVED' ? 'border-emerald-500' :
                                                  event.status === 'REJECTED' ? 'border-red-500' :
                                                  'border-amber-500'}
                                            `}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${EVENT_COLORS[event.event_type]}`}></div>
                                        </div>

                                        <CardContent className="p-4">
                                            {/* Header del evento */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                        {EVENT_LABELS[event.event_type] || event.event_type}
                                                        {isFirst && (
                                                            <Badge className="bg-emerald-600 text-white border-none text-xs">
                                                                Más reciente
                                                            </Badge>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {new Date(event.event_date).toLocaleDateString('es-UY')}
                                                        </span>
                                                        {event.approved_user?.email && (
                                                            <span className="flex items-center gap-1">
                                                                <User size={14} />
                                                                {event.approved_user.email.split('@')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        event.status === 'APPROVED' ? 'default' :
                                                        event.status === 'REJECTED' ? 'destructive' :
                                                        'secondary'
                                                    }
                                                >
                                                    {event.status === 'APPROVED' ? '✅ Aprobado' :
                                                     event.status === 'REJECTED' ? '❌ Rechazado' :
                                                     '⏳ Pendiente'}
                                                </Badge>
                                            </div>

                                            {/* Detalles específicos del evento */}
                                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                                {/* Pesaje */}
                                                {event.event_type === 'WEIGHING' && event.qty_kg && (
                                                    <div className="col-span-2">
                                                        <p className="text-slate-500">Peso registrado:</p>
                                                        <p className="font-bold text-emerald-600 text-xl">
                                                            {event.qty_kg} kg
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Guía DICOSE */}
                                                {event.guide_series && event.guide_number && (
                                                    <div>
                                                        <p className="text-slate-500">Guía DICOSE:</p>
                                                        <p className="font-mono font-bold text-blue-600">
                                                            {event.guide_series}-{event.guide_number}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Cantidad */}
                                                {event.qty_heads && event.qty_heads > 1 && (
                                                    <div>
                                                        <p className="text-slate-500">Cantidad:</p>
                                                        <p className="font-bold">{event.qty_heads} cabezas</p>
                                                    </div>
                                                )}

                                                {/* Categoría de evento */}
                                                {event.scope === 'HERD' && (
                                                    <div>
                                                        <p className="text-slate-500">Alcance:</p>
                                                        <p className="font-bold text-purple-600">Rodeo</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Notas */}
                                            {event.notes && (
                                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Notas</p>
                                                    <p className="text-sm text-slate-700 italic">"{event.notes}"</p>
                                                </div>
                                            )}

                                            {/* Status badge if event type affects DICOSE */}
                                            {['PURCHASE', 'SALE', 'DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA',
                                              'MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT', 'CONSIGNACION_IN', 'CONSIGNACION_OUT',
                                              'REMATE_IN', 'REMATE_OUT', 'BIRTH', 'CATEGORY_CHANGE'].includes(event.event_type) && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                        <Tag size={12} className="mr-1" />
                                                        Afecta DICOSE
                                                    </Badge>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200">
                    <Button onClick={onClose} className="w-full bg-slate-600 hover:bg-slate-700">
                        Cerrar Historial
                    </Button>
                </div>
            </div>
        </div>
    );
}
