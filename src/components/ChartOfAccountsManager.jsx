/**
 * ChartOfAccountsManager.jsx
 * Gestor del plan de cuentas contable con estructura jerárquica
 */

import React, { useState, useEffect } from 'react';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import { Plus, Edit2, Download, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { value: 'ACTIVO', label: 'Activo', color: 'bg-blue-100 text-blue-800' },
  { value: 'PASIVO', label: 'Pasivo', color: 'bg-red-100 text-red-800' },
  { value: 'PATRIMONIO', label: 'Patrimonio', color: 'bg-purple-100 text-purple-800' },
  { value: 'INGRESO', label: 'Ingreso', color: 'bg-green-100 text-green-800' },
  { value: 'GASTO', label: 'Gasto', color: 'bg-orange-100 text-orange-800' }
];

const BALANCE_NATURES = [
  { value: 'DEUDOR', label: 'Deudor' },
  { value: 'ACREEDOR', label: 'Acreedor' }
];

export default function ChartOfAccountsManager({ firmId, firmName }) {
  const { flatAccounts, loading, hasChart, loadAccounts, loadAllAccounts, createAccount, updateAccount, deactivateAccount, activateAccount, loadStandardChart, getParentOptions } = useChartOfAccounts();

  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [currentAccountType, setCurrentAccountType] = useState('ACTIVO');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    accountType: 'ACTIVO',
    balanceNature: 'DEUDOR',
    allowsTransactions: true,
    parentId: null
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (firmId) {
      loadAllAccounts(firmId);
    }
  }, [firmId, loadAllAccounts]);

  useEffect(() => {
    if (showForm && formData.accountType) {
      loadParentOptions();
    }
  }, [showForm, formData.accountType]);

  const loadParentOptions = async () => {
    try {
      const options = await getParentOptions(firmId, formData.accountType, editingId);
      setParentOptions(options);
    } catch (error) {
      console.error('Error loading parent options:', error);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.code.trim()) {
      errors.code = 'El código es requerido';
    } else if (formData.code.length > 20) {
      errors.code = 'El código no puede exceder 20 caracteres';
    }

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.length > 255) {
      errors.name = 'El nombre no puede exceder 255 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenForm = (account = null) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        code: account.code,
        name: account.name,
        description: account.description || '',
        accountType: account.account_type,
        balanceNature: account.balance_nature,
        allowsTransactions: account.allows_transactions,
        parentId: account.parent_id
      });
      setCurrentAccountType(account.account_type);
    } else {
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        accountType: 'ACTIVO',
        balanceNature: 'DEUDOR',
        allowsTransactions: true,
        parentId: null
      });
      setCurrentAccountType('ACTIVO');
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    try {
      if (editingId) {
        await updateAccount(editingId, {
          name: formData.name,
          description: formData.description,
          balance_nature: formData.balanceNature,
          allows_transactions: formData.allowsTransactions,
          parent_id: formData.parentId
        });
      } else {
        await createAccount({
          firmId,
          code: formData.code,
          name: formData.name,
          description: formData.description,
          accountType: formData.accountType,
          balanceNature: formData.balanceNature,
          allowsTransactions: formData.allowsTransactions,
          parentId: formData.parentId
        });
      }

      setShowForm(false);
      await loadAllAccounts(firmId);
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDeactivate = async (accountId) => {
    if (!window.confirm('¿Desactivar esta cuenta? Sus subcuentas también serán desactivadas.')) {
      return;
    }

    try {
      await deactivateAccount(accountId);
      await loadAllAccounts(firmId);
    } catch (error) {
      console.error('Error deactivating account:', error);
    }
  };

  const handleActivate = async (accountId) => {
    try {
      await activateAccount(accountId);
      await loadAllAccounts(firmId);
    } catch (error) {
      console.error('Error activating account:', error);
    }
  };

  const handleLoadStandardChart = async () => {
    if (!window.confirm('¿Cargar el plan de cuentas estándar? Esto creará la estructura base de 30 cuentas.')) {
      return;
    }

    try {
      await loadStandardChart(firmId);
      await loadAllAccounts(firmId);
    } catch (error) {
      console.error('Error loading standard chart:', error);
    }
  };

  const getTypeColor = (type) => {
    const typeObj = ACCOUNT_TYPES.find(t => t.value === type);
    return typeObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    const typeObj = ACCOUNT_TYPES.find(t => t.value === type);
    return typeObj?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Plan de Cuentas Contable</h3>
          <p className="text-sm text-slate-600">
            Estructura jerárquica de cuentas para {firmName}
          </p>
        </div>
        <div className="flex gap-2">
          {!hasChart && (
            <button
              onClick={handleLoadStandardChart}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download size={18} />
              Cargar Plan Estándar
            </button>
          )}
          <button
            onClick={() => handleOpenForm()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Nueva Cuenta
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Cargando...</div>
      ) : flatAccounts.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-slate-600 mb-4">No hay cuentas configuradas aún</p>
          <button
            onClick={handleLoadStandardChart}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Download size={18} />
            Cargar Plan Estándar
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Código</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tipo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Naturaleza</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Transacciones</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {flatAccounts.map(account => (
                <tr key={account.id} className={account.is_active ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-60'}>
                  <td className="px-6 py-3 text-sm">
                    {account.indent}
                    <span className="font-mono font-semibold text-slate-700">{account.code}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-700">
                    {account.indent}
                    {account.name}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(account.account_type)}`}>
                      {getTypeLabel(account.account_type)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {account.balance_nature === 'DEUDOR' ? '♀ Deudor' : '♂ Acreedor'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {account.allows_transactions ? (
                      <CheckCircle2 className="text-green-600" size={18} />
                    ) : (
                      <XCircle className="text-slate-400" size={18} />
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {account.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        <XCircle size={14} />
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenForm(account)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar cuenta"
                      >
                        <Edit2 size={16} />
                      </button>
                      {account.is_active ? (
                        <button
                          onClick={() => handleDeactivate(account.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Desactivar cuenta"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(account.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Activar cuenta"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                placeholder="Ej: 1.1.01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingId}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.code ? 'border-red-500' : 'border-slate-300'
                } ${editingId ? 'bg-slate-100' : ''}`}
              />
              {formErrors.code && (
                <p className="text-red-500 text-sm mt-1">{formErrors.code}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Caja"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.name ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción
              </label>
              <textarea
                placeholder="Descripción opcional..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Tipo de Cuenta (solo en creación) */}
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Cuenta *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      accountType: e.target.value,
                      balanceNature: e.target.value === 'INGRESO' || e.target.value === 'PATRIMONIO' || e.target.value === 'PASIVO' ? 'ACREEDOR' : 'DEUDOR'
                    });
                    setCurrentAccountType(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Naturaleza del Saldo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Naturaleza del Saldo *
              </label>
              <select
                value={formData.balanceNature}
                onChange={(e) => setFormData({ ...formData, balanceNature: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BALANCE_NATURES.map(nature => (
                  <option key={nature.value} value={nature.value}>
                    {nature.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cuenta Padre */}
            {parentOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cuenta Padre
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin padre (cuenta raíz)</option>
                  {parentOptions.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.code} - {parent.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Permite Transacciones */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowsTx"
                checked={formData.allowsTransactions}
                onChange={(e) => setFormData({ ...formData, allowsTransactions: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="allowsTx" className="text-sm font-medium text-slate-700">
                Permite transacciones (si no, es cuenta de resumen)
              </label>
            </div>

            {/* Botones */}
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editingId ? 'Actualizar' : 'Crear'} Cuenta
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
