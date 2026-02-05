import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, AlertTriangle, Package, History, FileText, ArrowRightLeft, Calendar } from 'lucide-react';
import InputForm from './InputForm';
import StockMovementForm from './StockMovementForm';

export default function InputManager({ selectedFirmId }) {
  const [inputs, setInputs] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'movements', 'by-depot'
  const [showInputModal, setShowInputModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedInput, setSelectedInput] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depots, setDepots] = useState([]);
  const [depotLots, setDepotLots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('all');

  useEffect(() => {
    if (selectedFirmId) {
      fetchData();
    }
  }, [selectedFirmId, startDate, endDate]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch Inputs with depot and lot information
      const { data: inputsData, error: inputsError } = await supabase
        .from('inputs')
        .select(`
          *,
          depots(id, name),
          lots(id, name)
        `)
        .eq('firm_id', selectedFirmId)
        .order('name');

      if (inputsError) throw inputsError;
      setInputs(inputsData || []);

      // Fetch Depots
      const { data: depotsData, error: depotsError } = await supabase
        .from('depots')
        .select('id, name')
        .eq('firm_id', selectedFirmId)
        .order('name');

      if (depotsError) throw depotsError;
      setDepots(depotsData || []);

      // Fetch Lots marked as Depots
      const { data: lotsData, error: lotsError } = await supabase
        .from('lots')
        .select('id, name')
        .eq('firm_id', selectedFirmId)
        .eq('is_depot', true)
        .order('name');

      if (lotsError) throw lotsError;
      setDepotLots(lotsData || []);

      // Fetch Movements
      let query = supabase
        .from('input_movements')
        .select(`
          *,
          inputs!input_movements_input_id_fkey!inner (
            name,
            unit,
            firm_id
          ),
          lots (
            name
          ),
          destination_input:inputs!input_movements_destination_input_id_fkey (
            name
          )
        `)
        .eq('inputs.firm_id', selectedFirmId)
        .order('date', { ascending: false });

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data: movementsData, error: movementsError } = await query.limit(100);

      if (movementsError) throw movementsError;
      setMovements(movementsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredInputs = inputs.filter(input => {
    const matchesSearch = input.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (input.brand && input.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || input.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (cat) => {
    const map = {
      'fertilizer': 'Fertilizante',
      'phytosanitary': 'Fitosanitario',
      'fuel': 'Combustible',
      'seed': 'Semilla',
      'veterinary_med': 'Medicamentos Veterinarios',
      'other': 'Otro'
    };
    return map[cat] || cat;
  };

  const getCategoryColor = (cat) => {
    const map = {
      'fertilizer': 'bg-blue-100 text-blue-800',
      'phytosanitary': 'bg-red-100 text-red-800',
      'fuel': 'bg-yellow-100 text-yellow-800',
      'seed': 'bg-green-100 text-green-800',
      'veterinary_med': 'bg-purple-100 text-purple-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return map[cat] || 'bg-gray-100 text-gray-800';
  };

  if (!selectedFirmId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p>Selecciona una firma para gestionar insumos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insumos y Stock</h1>
          <p className="text-slate-500">Gestión de inventario y movimientos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setSelectedInput(null); setShowMovementModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          >
            <ArrowUpRight size={18} />
            Registrar Movimiento
          </button>
          <button 
            onClick={() => { setSelectedInput(null); setShowInputModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-2 font-medium text-sm transition-colors relative ${
              activeTab === 'inventory'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Inventario General
          </button>
          <button
            onClick={() => setActiveTab('by-depot')}
            className={`pb-4 px-2 font-medium text-sm transition-colors relative ${
              activeTab === 'by-depot'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Por Depósito
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-4 px-2 font-medium text-sm transition-colors relative ${
              activeTab === 'movements'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Historial de Movimientos
          </button>
        </nav>
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="all">Todas las categorías</option>
                <option value="fertilizer">Fertilizantes</option>
                <option value="phytosanitary">Fitosanitarios</option>
                <option value="seed">Semillas</option>
                <option value="veterinary_med">Medicamentos Veterinarios</option>
                <option value="fuel">Combustibles</option>
                <option value="other">Otros</option>
              </select>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInputs.map(input => (
              <div key={input.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    {input.image_url ? (
                      <img 
                        src={input.image_url} 
                        alt={input.name} 
                        className="w-12 h-12 rounded-lg object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getCategoryColor(input.category)}`}>
                        {getCategoryLabel(input.category)}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">{input.name}</h3>
                      {input.brand && <p className="text-sm text-slate-500">{input.brand}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {input.current_stock} <span className="text-sm font-normal text-slate-500">{input.unit}</span>
                    </p>
                    {input.current_stock <= input.min_stock_alert && (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1 justify-end">
                        <AlertTriangle size={12} />
                        <span>Stock Bajo</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Costo Promedio:</span>
                    <span className="font-medium">${input.cost_per_unit}/{input.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Valor Total:</span>
                    <span className="font-medium text-slate-900">${(input.current_stock * input.cost_per_unit).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button 
                    onClick={() => { setSelectedInput(input); setShowMovementModal(true); }}
                    className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Movimiento
                  </button>
                  <button 
                    onClick={() => { setSelectedInput(input); setShowInputModal(true); }}
                    className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredInputs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
              <Package size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No se encontraron insumos</p>
              <p className="text-sm text-slate-400">Prueba ajustar los filtros o crea un nuevo insumo</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'by-depot' && (
        <div className="space-y-4">
          {/* Depot Selector */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <Package size={18} />
              <span className="font-medium text-sm">Seleccionar Depósito:</span>
            </div>
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              <option value="all">Todos los Depósitos</option>
              <optgroup label="Depósitos">
                {depots.map(depot => (
                  <option key={`depot-${depot.id}`} value={`depot:${depot.id}`}>{depot.name}</option>
                ))}
              </optgroup>
              <optgroup label="Lotes como Depósito">
                {depotLots.map(lot => (
                  <option key={`lot-${lot.id}`} value={`lot:${lot.id}`}>{lot.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Depots Groups */}
          {selectedDepot === 'all' ? (
            <div className="space-y-6">
              {/* Regular Depots */}
              {depots.map(depot => {
                const depotInputs = inputs.filter(inp => inp.depot_id === depot.id);
                if (depotInputs.length === 0) return null;

                return (
                  <div key={`depot-section-${depot.id}`} className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-green-600">
                      <Package size={24} className="text-green-600" />
                      <h3 className="text-xl font-bold text-slate-900">{depot.name}</h3>
                      <span className="ml-auto text-sm text-slate-500">
                        {depotInputs.length} insumo{depotInputs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {depotInputs.map(input => (
                        <div key={input.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-3">
                              {input.image_url ? (
                                <img
                                  src={input.image_url}
                                  alt={input.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Package size={20} />
                                </div>
                              )}
                              <div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getCategoryColor(input.category)}`}>
                                  {getCategoryLabel(input.category)}
                                </span>
                                <h3 className="font-bold text-lg text-slate-900 leading-tight">{input.name}</h3>
                                {input.brand && <p className="text-sm text-slate-500">{input.brand}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">
                                {input.current_stock} <span className="text-sm font-normal text-slate-500">{input.unit}</span>
                              </p>
                              {input.current_stock <= input.min_stock_alert && (
                                <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1 justify-end">
                                  <AlertTriangle size={12} />
                                  <span>Stock Bajo</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Costo:</span>
                              <span className="font-medium">{input.currency === 'USD' ? 'USD' : '$'} {input.cost_per_unit}/{input.unit}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Valor Total:</span>
                              <span className="font-medium text-slate-900">
                                {input.currency === 'USD' ? 'USD' : '$'} {(input.current_stock * input.cost_per_unit).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => { setSelectedInput(input); setShowMovementModal(true); }}
                              className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Movimiento
                            </button>
                            <button
                              onClick={() => { setSelectedInput(input); setShowInputModal(true); }}
                              className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Lot Depots */}
              {depotLots.map(lot => {
                const lotInputs = inputs.filter(inp => inp.lot_id === lot.id);
                if (lotInputs.length === 0) return null;

                return (
                  <div key={`lot-section-${lot.id}`} className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-green-600">
                      <Package size={24} className="text-green-600" />
                      <h3 className="text-xl font-bold text-slate-900">{lot.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Lote</span>
                      <span className="ml-auto text-sm text-slate-500">
                        {lotInputs.length} insumo{lotInputs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lotInputs.map(input => (
                        <div key={input.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-3">
                              {input.image_url ? (
                                <img
                                  src={input.image_url}
                                  alt={input.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Package size={20} />
                                </div>
                              )}
                              <div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getCategoryColor(input.category)}`}>
                                  {getCategoryLabel(input.category)}
                                </span>
                                <h3 className="font-bold text-lg text-slate-900 leading-tight">{input.name}</h3>
                                {input.brand && <p className="text-sm text-slate-500">{input.brand}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">
                                {input.current_stock} <span className="text-sm font-normal text-slate-500">{input.unit}</span>
                              </p>
                              {input.current_stock <= input.min_stock_alert && (
                                <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1 justify-end">
                                  <AlertTriangle size={12} />
                                  <span>Stock Bajo</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Costo:</span>
                              <span className="font-medium">{input.currency === 'USD' ? 'USD' : '$'} {input.cost_per_unit}/{input.unit}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Valor Total:</span>
                              <span className="font-medium text-slate-900">
                                {input.currency === 'USD' ? 'USD' : '$'} {(input.current_stock * input.cost_per_unit).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => { setSelectedInput(input); setShowMovementModal(true); }}
                              className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Movimiento
                            </button>
                            <button
                              onClick={() => { setSelectedInput(input); setShowInputModal(true); }}
                              className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {depots.length === 0 && depotLots.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                  <Package size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No hay depósitos configurados</p>
                  <p className="text-sm text-slate-400">Crea un depósito o marca un lote como depósito para comenzar</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const isDepot = selectedDepot.startsWith('depot:');
                const id = selectedDepot.replace('depot:', '').replace('lot:', '');
                const filteredDepotInputs = isDepot
                  ? inputs.filter(inp => inp.depot_id === id)
                  : inputs.filter(inp => inp.lot_id === id);

                return (
                  <>
                    {filteredDepotInputs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDepotInputs.map(input => (
                          <div key={input.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-3">
                                {input.image_url ? (
                                  <img
                                    src={input.image_url}
                                    alt={input.name}
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-100"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Package size={20} />
                                  </div>
                                )}
                                <div>
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getCategoryColor(input.category)}`}>
                                    {getCategoryLabel(input.category)}
                                  </span>
                                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{input.name}</h3>
                                  {input.brand && <p className="text-sm text-slate-500">{input.brand}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-900">
                                  {input.current_stock} <span className="text-sm font-normal text-slate-500">{input.unit}</span>
                                </p>
                                {input.current_stock <= input.min_stock_alert && (
                                  <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1 justify-end">
                                    <AlertTriangle size={12} />
                                    <span>Stock Bajo</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Costo:</span>
                                <span className="font-medium">{input.currency === 'USD' ? 'USD' : '$'} {input.cost_per_unit}/{input.unit}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Valor Total:</span>
                                <span className="font-medium text-slate-900">
                                  {input.currency === 'USD' ? 'USD' : '$'} {(input.current_stock * input.cost_per_unit).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => { setSelectedInput(input); setShowMovementModal(true); }}
                                className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                Movimiento
                              </button>
                              <button
                                onClick={() => { setSelectedInput(input); setShowInputModal(true); }}
                                className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                        <Package size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No hay insumos en este depósito</p>
                        <p className="text-sm text-slate-400">Agrega insumos a este depósito para comenzar</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={18} />
              <span className="font-medium text-sm">Filtrar por fecha:</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-500">Fecha</th>
                <th className="px-6 py-3 font-medium text-slate-500">Insumo</th>
                <th className="px-6 py-3 font-medium text-slate-500">Tipo</th>
                <th className="px-6 py-3 font-medium text-slate-500">Cantidad</th>
                <th className="px-6 py-3 font-medium text-slate-500">Destino/Detalle</th>
                <th className="px-6 py-3 font-medium text-slate-500">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {movements.map(mov => (
                <tr key={mov.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(mov.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {mov.inputs?.name}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      mov.type === 'entry' ? 'bg-green-100 text-green-800' :
                      mov.type === 'exit' ? 'bg-red-100 text-red-800' :
                      mov.type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {mov.type === 'entry' ? <ArrowDownLeft size={12} /> : 
                       mov.type === 'exit' ? <ArrowUpRight size={12} /> : 
                       mov.type === 'transfer' ? <ArrowRightLeft size={12} /> :
                       <History size={12} />}
                      {mov.type === 'entry' ? 'Ingreso' : 
                       mov.type === 'exit' ? 'Salida' : 
                       mov.type === 'transfer' ? 'Movimiento' :
                       'Ajuste'}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {mov.type === 'exit' || mov.type === 'transfer' ? '-' : '+'}{mov.quantity} {mov.inputs?.unit}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {mov.type === 'transfer' && mov.destination_input 
                      ? <span className="flex items-center gap-1"><ArrowRightLeft size={12} className="text-slate-400"/> Hacia: {mov.destination_input.name}</span>
                      : mov.lots ? `Lote: ${mov.lots.name}` : mov.description || '-'}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    Admin
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <FileText size={24} className="mx-auto mb-2 text-slate-400" />
                    <p className="font-medium">No hay movimientos registrados para esta firma.</p>
                    <p className="text-sm text-slate-400">Puedes ver todos los insumos en la pestaña "Inventario Actual".</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Modals */}
      {showInputModal && (
        <InputForm 
          input={selectedInput}
          firmId={selectedFirmId}
          onClose={() => setShowInputModal(false)}
          onSave={() => fetchData()}
          onDelete={() => fetchData()}
        />
      )}

      {showMovementModal && (
        <StockMovementForm 
          input={selectedInput}
          firmId={selectedFirmId}
          onClose={() => setShowMovementModal(false)}
          onSave={() => fetchData()}
        />
      )}
    </div>
  );
}