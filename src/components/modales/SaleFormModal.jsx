import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { validarVenta, validarItemVenta, validarDisponibilidadStock } from '../../lib/validations/salesValidations';

export default function SaleFormModal({ firmId, premiseId, insumos, onClose, onSave }) {
  // Estado del formulario
  const [formData, setFormData] = useState({
    firm_id: firmId,
    premise_id: premiseId,
    client_name: '',
    client_rut: '',
    client_address: '',
    sale_date: new Date().toISOString().split('T')[0],
    currency: 'UYU',
    payment_terms: 'Contado',
    tax_rate: 22,
    notes: ''
  });

  // Ítems de la venta
  const [items, setItems] = useState([{
    input_id: '',
    input_name: '',
    depot_id: '',
    quantity: 0,
    unit: '',
    unit_price: 0,
    unit_cost: 0,
    tax_rate: 22
  }]);

  // Totales calculados
  const [totales, setTotales] = useState({
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0
  });

  // Errores de validación
  const [errores, setErrores] = useState({});
  const [erroresItems, setErroresItems] = useState({});

  // Calcular totales cuando cambian los ítems
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unit_price));
    }, 0);

    const tax_amount = subtotal * (formData.tax_rate / 100);
    const total_amount = subtotal + tax_amount;

    setTotales({ subtotal, tax_amount, total_amount });
  }, [items, formData.tax_rate]);

  // Agregar ítem
  const handleAddItem = () => {
    setItems([...items, {
      input_id: '',
      input_name: '',
      depot_id: '',
      quantity: 0,
      unit: '',
      unit_price: 0,
      unit_cost: 0,
      tax_rate: formData.tax_rate
    }]);
  };

  // Eliminar ítem
  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast.error('Debe haber al menos un producto');
    }
  };

  // Actualizar ítem
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Si cambia el insumo, cargar datos automáticos
    if (field === 'input_id') {
      const insumo = insumos.find(i => i.id === value);
      if (insumo) {
        newItems[index].input_name = insumo.name;
        newItems[index].unit = insumo.unit;
        newItems[index].unit_cost = insumo.cost_per_unit || 0;
        // Precio sugerido: costo * 1.3 (margen 30%)
        newItems[index].unit_price = Math.round((insumo.cost_per_unit || 0) * 1.3 * 100) / 100;
      }
    }

    setItems(newItems);
  };

  // Validar y guardar
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar datos generales
    const validacion = validarVenta(formData);
    if (!validacion.valido) {
      setErrores(validacion.errores);
      toast.error('Corrige los errores en el formulario');
      return;
    }

    // Validar ítems
    const erroresItemsCheck = {};
    items.forEach((item, index) => {
      const validacionItem = validarItemVenta(item);
      if (!validacionItem.valido) {
        erroresItemsCheck[index] = validacionItem.errores;
      }
    });

    if (Object.keys(erroresItemsCheck).length > 0) {
      setErroresItems(erroresItemsCheck);
      toast.error('Corrige los errores en los productos');
      return;
    }

    // Validar stock disponible
    const validacionStock = validarDisponibilidadStock(items, insumos);
    if (!validacionStock.valido) {
      const mensajes = validacionStock.errores
        .filter(e => e.tipo === 'insufficient_stock')
        .map(e => e.mensaje)
        .join('\n');
      toast.error(`Stock insuficiente:\n${mensajes}`);
      return;
    }

    // Guardar
    try {
      const ventaData = {
        ...formData,
        subtotal: totales.subtotal,
        tax_amount: totales.tax_amount,
        total_amount: totales.total_amount
      };

      await onSave(ventaData, items);
    } catch (error) {
      console.error('Error guardando venta:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Venta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Datos del Cliente */}
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-4">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente / Razón Social *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => {
                    setFormData({...formData, client_name: e.target.value});
                    setErrores({...errores, client_name: undefined});
                  }}
                  placeholder="Nombre del cliente"
                  className={errores.client_name ? 'border-red-500' : ''}
                />
                {errores.client_name && (
                  <span className="text-red-500 text-sm">{errores.client_name}</span>
                )}
              </div>

              <div>
                <Label>RUT</Label>
                <Input
                  value={formData.client_rut}
                  onChange={(e) => {
                    setFormData({...formData, client_rut: e.target.value});
                    setErrores({...errores, client_rut: undefined});
                  }}
                  placeholder="12.345.678-9"
                  className={errores.client_rut ? 'border-red-500' : ''}
                />
                {errores.client_rut && (
                  <span className="text-red-500 text-sm">{errores.client_rut}</span>
                )}
              </div>

              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.client_address}
                  onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                  placeholder="Dirección de entrega"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Datos de la Venta */}
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-4">Datos de la Venta</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => {
                    setFormData({...formData, sale_date: e.target.value});
                    setErrores({...errores, sale_date: undefined});
                  }}
                  className={errores.sale_date ? 'border-red-500' : ''}
                />
                {errores.sale_date && (
                  <span className="text-red-500 text-sm">{errores.sale_date}</span>
                )}
              </div>

              <div>
                <Label>Moneda *</Label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    setFormData({...formData, currency: e.target.value});
                    setErrores({...errores, currency: undefined});
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="UYU">UYU (Pesos)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
                {errores.currency && (
                  <span className="text-red-500 text-sm">{errores.currency}</span>
                )}
              </div>

              <div>
                <Label>Condiciones de Pago *</Label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito</option>
                  <option value="30 días">30 días</option>
                  <option value="60 días">60 días</option>
                  <option value="90 días">90 días</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 3: Detalle de Productos */}
          <div className="border rounded p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Detalle de Productos</h3>
              <Button type="button" onClick={handleAddItem} size="sm">
                <Plus size={16} className="mr-1" />
                Agregar Producto
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-left p-2">Cantidad</th>
                    <th className="text-left p-2">Unidad</th>
                    <th className="text-left p-2">Precio Unit.</th>
                    <th className="text-left p-2">IVA %</th>
                    <th className="text-left p-2">Subtotal</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                      <td className="p-2">
                        <select
                          value={item.input_id}
                          onChange={(e) => handleItemChange(index, 'input_id', e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-sm ${erroresItems[index]?.input_id ? 'border-red-500' : ''}`}
                        >
                          <option value="">Seleccionar...</option>
                          {insumos && insumos.map(insumo => (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.name} (Stock: {insumo.current_stock})
                            </option>
                          ))}
                        </select>
                        {erroresItems[index]?.input_id && (
                          <p className="text-red-500 text-xs">{erroresItems[index].input_id}</p>
                        )}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className={`w-24 text-sm ${erroresItems[index]?.quantity ? 'border-red-500' : ''}`}
                          step="0.01"
                          min="0"
                        />
                        {erroresItems[index]?.quantity && (
                          <p className="text-red-500 text-xs">{erroresItems[index].quantity}</p>
                        )}
                      </td>
                      <td className="p-2 text-sm">{item.unit || '-'}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className={`w-28 text-sm ${erroresItems[index]?.unit_price ? 'border-red-500' : ''}`}
                          step="0.01"
                          min="0"
                        />
                        {erroresItems[index]?.unit_price && (
                          <p className="text-red-500 text-xs">{erroresItems[index].unit_price}</p>
                        )}
                      </td>
                      <td className="p-2">
                        <select
                          value={item.tax_rate}
                          onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                        >
                          <option value={0}>0%</option>
                          <option value={10}>10%</option>
                          <option value={22}>22%</option>
                        </select>
                      </td>
                      <td className="p-2 font-semibold text-sm">
                        {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="border rounded p-4 bg-slate-50">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{totales.subtotal.toFixed(2)} {formData.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA ({formData.tax_rate}%):</span>
                  <span className="font-semibold">{totales.tax_amount.toFixed(2)} {formData.currency}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-green-600">{totales.total_amount.toFixed(2)} {formData.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Guardar Venta (Borrador)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
