import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { Plus, Search, Truck, Package, XCircle, CheckCircle, Edit2, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Remittances({ firmId }) {
  const { user } = useAuth();
  const [remittances, setRemittances] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    remittance_number: '',
    remittance_date: new Date().toISOString().split('T')[0],
    purchase_order_id: '',
    supplier_name: '',
    supplier_rut: '',
    transport_company: '',
    driver_name: '',
    vehicle_plate: '',
    delivery_address: '',
    received_by: '',
    received_date: '',
    status: 'in_transit',
    notes: '',
    items: []
  });
  const [selectedPO, setSelectedPO] = useState(null);

  useEffect(() => {
    if (firmId) {
      fetchRemittances();
      fetchPurchaseOrders();
      fetchInputs();
    }
  }, [firmId]);

  async function fetchRemittances() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('remittances')
        .select('*, remittance_items (*)')
        .eq('firm_id', firmId)
        .order('remittance_date', { ascending: false });
      if (error) throw error;
      setRemittances(data || []);
    } catch (error) {
      console.error('Error fetching remittances:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPurchaseOrders() {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          supplier_name,
          supplier_rut,
          delivery_address,
          purchase_order_items (
            id,
            item_description,
            quantity,
            unit,
            input_id
          )
        `)
        .eq('firm_id', firmId)
        .in('status', ['approved', 'sent']);
      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  }

  async function fetchInputs() {
    try {
      const { data, error } = await supabase
        .from('inputs')
        .select('id, name, unit, category')
        .eq('firm_id', firmId)
        .order('name');
      if (error) throw error;
      setInputs(data || []);
    } catch (error) {
      console.error('Error fetching inputs:', error);
    }
  }

  function handlePOSelection(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setFormData(prev => ({
        ...prev,
        purchase_order_id: po.id,
        supplier_name: po.supplier_name,
        supplier_rut: po.supplier_rut || '',
        delivery_address: po.delivery_address || '',
        items: po.purchase_order_items.map(item => ({
          purchase_order_item_id: item.id,
          input_id: item.input_id,
          item_description: item.item_description,
          quantity_ordered: item.quantity,
          quantity_received: item.quantity,
          unit: item.unit,
          condition: 'good',
          notes: ''
        }))
      }));
    } else {
      setSelectedPO(null);
      setFormData(prev => ({
        ...prev,
        purchase_order_id: '',
        supplier_name: '',
        supplier_rut: '',
        delivery_address: '',
        items: []
      }));
    }
  }

  function addItem() {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        purchase_order_item_id: null,
        input_id: '',
        item_description: '',
        quantity_ordered: 0,
        quantity_received: 0,
        unit: '',
        condition: 'good',
        notes: ''
      }]
    }));
  }

  function updateItem(index, field, value) {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function removeItem(index) {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }

  function resetForm() {
    setFormData({
      remittance_number: '',
      remittance_date: new Date().toISOString().split('T')[0],
      purchase_order_id: '',
      supplier_name: '',
      supplier_rut: '',
      transport_company: '',
      driver_name: '',
      vehicle_plate: '',
      delivery_address: '',
      received_by: '',
      received_date: '',
      status: 'in_transit',
      notes: '',
      items: []
    });
    setSelectedPO(null);
    setError('');
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Está seguro de eliminar este remito?')) return;
    try {
      setSaving(true);

      // Obtener datos del remito para registrar en auditoría
      const remittanceToDelete = remittances.find(r => r.id === id);

      const { error } = await supabase
        .from('remittances')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de remito
      if (remittanceToDelete) {
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'remito',
          descripcion: `Eliminación de remito: ${remittanceToDelete.remittance_number} - ${remittanceToDelete.supplier_name}`,
          moduloOrigen: 'remittances',
          usuario: user?.full_name || 'sistema',
          metadata: {
            remittance_number: remittanceToDelete.remittance_number,
            supplier_name: remittanceToDelete.supplier_name,
            status: remittanceToDelete.status,
            transport_company: remittanceToDelete.transport_company,
            vehicle_plate: remittanceToDelete.vehicle_plate,
            deleted_at: new Date().toISOString()
          }
        }).catch(err => console.warn('Error registrando en auditoría:', err));
      }

      await fetchRemittances();
    } catch (error) {
      console.error('Error deleting remittance:', error);
      setError('Error al eliminar el remito: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log('Submitting remittance:', formData);

    // Validations
    if (!formData.remittance_number.trim()) {
      setError('El número de remito es obligatorio');
      return;
    }
    if (!formData.supplier_name.trim()) {
      setError('El nombre del proveedor es obligatorio');
      return;
    }
    if (formData.items.length === 0) {
      setError('Debe agregar al menos un item');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Insert remittance
      const { data: remittance, error: remittanceError } = await supabase
        .from('remittances')
        .insert({
          firm_id: firmId,
          remittance_number: formData.remittance_number,
          remittance_date: formData.remittance_date,
          purchase_order_id: formData.purchase_order_id || null,
          supplier_name: formData.supplier_name,
          supplier_rut: formData.supplier_rut || null,
          transport_company: formData.transport_company || null,
          driver_name: formData.driver_name || null,
          vehicle_plate: formData.vehicle_plate || null,
          delivery_address: formData.delivery_address || null,
          received_by: formData.received_by || null,
          received_date: formData.received_date || null,
          status: formData.status,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (remittanceError) throw remittanceError;

      console.log('Remittance created:', remittance);

      // Insert remittance items
      const itemsToInsert = formData.items.map(item => ({
        remittance_id: remittance.id,
        purchase_order_item_id: item.purchase_order_item_id || null,
        input_id: item.input_id || null,
        item_description: item.item_description,
        quantity_ordered: item.quantity_ordered || null,
        quantity_received: item.quantity_received,
        unit: item.unit,
        condition: item.condition,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('remittance_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      console.log('Remittance items created');

      // Update purchase order status if linked
      if (formData.purchase_order_id) {
        const allReceived = formData.items.every(
          item => item.quantity_received >= item.quantity_ordered
        );
        const newStatus = allReceived ? 'received' : 'partially_received';

        await supabase
          .from('purchase_orders')
          .update({ status: newStatus })
          .eq('id', formData.purchase_order_id);
      }

      // Registrar auditoría para remito
      const totalItems = formData.items.length;
      const totalQuantity = formData.items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: null,
        tipo: 'remito',
        descripcion: `Creación de remito: ${formData.remittance_number} - ${formData.supplier_name}`,
        moduloOrigen: 'remittances',
        usuario: user?.full_name || 'sistema',
        metadata: {
          remittance_number: formData.remittance_number,
          supplier_name: formData.supplier_name,
          supplier_rut: formData.supplier_rut,
          status: formData.status,
          transport_company: formData.transport_company,
          driver_name: formData.driver_name,
          vehicle_plate: formData.vehicle_plate,
          items_count: totalItems,
          total_quantity_received: totalQuantity,
          delivery_address: formData.delivery_address,
          received_by: formData.received_by,
          received_date: formData.received_date,
          purchase_order_id: formData.purchase_order_id || null
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      // Refresh data
      await fetchRemittances();
      setShowModal(false);
      resetForm();

    } catch (error) {
      console.error('Error saving remittance:', error);
      setError(error.message || 'Error al guardar el remito');
    } finally {
      setSaving(false);
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      in_transit: { label: 'En Tránsito', color: 'bg-yellow-100 text-yellow-700', icon: Truck },
      received: { label: 'Recibido', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      partially_received: { label: 'Parcial', color: 'bg-blue-100 text-blue-700', icon: Package },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const { label, color, icon: Icon } = config[status] || config.in_transit;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remitos</h1>
          <p className="text-slate-500">Gestión de remitos de compra</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuevo Remito
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-500">Nº Remito</th>
                <th className="px-6 py-3 font-medium text-slate-500">Fecha</th>
                <th className="px-6 py-3 font-medium text-slate-500">Proveedor</th>
                <th className="px-6 py-3 font-medium text-slate-500">Transporte</th>
                <th className="px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {remittances.map(rem => (
                <tr key={rem.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{rem.remittance_number}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(rem.remittance_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{rem.supplier_name}</p>
                      {rem.supplier_rut && (
                        <p className="text-xs text-slate-500">RUT: {rem.supplier_rut}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {rem.transport_company || '-'}
                    {rem.vehicle_plate && <span className="block text-xs text-slate-500">{rem.vehicle_plate}</span>}
                  </td>
                  <td className="px-6 py-3">{getStatusBadge(rem.status)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(rem.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {remittances.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No hay remitos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Remito */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Nuevo Remito</h2>
                <p className="text-sm text-slate-500 mt-1">Complete la información del remito de entrega</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {/* Información del Remito */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Información del Remito</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nº Remito <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.remittance_number}
                        onChange={e => setFormData({ ...formData, remittance_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fecha Remito <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.remittance_date}
                        onChange={e => setFormData({ ...formData, remittance_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      >
                        <option value="in_transit">En Tránsito</option>
                        <option value="received">Recibido</option>
                        <option value="partially_received">Parcialmente Recibido</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Orden de Compra Vinculada */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Vinculación (Opcional)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Orden de Compra
                      </label>
                      <select
                        value={formData.purchase_order_id}
                        onChange={e => handlePOSelection(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      >
                        <option value="">Sin vincular</option>
                        {purchaseOrders.map(po => (
                          <option key={po.id} value={po.id}>
                            {po.order_number} - {po.supplier_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Seleccione una orden de compra para autocompletar datos y items
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información del Proveedor */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Información del Proveedor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nombre del Proveedor <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.supplier_name}
                        onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                        disabled={!!selectedPO}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                      <input
                        type="text"
                        value={formData.supplier_rut}
                        onChange={e => setFormData({ ...formData, supplier_rut: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={!!selectedPO}
                      />
                    </div>
                  </div>
                </div>

                {/* Información de Transporte */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Información de Transporte</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Empresa de Transporte</label>
                      <input
                        type="text"
                        value={formData.transport_company}
                        onChange={e => setFormData({ ...formData, transport_company: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Chofer</label>
                      <input
                        type="text"
                        value={formData.driver_name}
                        onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Patente del Vehículo</label>
                      <input
                        type="text"
                        value={formData.vehicle_plate}
                        onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Información de Entrega */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Información de Entrega</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de Entrega</label>
                      <input
                        type="text"
                        value={formData.delivery_address}
                        onChange={e => setFormData({ ...formData, delivery_address: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={!!selectedPO}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Recibido Por</label>
                      <input
                        type="text"
                        value={formData.received_by}
                        onChange={e => setFormData({ ...formData, received_by: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Recepción</label>
                      <input
                        type="date"
                        value={formData.received_date}
                        onChange={e => setFormData({ ...formData, received_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Items del Remito */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Items del Remito <span className="text-red-500">*</span>
                    </h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Agregar Item
                    </button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 text-center">
                      <Package className="mx-auto mb-2 text-slate-400" size={40} />
                      <p className="text-slate-600">No hay items agregados</p>
                      <p className="text-sm text-slate-500">Agregue items manualmente o seleccione una orden de compra</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-sm font-medium text-slate-700">Item #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="lg:col-span-2">
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Descripción del Item <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.item_description}
                                onChange={e => updateItem(index, 'item_description', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                                disabled={!!item.purchase_order_item_id}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Insumo Relacionado</label>
                              <select
                                value={item.input_id || ''}
                                onChange={e => updateItem(index, 'input_id', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                disabled={!!item.purchase_order_item_id}
                              >
                                <option value="">Sin vincular</option>
                                {inputs.map(inp => (
                                  <option key={inp.id} value={inp.id}>
                                    {inp.name} ({inp.category})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Cant. Pedida
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.quantity_ordered || ''}
                                onChange={e => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                disabled={!!item.purchase_order_item_id}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Cant. Recibida <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.quantity_received}
                                onChange={e => updateItem(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Unidad <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => updateItem(index, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                                disabled={!!item.purchase_order_item_id}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Condición</label>
                              <select
                                value={item.condition}
                                onChange={e => updateItem(index, 'condition', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                              >
                                <option value="good">Bueno</option>
                                <option value="damaged">Dañado</option>
                                <option value="incomplete">Incompleto</option>
                              </select>
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={e => updateItem(index, 'notes', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                placeholder="Observaciones sobre este item"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notas Generales */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas Generales</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Observaciones generales sobre el remito"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Guardar Remito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
