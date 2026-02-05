import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { crearRegistro } from '../../services/registros';

export default function CompleteServiceOrderModal({
  order,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hours_worked: order?.hours_worked || 0,
    hectares_worked: order?.hectares_worked || 0,
    fuel_consumed_liters: order?.fuel_consumed_liters || 0,
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Actualizar orden como completada
      const { data: completedOrder, error } = await supabase
        .from('machinery_service_orders')
        .update({
          status: 'completed',
          end_datetime: new Date().toISOString(),
          updated_by: currentUser || 'sistema'
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;

      // 2. Crear registro de auditoría
      await crearRegistro({
        firmId: order.firm_id,
        tipo: 'orden_servicio_completada',
        descripcion: `Orden de servicio completada: ${order.service_type}`,
        moduloOrigen: 'machinery_manager',
        usuario: currentUser || 'sistema',
        referencia: order.id,
        metadata: {
          hours_worked: formData.hours_worked,
          hectares_worked: formData.hectares_worked
        }
      });

      toast.success('Orden completada correctamente');
      onSave?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Error al completar orden');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Completar Orden de Servicio</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Detalles de la orden</p>
              <p className="text-xs text-blue-800 mt-1">
                {order?.machinery?.name} - {order?.service_type}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium mb-1">Hectáreas Trabajadas</label>
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

            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notas adicionales sobre la orden..."
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
              />
            </div>

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
                {loading ? 'Completando...' : 'Completar Orden'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
