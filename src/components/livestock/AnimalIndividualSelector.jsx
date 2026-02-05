/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Componente para seleccionar animales individuales en trabajos ganaderos
 *
 * Funcionalidad:
 * - Cargar lista de animales del rodeo
 * - Búsqueda por caravana o RFID
 * - Selección múltiple (checkbox)
 * - Mostrar categoría y estado del animal
 * - Registrar datos individuales: aplicado/no aplicado, dosis, peso
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Check, X, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';

export default function AnimalIndividualSelector({
  herdId,
  selectedAnimals = [],
  onSelectionChange,
  onDetailsChange
}) {
  const [animals, setAnimals] = useState([]);
  const [filteredAnimals, setFilteredAnimals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [details, setDetails] = useState({});
  const [expandedAnimal, setExpandedAnimal] = useState(null);

  // Cargar animales del rodeo
  useEffect(() => {
    if (herdId) {
      loadAnimals();
    }
  }, [herdId]);

  // Filtrar animales según búsqueda y categoría
  useEffect(() => {
    let filtered = animals;

    // Filtro por búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.caravana && a.caravana.toLowerCase().includes(searchLower)) ||
          (a.rfid && a.rfid.toLowerCase().includes(searchLower)) ||
          (a.name && a.name.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por categoría
    if (categoryFilter) {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    setFilteredAnimals(filtered);
  }, [search, categoryFilter, animals]);

  async function loadAnimals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('herd_id', herdId)
        .eq('status', 'ACTIVE')
        .order('caravana');

      if (error) throw error;

      setAnimals(data || []);

      // Inicializar detalles para animales seleccionados
      const initialDetails = {};
      selectedAnimals.forEach((animalId) => {
        initialDetails[animalId] = {
          applied: true,
          dose_applied: 0,
          weight_at_work: 0,
          notes: ''
        };
      });
      setDetails(initialDetails);
    } catch (err) {
      console.error('Error loading animals:', err);
      toast.error('Error al cargar animales del rodeo');
    } finally {
      setLoading(false);
    }
  }

  const toggleAnimal = (animalId) => {
    let newSelected;
    if (selectedAnimals.includes(animalId)) {
      newSelected = selectedAnimals.filter((id) => id !== animalId);
      const newDetails = { ...details };
      delete newDetails[animalId];
      setDetails(newDetails);
    } else {
      newSelected = [...selectedAnimals, animalId];
      setDetails({
        ...details,
        [animalId]: {
          applied: true,
          dose_applied: 0,
          weight_at_work: 0,
          notes: ''
        }
      });
    }

    onSelectionChange(newSelected);
    onDetailsChange(newDetails);
  };

  const updateDetail = (animalId, field, value) => {
    const newDetails = {
      ...details,
      [animalId]: {
        ...details[animalId],
        [field]: value
      }
    };
    setDetails(newDetails);
    onDetailsChange(newDetails);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'NOVILLO': 'bg-blue-100 text-blue-800',
      'VACA': 'bg-purple-100 text-purple-800',
      'TORO': 'bg-red-100 text-red-800',
      'TERNERO': 'bg-green-100 text-green-800',
      'TERNERA': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  const categories = [...new Set(animals.map((a) => a.category))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin mr-2" size={24} />
        <span className="text-slate-600">Cargando animales...</span>
      </div>
    );
  }

  if (animals.length === 0) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">No hay animales en este rodeo</p>
            <p className="text-sm text-blue-700">Agrega animales primero para poder aplicar trabajos individuales</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles de búsqueda y filtro */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por caravana, RFID o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Resumen de selección */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-900">
          {selectedAnimals.length} animal{selectedAnimals.length !== 1 ? 'es' : ''} seleccionado{selectedAnimals.length !== 1 ? 's' : ''}
          {selectedAnimals.length > 0 && (
            <span className="text-slate-600 ml-1">
              de {filteredAnimals.length} {categoryFilter ? 'en esta categoría' : 'disponible' + (filteredAnimals.length > 1 ? 's' : '')}
            </span>
          )}
        </p>
      </div>

      {/* Lista de animales */}
      <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
        {filteredAnimals.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No se encontraron animales con los filtros seleccionados</p>
          </div>
        ) : (
          filteredAnimals.map((animal) => {
            const isSelected = selectedAnimals.includes(animal.id);
            const animalDetails = details[animal.id] || {};

            return (
              <div key={animal.id} className="border-b border-slate-200 last:border-b-0">
                {/* Fila principal con checkbox */}
                <div
                  className={`p-4 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-green-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAnimal(animal.id)}
                    className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{animal.caravana}</p>
                      {animal.rfid && (
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {animal.rfid}
                        </code>
                      )}
                      <Badge className={getCategoryColor(animal.category)}>
                        {animal.category}
                      </Badge>
                    </div>
                    {animal.name && (
                      <p className="text-sm text-slate-600">{animal.name}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                      {animal.weight && <span>Peso: {animal.weight} kg</span>}
                      {animal.age && <span>Edad: {animal.age} meses</span>}
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      onClick={() => setExpandedAnimal(
                        expandedAnimal === animal.id ? null : animal.id
                      )}
                      className="text-green-600 hover:text-green-800"
                    >
                      {expandedAnimal === animal.id ? <X size={20} /> : <Check size={20} />}
                    </button>
                  )}
                </div>

                {/* Detalles expandibles */}
                {isSelected && expandedAnimal === animal.id && (
                  <div className="bg-slate-50 p-4 space-y-3 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Aplicado
                        </label>
                        <select
                          value={animalDetails.applied ? 'true' : 'false'}
                          onChange={(e) => updateDetail(animal.id, 'applied', e.target.value === 'true')}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
                        >
                          <option value="true">✓ Sí - Se aplicó</option>
                          <option value="false">✗ No - No se aplicó</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Dosis Aplicada
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={animalDetails.dose_applied || ''}
                          onChange={(e) => updateDetail(animal.id, 'dose_applied', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Peso (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={animalDetails.weight_at_work || ''}
                          onChange={(e) => updateDetail(animal.id, 'weight_at_work', parseFloat(e.target.value) || 0)}
                          placeholder={animal.weight || '0.0'}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={animalDetails.notes || ''}
                          onChange={(e) => updateDetail(animal.id, 'notes', e.target.value)}
                          placeholder="Notas específicas..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Acciones batch */}
      {selectedAnimals.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
          <p className="text-sm font-medium text-blue-900">
            Acciones rápidas para los {selectedAnimals.length} animal{selectedAnimals.length !== 1 ? 'es' : ''} seleccionado{selectedAnimals.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                selectedAnimals.forEach((id) => {
                  updateDetail(id, 'applied', true);
                });
                toast.success('Marcados como aplicado');
              }}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Marcar como aplicado
            </button>
            <button
              onClick={() => {
                selectedAnimals.forEach((id) => {
                  updateDetail(id, 'applied', false);
                });
                toast.success('Marcados como no aplicado');
              }}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Marcar como no aplicado
            </button>
            <button
              onClick={() => {
                setSelectedAnimals([]);
                setDetails({});
                onSelectionChange([]);
                onDetailsChange({});
                toast.success('Selección limpiada');
              }}
              className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
