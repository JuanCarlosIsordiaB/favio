import React, { useState, useEffect } from 'react';
import {
  Plus, ChevronDown, MapPin, Users, Tractor, PawPrint, TrendingUp,
  CloudRain, ClipboardList, FlaskConical, Microscope, PackagePlus,
  Receipt, Banknote, ArrowLeftRight, Bell, ArrowUpCircle, ArrowDownCircle,
  LayoutGrid, Sprout, Activity, Coins
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AgriculturalWorkForm from './AgriculturalWorkForm';
import LivestockWorkForm from './LivestockWorkForm';
import RemittanceFormModal from './modales/RemittanceFormModal';
import { crearRemito } from '../services/remittances';
import { toast } from 'sonner';

export default function NewDataMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [activeForm, setActiveForm] = useState(null); // 'agricultural', 'livestock', etc.
  
  // Data states
  const [firms, setFirms] = useState([]);
  const [premises, setPremises] = useState([]);
  const [lots, setLots] = useState([]);
  
  // Selection states
  const [selectedFirm, setSelectedFirm] = useState('');
  const [selectedPremise, setSelectedPremise] = useState('');
  const [selectedLot, setSelectedLot] = useState('');

  // Fetch Firms on mount
  useEffect(() => {
    fetchFirms();
  }, []);

  // Fetch Premises when Firm changes
  useEffect(() => {
    if (selectedFirm) {
      fetchPremises(selectedFirm);
    } else {
      setPremises([]);
      setSelectedPremise('');
      setLots([]);
      setSelectedLot('');
    }
  }, [selectedFirm]);

  // Fetch Lots when Premise changes
  useEffect(() => {
    if (selectedPremise) {
      fetchLots(selectedPremise);
    } else {
      setLots([]);
      setSelectedLot('');
    }
  }, [selectedPremise]);

  const fetchFirms = async () => {
    try {
      const { data, error } = await supabase.from('firms').select('id, name');
      if (error) throw error;
      setFirms(data || []);
    } catch (error) {
      console.error('Error fetching firms:', error);
    }
  };

  const fetchPremises = async (firmId) => {
    try {
      const { data, error } = await supabase
        .from('premises')
        .select('id, name')
        .eq('firm_id', firmId);
      if (error) throw error;
      setPremises(data || []);
    } catch (error) {
      console.error('Error fetching premises:', error);
    }
  };

  const fetchLots = async (premiseId) => {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select('id, name')
        .eq('premise_id', premiseId);
      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error('Error fetching lots:', error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setShowSelection(false);
  };

  const handleMenuItemClick = (type) => {
    setSelectedType(type);
    setShowSelection(true);
    setIsOpen(false);
  };

  /**
   * Manejar envío de remito desde RemittanceFormModal
   */
  const handleRemittanceSubmit = async (submitData, items) => {
    try {
      console.log('🔍 [NewDataMenu] handleRemittanceSubmit recibiendo datos:', {
        submitData,
        items: items.map(i => ({ id: i.id, input_id: i.input_id, item_description: i.item_description }))
      });

      await crearRemito(submitData, items);
      toast.success('✓ Remito guardado correctamente');
      setActiveForm(null);
    } catch (error) {
      console.error('❌ Error guardando remito:', error);
      toast.error('Error guardando remito: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleSelectionSubmit = () => {
    setShowSelection(false);

    if (selectedType === "Nuevo Trabajo Agrícola") {
      setActiveForm('agricultural');
    } else if (selectedType === "Nuevo Trabajo Ganadero") {
      setActiveForm('livestock');
    } else if (selectedType === "Ingreso de Insumo") {
      setActiveForm('remittance');
    } else {
      // For other types not yet implemented
      console.log('Tipo:', selectedType);
      console.log('Firma:', selectedFirm, 'Predio:', selectedPremise, 'Lote:', selectedLot);
    }
  };

  const categories = [
    {
      title: "Estructura",
      icon: <LayoutGrid size={18} className="text-slate-500" />,
      items: [
        { label: "Nuevo Lote", icon: <MapPin size={16} className="text-blue-500" /> },
        { label: "Nuevo Personal", icon: <Users size={16} className="text-blue-500" /> }
      ]
    },
    {
      title: "Producción",
      icon: <Sprout size={18} className="text-green-600" />,
      items: [
        { label: "Nuevo Trabajo Agrícola", icon: <Tractor size={16} className="text-green-600" /> },
        { label: "Nuevo Trabajo Ganadero", icon: <PawPrint size={16} className="text-amber-600" /> },
        { label: "Nueva Proyección Agrícola", icon: <TrendingUp size={16} className="text-green-600" /> },
        { label: "Nueva Proyección Ganadera", icon: <TrendingUp size={16} className="text-amber-600" /> }
      ]
    },
    {
      title: "Monitoreo",
      icon: <Activity size={18} className="text-blue-600" />,
      items: [
        { label: "Nueva Lluvia", icon: <CloudRain size={16} className="text-blue-400" /> },
        { label: "Nuevo Monitoreo Agrícola", icon: <ClipboardList size={16} className="text-slate-600" /> },
        { label: "Nuevo Monitoreo Ganadero", icon: <ClipboardList size={16} className="text-slate-600" /> },
        { label: "Nuevo Análisis de suelo", icon: <FlaskConical size={16} className="text-purple-500" /> },
        { label: "Nuevo Análisis de semillas", icon: <Microscope size={16} className="text-purple-500" /> }
      ]
    },
    {
      title: "Insumos y Economía",
      icon: <Coins size={18} className="text-yellow-600" />,
      items: [
        { label: "Ingreso de Insumo", icon: <ArrowUpCircle size={16} className="text-green-500" /> },
        { label: "Gasto / Salida", icon: <ArrowDownCircle size={16} className="text-red-500" /> },
        { label: "Movimiento", icon: <ArrowLeftRight size={16} className="text-purple-500" /> },
        { label: "Nuevo Ingreso (Dinero)", icon: <Banknote size={16} className="text-green-600" /> },
        { label: "Nueva Factura", icon: <Receipt size={16} className="text-slate-600" /> }
      ]
    },
    {
      title: "Otros",
      icon: <Bell size={18} className="text-slate-500" />,
      items: [
        { label: "Nuevo Recordatorio", icon: <Bell size={16} className="text-yellow-500" /> }
      ]
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus size={16} />
        Nuevo Dato
        <ChevronDown size={16} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
          <div className="p-2 space-y-4">
            {categories.map((category, index) => (
              <div key={index} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {category.icon}
                  {category.title}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {category.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => handleMenuItemClick(item.label)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors group"
                    >
                      <div className="p-1.5 bg-slate-50 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {selectedType}
              </h3>
              <button onClick={() => setShowSelection(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Selecciona la ubicación donde se registrará este dato.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Firma</label>
                <select
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all"
                  value={selectedFirm}
                  onChange={(e) => setSelectedFirm(e.target.value)}
                >
                  <option value="">Seleccionar Firma</option>
                  {firms.map(firm => (
                    <option key={firm.id} value={firm.id}>{firm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Predio</label>
                <select
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all"
                  value={selectedPremise}
                  onChange={(e) => setSelectedPremise(e.target.value)}
                  disabled={!selectedFirm}
                >
                  <option value="">Seleccionar Predio</option>
                  {premises.map(premise => (
                    <option key={premise.id} value={premise.id}>{premise.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lote (opcional)</label>
                <select
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all"
                  value={selectedLot}
                  onChange={(e) => setSelectedLot(e.target.value)}
                  disabled={!selectedPremise}
                >
                  <option value="">Seleccionar Lote</option>
                  {lots.map(lot => (
                    <option key={lot.id} value={lot.id}>{lot.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowSelection(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSelectionSubmit}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:scale-105"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      {activeForm === 'agricultural' && (
        <AgriculturalWorkForm 
          onClose={() => setActiveForm(null)}
          initialData={{
            firm_id: selectedFirm,
            premise_id: selectedPremise,
            lot_id: selectedLot
          }}
        />
      )}

      {activeForm === 'livestock' && (
        <LivestockWorkForm
          onClose={() => setActiveForm(null)}
          initialData={{
            firm_id: selectedFirm,
            premise_id: selectedPremise,
            lot_id: selectedLot
          }}
        />
      )}

      {activeForm === 'remittance' && (
        <RemittanceFormModal
          isOpen={true}
          onClose={() => setActiveForm(null)}
          selectedFirm={{ id: selectedFirm }}
          selectedPremise={{ id: selectedPremise }}
          currentUser="Admin Test"
          onSubmit={handleRemittanceSubmit}
        />
      )}
    </div>
  );
}