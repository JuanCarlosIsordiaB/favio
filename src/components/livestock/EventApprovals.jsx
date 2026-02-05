import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    ArrowRightLeft,
    Scale,
    Skull,
    Baby,
    TrendingUp,
    ShoppingCart,
    Loader2,
    Info,
    Calendar,
    Activity,
    Utensils,
    AlertTriangle,
    Truck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { getPendingEvents, updateEventStatus, validateGuide, findMirrorSalePurchaseEvent } from '../../services/livestock';
import { useAuth } from '../../contexts/AuthContext';

const EVENT_ICONS = {
    'MOVE_INTERNAL': { icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Traslado' },
    'WEIGHING': { icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pesaje' },
    'HEALTH_TREATMENT': { icon: Activity, color: 'text-red-600', bg: 'bg-red-50', label: 'Sanidad' },
    'BIRTH': { icon: Baby, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Nacimiento' },
    'DEATH': { icon: Skull, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Muerte' },
    'CATEGORY_CHANGE': { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Categoría' },
    'PURCHASE': { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Compra' },
    'SALE': { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50', label: 'Venta' },
    'CONSUMPTION': { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Consumo' },
    'LOST_WITH_HIDE': { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Perdido' },
    'FAENA': { icon: Truck, color: 'text-red-600', bg: 'bg-red-50', label: 'Faena' },
};

export default function EventApprovals({ premiseId, onAction }) {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (premiseId) loadEvents();
    }, [premiseId]);

    async function loadEvents() {
        setLoading(true);
        try {
            const data = await getPendingEvents(premiseId);
            setEvents(data || []);
        } catch (error) {
            console.error('Error loading pending events:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async (eventId, status) => {
        try {
            // Si se rechaza, no validar, solo rechazar
            if (status === 'REJECTED') {
                await updateEventStatus(eventId, status, user?.id);
                toast.success('Evento rechazado');
                loadEvents();
                if (onAction) onAction();
                return;
            }

            // Obtener evento para validaciones
            const event = events.find(e => e.id === eventId);
            if (!event) {
                toast.error('Evento no encontrado');
                return;
            }

            // =====================================================
            // VALIDACIÓN 1: Plazo 30 días para mortandad/consumo/perdidos/faena
            // Decreto 289/74 Uruguay
            // =====================================================
            if (['DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA'].includes(event.event_type)) {
                const eventDate = new Date(event.event_date);
                const today = new Date();
                const daysDiff = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));

                if (daysDiff > 30) {
                    toast.error(
                        `🚫 BLOQUEO LEGAL DICOSE: No se puede aprobar "${event.event_type}" con ${daysDiff} días de retraso. ` +
                        `Plazo máximo: 30 días según Decreto 289/74.`
                    );
                    return;
                }

                if (daysDiff > 25) {
                    toast.warning(
                        `⚠️ ADVERTENCIA: Evento con ${daysDiff} días. Quedan ${30 - daysDiff} días para cumplir plazo DICOSE.`
                    );
                }
            }

            // =====================================================
            // VALIDACIÓN 1B: Regla 30/06 para nacimientos
            // Uruguay DICOSE: Nacimientos post 30/06 requieren validación especial
            // =====================================================
            if (event.event_type === 'BIRTH') {
                const birthDate = new Date(event.event_date);
                const birthYear = birthDate.getFullYear();
                const birthMonth = birthDate.getMonth() + 1; // 0-indexed
                const birthDay = birthDate.getDate();

                // Determinar si está después del 30/06
                const isAfterJune30 = birthMonth > 6 || (birthMonth === 6 && birthDay > 30);

                if (isAfterJune30) {
                    toast.info(
                        `ℹ️ REGLA 30/06: Nacimiento registrado después del 30/06. ` +
                        `Animal será clasificado en campaña ${birthYear + 1} según normas DICOSE.`,
                        { duration: 4000 }
                    );
                }
            }

            // =====================================================
            // VALIDACIÓN 2: Guía obligatoria y validaciones avanzadas
            // =====================================================
            const externalEventTypes = [
                'PURCHASE', 'SALE',
                'MOVE_EXTERNAL_OUT', 'MOVE_EXTERNAL_IN',
                'CONSIGNACION_OUT', 'CONSIGNACION_IN',
                'REMATE_OUT', 'REMATE_IN'
            ];

            if (externalEventTypes.includes(event.event_type)) {
                // Validación básica: campos obligatorios
                if (!event.guide_series || !event.guide_number) {
                    toast.error(
                        '🚫 BLOQUEO LEGAL: Movimientos externos requieren ' +
                        'Serie y Número de Guía DICOSE obligatoriamente.'
                    );
                    return;
                }

                // ✅ NUEVA: Validación avanzada de guía
                const guideValidation = await validateGuide(
                    event.guide_series,
                    event.guide_number,
                    event.event_type,
                    event.species || 'BOVINO',
                    event.premise_id
                );

                if (!guideValidation.valid) {
                    toast.error(`🚫 GUÍA INVÁLIDA: ${guideValidation.error}`);
                    return;
                }

                // Si guía no existe, mostrar advertencia informativa
                if (guideValidation.autoRegister) {
                    toast.info(
                        `ℹ️ Guía ${event.guide_series}-${event.guide_number} se registrará automáticamente ` +
                        `al aprobar el evento.`,
                        { duration: 4000 }
                    );
                }
            }

            // =====================================================
            // VALIDACIÓN 3: Categoría válida (para eventos de animal)
            // =====================================================
            if (event.scope === 'ANIMAL' && event.animal) {
                if (!event.animal?.current_category_id) {
                    toast.error(
                        '🚫 BLOQUEO: El animal no tiene categoría asignada. ' +
                        'Asigne una categoría antes de aprobar.'
                    );
                    return;
                }
            }

            // =====================================================
            // VALIDACIÓN 4: Cantidad debe ser positiva
            // =====================================================
            if (event.qty_heads && event.qty_heads <= 0) {
                toast.error('🚫 BLOQUEO: La cantidad debe ser mayor a 0');
                return;
            }

            // =====================================================
            // VALIDACIÓN 5: Species debe estar poblado (DICOSE)
            // =====================================================
            if (!event.species) {
                toast.error(
                    '🚫 BLOQUEO DICOSE: El evento no tiene especie asignada. ' +
                    'Necesaria para clasificar en Planilla A (Bovino) o B (Ovino).'
                );
                return;
            }

            // =====================================================
            // VALIDACIÓN 6: Eventos DICOSE requieren qty_heads
            // =====================================================
            const dicoseEventTypes = [
                'PURCHASE', 'SALE', 'DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA',
                'MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT',
                'CONSIGNACION_IN', 'CONSIGNACION_OUT',
                'REMATE_IN', 'REMATE_OUT', 'BIRTH', 'CATEGORY_CHANGE'
            ];

            if (dicoseEventTypes.includes(event.event_type)) {
                if (!event.qty_heads || event.qty_heads <= 0) {
                    toast.error(
                        `🚫 BLOQUEO DICOSE: "${event.event_type}" requiere cantidad válida (> 0). ` +
                        `Necesaria para generar entrada en Contralor Interno.`
                    );
                    return;
                }
            }

            // =====================================================
            // VALIDACIÓN 7: CATEGORY_CHANGE debe tener entradas = salidas
            // =====================================================
            if (event.event_type === 'CATEGORY_CHANGE') {
                if (!event.category_from_id || !event.category_to_id) {
                    toast.error(
                        '🚫 BLOQUEO: Cambio de categoría requiere categoría anterior Y nueva.'
                    );
                    return;
                }
                if (event.category_from_id === event.category_to_id) {
                    toast.error(
                        '🚫 BLOQUEO: Las categorías deben ser diferentes.'
                    );
                    return;
                }
            }

            // =====================================================
            // VALIDACIÓN 8: Verificar que planilla DICOSE está OPEN
            // =====================================================
            if (dicoseEventTypes.includes(event.event_type)) {
                const { data: sheet } = await supabase
                    .from('contralor_sheets')
                    .select('id, status')
                    .eq('premise_id', event.premise_id)
                    .eq('sheet_type', event.species === 'BOVINO' ? 'A' : 'B')
                    .eq('status', 'OPEN')
                    .maybeSingle();

                if (!sheet) {
                    toast.error(
                        `🚫 BLOQUEO DICOSE: No existe Planilla ${event.species === 'BOVINO' ? 'Tipo A' : 'Tipo B'} ABIERTA ` +
                        `para este predio. Crear planilla en DICOSE primero.`
                    );
                    return;
                }
            }

            // =====================================================
            // MAPEO AUTOMÁTICO: Búsqueda de evento complementario VENTA ↔ COMPRA
            // Decreto 289/74: Sistema debe vincular automáticamente pares de transacciones
            // =====================================================
            if (['SALE', 'PURCHASE'].includes(event.event_type) && event.guide_series && event.guide_number) {
                try {
                    // Buscar evento complementario (SALE → PURCHASE, PURCHASE → SALE)
                    const mirrorEvent = await findMirrorSalePurchaseEvent(
                        event.event_type,
                        event.guide_series,
                        event.guide_number
                    );

                    if (mirrorEvent) {
                        // Se encontró evento complementario APROBADO - ya se vincularán automáticamente por trigger SQL
                        const complementaryType = event.event_type === 'SALE' ? 'Compra' : 'Venta';
                        const otherPremiseName = mirrorEvent.herd?.name ||
                                               mirrorEvent.animal?.visual_tag ||
                                               'Otro predio';

                        toast.info(
                            `🔗 VINCULACIÓN AUTOMÁTICA DICOSE: Se vinculará automáticamente con ${complementaryType} ` +
                            `(Guía ${event.guide_series}-${event.guide_number}) en ${otherPremiseName}. ` +
                            `Trazabilidad completa garantizada por trigger SQL.`,
                            { duration: 5000 }
                        );
                    } else {
                        // No se encontró evento complementario - informar que se espera uno
                        const expectedType = event.event_type === 'SALE' ? 'Compra' : 'Venta';

                        toast.info(
                            `ℹ️ VINCULACIÓN PENDIENTE: Evento ${expectedType} esperado ` +
                            `(Guía ${event.guide_series}-${event.guide_number}) en otro predio. ` +
                            `Se vinculará automáticamente cuando se registre.`,
                            { duration: 5000 }
                        );
                    }
                } catch (error) {
                    console.warn('Advertencia al buscar evento complementario:', error);
                    // No bloquear la aprobación si falla la búsqueda
                }
            }

            // Si todas las validaciones pasaron, aprobar evento
            await updateEventStatus(eventId, status, user?.id);

            // Verificar si se generó un costo automático
            try {
                const { data: workCost, error: costError } = await supabase
                    .from('work_costs')
                    .select('cost_amount')
                    .eq('event_id', eventId)
                    .maybeSingle();

                if (workCost && !costError) {
                    toast.success(
                        `✅ Evento aprobado. Costo automático generado: $${workCost.cost_amount.toFixed(2)}`,
                        { duration: 5000 }
                    );
                } else {
                    toast.success('✅ Evento aprobado correctamente');
                }
            } catch (costError) {
                console.warn('Advertencia al buscar costo automático:', costError);
                toast.success('✅ Evento aprobado correctamente');
            }

            loadEvents();
            if (onAction) onAction();
        } catch (error) {
            console.error('Error en handleAction:', error);
            toast.error('Error al procesar acción: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Clock size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium text-lg">No hay eventos pendientes de aprobación</p>
                <p className="text-slate-400 text-sm">Todo el historial está al día.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-2">
                <Badge className="bg-amber-500 text-white border-none">{events.length}</Badge>
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Pendientes de Revisión</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {events.map((event) => {
                    const config = EVENT_ICONS[event.event_type] || { icon: Info, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Evento' };
                    const Icon = config.icon;

                    return (
                        <Card key={event.id} className="border-slate-200 overflow-hidden hover:border-emerald-200 transition-colors shadow-sm">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row md:items-center">
                                    {/* Icono y Tipo */}
                                    <div className={`p-4 md:w-40 flex flex-row md:flex-col items-center justify-center gap-2 ${config.bg}`}>
                                        <Icon className={config.color} size={24} />
                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${config.color}`}>
                                            {config.label}
                                        </span>
                                    </div>

                                    {/* Contenido */}
                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {event.scope === 'HERD' ? `Rodeo: ${event.herd?.name}` : `Animal: ${event.animal?.visual_tag || event.animal?.rfid_tag}`}
                                                </p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Calendar size={12} /> {new Date(event.event_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {event.qty_kg && (
                                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 font-bold">
                                                    {event.qty_kg} kg
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="text-sm text-slate-600 bg-slate-50/50 p-2 rounded-lg">
                                            {event.event_type === 'MOVE_INTERNAL' && (
                                                <p className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-400">Destino:</span> 
                                                    <span className="font-bold text-emerald-600">{event.to_lote?.name}</span>
                                                </p>
                                            )}
                                            {event.notes && (
                                                <p className="italic text-xs mt-1">"{event.notes}"</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="p-4 border-t md:border-t-0 md:border-l border-slate-100 flex md:flex-col gap-2 bg-slate-50/30">
                                        <Button 
                                            size="sm" 
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2 p-2 text-white"
                                            onClick={() => handleAction(event.id, 'APPROVED')}
                                        >
                                            <CheckCircle2 size={14} /> Aprobar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="flex-1 text-red-600 hover:bg-red-50 gap-2"
                                            onClick={() => handleAction(event.id, 'REJECTED')}
                                        >
                                            <XCircle size={14} /> Rechazar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
