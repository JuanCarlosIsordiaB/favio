import React, { useState, useEffect } from 'react';
import {
    Activity,
    ArrowRightLeft,
    Scale,
    Skull,
    Baby,
    TrendingUp,
    ShoppingCart,
    Calendar,
    MapPin,
    Users,
    Tag,
    Save,
    AlertTriangle,
    Utensils,
    Truck,
    ArrowDown,
    ArrowUp,
    Package,
    Hammer
} from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { registerLivestockEvent, registerBulkWeighingEvent } from '../../services/livestock';

const EVENT_TYPES = [
    { id: 'MOVE_INTERNAL', label: 'Traslado Interno', icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },

    // ✅ NUEVOS: Movimientos Externos
    { id: 'MOVE_EXTERNAL_IN', label: 'Ingreso Externo', icon: ArrowDown, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'MOVE_EXTERNAL_OUT', label: 'Egreso Externo', icon: ArrowUp, color: 'text-violet-600', bg: 'bg-violet-50' },

    // ✅ NUEVOS: Consignación
    { id: 'CONSIGNACION_IN', label: 'Consignación Ingreso', icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'CONSIGNACION_OUT', label: 'Consignación Egreso', icon: Package, color: 'text-teal-600', bg: 'bg-teal-50' },

    // ✅ NUEVOS: Remates
    { id: 'REMATE_IN', label: 'Remate Ingreso', icon: Hammer, color: 'text-lime-600', bg: 'bg-lime-50' },
    { id: 'REMATE_OUT', label: 'Remate Egreso', icon: Hammer, color: 'text-amber-600', bg: 'bg-amber-50' },

    { id: 'WEIGHING', label: 'Pesaje', icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'HEALTH_TREATMENT', label: 'Sanidad', icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'BIRTH', label: 'Nacimiento', icon: Baby, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'CATEGORY_CHANGE', label: 'Cambio Categoría', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'DEATH', label: 'Muerte / Mortandad', icon: Skull, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'PURCHASE', label: 'Compra', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'SALE', label: 'Venta', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'CONSUMPTION', label: 'Consumo', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'LOST_WITH_HIDE', label: 'Perdido c/ Cuero', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { id: 'FAENA', label: 'Faena', icon: Truck, color: 'text-red-600', bg: 'bg-red-50' },
];

export default function LivestockEventForm({ 
    open, 
    onOpenChange, 
    selectedFirmId, 
    selectedPremiseId,
    animals = [],
    herds = [],
    lots = [],
    categories = [],
    defaultType = 'MOVE_INTERNAL',
    onSuccess 
}) {
    const [loading, setLoading] = useState(false);
    const [eventType, setEventType] = useState(defaultType);
    const [scope, setScope] = useState('HERD'); // 'ANIMAL' o 'HERD'
    
    const [formData, setFormData] = useState({
        event_date: new Date().toISOString().split('T')[0],
        animal_id: '',
        herd_id: '',
        to_lot_id: '',
        category_from_id: '', // NUEVO: Categoría anterior para CATEGORY_CHANGE
        category_to_id: '',
        qty_kg: '',
        qty_heads: '', // Para PURCHASE, SALE, BIRTH, DEATH, CONSUMPTION, LOST_WITH_HIDE, FAENA y movimientos externos
        withdraw_days: '', // Nuevo campo
        notes: '',
        guide_series: '',
        guide_number: '',
        from_predio_name: '', // Predio origen (movimientos externos IN)
        to_predio_name: '', // Predio destino (movimientos externos OUT)
        // Campos SANIDAD
        product_id: '',
        dose: '',
        veterinary_professional: '',
        weighing_method: ''
    });

    useEffect(() => {
        if (defaultType) setEventType(defaultType);
    }, [defaultType, open]);

    const validateEventData = () => {
        const errors = [];

        // VALIDACIÓN #1: Animal obligatorio (scope ANIMAL)
        if (scope === 'ANIMAL' && !formData.animal_id) {
            errors.push('Debe seleccionar un animal');
        }

        // VALIDACIÓN #3: Rodeo obligatorio (scope HERD)
        if (scope === 'HERD' && !formData.herd_id) {
            errors.push('Debe seleccionar un rodeo');
        }

        // VALIDACIÓN #4: Cantidad obligatoria para eventos que la requieren
        const eventosQueRequierenCantidad = [
            'BIRTH', 'DEATH', 'SALE', 'PURCHASE', 'CONSUMPTION',
            'LOST_WITH_HIDE', 'FAENA', 'MOVE_EXTERNAL_IN',
            'MOVE_EXTERNAL_OUT', 'CONSIGNACION_IN', 'CONSIGNACION_OUT',
            'REMATE_IN', 'REMATE_OUT', 'CATEGORY_CHANGE'
        ];
        if (eventosQueRequierenCantidad.includes(eventType)) {
            if (!formData.qty_heads || parseInt(formData.qty_heads) <= 0) {
                errors.push('Cantidad de cabezas es obligatoria para este tipo de evento');
            }
        }

        // VALIDACIÓN #5: Guía DICOSE obligatoria para movimientos externos
        const eventosQueRequierenGuia = [
            'SALE', 'PURCHASE', 'MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT',
            'CONSIGNACION_IN', 'CONSIGNACION_OUT', 'REMATE_IN', 'REMATE_OUT'
        ];
        if (eventosQueRequierenGuia.includes(eventType)) {
            if (!formData.guide_series || !formData.guide_number) {
                errors.push('Guía (serie y número) es obligatoria para este movimiento');
            }
        }

        // VALIDACIÓN #6: Categorías diferentes para CATEGORY_CHANGE
        if (eventType === 'CATEGORY_CHANGE') {
            if (!formData.category_from_id || !formData.category_to_id) {
                errors.push('Debe seleccionar categoría anterior y nueva');
            } else if (formData.category_from_id === formData.category_to_id) {
                errors.push('Las categorías anterior y nueva deben ser diferentes');
            }
        }

        // VALIDACIÓN #7: Fecha válida (no futura)
        const eventDate = new Date(formData.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate > today) {
            errors.push('La fecha del evento no puede ser en el futuro');
        }

        // VALIDACIÓN #8: Datos sanitarios completos para HEALTH_TREATMENT
        if (eventType === 'HEALTH_TREATMENT') {
            if (!formData.product_id || formData.product_id === 'manual') {
                if (!formData.dose) {
                    errors.push('Dosis es obligatoria para tratamiento sanitario');
                }
            }
        }

        // VALIDACIÓN SANITARIA EXISTENTE: Bloquear venta si tiene retiro activo
        if (eventType === 'SALE' && scope === 'ANIMAL') {
            const selectedAnimal = animals.find(a => a.id === formData.animal_id);
            if (selectedAnimal?.withdraw_until) {
                const today = new Date();
                const releaseDate = new Date(selectedAnimal.withdraw_until);
                if (today < releaseDate) {
                    errors.push(`BLOQUEO SANITARIO: El animal no es apto para venta/faena hasta el ${releaseDate.toLocaleDateString()} por período de retiro`);
                }
            }
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ejecutar todas las validaciones
        const validationErrors = validateEventData();

        if (validationErrors.length > 0) {
            // Mostrar cada error por separado
            validationErrors.forEach(error => toast.error(error));
            return;
        }

        setLoading(true);
        try {
            // OBTENER ESPECIE: Del animal individual o del rodeo (default BOVINO)
            let eventSpecies = 'BOVINO'; // Default

            if (scope === 'ANIMAL' && formData.animal_id) {
                // Obtener especie del animal seleccionado
                const selectedAnimal = animals.find(a => a.id === formData.animal_id);
                if (selectedAnimal?.species) {
                    eventSpecies = selectedAnimal.species;
                }
            } else if (scope === 'HERD' && formData.herd_id && animals.length > 0) {
                // Obtener especie del primer animal del rodeo
                const herdAnimal = animals.find(a => a.herd_id === formData.herd_id);
                if (herdAnimal?.species) {
                    eventSpecies = herdAnimal.species;
                }
            }

            const eventData = {
                firm_id: selectedFirmId,
                premise_id: selectedPremiseId,
                event_type: eventType,
                scope: scope,
                event_date: formData.event_date,
                species: eventSpecies,
                animal_id: scope === 'ANIMAL' ? formData.animal_id : null,
                herd_id: scope === 'HERD' ? formData.herd_id : null,
                to_lote_id: eventType === 'MOVE_INTERNAL' ? formData.to_lot_id : null,
                category_from_id: eventType === 'CATEGORY_CHANGE' ? formData.category_from_id : null,
                category_to_id: eventType === 'CATEGORY_CHANGE' ? formData.category_to_id : null,
                qty_kg: formData.qty_kg ? parseFloat(formData.qty_kg) : null,
                qty_heads: formData.qty_heads ? parseInt(formData.qty_heads) : null,
                notes: formData.notes,
                guide_series: formData.guide_series,
                guide_number: formData.guide_number,
                status: 'PENDING',
                // NOTA: created_by y created_at son generados por Supabase automáticamente
                // No incluir aquí para evitar conflictos de tipo UUID vs string
                metadata: {
                    // Campos operacionales
                    withdraw_days: formData.withdraw_days ? parseInt(formData.withdraw_days) : null,
                    product_id: formData.product_id || null,
                    dose: formData.dose || null,
                    veterinary_professional: formData.veterinary_professional || null,
                    weighing_method: formData.weighing_method || null,
                    from_predio_name: formData.from_predio_name || null,
                    to_predio_name: formData.to_predio_name || null,
                    // ✅ Campos de auditoría (en metadata donde es seguro)
                    audit: {
                        creation_source: 'LIVESTOCK_EVENT_FORM',
                        form_version: '2026-01-15',
                        creator_name: localStorage.getItem('currentUser') || 'Sistema',
                        validation_status: 'PENDING_APPROVAL',
                        compliance_notes: {
                            dicose_compliant: eventType !== 'WEIGHING' && eventType !== 'HEALTH_TREATMENT' && eventType !== 'MOVE_INTERNAL',
                            requires_quantity: ['BIRTH', 'DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA', 'PURCHASE', 'SALE', 'MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT', 'CONSIGNACION_IN', 'CONSIGNACION_OUT', 'REMATE_IN', 'REMATE_OUT', 'CATEGORY_CHANGE'].includes(eventType),
                            requires_guide: ['PURCHASE', 'SALE', 'MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT', 'CONSIGNACION_IN', 'CONSIGNACION_OUT', 'REMATE_IN', 'REMATE_OUT'].includes(eventType)
                        }
                    }
                }
            };

            // ✅ NUEVA LÓGICA: Pesaje masivo (HERD) genera evento POR CADA ANIMAL
            if (scope === 'HERD' && eventType === 'WEIGHING') {
                // Preparar datos sin scope ni animal_id/herd_id (será set por registerBulkWeighingEvent)
                const bulkEventData = { ...eventData };
                delete bulkEventData.animal_id;  // Será asignado por cada animal
                delete bulkEventData.scope;      // No necesario en eventos individuales

                await registerBulkWeighingEvent(formData.herd_id, bulkEventData);
                toast.success(`✅ Pesaje masivo registrado: ${eventData.qty_kg} kg para cada animal del rodeo`);
            } else {
                // Evento normal (individual)
                await registerLivestockEvent(eventData);
                toast.success('Evento registrado y enviado a aprobación');
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error('Error registering event:', error);
            toast.error('Error al registrar el evento');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            event_date: new Date().toISOString().split('T')[0],
            animal_id: '',
            herd_id: '',
            to_lot_id: '',
            category_from_id: '',
            category_to_id: '',
            qty_kg: '',
            qty_heads: '',
            withdraw_days: '',
            notes: '',
            guide_series: '',
            guide_number: '',
            from_predio_name: '',
            to_predio_name: '',
            product_id: '',
            dose: '',
            veterinary_professional: '',
            weighing_method: ''
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Activity className="text-emerald-600" />
                        Registrar Evento Ganadero
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-2 max-h-[80vh] overflow-y-auto">
                    {/* Selector de Tipo de Evento */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {EVENT_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setEventType(type.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1 ${eventType === type.id ? `border-emerald-500 ${type.bg} ${type.color}` : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    <Icon size={20} />
                                    <span className="text-[10px] font-bold text-center leading-tight">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        {/* Fecha y Alcance */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fecha del Evento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input 
                                        type="date" 
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={formData.event_date}
                                        onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">¿A quién afecta?</label>
                                <div className="flex bg-white border rounded-lg p-1">
                                    <button 
                                        type="button"
                                        onClick={() => setScope('HERD')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${scope === 'HERD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        <Users size={14} /> Rodeo
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setScope('ANIMAL')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${scope === 'ANIMAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        <Tag size={14} /> Caravana
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sujeto (Animal o Rodeo) */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                    Seleccionar {scope === 'HERD' ? 'Rodeo' : 'Animal'}
                                </label>
                                <select 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    value={scope === 'HERD' ? formData.herd_id : formData.animal_id}
                                    onChange={(e) => setFormData({...formData, [scope === 'HERD' ? 'herd_id' : 'animal_id']: e.target.value})}
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {scope === 'HERD' ? (
                                        herds.map(h => <option key={h.id} value={h.id}>{h.name}</option>)
                                    ) : (
                                        animals.map(a => <option key={a.id} value={a.id}>{a.visual_tag || a.rfid_tag}</option>)
                                    )}
                                </select>
                            </div>

                            {/* Campos condicionales según tipo de evento */}
                            {eventType === 'MOVE_INTERNAL' && (
                                <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                        <MapPin size={12} /> Lote Destino
                                    </label>
                                    <select 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-emerald-700"
                                        value={formData.to_lot_id}
                                        onChange={(e) => setFormData({...formData, to_lot_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Seleccionar destino...</option>
                                        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {eventType === 'WEIGHING' && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Peso */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <Scale size={12} /> Peso (kg)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.0"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold"
                                            value={formData.qty_kg}
                                            onChange={(e) => setFormData({...formData, qty_kg: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Método de Pesaje */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <Scale size={12} /> Método de Pesaje
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.weighing_method}
                                            onChange={(e) => setFormData({...formData, weighing_method: e.target.value})}
                                        >
                                            <option value="">No especificado</option>
                                            <option value="BALANZA_ELECTRONICA">Balanza Electrónica</option>
                                            <option value="BALANZA_MECANICA">Balanza Mecánica</option>
                                            <option value="CINTA_BAROMETRICA">Cinta Barométrica</option>
                                            <option value="ESTIMACION_VISUAL">Estimación Visual</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {eventType === 'CATEGORY_CHANGE' && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Categoría Anterior */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <TrendingUp size={12} /> Categoría Anterior <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-slate-700"
                                            value={formData.category_from_id}
                                            onChange={(e) => setFormData({...formData, category_from_id: e.target.value})}
                                            required
                                        >
                                            <option value="">Seleccionar categoría anterior...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <p className="text-[9px] text-slate-400 italic">Categoría en que se encontraba el animal.</p>
                                    </div>

                                    {/* Categoría Nueva */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <TrendingUp size={12} /> Nueva Categoría <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-purple-700"
                                            value={formData.category_to_id}
                                            onChange={(e) => setFormData({...formData, category_to_id: e.target.value})}
                                            required
                                        >
                                            <option value="">Seleccionar categoría nueva...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <p className="text-[9px] text-slate-400 italic">Categoría a la que pasa el animal.</p>
                                    </div>

                                    {/* Cantidad */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Cantidad (Cabezas) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Ej: 5"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.qty_heads}
                                            onChange={(e) => setFormData({...formData, qty_heads: e.target.value})}
                                            required
                                        />
                                        <p className="text-[9px] text-slate-400 italic">Número de animales que cambian de categoría.</p>
                                    </div>
                                </div>
                            )}

                            {eventType === 'HEALTH_TREATMENT' && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Días de Retiro */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <Activity size={12} /> Días de Retiro (Carencia)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 30"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-red-600"
                                            value={formData.withdraw_days}
                                            onChange={(e) => setFormData({...formData, withdraw_days: e.target.value})}
                                            required
                                        />
                                        <p className="text-[9px] text-slate-400 italic">Días obligatorios sin faena tras el tratamiento.</p>
                                    </div>

                                    {/* Producto Veterinario */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            Producto Veterinario <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.product_id}
                                            onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                                            required
                                        >
                                            <option value="">Seleccionar producto...</option>
                                            <option value="MANUAL">Registro Manual (sin stock)</option>
                                        </select>
                                        <p className="text-[9px] text-slate-400 italic">Productos veterinarios desde inventario de stock.</p>
                                    </div>

                                    {/* Dosis */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            Dosis Aplicada <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 5ml, 2cc, 1 comprimido"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.dose}
                                            onChange={(e) => setFormData({...formData, dose: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Profesional */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            Profesional Responsable
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nombre del veterinario o técnico"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.veterinary_professional}
                                            onChange={(e) => setFormData({...formData, veterinary_professional: e.target.value})}
                                        />
                                        <p className="text-[9px] text-slate-400 italic">Opcional: registra quién aplicó el tratamiento.</p>
                                    </div>
                                </div>
                            )}

                            {/* BLOQUE: BIRTH, DEATH, CONSUMPTION, LOST_WITH_HIDE, FAENA */}
                            {(['BIRTH', 'DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA'].includes(eventType)) && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Cantidad de Animales */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Cantidad (Cabezas) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Ej: 1"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold"
                                            value={formData.qty_heads}
                                            onChange={(e) => setFormData({...formData, qty_heads: e.target.value})}
                                            required
                                        />
                                        <p className="text-[9px] text-slate-400 italic">
                                            {eventType === 'BIRTH' && 'Número de crías nacidas'}
                                            {eventType === 'DEATH' && 'Número de animales que murieron'}
                                            {eventType === 'CONSUMPTION' && 'Número de animales para consumo'}
                                            {eventType === 'LOST_WITH_HIDE' && 'Número de animales perdidos'}
                                            {eventType === 'FAENA' && 'Número de animales a faenar'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(['PURCHASE', 'SALE'].includes(eventType)) && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Cantidad */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Cantidad (Cabezas)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Ej: 5"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.qty_heads}
                                            onChange={(e) => setFormData({...formData, qty_heads: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Serie de Guía */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Guía Serie <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: A, B, C"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.guide_series}
                                            onChange={(e) => setFormData({...formData, guide_series: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Número de Guía */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Guía Número <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 12345"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.guide_number}
                                            onChange={(e) => setFormData({...formData, guide_number: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 🆕 Campos para Movimientos Externos */}
                            {['MOVE_EXTERNAL_IN', 'MOVE_EXTERNAL_OUT', 'CONSIGNACION_IN', 'CONSIGNACION_OUT', 'REMATE_IN', 'REMATE_OUT'].includes(eventType) && (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                                    {/* Cantidad (Cabezas) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Cantidad (Cabezas) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Ej: 10"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.qty_heads}
                                            onChange={(e) => setFormData({...formData, qty_heads: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Guía Serie DICOSE */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Guía Serie (DICOSE) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: A, B, C, D"
                                            maxLength="1"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white uppercase font-bold"
                                            value={formData.guide_series}
                                            onChange={(e) => setFormData({...formData, guide_series: e.target.value.toUpperCase()})}
                                            required
                                        />
                                    </div>

                                    {/* Guía Número DICOSE */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">
                                            Guía Número (DICOSE) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 12345"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                            value={formData.guide_number}
                                            onChange={(e) => setFormData({...formData, guide_number: e.target.value})}
                                            required
                                        />
                                    </div>

                                    {/* Predio de Origen (para INGRESOS) */}
                                    {['MOVE_EXTERNAL_IN', 'CONSIGNACION_IN', 'REMATE_IN'].includes(eventType) && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <MapPin size={12} /> Predio de Origen
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nombre del predio origen"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                                value={formData.from_predio_name}
                                                onChange={(e) => setFormData({...formData, from_predio_name: e.target.value})}
                                            />
                                            <p className="text-[9px] text-slate-400 italic">
                                                Opcional: Registra predio de origen para trazabilidad DICOSE
                                            </p>
                                        </div>
                                    )}

                                    {/* Predio de Destino (para EGRESOS) */}
                                    {['MOVE_EXTERNAL_OUT', 'CONSIGNACION_OUT', 'REMATE_OUT'].includes(eventType) && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <MapPin size={12} /> Predio de Destino
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nombre del predio destino"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                                value={formData.to_predio_name}
                                                onChange={(e) => setFormData({...formData, to_predio_name: e.target.value})}
                                            />
                                            <p className="text-[9px] text-slate-400 italic">
                                                Opcional: Registra predio de destino para trazabilidad DICOSE
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Observaciones / Motivo</label>
                        <textarea 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20 text-sm"
                            placeholder="Ej: Traslado por falta de pastura en lote actual."
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>

                    <DialogFooter className="border-t pt-6">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8"
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : <><Save size={16} /> Registrar Evento</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
