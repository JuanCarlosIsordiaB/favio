import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { Plus, Search, DollarSign, CheckCircle, XCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentOrders({ firmId }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    beneficiary_name: '',
    beneficiary_rut: '',
    beneficiary_bank: '',
    beneficiary_account: '',
    amount: '',
    currency: 'UYU',
    concept: '',
    status: 'pending',
    payment_date: '',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    if (firmId) fetchOrders();
  }, [firmId]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('firm_id', firmId)
        .order('order_date', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching payment orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('payment_orders')
        .insert([{ ...formData, firm_id: firmId }]);
      if (error) throw error;

      // Registrar auditoría para orden de pago
      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: null,
        tipo: 'orden_pago',
        descripcion: `Creación de orden de pago: ${formData.order_number} - ${formData.beneficiary_name}`,
        moduloOrigen: 'payment_orders',
        usuario: user?.full_name || 'sistema',
        metadata: {
          order_number: formData.order_number,
          beneficiary_name: formData.beneficiary_name,
          beneficiary_rut: formData.beneficiary_rut,
          amount: parseFloat(formData.amount || 0),
          currency: formData.currency,
          payment_method: formData.payment_method,
          concept: formData.concept,
          status: formData.status,
          beneficiary_bank: formData.beneficiary_bank,
          beneficiary_account: formData.beneficiary_account
        }
      }).catch(err => console.warn('Error registrando en auditoría:', err));

      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error saving payment order:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta orden de pago?')) return;
    try {
      setLoading(true);

      // Obtener datos de la orden para registrar en auditoría
      const orderToDelete = orders.find(o => o.id === id);

      const { error } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Registrar auditoría para eliminación de orden de pago
      if (orderToDelete) {
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'orden_pago',
          descripcion: `Eliminación de orden de pago: ${orderToDelete.order_number} - ${orderToDelete.beneficiary_name}`,
          moduloOrigen: 'payment_orders',
          usuario: user?.full_name || 'sistema',
          metadata: {
            order_number: orderToDelete.order_number,
            beneficiary_name: orderToDelete.beneficiary_name,
            amount: orderToDelete.amount,
            currency: orderToDelete.currency,
            status: orderToDelete.status,
            deleted_at: new Date().toISOString()
          }
        }).catch(err => console.warn('Error registrando en auditoría:', err));
      }

      fetchOrders();
    } catch (error) {
      console.error('Error deleting payment order:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      beneficiary_name: '',
      beneficiary_rut: '',
      beneficiary_bank: '',
      beneficiary_account: '',
      amount: '',
      currency: 'UYU',
      concept: '',
      status: 'pending',
      payment_date: '',
      reference_number: '',
      notes: ''
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      paid: { label: 'Pagado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
      rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const { label, color, icon: Icon } = config[status] || config.pending;
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
          <h1 className="text-2xl font-bold text-slate-900">Órdenes de Pago</h1>
          <p className="text-slate-500">Gestión de órdenes de pago</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nueva Orden de Pago
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-500">Nº Orden</th>
                <th className="px-6 py-3 font-medium text-slate-500">Fecha</th>
                <th className="px-6 py-3 font-medium text-slate-500">Beneficiario</th>
                <th className="px-6 py-3 font-medium text-slate-500">Concepto</th>
                <th className="px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Monto</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{order.order_number}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{order.beneficiary_name}</p>
                      {order.beneficiary_rut && (
                        <p className="text-xs text-slate-500">RUT: {order.beneficiary_rut}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{order.concept}</td>
                  <td className="px-6 py-3">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-3 font-bold text-right text-green-600">
                    {order.currency === 'USD' ? 'US$ ' : '$ '}{order.amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    No hay órdenes de pago registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Nueva Orden de Pago</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nº Orden *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.order_number}
                    onChange={e => setFormData({...formData, order_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.order_date}
                    onChange={e => setFormData({...formData, order_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beneficiario *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.beneficiary_name}
                    onChange={e => setFormData({...formData, beneficiary_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.beneficiary_rut}
                    onChange={e => setFormData({...formData, beneficiary_rut: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago *</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    value={formData.payment_method}
                    onChange={e => setFormData({...formData, payment_method: e.target.value})}
                  >
                    <option value="transfer">Transferencia</option>
                    <option value="check">Cheque</option>
                    <option value="cash">Efectivo</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="debit_card">Tarjeta de Débito</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Concepto *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.concept}
                    onChange={e => setFormData({...formData, concept: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.beneficiary_bank}
                    onChange={e => setFormData({...formData, beneficiary_bank: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.beneficiary_account}
                    onChange={e => setFormData({...formData, beneficiary_account: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
