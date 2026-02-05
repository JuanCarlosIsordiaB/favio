/**
 * MovementFormModal.jsx
 * Modal para registrar movimientos de stock
 * Tipos: entry, exit, adjustment, transfer
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader, AlertTriangle, TrendingDown, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { validarMovimiento } from '../../lib/validations/inputValidations';

export default function MovementFormModal({
  isOpen,
  inputs = [],
  depots = [],
  lotes = [],
  onSubmit,
  onCancel,
  isLoading = false
}) {
  const [formData, setFormData] = useState({
    input_id: '',
    type: 'exit',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    destination_depot_id: '',
    unit_cost: '',
    document_reference: '',
    lot_id: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);
  const [selectedInput, setSelectedInput] = useState(null);

  // Actualizar stock disponible cuando cambia el insumo seleccionado
  useEffect(() => {
    if (formData.input_id) {
      const insumo = inputs.find(i => i.id === formData.input_id);
      if (insumo) {
        setCurrentStock(insumo.current_stock || 0);
        setSelectedInput(insumo);
      }
    } else {
      setCurrentStock(0);
      setSelectedInput(null);
    }
  }, [formData.input_id, inputs]);

  // Limpiar formulario cuando se abre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        input_id: '',
        type: 'exit',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        destination_depot_id: '',
        unit_cost: '',
        document_reference: '',
        lot_id: ''
      });
      setErrors({});
      setCurrentStock(0);
      setSelectedInput(null);
    }
  }, [isOpen]);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  function handleTypeChange(newType) {
    setFormData(prev => ({
      ...prev,
      type: newType,
      destination_depot_id: '' // Limpiar destino si no es transfer
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    // Validar datos
    const validacion = validarMovimiento(formData, currentStock);
    if (!validacion.valido) {
      setErrors(validacion.errores);
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast.error(error.message || 'Error al registrar movimiento');
    } finally {
      setIsSubmitting(false);
    }
  }

  const tiposMovimiento = [
    {
      valor: 'entry',
      etiqueta: 'Ingreso',
      icono: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      desc: 'Entrada de insumo'
    },
    {
      valor: 'exit',
      etiqueta: 'Egreso',
      icono: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      desc: 'Salida de insumo'
    },
    {
      valor: 'adjustment',
      etiqueta: 'Ajuste',
      icono: AlertTriangle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      desc: 'Rectificación'
    },
    {
      valor: 'transfer',
      etiqueta: 'Transferencia',
      icono: ArrowRightLeft,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      desc: 'Entre depósitos'
    }
  ];

  if (!isOpen) {
    return null;
  }

  const tipoActual = tiposMovimiento.find(t => t.valor === formData.type);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Registrar Movimiento
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Registra un movimiento de stock en el sistema
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selector de Insumo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Insumo <span className="text-red-500">*</span>
            </label>
            <select
              name="input_id"
              value={formData.input_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                errors.input_id ? 'border-red-500 bg-red-50' : 'border-slate-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar insumo...</option>
              {inputs.map(insumo => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.name} ({insumo.unit}) - Stock: {insumo.current_stock}
                </option>
              ))}
            </select>
            {errors.input_id && (
              <p className="text-red-500 text-xs mt-1">{errors.input_id}</p>
            )}
          </div>

          {/* Stock Disponible */}
          {selectedInput && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase font-bold">Insumo</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedInput.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase font-bold">Unidad</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedInput.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase font-bold">Stock Actual</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">{currentStock}</p>
                </div>
                {selectedInput.min_stock_alert > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold">Mínimo</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{selectedInput.min_stock_alert}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiposMovimiento.map(tipo => {
                const Icono = tipo.icono;
                const isSelected = formData.type === tipo.valor;
                return (
                  <button
                    key={tipo.valor}
                    type="button"
                    onClick={() => handleTypeChange(tipo.valor)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <Icono className={`w-5 h-5 ${tipo.color} mx-auto mb-1`} />
                    <p className="text-xs font-semibold text-slate-900">{tipo.etiqueta}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{tipo.desc}</p>
                  </button>
                );
              })}
            </div>
            {errors.type && (
              <p className="text-red-500 text-xs mt-1">{errors.type}</p>
            )}
          </div>

          {/* Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                  errors.quantity ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Costo Unitario */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Costo Unitario (opcional)
              </label>
              <input
                type="number"
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="0.00"
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500 mt-1">Para valuación de movimientos</p>
            </div>
          </div>

          {/* Destino (solo para Transfer) */}
          {formData.type === 'transfer' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Depósito Destino <span className="text-red-500">*</span>
              </label>
              <select
                name="destination_depot_id"
                value={formData.destination_depot_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                  errors.destination_depot_id ? 'border-red-500 bg-red-50' : 'border-slate-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="">Seleccionar destino...</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name}
                  </option>
                ))}
              </select>
              {errors.destination_depot_id && (
                <p className="text-red-500 text-xs mt-1">{errors.destination_depot_id}</p>
              )}
            </div>
          )}

          {/* Lote/Depósito (REQUERIDO para TODOS los tipos - trazabilidad completa) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {formData.type === 'entry' && 'Depósito de Ingreso'}
              {formData.type === 'exit' && 'Lote de Consumo'}
              {formData.type === 'adjustment' && 'Depósito'}
              {formData.type === 'transfer' && 'Depósito Origen'}
              {' '}<span className="text-red-500">*</span>
            </label>
            <select
              name="lot_id"
              value={formData.lot_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white ${
                errors.lot_id ? 'border-red-500 bg-red-50' : 'border-slate-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar...</option>
              {formData.type === 'entry' || formData.type === 'adjustment' || formData.type === 'transfer'
                ? depots.map(depot => (
                    <option key={depot.id} value={depot.id}>
                      {depot.name}
                    </option>
                  ))
                : lotes.map(lote => (
                    <option key={lote.id} value={lote.id}>
                      {lote.name}
                    </option>
                  ))
              }
            </select>
            {errors.lot_id && (
              <p className="text-red-500 text-xs mt-1">{errors.lot_id}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {formData.type === 'entry' && 'Depósito donde ingresa el insumo'}
              {formData.type === 'exit' && 'Lote productivo donde se consume'}
              {formData.type === 'adjustment' && 'Depósito donde se realiza el ajuste'}
              {formData.type === 'transfer' && 'Depósito de origen de la transferencia'}
            </p>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fecha
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                errors.date ? 'border-red-500 bg-red-50' : 'border-slate-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Fecha del movimiento</p>
          </div>

          {/* Referencia/Descripción */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Referencia/Descripción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition ${
                errors.description ? 'border-red-500 bg-red-50' : 'border-slate-300'
              }`}
              placeholder="Ej: Factura #123, Trabajo #456, Ajuste por vencimiento"
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Trazabilidad: factura, trabajo, remito, etc.</p>
          </div>

          {/* Número de Documento */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Número de Documento <span className="text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              name="document_reference"
              value={formData.document_reference}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              placeholder="Ej: FAC-2024-001, REM-456, OC-789"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-1">
              Para vincular con factura, remito, orden de compra, etc.
            </p>
          </div>

          {/* Info Alert */}
          {formData.type === 'exit' && currentStock > 0 && formData.quantity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Stock después del movimiento:</span> {(currentStock - parseFloat(formData.quantity || 0)).toFixed(2)} {selectedInput?.unit}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Registrar Movimiento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
