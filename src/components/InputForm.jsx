import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { X, Save, Loader, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function InputForm({ input, firmId, onClose, onSave, onDelete }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: 'fertilizer',
    unit: 'kg',
    min_stock_alert: 0,
    cost_per_unit: 0,
    currency: 'ARS',
    brand: '',
    description: '',
    depot_id: '',
    image_url: '',
    is_depot: false,
    initial_stock: 0, // New field for initial stock
    variety: '',
    laboratory: '',
    active_ingredient: '',
    batch_number: '',
    expiration_date: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [depots, setDepots] = useState([]);
  const [depotLots, setDepotLots] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newLocationName, setNewLocationName] = useState(''); // New state for new location name
  const [isNewLocation, setIsNewLocation] = useState(false); // New state to toggle new location input

  const commonCategories = [
    { value: 'fertilizer', label: 'Fertilizante' },
    { value: 'phytosanitary', label: 'Fitosanitario' },
    { value: 'seed', label: 'Semilla' },
    { value: 'fuel', label: 'Combustible' },
    { value: 'veterinary_med', label: 'Medicamentos Veterinarios' },
    { value: 'other', label: 'Otro' }
  ];

  useEffect(() => {
    fetchDepots();
    if (input) {
      const isCommon = commonCategories.some(c => c.value === input.category);
      
      // Determine location value (depot or lot)
      let locationValue = '';
      if (input.depot_id) locationValue = `depot:${input.depot_id}`;
      else if (input.lot_id) locationValue = `lot:${input.lot_id}`;

      setFormData({
        name: input.name,
        category: input.category,
        unit: input.unit,
        min_stock_alert: input.min_stock_alert,
        cost_per_unit: input.cost_per_unit,
        currency: input.currency || 'ARS',
        brand: input.brand || '',
        description: input.description || '',
        depot_id: locationValue, // We use this field to store the combined value
        image_url: input.image_url || '',
        is_depot: input.is_depot || false,
        initial_stock: 0, // Initial stock is not applicable when editing
        variety: input.variety || '',
        laboratory: input.laboratory || '',
        active_ingredient: input.active_ingredient || '',
        batch_number: input.batch_number || '',
        expiration_date: input.expiration_date || '',
        entry_date: input.entry_date || ''
      });
      if (!isCommon && input.category) {
        setIsCustomCategory(true);
        setCustomCategory(input.category);
      }
    } else {
      setFormData(prev => ({ ...prev, initial_stock: 0 })); // Set initial stock to 0 for new inputs
    }
  }, [input]);

  async function fetchDepots() {
    try {
      // Fetch Depots
      const { data: depotsData } = await supabase
        .from('depots')
        .select('id, name')
        .eq('firm_id', firmId)
        .order('name');
      setDepots(depotsData || []);

      // Fetch Lots marked as Depots
      const { data: lotsData } = await supabase
        .from('lots')
        .select('id, name')
        .eq('firm_id', firmId)
        .eq('is_depot', true)
        .order('name');
      setDepotLots(lotsData || []);

    } catch (err) {
      console.error('Error fetching depots:', err);
    }
  }

  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('input-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('input-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este insumo? Esta acción no se puede deshacer.')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('inputs')
        .delete()
        .eq('id', input.id);

      if (error) throw error;

      // Registrar auditoría
      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: null,
        tipo: 'stock',
        descripcion: `Insumo eliminado: ${input.name} - ${input.category}`,
        moduloOrigen: 'input_manager',
        usuario: user?.full_name || 'sistema',
        metadata: {
          input_name: input.name,
          category: input.category,
          unit: input.unit,
          cost_per_unit: input.cost_per_unit
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting input:', err);
      alert('Error al eliminar el insumo');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const finalCategory = isCustomCategory ? customCategory : formData.category;
      let finalDepotId = null;
      let finalLotId = null;

      // Handle new location creation
      if (isNewLocation && newLocationName) {
        const { data: newDepot, error: depotError } = await supabase
          .from('depots')
          .insert([{ name: newLocationName, firm_id: firmId }])
          .select('id')
          .single();

        if (depotError) throw depotError;
        finalDepotId = newDepot.id;
      } else if (isNewLocation && !newLocationName) {
        // If new location is selected but name is empty, show error
        setError('Debes ingresar un nombre para la nueva ubicación');
        setLoading(false);
        return;
      } else if (formData.depot_id) {
        // Parse the combined value
        if (formData.depot_id.startsWith('depot:')) {
          finalDepotId = formData.depot_id.replace('depot:', '');
        } else if (formData.depot_id.startsWith('lot:')) {
          finalLotId = formData.depot_id.replace('lot:', '');
        }
      } else {
        // No depot or lot selected - require selection
        setError('Debes seleccionar una ubicación o depósito para el insumo');
        setLoading(false);
        return;
      }
      
      const dataToSave = {
        ...formData,
        category: finalCategory,
        firm_id: firmId,
        depot_id: finalDepotId,
        lot_id: finalLotId,
        // Convert empty date strings to null
        expiration_date: formData.expiration_date || null,
        entry_date: formData.entry_date || null
      };

      // Remove fields that are not in the inputs table
      delete dataToSave.initial_stock;

      let result;
      if (input) {
        const { data, error } = await supabase
          .from('inputs')
          .update(dataToSave)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        result = data;

        // Registrar auditoría para actualización
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'stock',
          descripcion: `Insumo actualizado: ${finalCategory} - ${dataToSave.name}`,
          moduloOrigen: 'input_manager',
          usuario: user?.full_name || 'sistema',
          metadata: {
            name: dataToSave.name,
            category: finalCategory,
            unit: dataToSave.unit,
            cost_per_unit: dataToSave.cost_per_unit,
            brand: dataToSave.brand,
            batch_number: dataToSave.batch_number
          }
        }).catch(err => console.warn('Error registrando en auditoría:', err));
      } else {
        const { data, error } = await supabase
          .from('inputs')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        result = data;

        // Registrar auditoría para creación
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'stock',
          descripcion: `Insumo creado: ${finalCategory} - ${dataToSave.name}`,
          moduloOrigen: 'input_manager',
          usuario: user?.full_name || 'sistema',
          metadata: {
            name: dataToSave.name,
            category: finalCategory,
            unit: dataToSave.unit,
            cost_per_unit: dataToSave.cost_per_unit,
            brand: dataToSave.brand,
            initial_stock: formData.initial_stock
          }
        }).catch(err => console.warn('Error registrando en auditoría:', err));

        // Handle initial stock for new inputs
        if (formData.initial_stock > 0) {
          const { error: movementError } = await supabase
            .from('input_movements')
            .insert({
              input_id: result.id,
              type: 'initial',
              quantity: formData.initial_stock,
              date: new Date().toISOString(),
              firm_id: firmId,
              description: 'Stock inicial al crear insumo'
            });
          if (movementError) throw movementError;

          // Registrar auditoría para movimiento inicial de stock
          await crearRegistro({
            firmId: firmId,
            premiseId: null,
            lotId: null,
            tipo: 'stock',
            descripcion: `Movimiento de stock inicial: ${dataToSave.name} - ${formData.initial_stock} ${dataToSave.unit}`,
            moduloOrigen: 'input_manager',
            usuario: user?.full_name || 'sistema',
            metadata: {
              input_name: dataToSave.name,
              movement_type: 'initial',
              quantity: formData.initial_stock,
              unit: dataToSave.unit
            }
          }).catch(err => console.warn('Error registrando movimiento en auditoría:', err));
        }
      }

      onSave(result);
      onClose();
    } catch (err) {
      console.error('Error saving input:', err);
      setError('Error al guardar el insumo. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {input ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-slate-400" size={32} />
                )}
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium">
                  {uploading ? 'Subiendo...' : 'Cambiar'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ej: Urea Granulada"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_depot"
                  checked={formData.is_depot}
                  onChange={(e) => setFormData({...formData, is_depot: e.target.checked})}
                  className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_depot" className="text-sm text-slate-700 font-medium cursor-pointer">
                  Funciona como depósito / tanque
                </label>
              </div>
              <p className="text-xs text-slate-500 ml-6">
                Marca esta opción si este insumo puede almacenar stock y recibir transferencias (ej: Tanque de Gasoil).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              {!isCustomCategory ? (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomCategory(true);
                      setCustomCategory('');
                    } else {
                      setFormData({...formData, category: e.target.value});
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  {commonCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                  <option value="custom">+ Nueva Categoría</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Escribe la categoría..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    title="Volver a lista"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="litros">Litros (L)</option>
                <option value="cc">Centímetros Cúbicos (cc)</option>
                <option value="ton">Toneladas (t)</option>
                <option value="unid">Unidades</option>
                <option value="dosis">Dosis</option>
                <option value="bolsas">Bolsas</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="g">Gramos (g)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ubicación / Depósito <span className="text-red-500">*</span>
            </label>
            {!isNewLocation ? (
              <select
                required
                value={formData.depot_id}
                onChange={(e) => {
                  if (e.target.value === 'new_location') {
                    setIsNewLocation(true);
                    setNewLocationName('');
                  } else {
                    setFormData({...formData, depot_id: e.target.value});
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">Selecciona una ubicación...</option>
                <optgroup label="Depósitos">
                  {depots.map(depot => (
                    <option key={`depot-${depot.id}`} value={`depot:${depot.id}`}>{depot.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Lotes (Marcados como Depósito)">
                  {depotLots.map(lot => (
                    <option key={`lot-${lot.id}`} value={`lot:${lot.id}`}>{lot.name}</option>
                  ))}
                </optgroup>
                <option value="new_location">+ Nueva Ubicación</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Escribe el nombre del depósito..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsNewLocation(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  title="Volver a lista"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Es obligatorio asignar una ubicación o depósito para el insumo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Laboratorio</label>
              <input
                type="text"
                value={formData.laboratory}
                onChange={(e) => setFormData({...formData, laboratory: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Variedad</label>
              <input
                type="text"
                value={formData.variety}
                onChange={(e) => setFormData({...formData, variety: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Ej: Soja RR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Droga / Principio Activo</label>
              <input
                type="text"
                value={formData.active_ingredient}
                onChange={(e) => setFormData({...formData, active_ingredient: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Ej: Ivermectina"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lote</label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Vencimiento</label>
              <input
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Ingreso</label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({...formData, cost_per_unit: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="ARS">Pesos ($)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alerta de Stock Mínimo</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_stock_alert}
                onChange={(e) => setFormData({...formData, min_stock_alert: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                {formData.unit}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Se mostrará una alerta cuando el stock sea menor a este valor.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
              placeholder="Detalles adicionales..."
            ></textarea>
          </div>

          {!input && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad de Inicio de Stock</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.initial_stock}
                  onChange={(e) => setFormData({...formData, initial_stock: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {formData.unit}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Stock inicial al crear este insumo.</p>
            </div>
          )}
        </form>

        <div className="p-4 border-t border-slate-200 flex justify-between gap-3">
          {input && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              disabled={loading || deleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploading || deleting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar Insumo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}