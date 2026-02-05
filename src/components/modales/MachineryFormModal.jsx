import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { validarMaquinaria } from '../../lib/validations/machineryValidations';
import { supabase } from '../../lib/supabase';
import { crearMaquinaria, actualizarMaquinaria } from '../../services/machinery';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function MachineryFormModal({
  firmId,
  machineryId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'tractor',
    status: 'ACTIVE',
    purchase_date: '',
    purchase_value: '',
    cost_per_hour: '',
    fuel_consumption_per_hour: '',
    license_plate: '',
    insurance_policy: '',
    insurance_expiry: '',
    horometer_hours: '0',
    total_hectares: '0'
  });

  useEffect(() => {
    if (machineryId) {
      loadMachinery();
    }
  }, [machineryId]);

  const loadMachinery = async () => {
    try {
      const { data } = await supabase
        .from('machinery')
        .select('*')
        .eq('id', machineryId)
        .single();

      if (data) {
        setFormData(data);
      }
    } catch (err) {
      toast.error('Error al cargar maquinaria');
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

    const validation = validarMaquinaria(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Por favor completa los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      if (machineryId) {
        // Actualizar usando el servicio
        await actualizarMaquinaria(machineryId, {
          ...formData,
          currentUser
        });
        toast.success('Maquinaria actualizada correctamente');
      } else {
        // Crear usando el servicio que valida y realiza auditoría
        await crearMaquinaria({
          firm_id: firmId,
          code: formData.code,
          name: formData.name,
          type: formData.type,
          brand: formData.brand,
          model: formData.model,
          year: formData.year,
          cost_per_hour: formData.cost_per_hour,
          fuel_consumption_per_hour: formData.fuel_consumption_per_hour,
          notes: formData.notes,
          currentUser
        });
        toast.success('Maquinaria creada correctamente');
      }

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
          <CardTitle>
            {machineryId ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos básicos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Datos Básicos</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'border-red-500' : ''}
                    placeholder="Ej: Tractor modelo XYZ"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Código</label>
                  <Input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Ej: TR-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.type ? 'border-red-500' : ''}`}
                  >
                    <option value="tractor">Tractor</option>
                    <option value="harvester">Cosechadora</option>
                    <option value="sprayer">Pulverizadora</option>
                    <option value="baler">Enfardadora</option>
                    <option value="truck">Camión</option>
                    <option value="other">Otro</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-600 text-xs mt-1">{errors.type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ACTIVE">Activa</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="INACTIVE">Inactiva</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compra e historial */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Compra e Historial</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Compra</label>
                  <Input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleChange}
                    className={errors.purchase_date ? 'border-red-500' : ''}
                  />
                  {errors.purchase_date && (
                    <p className="text-red-600 text-xs mt-1">{errors.purchase_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor de Compra ($)</label>
                  <Input
                    type="number"
                    name="purchase_value"
                    value={formData.purchase_value}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Horómetro Actual (horas)</label>
                  <Input
                    type="number"
                    name="horometer_hours"
                    value={formData.horometer_hours}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hectáreas Trabajadas</label>
                  <Input
                    type="number"
                    name="total_hectares"
                    value={formData.total_hectares}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Costos de operación */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Costos de Operación</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Costo por Hora ($)</label>
                  <Input
                    type="number"
                    name="cost_per_hour"
                    value={formData.cost_per_hour}
                    onChange={handleChange}
                    className={errors.cost_per_hour ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.cost_per_hour && (
                    <p className="text-red-600 text-xs mt-1">{errors.cost_per_hour}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Consumo de Combustible (L/h)</label>
                  <Input
                    type="number"
                    name="fuel_consumption_per_hour"
                    value={formData.fuel_consumption_per_hour}
                    onChange={handleChange}
                    className={errors.fuel_consumption_per_hour ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.1"
                  />
                  {errors.fuel_consumption_per_hour && (
                    <p className="text-red-600 text-xs mt-1">{errors.fuel_consumption_per_hour}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seguros */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Seguros y Documentación</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Placa/Patente</label>
                  <Input
                    type="text"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleChange}
                    placeholder="Ej: XYZ 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Número de Póliza</label>
                  <Input
                    type="text"
                    name="insurance_policy"
                    value={formData.insurance_policy}
                    onChange={handleChange}
                    placeholder="Número de póliza"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vencimiento del Seguro</label>
                <Input
                  type="date"
                  name="insurance_expiry"
                  value={formData.insurance_expiry}
                  onChange={handleChange}
                  className={errors.insurance_expiry ? 'border-red-500' : ''}
                />
                {errors.insurance_expiry && (
                  <p className="text-red-600 text-xs mt-1">{errors.insurance_expiry}</p>
                )}
              </div>
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
