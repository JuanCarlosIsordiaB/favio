import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { validarMantenimiento } from '../../lib/validations/machineryValidations';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function MaintenanceFormModal({
  firmId,
  maintenanceId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [machinery, setMachinery] = useState([]);
  const [formData, setFormData] = useState({
    machinery_id: '',
    maintenance_type: 'preventive',
    description: '',
    scheduled_date: '',
    start_date: '',
    completion_date: '',
    horometer_at_maintenance: '',
    labor_cost: '',
    parts_cost: '',
    status: 'scheduled',
    next_maintenance_due_date: '',
    next_maintenance_due_hours: ''
  });

  useEffect(() => {
    if (firmId) {
      loadMachinery();
    }
  }, [firmId]);

  useEffect(() => {
    if (maintenanceId) {
      loadMaintenance();
    }
  }, [maintenanceId]);

  const loadMachinery = async () => {
    const { data } = await supabase
      .from('machinery')
      .select('id, name, code')
      .eq('firm_id', firmId);

    if (data) {
      setMachinery(data);
    }
  };

  const loadMaintenance = async () => {
    try {
      const { data } = await supabase
        .from('machinery_maintenance')
        .select('*')
        .eq('id', maintenanceId)
        .single();

      if (data) {
        setFormData(data);
      }
    } catch (err) {
      toast.error('Error al cargar mantenimiento');
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

    const validation = validarMantenimiento(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Por favor completa los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      if (maintenanceId) {
        await supabase
          .from('machinery_maintenance')
          .update(formData)
          .eq('id', maintenanceId);

        toast.success('Mantenimiento actualizado correctamente');
      } else {
        await supabase
          .from('machinery_maintenance')
          .insert([{
            ...formData,
            firm_id: firmId
          }]);

        toast.success('Mantenimiento registrado correctamente');
      }

      // Ejecutar callbacks y cerrar modal
      onSave?.();

      // Pequeño delay para asegurar que el toast se muestre
      setTimeout(() => {
        onClose?.();
      }, 500);
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
            {maintenanceId ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
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

            {/* Tipo y descripción */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Detalles del Mantenimiento</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Mantenimiento *</label>
                <select
                  name="maintenance_type"
                  value={formData.maintenance_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="preventive">Preventivo</option>
                  <option value="corrective">Correctivo</option>
                  <option value="inspection">Inspección</option>
                  <option value="calibration">Calibración</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Describir el mantenimiento..."
                  rows="3"
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Fechas</h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Programado</label>
                  <Input
                    type="date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Inicio</label>
                  <Input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finalización</label>
                  <Input
                    type="date"
                    name="completion_date"
                    value={formData.completion_date}
                    onChange={handleChange}
                    className={errors.completion_date ? 'border-red-500' : ''}
                  />
                  {errors.completion_date && (
                    <p className="text-red-600 text-xs mt-1">{errors.completion_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lecturas */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Lecturas</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Horómetro en Mantenimiento (horas)</label>
                <Input
                  type="number"
                  name="horometer_at_maintenance"
                  value={formData.horometer_at_maintenance}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.5"
                />
              </div>
            </div>

            {/* Costos */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Costos</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Costo de Mano de Obra ($)</label>
                  <Input
                    type="number"
                    name="labor_cost"
                    value={formData.labor_cost}
                    onChange={handleChange}
                    className={errors.labor_cost ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.labor_cost && (
                    <p className="text-red-600 text-xs mt-1">{errors.labor_cost}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Costo de Repuestos ($)</label>
                  <Input
                    type="number"
                    name="parts_cost"
                    value={formData.parts_cost}
                    onChange={handleChange}
                    className={errors.parts_cost ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.parts_cost && (
                    <p className="text-red-600 text-xs mt-1">{errors.parts_cost}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Próximo mantenimiento */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Próximo Mantenimiento</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Estimada</label>
                  <Input
                    type="date"
                    name="next_maintenance_due_date"
                    value={formData.next_maintenance_due_date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Horas de Uso</label>
                  <Input
                    type="number"
                    name="next_maintenance_due_hours"
                    value={formData.next_maintenance_due_hours}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="scheduled">Programado</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
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
