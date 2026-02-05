import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { validarOrdenServicio } from '../../lib/validations/machineryValidations';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function ServiceOrderFormModal({
  firmId,
  premiseId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [machinery, setMachinery] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [formData, setFormData] = useState({
    machinery_id: '',
    client_type: 'internal',
    internal_cost_center_id: '',
    external_client_name: '',
    service_type: 'seeding',
    service_description: '',
    order_date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    hectares_worked: '',
    fuel_consumed_liters: '',
    billing_amount: '',
    status: 'scheduled'
  });

  useEffect(() => {
    if (firmId) {
      loadMachinery();
      loadCostCenters();
    }
  }, [firmId]);

  const loadMachinery = async () => {
    const { data } = await supabase
      .from('machinery')
      .select('id, name, code')
      .eq('firm_id', firmId)
      .eq('status', 'ACTIVE');

    if (data) {
      setMachinery(data);
    }
  };

  const loadCostCenters = async () => {
    const { data } = await supabase
      .from('cost_centers')
      .select('id, name, code')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setCostCenters(data);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validarOrdenServicio(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Por favor completa los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('machinery_service_orders')
        .insert([{
          ...formData,
          firm_id: firmId,
          created_by: currentUser || 'sistema'
        }]);

      toast.success('Orden de servicio creada correctamente');
      onSave?.();
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Nueva Orden de Servicio</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Maquinaria */}
            <div>
              <label className="block text-sm font-medium mb-1">Maquinaria *</label>
              <select
                name="machinery_id"
                value={formData.machinery_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${errors.machinery_id ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccionar máquina...</option>
                {machinery.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.code && `(${m.code})`}
                  </option>
                ))}
              </select>
              {errors.machinery_id && (
                <p className="text-red-600 text-xs mt-1">{errors.machinery_id}</p>
              )}
            </div>

            {/* Cliente */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Cliente</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Cliente *</label>
                <select
                  name="client_type"
                  value={formData.client_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="internal">Interno</option>
                  <option value="external">Externo</option>
                </select>
              </div>

              {formData.client_type === 'internal' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Centro de Costo *</label>
                  <Select
                    value={formData.internal_cost_center_id}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        internal_cost_center_id: value
                      }));
                      if (errors.internal_cost_center_id) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.internal_cost_center_id;
                          return newErrors;
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={errors.internal_cost_center_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccionar centro de costo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.name} {cc.code && `(${cc.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.internal_cost_center_id && (
                    <p className="text-red-600 text-xs mt-1">{errors.internal_cost_center_id}</p>
                  )}
                </div>
              )}

              {formData.client_type === 'external' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del Cliente Externo *</label>
                  <Input
                    type="text"
                    name="external_client_name"
                    value={formData.external_client_name}
                    onChange={handleChange}
                    className={errors.external_client_name ? 'border-red-500' : ''}
                    placeholder="Nombre o razón social"
                  />
                  {errors.external_client_name && (
                    <p className="text-red-600 text-xs mt-1">{errors.external_client_name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Servicio */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Servicio</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Servicio *</label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="seeding">Siembra</option>
                    <option value="spraying">Pulverización</option>
                    <option value="harvesting">Cosecha</option>
                    <option value="irrigation">Riego</option>
                    <option value="transport">Transporte</option>
                    <option value="baling">Enfardado</option>
                    <option value="hauling">Acarreo</option>
                    <option value="plowing">Arado</option>
                    <option value="fertilization">Fertilización</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción *</label>
                  <Input
                    type="text"
                    name="service_description"
                    value={formData.service_description}
                    onChange={handleChange}
                    className={errors.service_description ? 'border-red-500' : ''}
                    placeholder="Descripción breve del servicio"
                  />
                  {errors.service_description && (
                    <p className="text-red-600 text-xs mt-1">{errors.service_description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mediciones */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Mediciones</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Horas Trabajadas</label>
                  <Input
                    type="number"
                    name="hours_worked"
                    value={formData.hours_worked}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hectáreas</label>
                  <Input
                    type="number"
                    name="hectares_worked"
                    value={formData.hectares_worked}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Combustible (L)</label>
                  <Input
                    type="number"
                    name="fuel_consumed_liters"
                    value={formData.fuel_consumed_liters}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Orden</label>
                  <Input
                    type="date"
                    name="order_date"
                    value={formData.order_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Costos y Facturación */}
            {formData.client_type === 'external' && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Facturación</h3>

                <div>
                  <label className="block text-sm font-medium mb-1">Monto de Facturación ($) *</label>
                  <Input
                    type="number"
                    name="billing_amount"
                    value={formData.billing_amount}
                    onChange={handleChange}
                    className={errors.billing_amount ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.billing_amount && (
                    <p className="text-red-600 text-xs mt-1">{errors.billing_amount}</p>
                  )}
                </div>
              </div>
            )}

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="scheduled">Programada</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
