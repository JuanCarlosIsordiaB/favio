import React, { useState } from 'react';
import { 
    Users, 
    Save, 
    X, 
    MapPin, 
    Beef 
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
import { supabase } from '../../lib/supabase';

export default function HerdForm({ 
    open, 
    onOpenChange, 
    selectedFirmId, 
    selectedPremiseId, 
    lots = [],
    onSuccess 
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        species: 'BOVINO',
        current_lot_id: '',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('El nombre del rodeo es obligatorio');
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

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('herds')
                .insert([
                    {
                        ...formData,
                        firm_id: selectedFirmId,
                        premise_id: selectedPremiseId,
                        is_active: true,
                        current_lot_id: formData.current_lot_id || null
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            toast.success('Rodeo creado exitosamente');
            if (onSuccess) onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error('Error creating herd:', error);
            toast.error(error.message || 'Error al crear el rodeo');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            species: 'BOVINO',
            current_lot_id: '',
            notes: ''
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Users className="text-emerald-600" />
                        Crear Nuevo Rodeo / Tropa
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Nombre del Rodeo</label>
                        <input 
                            type="text"
                            placeholder="Ej: Terneras de Invernada"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">Especie</label>
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
                            <label className="text-sm font-bold text-slate-600">Ubicación Inicial</label>
                            <select 
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.current_lot_id}
                                onChange={(e) => setFormData({...formData, current_lot_id: e.target.value})}
                            >
                                <option value="">Sin lote inicial</option>
                                {lots.map(lot => (
                                    <option key={lot.id} value={lot.id}>{lot.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Notas</label>
                        <textarea 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-sm"
                            placeholder="Descripción opcional..."
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>

                    <DialogFooter className="pt-4 border-t">
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : <><Save size={16} /> Crear Rodeo</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
