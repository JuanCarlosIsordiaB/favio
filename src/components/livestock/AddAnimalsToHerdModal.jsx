import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { getAvailableAnimalsForHerd, addAnimalsToHerdBulk } from '../../services/livestock';

export default function AddAnimalsToHerdModal({ herd, onClose, onSuccess }) {
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (herd?.id) loadAnimals();
    }, [herd?.id]);

    async function loadAnimals() {
        setLoading(true);
        try {
            const data = await getAvailableAnimalsForHerd(
                herd.premise_id,
                herd.id,
                herd.species
            );
            setAnimals(data);
        } catch (error) {
            console.error('Error loading animals:', error);
            toast.error('Error al cargar animales disponibles');
        } finally {
            setLoading(false);
        }
    }

    const toggleSelection = (animalId) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(animalId)) {
            newSelected.delete(animalId);
        } else {
            newSelected.add(animalId);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredAnimals.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAnimals.map(a => a.id)));
        }
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0) {
            toast.error('Selecciona al menos un animal');
            return;
        }

        setSubmitting(true);
        try {
            const count = await addAnimalsToHerdBulk(herd.id, Array.from(selectedIds));
            toast.success(`${count} animal(es) agregado(s) al rodeo`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error adding animals:', error);
            toast.error('Error al agregar animales: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAnimals = animals.filter(a =>
        a.visual_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            Agregar Animales a {herd?.name}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Especie: {herd?.species} • Seleccionados: {selectedIds.size}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Search + Select All */}
                <div className="p-4 border-b border-slate-200 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por caravana..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAll}
                        className="w-full"
                    >
                        {selectedIds.size === filteredAnimals.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </Button>
                </div>

                {/* Lista de Animales */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
                        </div>
                    ) : filteredAnimals.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <p className="font-medium">No hay animales disponibles</p>
                            <p className="text-sm mt-1">
                                Todos los animales de esta especie ya están en el rodeo
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredAnimals.map((animal) => (
                                <div
                                    key={animal.id}
                                    onClick={() => toggleSelection(animal.id)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                        selectedIds.has(animal.id)
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-200 hover:border-emerald-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(animal.id)}
                                                    onChange={() => {}}
                                                    className="w-5 h-5 text-emerald-600 rounded"
                                                />
                                                <div>
                                                    <p className="font-bold text-slate-900">
                                                        {animal.visual_tag || 'S/N'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-mono">
                                                        {animal.rfid_tag}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {animal.current_category?.name || 'Sin categoría'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs bg-slate-50">
                                                {animal.current_lot?.name || 'Sin lote'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || selectedIds.size === 0}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Agregando...
                            </>
                        ) : (
                            <>
                                <UserPlus size={16} />
                                Agregar {selectedIds.size > 0 && `(${selectedIds.size})`}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
