import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { validarCapacitacion } from '../../lib/validations/personnelValidations';
import { supabase } from '../../lib/supabase';
import { usePersonnel } from '../../hooks/usePersonnel';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function TrainingFormModal({
  firmId,
  trainingId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [personnel, setPersonnel] = useState([]);
  const [formData, setFormData] = useState({
    personnel_id: '',
    training_name: '',
    training_type: 'course',
    provider: '',
    start_date: '',
    completion_date: '',
    expiration_date: '',
    status: 'planned',
    is_mandatory: false,
    cost_amount: '',
    score: ''
  });

  const { personnel: personnelList } = usePersonnel(firmId);

  useEffect(() => {
    if (personnelList) {
      setPersonnel(personnelList);
    }
  }, [personnelList]);

  useEffect(() => {
    if (trainingId) {
      loadTraining();
    }
  }, [trainingId]);

  const loadTraining = async () => {
    try {
      const { data } = await supabase
        .from('personnel_training')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (data) {
        setFormData(data);
      }
    } catch (err) {
      toast.error('Error al cargar capacitación');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

    const validation = validarCapacitacion(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Por favor completa los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      if (trainingId) {
        await supabase
          .from('personnel_training')
          .update(formData)
          .eq('id', trainingId);

        toast.success('Capacitación actualizada correctamente');
      } else {
        await supabase
          .from('personnel_training')
          .insert([{
            ...formData,
            firm_id: firmId
          }]);

        toast.success('Capacitación creada correctamente');
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
            {trainingId ? 'Editar Capacitación' : 'Nueva Capacitación'}
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
            {/* Personal */}
            <div>
              <label className="block text-sm font-medium mb-1">Personal *</label>
              <select
                name="personnel_id"
                value={formData.personnel_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${errors.personnel_id ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccionar personal...</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              {errors.personnel_id && (
                <p className="text-red-600 text-xs mt-1">{errors.personnel_id}</p>
              )}
            </div>

            {/* Datos de la capacitación */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Datos de la Capacitación</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  type="text"
                  name="training_name"
                  value={formData.training_name}
                  onChange={handleChange}
                  className={errors.training_name ? 'border-red-500' : ''}
                  placeholder="Ej: Seguridad en equipos agrícolas"
                />
                {errors.training_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.training_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    name="training_type"
                    value={formData.training_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="course">Curso</option>
                    <option value="certification">Certificación</option>
                    <option value="workshop">Taller</option>
                    <option value="seminar">Seminario</option>
                    <option value="internal">Interno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Proveedor</label>
                  <Input
                    type="text"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    placeholder="Ej: INIA, Instituto privado"
                  />
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Fechas</h3>

              <div className="grid grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-sm font-medium mb-1">Vencimiento</label>
                  <Input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleChange}
                    className={errors.expiration_date ? 'border-red-500' : ''}
                  />
                  {errors.expiration_date && (
                    <p className="text-red-600 text-xs mt-1">{errors.expiration_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Resultados</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="planned">Planificada</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                    <option value="expired">Vencida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Calificación (0-100)</label>
                  <Input
                    type="number"
                    name="score"
                    value={formData.score}
                    onChange={handleChange}
                    className={errors.score ? 'border-red-500' : ''}
                    min="0"
                    max="100"
                    placeholder="0"
                  />
                  {errors.score && (
                    <p className="text-red-600 text-xs mt-1">{errors.score}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Capacitación obligatoria</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Costo ($)</label>
                <Input
                  type="number"
                  name="cost_amount"
                  value={formData.cost_amount}
                  onChange={handleChange}
                  className={errors.cost_amount ? 'border-red-500' : ''}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.cost_amount && (
                  <p className="text-red-600 text-xs mt-1">{errors.cost_amount}</p>
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
