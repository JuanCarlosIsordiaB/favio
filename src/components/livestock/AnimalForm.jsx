import React, { useState, useMemo, useEffect } from 'react';
import {
    X,
    Save,
    Tags,
    Hash,
    Info,
    MapPin,
    Users,
    ChevronDown,
    Fingerprint,
    Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { createAnimal, updateAnimal } from '../../services/livestock';

export default function AnimalForm({
    open,
    onOpenChange,
    selectedFirmId,
    selectedPremiseId,
    categories = [],
    herds = [],
    lots = [],
    onSuccess,
    mode = 'create',
    animal = null
}) {
    const [loading, setLoading] = useState(false);
    const [premises, setPremises] = useState([]);
    const [formData, setFormData] = useState({
        visual_tag: '',
        rfid_tag: '',
        species: 'BOVINO',
        breed: '',
        sex: 'M',
        birth_date: new Date().toISOString().split('T')[0],
        initial_weight: '',
        current_category_id: '',
        current_lot_id: '',
        herd_id: '',
        origin_premise_id: selectedPremiseId || '',
        notes: ''
    });

    // Cargar predios de la firma cuando el modal abre
    // Si es modo edición, pre-popular formulario con datos del animal
    useEffect(() => {
        if (open && selectedFirmId) {
            loadPremises();
        }

        if (open && mode === 'edit' && animal) {
            setFormData({
                visual_tag: animal.visual_tag || '',
                rfid_tag: animal.rfid_tag || '',
                species: animal.species || 'BOVINO',
                breed: animal.breed || '',
                sex: animal.sex || 'M',
                birth_date: animal.birth_date || new Date().toISOString().split('T')[0],
                initial_weight: animal.initial_weight?.toString() || '',
                current_category_id: animal.current_category_id || '',
                current_lot_id: animal.current_lot_id || '',
                herd_id: animal.herd_id || '',
                origin_premise_id: animal.origin_premise_id || selectedPremiseId || '',
                notes: animal.notes || ''
            });
        } else if (open && mode === 'create') {
            resetForm();
        }
    }, [open, selectedFirmId, mode, animal]);

    // Cargar predios de la firma actual
    async function loadPremises() {
        try {
            const { data, error } = await supabase
                .from('premises')
                .select('id, name')
                .eq('firm_id', selectedFirmId)
                .order('name');
            if (error) throw error;
            setPremises(data || []);
        } catch (error) {
            console.error('Error loading premises:', error);
        }
    }

    // Filtrar rodeos por especie y estado activo
    const filteredHerds = useMemo(() => {
        return herds.filter(h =>
            h.species === formData.species && h.is_active
        );
    }, [herds, formData.species]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.current_category_id) {
            toast.error('La categoría es obligatoria');
            return;
        }

        // Validar que existan firma y predio
        if (!selectedFirmId) {
            toast.error('Debes seleccionar una firma');
            return;
        }

        if (!selectedPremiseId) {
            toast.error('Debes seleccionar un predio');
            return;
        }

        // Validar al menos un identificador (RFID o Caravana Visual)
        if (!formData.rfid_tag && !formData.visual_tag) {
            toast.error('Debes ingresar al menos RFID o Caravana Visual');
            return;
        }

        // Validar que haya peso inicial
        if (!formData.initial_weight || parseFloat(formData.initial_weight) <= 0) {
            toast.error('El peso inicial es obligatorio y debe ser mayor a 0');
            return;
        }

        setLoading(true);
        try {
            const animalData = {
                visual_tag: formData.visual_tag || null,
                rfid_tag: formData.rfid_tag || null,
                species: formData.species,
                breed: formData.breed || null,
                sex: formData.sex,
                birth_date: formData.birth_date || null,
                initial_weight: formData.initial_weight ? parseFloat(formData.initial_weight) : null,
                current_category_id: formData.current_category_id,
                current_lot_id: formData.current_lot_id || null,
                origin_premise_id: formData.origin_premise_id || selectedPremiseId,
                notes: formData.notes || null,
                herd_id: formData.herd_id || null
            };

            // Agregar campos adicionales solo para creación
            if (mode === 'create') {
                animalData.firm_id = selectedFirmId;
                animalData.premise_id = selectedPremiseId;
                animalData.initial_category_id = formData.current_category_id;
                animalData.status = 'ACTIVE';
            }

            if (mode === 'edit' && animal) {
                await updateAnimal(animal.id, animalData);
                toast.success('Animal actualizado exitosamente');
            } else {
                await createAnimal(animalData);
                toast.success('Animal registrado exitosamente');
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} animal:`, error);
            toast.error(error.message || `Error al ${mode === 'edit' ? 'actualizar' : 'registrar'} el animal`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            visual_tag: '',
            rfid_tag: '',
            species: 'BOVINO',
            breed: '',
            sex: 'M',
            birth_date: new Date().toISOString().split('T')[0],
            initial_weight: '',
            current_category_id: '',
            current_lot_id: '',
            herd_id: '',
            origin_premise_id: selectedPremiseId || '',
            notes: ''
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Tags className="text-emerald-600" />
                        {mode === 'edit' ? 'Editar Animal' : 'Registrar Nuevo Animal'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Sección: Identificación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Hash size={14} className="text-slate-400" />
                                Caravana Visual
                            </label>
                            <input 
                                type="text"
                                placeholder="Ej: 1234"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.visual_tag}
                                onChange={(e) => setFormData({...formData, visual_tag: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Info size={14} className="text-slate-400" />
                                Caravana RFID (Electrónica)
                            </label>
                            <input 
                                type="text"
                                placeholder="Nº de chip / dispositivo"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.rfid_tag}
                                onChange={(e) => setFormData({...formData, rfid_tag: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Sección: Biología */}
                    <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Datos Biológicos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">Especie</label>
                                <select
                                    className="w-full px-3 py-2 bg-white border rounded-lg outline-none"
                                    value={formData.species}
                                    onChange={(e) => setFormData({...formData, species: e.target.value})}
                                >
                                    <option value="BOVINO">Bovino</option>
                                    <option value="OVINO">Ovino</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <Fingerprint size={12} />
                                    Raza
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Hereford, Angus"
                                    className="w-full px-3 py-2 bg-white border rounded-lg outline-none text-xs"
                                    value={formData.breed}
                                    onChange={(e) => setFormData({...formData, breed: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">Sexo</label>
                                <div className="flex bg-white border rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, sex: 'M'})}
                                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${formData.sex === 'M' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}
                                    >Macho</button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, sex: 'F'})}
                                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${formData.sex === 'F' ? 'bg-pink-100 text-pink-700' : 'text-slate-400'}`}
                                    >Hembra</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <Calendar size={12} />
                                    Fecha Nac.
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 bg-white border rounded-lg outline-none text-xs"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">Peso Inicial (kg) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    placeholder="Ej: 250.5"
                                    className="w-full px-3 py-2 bg-white border rounded-lg outline-none text-xs font-bold"
                                    value={formData.initial_weight}
                                    onChange={(e) => setFormData({...formData, initial_weight: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección: Ubicación y Categoría */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                Categoría Ganadera
                            </label>
                            <select
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.current_category_id}
                                onChange={(e) => setFormData({...formData, current_category_id: e.target.value})}
                            >
                                <option value="">Seleccione categoría...</option>
                                {categories
                                    .filter(c => c.species === formData.species)
                                    .map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                Rodeo / Tropa
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.herd_id}
                                onChange={(e) => setFormData({...formData, herd_id: e.target.value})}
                            >
                                <option value="">Sin rodeo inicial</option>
                                {filteredHerds.map(herd => (
                                    <option key={herd.id} value={herd.id}>
                                        {herd.name} ({herd.species})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[9px] text-slate-400 italic">
                                Opcional: Asignar animal a un rodeo al crearlo
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <MapPin size={14} className="text-slate-400" />
                                Lote / Potrero Inicial
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.current_lot_id}
                                onChange={(e) => setFormData({...formData, current_lot_id: e.target.value})}
                            >
                                <option value="">Sin lote asignado</option>
                                {lots.map(lot => (
                                    <option key={lot.id} value={lot.id}>{lot.name} ({lot.area_hectares} ha)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Predio de Origen (DICOSE) */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            Predio de Origen (DICOSE)
                        </label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.origin_premise_id}
                            onChange={(e) => setFormData({...formData, origin_premise_id: e.target.value})}
                        >
                            <option value={selectedPremiseId}>Este predio (nacido aquí)</option>
                            {premises
                                .filter(p => p.id !== selectedPremiseId)
                                .map(premise => (
                                    <option key={premise.id} value={premise.id}>
                                        {premise.name} (Compra externa)
                                    </option>
                                ))}
                        </select>
                        <p className="text-[9px] text-slate-400 italic">
                            Si fue comprado externamente, selecciona predio de origen. Default: este predio.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Notas / Observaciones</label>
                        <textarea 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                            placeholder="Detalles adicionales..."
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
                            {loading ? (mode === 'edit' ? 'Actualizando...' : 'Guardando...') : (
                                <>
                                    <Save size={16} />
                                    {mode === 'edit' ? 'Actualizar Animal' : 'Guardar Animal'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
